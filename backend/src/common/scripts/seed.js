require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Role = require("../../modules/rbac/models/role.model");
const User = require("../../modules/user/models/user.model");

const { Roles } = require("../../modules/rbac/constants/rbac.enum");

const seedData = async () => {
  if (process.env.SEED_DATA !== "true") {
    console.log("⏭️ Skip seed");
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);

      console.log("✅ MongoDB Connected for seeding");
    }

    let systemAdminRole = await Role.findOne({
      name: Roles.SYSTEM_ADMIN,
    });

    if (!systemAdminRole) {
      systemAdminRole = await Role.create({
        name: Roles.SYSTEM_ADMIN,
        description: "Super Administrator",
      });

      console.log("✅ SYSTEM_ADMIN role created");
    }

    const adminEmail = process.env.SEED_SYSTEM_ADMIN_EMAIL;

    const password_hash = await bcrypt.hash(
      process.env.SEED_SYSTEM_ADMIN_PASSWORD,
      10,
    );

    const existingAdmin = await User.findOne({
      email: adminEmail,
    });

    if (!existingAdmin) {
      const newAdmin = await User.create({
        email: adminEmail,
        password_hash,
        full_name: "System Admin",

        role_id: systemAdminRole._id,
      });

      console.log("✅ SYSTEM_ADMIN user created");

      console.log(newAdmin);
    } else {
      await User.updateOne(
        { email: adminEmail },
        {
          $set: {
            password_hash,

            role_id: systemAdminRole._id,
          },
        },
      );

      console.log("✅ SYSTEM_ADMIN updated");
    }
  } catch (error) {
    console.error("❌ Seed Error");

    console.error(error);
  }
};

module.exports = seedData;
