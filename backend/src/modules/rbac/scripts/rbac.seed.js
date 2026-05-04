/**
 * src/modules/rbac/scripts/rbac.seed.js
 */
const mongoose = require('mongoose');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const { Roles, Scopes, Resources, Actions } = require('../constants/rbac.enum');

const seedRbac = async () => {
    try {
        console.log('🔄 Starting RBAC data synchronization...');

        // 1. TẠO CÁC QUYỀN (PERMISSIONS) CỐT LÕI
        const permissionsData = [
            { resource: Resources.PROJECT, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Create new projects' },
            { resource: Resources.PROJECT, action: Actions.READ, scope: Scopes.PROJECT, description: 'View project details' },
            { resource: Resources.PROJECT, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Update project information' },
            { resource: Resources.PROJECT, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Delete projects' },
            { resource: Resources.PROJECT, action: Actions.MANAGE_MEMBERS, scope: Scopes.PROJECT, description: 'Manage project members' }
        ];

        const savedPermissions = {};
        for (const p of permissionsData) {
            const doc = await Permission.findOneAndUpdate(
                { resource: p.resource, action: p.action, scope: p.scope },
                p,
                { upsert: true, returnDocument: 'after' }
            );
            savedPermissions[`${p.resource}_${p.action}_${p.scope}`] = doc._id;
        }

        // 2. TẠO CHỨC DANH (ROLES) & GẮN QUYỀN
        const rolesData = [
            {
                name: Roles.SYSTEM_ADMIN, //[cite: 9]
                scope: Scopes.SYSTEM,     //[cite: 9]
                description: 'Full control over the whole system',
                permission_ids: [] // SYSTEM_ADMIN bypasses all checks via middleware
            },
            {
                name: Roles.ADMIN,        //[cite: 9]
                scope: Scopes.SYSTEM,     //[cite: 9]
                description: 'System administrator',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`]
                ]
            },
            {
                name: Roles.PM,           //[cite: 9]
                scope: Scopes.PROJECT,    //[cite: 9]
                description: 'Project manager role',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.UPDATE}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.MANAGE_MEMBERS}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: Roles.VIEWER,       //[cite: 9]
                scope: Scopes.PROJECT,    //[cite: 9]
                description: 'Read-only access within project',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`]
                ]
            },
            // ... (Tiếp nối bên dưới các Role đã có trong mảng rolesData)

            {
                name: Roles.MANAGER,      // Quyền hệ thống[cite: 5]
                scope: Scopes.SYSTEM,     //[cite: 5]
                description: 'Manage business operations',
                permission_ids: [
                    // Tùy bạn quyết định, ví dụ Manager được tạo project giống Admin
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`]
                ]
            },
            {
                name: Roles.LEAD,         // Quyền dự án[cite: 5]
                scope: Scopes.PROJECT,    //[cite: 5]
                description: 'Team lead role within project',
                permission_ids: [
                    // Lead được xem và sửa dự án, nhưng không được xóa hay mời người khác
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.UPDATE}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: Roles.MEMBER,       // Quyền dự án[cite: 5]
                scope: Scopes.PROJECT,    //[cite: 5]
                description: 'Basic member access',
                permission_ids: [
                    // Member chỉ được quyền xem thông tin dự án
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`]
                ]
            }
        ];

        for (const r of rolesData) {
            await Role.findOneAndUpdate(
                { name: r.name, scope: r.scope },
                r,
                { upsert: true }
            );
        }

        console.log('✅ RBAC data seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding RBAC data:', error);
    }
};

module.exports = seedRbac;