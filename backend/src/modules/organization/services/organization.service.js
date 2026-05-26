const Department = require('../../department/models/department.model');
const Team = require('../../team/models/team.model');
const User = require('../../user/models/user.model');
const Role = require('../../rbac/models/role.model');
const AppError = require('../../../common/exceptions/AppError');

const normalizeRoleName = (value) => {
    if (!value) return '';

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
};

const getUserId = (user) => {
    if (!user) return '';

    return String(user.user_id || user.id || user._id || '');
};

const getRoleNameFromValue = (value) => {
    if (!value) return '';

    const directRole =
        value.role_name ||
        value.roleName ||
        value.system_role ||
        value.systemRole ||
        value.role ||
        value.role_code ||
        value.roleCode;

    if (directRole) {
        return normalizeRoleName(directRole);
    }

    if (value.role_id && typeof value.role_id === 'object') {
        return normalizeRoleName(value.role_id.name || value.role_id.code);
    }

    return '';
};

const isSystemAdminValue = (value) => {
    return getRoleNameFromValue(value) === 'SYSTEM_ADMIN';
};

const getActorFromDb = async (actorUser) => {
    const actorId = getUserId(actorUser);

    if (!actorId) return null;

    return User.findById(actorId)
        .populate('role_id', 'name scope')
        .lean();
};

const getSystemAdminRole = async () => {
    return Role.findOne({
        name: 'SYSTEM_ADMIN',
    }).lean();
};

const buildVisibilityContext = async ({
    actorUser,
    excludeSystemAdmin = true,
    includeCurrentSystemAdmin = false,
} = {}) => {
    const actorFromDb = await getActorFromDb(actorUser);
    const actor = actorFromDb || actorUser || null;

    const actorIsSystemAdmin =
        isSystemAdminValue(actorUser) ||
        isSystemAdminValue(actorFromDb);

    const systemAdminRole = await getSystemAdminRole();

    return {
        actor,
        actorId: getUserId(actor),
        actorIsSystemAdmin,
        systemAdminRoleId: systemAdminRole?._id ? String(systemAdminRole._id) : null,
        excludeSystemAdmin,
        includeCurrentSystemAdmin,
    };
};

const isUserSystemAdminByRoleId = (user, context) => {
    if (!user || !context.systemAdminRoleId) {
        return false;
    }

    const roleId =
        typeof user.role_id === 'object'
            ? user.role_id?._id || user.role_id?.id
            : user.role_id;

    return String(roleId || '') === context.systemAdminRoleId;
};

const shouldExposeUser = (user, context) => {
    if (!user) return false;

    const userIsSystemAdmin =
        isSystemAdminValue(user) ||
        isUserSystemAdminByRoleId(user, context);

    if (!userIsSystemAdmin) {
        return true;
    }

    if (!context.excludeSystemAdmin) {
        return context.actorIsSystemAdmin;
    }

    return (
        context.actorIsSystemAdmin &&
        context.includeCurrentSystemAdmin &&
        String(getUserId(user)) === String(context.actorId)
    );
};

const assertUserSelectable = async (userId, actorUser) => {
    if (!userId) return null;

    const context = await buildVisibilityContext({
        actorUser,
        excludeSystemAdmin: true,
        includeCurrentSystemAdmin: true,
    });

    const targetUser = await User.findById(userId)
        .populate('role_id', 'name scope')
        .lean();

    if (!targetUser) {
        throw new AppError('Không tìm thấy nhân sự', 404, 'USER_NOT_FOUND');
    }

    if (!shouldExposeUser(targetUser, context)) {
        throw new AppError(
            'SYSTEM_ADMIN là tài khoản quản trị cao nhất và không thể bị chọn/gán bởi tài khoản khác.',
            403,
            'SYSTEM_ADMIN_PROTECTED',
        );
    }

    return targetUser;
};

const sanitizeUserForResponse = (user, context) => {
    if (!shouldExposeUser(user, context)) {
        return null;
    }

    return user;
};

const sanitizeTeam = (team, context) => {
    if (!team) return team;

    const sanitizedLead = sanitizeUserForResponse(team.lead_id, context);

    return {
        ...team,
        lead_id: sanitizedLead,
        members: Array.isArray(team.members)
            ? team.members.filter((member) => shouldExposeUser(member, context))
            : team.members,
    };
};

