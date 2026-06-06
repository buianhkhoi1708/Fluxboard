const mongoose = require("mongoose");
const { Scopes } = require("../constants/rbac.enum");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    scope: {
      type: String,
      enum: Object.values(Scopes),
      required: true,
    },
    description: { type: String },
    permission_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

module.exports = mongoose.model("Role", roleSchema);
