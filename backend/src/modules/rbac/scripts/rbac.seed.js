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

        // 1. CREATE CORE PERMISSIONS
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
                { upsert: true, new: true }
            );
            savedPermissions[`${p.resource}_${p.action}_${p.scope}`] = doc._id;
        }

        // 2. CREATE ROLES & ASSIGN PERMISSIONS
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