const sanitizeDepartment = (department, context) => {
    if (!department) return department;

    const sanitizedManager = sanitizeUserForResponse(department.manager_id, context);

    return {
        ...department,
        manager_id: sanitizedManager,
        teams: Array.isArray(department.teams)
            ? department.teams.map((team) => sanitizeTeam(team, context))
            : department.teams,
        sub_departments: Array.isArray(department.sub_departments)
            ? department.sub_departments.map((child) =>
                sanitizeDepartment(child, context),
            )
            : department.sub_departments,
    };
};

const buildUserVisibilityFilter = async (context, baseFilter = {}) => {
    if (!context.systemAdminRoleId) {
        return baseFilter;
    }

    if (!context.excludeSystemAdmin && context.actorIsSystemAdmin) {
        return baseFilter;
    }

    const nonSystemAdminFilter = {
        role_id: {
            $ne: context.systemAdminRoleId,
        },
    };

    if (
        context.actorIsSystemAdmin &&
        context.includeCurrentSystemAdmin &&
        context.actorId
    ) {
        return {
            $and: [
                baseFilter,
                {
                    $or: [
                        nonSystemAdminFilter,
                        {
                            _id: context.actorId,
                        },
                    ],
                },
            ],
        };
    }

    return {
        $and: [
            baseFilter,
            nonSystemAdminFilter,
        ],
    };
};

const userSafeSelect = '_id full_name email avatar_url role_id status team_id department_id';

// ==========================================
// 1. SƠ ĐỒ TỔ CHỨC
// ==========================================

exports.getOrganizationTree = async (options = {}) => {
    const context = await buildVisibilityContext(options);

    const allDepartments = await Department.aggregate([
        {
            $match: {
                is_deleted: false,
            },
        },

        {
            $lookup: {
                from: 'users',
                localField: 'manager_id',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            full_name: 1,
                            email: 1,
                            avatar_url: 1,
                            role_id: 1,
                        },
                    },
                ],
                as: 'manager_info',
            },
        },
        {
            $addFields: {
                manager_id: {
                    $arrayElemAt: ['$manager_info', 0],
                },
            },
        },
        {
            $project: {
                manager_info: 0,
            },
        },

        {
            $lookup: {
                from: 'teams',
                localField: '_id',
                foreignField: 'department_id',
                pipeline: [
                    {
                        $match: {
                            is_deleted: false,
                        },
                    },

                    {
                        $lookup: {
                            from: 'users',
                            localField: 'lead_id',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        full_name: 1,
                                        email: 1,
                                        avatar_url: 1,
                                        role_id: 1,
                                    },
                                },
                            ],
                            as: 'lead_info',
                        },
                    },
                    {
                        $addFields: {
                            lead_id: {
                                $arrayElemAt: ['$lead_info', 0],
                            },
                        },
                    },
                    {
                        $project: {
                            lead_info: 0,
                        },
                    },

                    {
                        $lookup: {
                            from: 'users',
                            localField: '_id',
                            foreignField: 'team_id',
                            pipeline: [
                                {
                                    $match: {
                                        status: 'ACTIVE',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        full_name: 1,
                                        email: 1,
                                        avatar_url: 1,
                                        role_id: 1,
                                    },
                                },
                            ],
                            as: 'members',
                        },
                    },
                ],
                as: 'teams',
            },
        },
    ]);

    const deptMap = {};
    const roots = [];

    allDepartments.forEach((dept) => {
        deptMap[dept._id.toString()] = {
            ...dept,
            sub_departments: [],
        };
    });

    allDepartments.forEach((dept) => {
        const mappedDept = deptMap[dept._id.toString()];

        if (dept.parent_id && deptMap[dept.parent_id.toString()]) {
            deptMap[dept.parent_id.toString()].sub_departments.push(mappedDept);
        } else {
            roots.push(mappedDept);
        }
    });

    return roots.map((root) => sanitizeDepartment(root, context));
};

// ==========================================
// 2. DEPARTMENT LOGIC
// ==========================================

exports.createDepartment = async (
    {
        name,
        code,
        parent_id,
        description,
        manager_id,
    },
    actorUser,
) => {
    if (!name || !code) {
        throw new AppError('Tên và Mã phòng ban là bắt buộc', 400);
    }

    if (manager_id) {
        await assertUserSelectable(manager_id, actorUser);
    }

    return await Department.create({
        name,
        code,
        parent_id: parent_id || null,
        description,
        manager_id: manager_id || null,
        is_deleted: false,
    });
};

