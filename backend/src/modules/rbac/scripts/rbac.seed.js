/**
 * src/modules/rbac/scripts/rbac.seed.js
 */
const mongoose = require('mongoose');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const { Scopes, Resources, Actions } = require('../constants/rbac.enum');

const seedRbac = async () => {
    try {
        console.log('🔄 Starting RBAC data synchronization...');

        // 1. Khởi tạo quyền cốt lõi
        const permissionsData = [
            // Quyền Project
            { resource: Resources.PROJECT, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Create new projects' },
            { resource: Resources.PROJECT, action: Actions.READ, scope: Scopes.PROJECT, description: 'View project details' },
            { resource: Resources.PROJECT, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Update project information' },
            { resource: Resources.PROJECT, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Delete projects' },
            { resource: Resources.PROJECT, action: Actions.MANAGE_MEMBERS, scope: Scopes.PROJECT, description: 'Manage project members' },
            
            // 🚀 THÊM QUYỀN RBAC ĐỂ ROUTER KHÔNG BỊ CHẶN NỮA
            { resource: 'RBAC', action: Actions.READ, scope: Scopes.SYSTEM, description: 'View Roles & Permissions' },
            { resource: 'RBAC', action: Actions.WRITE, scope: Scopes.SYSTEM, description: 'Manage Roles & Permissions' }
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

        // 2. Khởi tạo danh sách Roles mặc định (SYSTEM & PROJECT)
     const rolesData = [
            // --- SYSTEM SCOPE ---
            {
                name: 'SYSTEM_ADMIN',
                scope: Scopes.SYSTEM,
                description: 'Full control over the whole system',
                // 🚀 TRÙM CUỐI: Gắn TẤT CẢ các quyền (bao gồm cả RBAC) vào đây
                permission_ids: Object.values(savedPermissions) 
            },
            {
                name: 'ADMIN',
                scope: Scopes.SYSTEM,
                description: 'System administrator',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`],
                    // Thêm quyền RBAC READ cho Admin nếu Sếp muốn họ xem được danh sách
                    savedPermissions[`RBAC_${Actions.READ}_${Scopes.SYSTEM}`]
                ]
            },
            {
                name: 'MANAGER',
                scope: Scopes.SYSTEM,
                description: 'Manage business operations',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`]
                ]
            },
            {
                name: 'EMPLOYEE',
                scope: Scopes.SYSTEM,
                description: 'Nhân viên công ty',
                permission_ids: []
            },
            
            // --- PROJECT SCOPE ---
            {
                name: 'PROJECT_ADMIN',
                scope: Scopes.PROJECT,
                description: 'Quản trị dự án toàn quyền',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.UPDATE}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.DELETE}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.MANAGE_MEMBERS}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: 'PM',
                scope: Scopes.PROJECT,
                description: 'Project manager role',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.UPDATE}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.MANAGE_MEMBERS}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: 'LEAD',
                scope: Scopes.PROJECT,
                description: 'Team lead role within project',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`],
                    savedPermissions[`${Resources.PROJECT}_${Actions.UPDATE}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: 'MEMBER',
                scope: Scopes.PROJECT,
                description: 'Basic member access',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`]
                ]
            },
            {
                name: 'VIEWER',
                scope: Scopes.PROJECT,
                description: 'Read-only access within project',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.READ}_${Scopes.PROJECT}`]
                ]
            }
        ];

        for (const r of rolesData) {
            // Tách name ra làm điều kiện tìm kiếm, các trường còn lại để update
            const { name, ...updateData } = r;

            await Role.findOneAndUpdate(
                { name: name }, // ✅ CHỈ tìm theo trường được đánh unique index
                { 
                    $set: updateData // ✅ Dùng $set để LUÔN CẬP NHẬT quyền/scope mới nhất mỗi khi chạy seed
                },
                { upsert: true, returnDocument: 'after' }
            );
        }

        console.log('✅ RBAC data seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding RBAC data:', error);
    }
};

module.exports = seedRbac;