const Department = require('../../department/models/department.model');
const Team = require('../../team/models/team.model');
const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');

// ==========================================
// 1. SƠ ĐỒ TỔ CHỨC (TREE)
// ==========================================
exports.getOrganizationTree = async () => {
    // 1. KÉO PHẲNG (FLAT FETCH): Lấy toàn bộ phòng ban + Teams + Members + Leads/Managers
    const allDepartments = await Department.aggregate([
        { $match: { is_deleted: false } },
        
        // 🚀 FIX: Kéo thêm thông tin Trưởng phòng (manager_id)
        {
            $lookup: {
                from: 'users',
                localField: 'manager_id',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 1, full_name: 1, email: 1, avatar_url: 1 } }],
                as: 'manager_info'
            }
        },
        { $addFields: { manager_id: { $arrayElemAt: ['$manager_info', 0] } } }, // Ghi đè Object vào trường manager_id
        { $project: { manager_info: 0 } }, // Dọn dẹp field thừa
        
        {
            $lookup: {
                from: 'teams', 
                localField: '_id',
                foreignField: 'department_id',
                pipeline: [
                    { $match: { is_deleted: false } },
                    
                    // 🚀 FIX: Kéo thêm thông tin Trưởng nhóm (lead_id)
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'lead_id',
                            foreignField: '_id',
                            pipeline: [{ $project: { _id: 1, full_name: 1, email: 1, avatar_url: 1 } }],
                            as: 'lead_info'
                        }
                    },
                    { $addFields: { lead_id: { $arrayElemAt: ['$lead_info', 0] } } },
                    { $project: { lead_info: 0 } },

                    // Lấy danh sách thành viên
                    {
                        $lookup: {
                            from: 'users',
                            localField: '_id',
                            foreignField: 'team_id',
                            pipeline: [
                                { $match: { status: 'ACTIVE' } },
                                { $project: { _id: 1, full_name: 1, email: 1, avatar_url: 1 } }
                            ],
                            as: 'members'
                        }
                    }
                ],
                as: 'teams'
            }
        }
    ]);

    // 2. RÁP CÂY BẰNG RAM (In-memory Assembly O(N))
    const deptMap = {};
    const roots = [];

    // Tạo Hash Map 
    allDepartments.forEach(dept => {
        deptMap[dept._id.toString()] = { 
            ...dept, 
            sub_departments: [] 
        };
    });

    // Ráp node con vào node cha
    allDepartments.forEach(dept => {
        const mappedDept = deptMap[dept._id.toString()];
        if (dept.parent_id && deptMap[dept.parent_id.toString()]) {
            deptMap[dept.parent_id.toString()].sub_departments.push(mappedDept);
        } else {
            roots.push(mappedDept);
        }
    });

    return roots;
};

// ==========================================
// 2. DEPARTMENT LOGIC
// ==========================================
exports.createDepartment = async ({ name, code, parent_id, description, manager_id }) => {
    if (!name || !code) throw new AppError('Tên và Mã phòng ban là bắt buộc', 400);
    
    return await Department.create({
        name,
        code,
        parent_id: parent_id || null,
        description,
        manager_id, 
        is_deleted: false
    });
};

exports.updateDepartment = async (id, updateData) => {
    // 🚀 FIX: Đổi payload thành updateData để không bị sập server
    const updatedDept = await Department.findByIdAndUpdate(
        id, 
        updateData, 
        { returnDocument: 'after', runValidators: true }
    );
    if (!updatedDept) throw new AppError('Không tìm thấy phòng ban', 404);
    return updatedDept;
};

exports.deleteDepartment = async (id) => {
    const hasChildren = await Department.exists({ parent_id: id, is_deleted: false });
    if (hasChildren) throw new AppError('Không thể xóa. Vui lòng chuyển các phòng ban con trước.', 400);

    // 🚀 FIX: Sửa { new: true } thành { returnDocument: 'after' }
    const deletedDept = await Department.findByIdAndUpdate(
        id, 
        { is_deleted: true }, 
        { returnDocument: 'after' } 
    );
    if (!deletedDept) throw new AppError('Không tìm thấy phòng ban', 404);
    return true;
};

// ==========================================
// 3. TEAM LOGIC
// ==========================================
exports.createTeam = async ({ name, code, department_id, description, lead_id }) => {
    if (!name || !code || !department_id) throw new AppError('Tên, Mã nhóm và ID phòng ban là bắt buộc', 400);
    
    return await Team.create({ 
        name, 
        code, 
        department_id, 
        description, 
        lead_id, 
        is_deleted: false 
    });
};

exports.updateTeam = async (teamId, updateData) => {
    // 🚀 FIX: Sửa { new: true } thành { returnDocument: 'after' }
    const updatedTeam = await Team.findByIdAndUpdate(
        teamId, 
        updateData, 
        { returnDocument: 'after', runValidators: true }
    );
    if (!updatedTeam) throw new AppError('Không tìm thấy nhóm', 404);
    return updatedTeam;
};

// ==========================================
// 4. MEMBER ASSIGNMENT LOGIC
// ==========================================
exports.getUnassignedUsers = async () => {
    // 1. X-QUANG: Lấy thử TOÀN BỘ user trong hệ thống ra xem mặt mũi nó thế nào
    const debugAllUsers = await User.find({}).select('full_name email status team_id');
    console.log("🔍 [DEBUG] TOÀN BỘ USER TRONG DB:", debugAllUsers);

    // 2. NỚI LỎNG TỐI ĐA ĐIỀU KIỆN (Tạm thời bỏ check status)
    const users = await User.find({ 
        $or: [
            { team_id: null }, 
            { team_id: { $exists: false } }
        ] 
    }).select('_id full_name email avatar_url');

    console.log("🟢 [DEBUG] SỐ LƯỢNG USER TRỐNG TÌM THẤY:", users.length);
    
    return users;
};

exports.assignUserToTeam = async (userId, teamId, departmentId) => {
    // 🚀 FIX: Sửa { new: true }
    const updatedUser = await User.findByIdAndUpdate(
        userId, 
        { team_id: teamId, department_id: departmentId },
        { returnDocument: 'after' }
    );
    if (!updatedUser) throw new AppError('Không tìm thấy nhân sự', 404);
    return updatedUser;
};

exports.removeUserFromTeam = async (userId, teamId) => {
    // 🚀 FIX: Sửa { new: true }
    const updatedUser = await User.findOneAndUpdate(
        { _id: userId, team_id: teamId },
        { team_id: null }, 
        { returnDocument: 'after' }
    );
    if (!updatedUser) throw new AppError('Nhân sự không thuộc nhóm này hoặc không tồn tại', 404);
    return true;
};

// ==========================================
// 5. SEARCH LOGIC
// ==========================================
exports.searchUsers = async (keyword) => {
    if (!keyword) return [];
    
    const searchTerm = keyword.trim();

    return await User.find({
        status: 'ACTIVE',
        $or: [
            { full_name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
        ]
    })
    .select('_id full_name email avatar_url')
    .limit(10);
};