exports.updateDepartment = async (id, updateData, actorUser) => {
    if (updateData.manager_id) {
        await assertUserSelectable(updateData.manager_id, actorUser);
    }

    const updatedDept = await Department.findByIdAndUpdate(
        id,
        updateData,
        {
            returnDocument: 'after',
            runValidators: true,
        },
    );

    if (!updatedDept) {
        throw new AppError('Không tìm thấy phòng ban', 404);
    }

    return updatedDept;
};

exports.deleteDepartment = async (id) => {
    const hasChildren = await Department.exists({
        parent_id: id,
        is_deleted: false,
    });

    if (hasChildren) {
        throw new AppError(
            'Không thể xóa. Vui lòng chuyển các phòng ban con trước.',
            400,
        );
    }

    const deletedDept = await Department.findByIdAndUpdate(
        id,
        {
            is_deleted: true,
        },
        {
            returnDocument: 'after',
        },
    );

    if (!deletedDept) {
        throw new AppError('Không tìm thấy phòng ban', 404);
    }

    return true;
};

// ==========================================
// 3. TEAM LOGIC
// ==========================================

exports.createTeam = async (
    {
        name,
        code,
        department_id,
        description,
        lead_id,
    },
    actorUser,
) => {
    if (!name || !code || !department_id) {
        throw new AppError('Tên, Mã nhóm và ID phòng ban là bắt buộc', 400);
    }

    if (lead_id) {
        await assertUserSelectable(lead_id, actorUser);
    }

    return await Team.create({
        name,
        code,
        department_id,
        description,
        lead_id: lead_id || null,
        is_deleted: false,
    });
};

exports.updateTeam = async (teamId, updateData, actorUser) => {
    if (updateData.lead_id) {
        await assertUserSelectable(updateData.lead_id, actorUser);
    }

    const updatedTeam = await Team.findByIdAndUpdate(
        teamId,
        updateData,
        {
            returnDocument: 'after',
            runValidators: true,
        },
    );

    if (!updatedTeam) {
        throw new AppError('Không tìm thấy nhóm', 404);
    }

    return updatedTeam;
};

// ==========================================
// 4. MEMBER ASSIGNMENT LOGIC
// ==========================================

exports.getUnassignedUsers = async (options = {}) => {
    const context = await buildVisibilityContext(options);

    const baseFilter = {
        $or: [
            { team_id: null },
            { team_id: { $exists: false } },
        ],
        status: 'ACTIVE',
    };

    const query = await buildUserVisibilityFilter(context, baseFilter);

    return await User.find(query)
        .select(userSafeSelect)
        .populate('role_id', 'name scope')
        .sort({ full_name: 1 })
        .lean();
};

exports.assignUserToTeam = async (userId, teamId, departmentId, actorUser) => {
    await assertUserSelectable(userId, actorUser);

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            team_id: teamId,
            department_id: departmentId,
        },
        {
            returnDocument: 'after',
        },
    )
        .select(userSafeSelect)
        .populate('role_id', 'name scope');

    if (!updatedUser) {
        throw new AppError('Không tìm thấy nhân sự', 404);
    }

    return updatedUser;
};

exports.removeUserFromTeam = async (userId, teamId, actorUser) => {
    await assertUserSelectable(userId, actorUser);

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            team_id: teamId,
        },
        {
            team_id: null,
        },
        {
            returnDocument: 'after',
        },
    );

    if (!updatedUser) {
        throw new AppError('Nhân sự không thuộc nhóm này hoặc không tồn tại', 404);
    }

    return true;
};

// ==========================================
// 5. SEARCH LOGIC
// ==========================================

exports.searchUsers = async (keyword, options = {}) => {
    const searchTerm = String(keyword || '').trim();

    if (!searchTerm) {
        return [];
    }

    const context = await buildVisibilityContext(options);

    const baseFilter = {
        status: 'ACTIVE',
        $or: [
            {
                full_name: {
                    $regex: searchTerm,
                    $options: 'i',
                },
            },
            {
                email: {
                    $regex: searchTerm,
                    $options: 'i',
                },
            },
        ],
    };

    const query = await buildUserVisibilityFilter(context, baseFilter);

    return await User.find(query)
        .select(userSafeSelect)
        .populate('role_id', 'name scope')
        .limit(10)
        .lean();
};