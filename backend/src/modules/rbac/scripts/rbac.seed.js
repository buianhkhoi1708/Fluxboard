/**
 * src/modules/rbac/scripts/rbac.seed.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const { Scopes, Resources, Actions } = require('../constants/rbac.enum');

const seedRbac = async () => {
    try {
        console.log('🔄 Bắt đầu đồng bộ dữ liệu RBAC toàn diện...');

        // =========================================================
        // 1. TỪ ĐIỂN QUYỀN HẠN (FULL TẤT CẢ MODULES)
        // =========================================================
        const permissionsData = [
            // --- SYSTEM SCOPE (QUẢN TRỊ HỆ THỐNG) ---
            { resource: Resources.PROJECT, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Tạo dự án mới' },
            { resource: Resources.USER, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Tạo tài khoản' },
            { resource: Resources.USER, action: Actions.READ, scope: Scopes.SYSTEM, description: 'Xem danh sách tài khoản' },
            { resource: Resources.USER, action: Actions.UPDATE, scope: Scopes.SYSTEM, description: 'Sửa tài khoản' },
            { resource: Resources.USER, action: Actions.DELETE, scope: Scopes.SYSTEM, description: 'Xóa/Khóa tài khoản' },
            { resource: Resources.DEPARTMENT, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Tạo phòng ban' },
            { resource: Resources.DEPARTMENT, action: Actions.READ, scope: Scopes.SYSTEM, description: 'Xem phòng ban' },
            { resource: Resources.DEPARTMENT, action: Actions.UPDATE, scope: Scopes.SYSTEM, description: 'Sửa phòng ban' },
            { resource: Resources.DEPARTMENT, action: Actions.DELETE, scope: Scopes.SYSTEM, description: 'Xóa phòng ban' },
            { resource: Resources.TEAM, action: Actions.CREATE, scope: Scopes.SYSTEM, description: 'Tạo nhóm' },
            { resource: Resources.TEAM, action: Actions.READ, scope: Scopes.SYSTEM, description: 'Xem danh sách nhóm' },
            { resource: Resources.TEAM, action: Actions.UPDATE, scope: Scopes.SYSTEM, description: 'Sửa nhóm' },
            { resource: Resources.TEAM, action: Actions.DELETE, scope: Scopes.SYSTEM, description: 'Xóa nhóm' },
            { resource: Resources.RBAC, action: Actions.READ, scope: Scopes.SYSTEM, description: 'Xem phân quyền' },
            { resource: Resources.RBAC, action: Actions.WRITE, scope: Scopes.SYSTEM, description: 'Quản lý phân quyền' },

            // --- PROJECT SCOPE (QUẢN TRỊ DỰ ÁN) ---
            // 1. Project
            { resource: Resources.PROJECT, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem chi tiết dự án' },
            { resource: Resources.PROJECT, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Cập nhật dự án' },
            { resource: Resources.PROJECT, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa dự án' },
            { resource: Resources.PROJECT, action: Actions.MANAGE_MEMBERS, scope: Scopes.PROJECT, description: 'Quản lý thành viên dự án' },
            
            // 2. Board & Column
            { resource: Resources.BOARD, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Tạo Bảng' },
            { resource: Resources.BOARD, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem Bảng' },
            { resource: Resources.BOARD, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Sửa Bảng' },
            { resource: Resources.BOARD, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa Bảng' },
            { resource: Resources.COLUMN, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Tạo Cột' },
            { resource: Resources.COLUMN, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem Cột' },
            { resource: Resources.COLUMN, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Sửa Cột' },
            { resource: Resources.COLUMN, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa Cột' },
            
            // 3. Task
            { resource: Resources.TASK, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Tạo Thẻ công việc' },
            { resource: Resources.TASK, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem Thẻ công việc' },
            { resource: Resources.TASK, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Sửa & Di chuyển Thẻ' },
            { resource: Resources.TASK, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa Thẻ công việc' },
            
            // 4. Comment & Attachment & Label
            { resource: Resources.COMMENT, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Bình luận' },
            { resource: Resources.COMMENT, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem bình luận' },
            { resource: Resources.COMMENT, action: Actions.UPDATE, scope: Scopes.PROJECT, description: 'Sửa bình luận' },
            { resource: Resources.COMMENT, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa bình luận' },
            { resource: Resources.ATTACHMENT, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Đính kèm file' },
            { resource: Resources.ATTACHMENT, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem/Tải file' },
            { resource: Resources.ATTACHMENT, action: Actions.DELETE, scope: Scopes.PROJECT, description: 'Xóa file đính kèm' },
            { resource: Resources.LABEL, action: Actions.CREATE, scope: Scopes.PROJECT, description: 'Tạo nhãn' },
            { resource: Resources.LABEL, action: Actions.READ, scope: Scopes.PROJECT, description: 'Xem nhãn' }
        ];

        // Lưu và lấy ID của từng Permission
        const savedPermissions = {};
        for (const p of permissionsData) {
            const doc = await Permission.findOneAndUpdate(
                { resource: p.resource, action: p.action, scope: p.scope },
                p,
                { upsert: true, returnDocument: 'after' }
            );
            savedPermissions[`${p.resource}_${p.action}_${p.scope}`] = doc._id;
        }

        // Helpers để nhóm quyền cho gọn code
        const getPerms = (resource, actions, scope) => actions.map(a => savedPermissions[`${resource}_${a}_${scope}`]);
        const ALL_PROJECT_READ = [
            ...getPerms(Resources.PROJECT, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.BOARD, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.COLUMN, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.TASK, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.COMMENT, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.ATTACHMENT, [Actions.READ], Scopes.PROJECT),
            ...getPerms(Resources.LABEL, [Actions.READ], Scopes.PROJECT)
        ];

        // =========================================================
        // 2. KHỞI TẠO VÀ GÁN QUYỀN CHO ROLES
        // =========================================================
        const rolesData = [
            // ============ CẤP HỆ THỐNG (SYSTEM SCOPE) ============
            {
                name: 'SYSTEM_ADMIN', scope: Scopes.SYSTEM, description: 'Toàn quyền kiểm soát hệ thống',
                permission_ids: Object.values(savedPermissions) // Lấy TẤT CẢ
            },
            {
                name: 'ADMIN', scope: Scopes.SYSTEM, description: 'Quản trị viên hệ thống',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`],
                    ...getPerms(Resources.USER, [Actions.CREATE, Actions.READ, Actions.UPDATE], Scopes.SYSTEM),
                    ...getPerms(Resources.DEPARTMENT, [Actions.CREATE, Actions.READ, Actions.UPDATE], Scopes.SYSTEM),
                    ...getPerms(Resources.TEAM, [Actions.CREATE, Actions.READ, Actions.UPDATE], Scopes.SYSTEM),
                    ...getPerms(Resources.RBAC, [Actions.READ], Scopes.SYSTEM)
                ]
            },
            {
                name: 'MANAGER', scope: Scopes.SYSTEM, description: 'Quản lý vận hành (Tạo Project, Team)',
                permission_ids: [
                    savedPermissions[`${Resources.PROJECT}_${Actions.CREATE}_${Scopes.SYSTEM}`],
                    ...getPerms(Resources.USER, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.TEAM, [Actions.CREATE, Actions.READ, Actions.UPDATE], Scopes.SYSTEM),
                    ...getPerms(Resources.DEPARTMENT, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.RBAC, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.BOARD, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                ]
            },
            {
                name: 'EMPLOYEE', scope: Scopes.SYSTEM, description: 'Nhân viên công ty (Mặc định)',
                permission_ids: [
                    ...getPerms(Resources.USER, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.TEAM, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.DEPARTMENT, [Actions.READ], Scopes.SYSTEM),
                    ...getPerms(Resources.RBAC, [Actions.READ], Scopes.SYSTEM)
                ]
            },
            
            // ============ CẤP DỰ ÁN (PROJECT SCOPE) ============
            {
                name: 'PROJECT_ADMIN', scope: Scopes.PROJECT, description: 'Quản trị viên dự án (Full quyền trong Project)',
                permission_ids: Object.values(savedPermissions).filter(id => {
                    const p = Object.keys(savedPermissions).find(key => savedPermissions[key] === id);
                    return p.endsWith(`_${Scopes.PROJECT}`); // Lấy full quyền thuộc về PROJECT
                })
            },
            {
                name: 'PM', scope: Scopes.PROJECT, description: 'Quản lý dự án (Quản lý Bảng, Task, Thành viên)',
                permission_ids: [
                    ...ALL_PROJECT_READ,
                    ...getPerms(Resources.PROJECT, [Actions.UPDATE, Actions.MANAGE_MEMBERS], Scopes.PROJECT),
                    ...getPerms(Resources.BOARD, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.COLUMN, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.TASK, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.COMMENT, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.ATTACHMENT, [Actions.CREATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.LABEL, [Actions.CREATE], Scopes.PROJECT)
                ]
            },
            {
                name: 'LEAD', scope: Scopes.PROJECT, description: 'Trưởng nhóm (Quản lý Task, không quản lý Bảng)',
                permission_ids: [
                    ...ALL_PROJECT_READ,
                    ...getPerms(Resources.TASK, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.COMMENT, [Actions.CREATE, Actions.UPDATE, Actions.DELETE], Scopes.PROJECT),
                    ...getPerms(Resources.ATTACHMENT, [Actions.CREATE, Actions.DELETE], Scopes.PROJECT)
                ]
            },
            {
                name: 'MEMBER', scope: Scopes.PROJECT, description: 'Thành viên thực thi (Tạo/Sửa Task, Comment)',
                permission_ids: [
                    ...ALL_PROJECT_READ,
                    // Bơm quyền cho phép MEMBER tạo và sửa Task
                    ...getPerms(Resources.TASK, [Actions.CREATE, Actions.UPDATE], Scopes.PROJECT),
                    ...getPerms(Resources.COMMENT, [Actions.CREATE, Actions.UPDATE], Scopes.PROJECT),
                    ...getPerms(Resources.ATTACHMENT, [Actions.CREATE], Scopes.PROJECT)
                ]
            },
            {
                name: 'VIEWER', scope: Scopes.PROJECT, description: 'Khách xem (Chỉ đọc, không thao tác)',
                permission_ids: [
                    ...ALL_PROJECT_READ
                ]
            }
        ];

        for (const r of rolesData) {
            const { name, ...updateData } = r;
            await Role.findOneAndUpdate(
                { name: name },
                { $set: updateData },
                { upsert: true, returnDocument: 'after' }
            );
        }

        console.log('✅ RBAC data seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding RBAC data:', error);
    }
};

// =========================================================
// 3. CHẠY KỊCH BẢN (TỰ ĐỘNG KẾT NỐI MONGODB)
// =========================================================
const runSeed = async () => {
    try {
        const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fluxboard';
        console.log(`⏳ Đang kết nối tới DB: ${dbUri}`);
        await mongoose.connect(dbUri);
        console.log('✅ Kết nối Database thành công!');

        await seedRbac();

        console.log('🎉 Xong! Đang ngắt kết nối DB...');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Kết nối DB thất bại:', error);
        process.exit(1);
    }
};

// Khởi chạy
if (require.main === module) {
    runSeed();
} else {
    module.exports = seedRbac;
}