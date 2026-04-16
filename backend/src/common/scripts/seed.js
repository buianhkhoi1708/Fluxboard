require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Role = require('../../modules/rbac/models/role.model');
const User = require('../../modules/user/models/user.model');
const { Roles } = require('../../modules/rbac/constants/rbac.enum');

const seedData = async () => {
    if (process.env.SEED_DATA !== 'true') return;

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        let systemAdminRole = await Role.findOne({ name: Roles.SYSTEM_ADMIN });
        if (!systemAdminRole) {
            systemAdminRole = await Role.create({ name: Roles.SYSTEM_ADMIN, description: 'Super Administrator' });
        }

        const adminEmail = process.env.SEED_SYSTEM_ADMIN_EMAIL;
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
            const password_hash = await bcrypt.hash(process.env.SEED_SYSTEM_ADMIN_PASSWORD, 10);
            await User.create({
                email: adminEmail,
                password_hash,
                full_name: 'System Admin',
                system_role_ids: [systemAdminRole._id]
            });
            console.log('Seed: SYSTEM_ADMIN user created successfully.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Seed Data Error:', error);
        process.exit(1);
    }
};

seedData();