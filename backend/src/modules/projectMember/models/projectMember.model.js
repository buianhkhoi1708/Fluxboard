const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    is_active: { type: Boolean, default: true },

    role_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],

    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model("ProjectMember", projectMemberSchema);
