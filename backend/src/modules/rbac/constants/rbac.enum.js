/**
 * src/modules/rbac/constants/rbac.enum.js
 */

exports.Roles = Object.freeze({
    SYSTEM_ADMIN: 'SYSTEM_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    PM: 'PM',
    LEAD: 'LEAD',
    MEMBER: 'MEMBER',
    VIEWER: 'VIEWER'
}); //

exports.Scopes = Object.freeze({
    SYSTEM: 'SYSTEM',
    PROJECT: 'PROJECT',
    PERSONAL: 'PERSONAL'
}); //

// Bổ sung thêm Resource (Tài nguyên)
exports.Resources = Object.freeze({
    USER: 'USER',
    PROJECT: 'PROJECT',
    TASK: 'TASK',
    ROLE: 'ROLE',
    PERMISSION: 'PERMISSION'
});

// Bổ sung thêm Action (Hành động)
exports.Actions = Object.freeze({
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    MANAGE_MEMBERS: 'MANAGE_MEMBERS'
});