const mongoose = require("mongoose");
const { Scopes, Resources, Actions } = require("../constants/rbac.enum");

const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      enum: Object.values(Resources),
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: Object.values(Actions),
      required: true,
    },

    scope: {
      type: String,
      enum: Object.values(Scopes),
      required: true,
    },

    description: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

permissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
