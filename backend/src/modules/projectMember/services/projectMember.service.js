const ProjectMember = require('../models/projectMember.model');
const Role = require('../../rbac/models/role.model');
const AppError = require('../../../common/exceptions/AppError');
const eventBus = require('../../../common/utils/eventBus'); 
const mongoose = require('mongoose');

exports.getMembers = async (projectId) => {
    return await ProjectMember.aggregate([
        { $match: { project_id: new mongoose.Types.ObjectId(projectId), is_deleted: false } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { 
            $project: {
                _id: 0,
                member_record_id: '$_id',
                user_id: 1,
                full_name: '$user.full_name',
                email: '$user.email',
                avatar_url: '$user.avatar_url',
                is_active: 1,
                role_ids: 1,
                joined_at: '$created_at'
            }
        }
    ]);
};

exports.addMember = async (projectId, payload, actorUser) => {
    const { user_id, role_ids } = payload;
    const existingMember = await ProjectMember.findOne({ project_id: projectId, user_id });
    
    if (existingMember && !existingMember.is_deleted) {
        throw new AppError('This user is already a member of the project.', 400, 'BAD_REQUEST');
    }

    let member;
    if (existingMember && existingMember.is_deleted) {
        existingMember.is_deleted = false;
        existingMember.is_active = true;
        existingMember.role_ids = role_ids;
        member = await existingMember.save();
    } else {
        member = await ProjectMember.create({ project_id: projectId, user_id, role_ids });
    }

    eventBus.emit('activity_log', {
        actor_user_id: actorUser.id,
        source_type: 'PROJECT',
        source_id: projectId,
        project_id: projectId,
        action: 'ADD_MEMBER',
        message: 'A new member has been added to the project.'
    });

    return member;
};

// 💡 ĐỔI QUYỀN DỰ ÁN (PROJECT ROLE)
exports.updateMember = async (projectId, userId, payload, actorUser) => {
    const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId, is_deleted: false });
    if (!member) throw new AppError('Project member not found.', 404, 'NOT_FOUND');

    let isRoleChanged = false;

    if (payload.role_ids !== undefined) {
        member.role_ids = payload.role_ids;
        isRoleChanged = true;
    }
    if (payload.is_active !== undefined) {
        member.is_active = payload.is_active;
        isRoleChanged = true;
    }

    await member.save();

    eventBus.emit('activity_log', {
        actor_user_id: actorUser.id,
        source_type: 'PROJECT',
        source_id: projectId,
        project_id: projectId,
        action: 'UPDATE_MEMBER',
        message: 'Member permissions or status have been updated.'
    });

    if (isRoleChanged) {
        eventBus.emit('force_logout_user', { 
            userId: userId, 
            message: 'Your project permissions have changed. Please log in again to sync updates!' 
        });
    }

    return member;
};

// 💡 XÓA KHỎI DỰ ÁN 
exports.removeMember = async (projectId, userId, actorUser) => {
    const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId, is_deleted: false });
    if (!member) throw new AppError('Project member not found.', 404, 'NOT_FOUND');

    const adminRole = await Role.findOne({ name: 'PROJECT_ADMIN', scope: 'PROJECT' }).lean();
    if (adminRole && member.role_ids.includes(adminRole._id)) {
        const adminCount = await ProjectMember.countDocuments({
            project_id: projectId,
            is_deleted: false,
            role_ids: { $in: [adminRole._id] }
        });
        if (adminCount <= 1) {
            throw new AppError('Cannot remove the last Project Admin from this project.', 400, 'BAD_REQUEST');
        }
    }

    member.is_deleted = true;
    await member.save();

    eventBus.emit('activity_log', {
        actor_user_id: actorUser.id,
        source_type: 'PROJECT',
        source_id: projectId,
        project_id: projectId,
        action: 'REMOVE_MEMBER',
        message: 'A member has been removed from the project.'
    });

    eventBus.emit('project_access_removed', { 
        userId: userId, 
        projectId: projectId,
        message: 'Your access to this project has been revoked.' 
    });

    return true;
};