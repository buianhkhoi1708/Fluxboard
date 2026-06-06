const mongoose = require("mongoose");
const {
  ActivityAction,
  ActivitySource,
} = require("../constants/activity.enum");

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(ActivitySource),
      required: true,
      index: true,
    },

    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    target_type: {
      type: String,
      default: null,
      index: true,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ip_address: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
  },
);

activitySchema.index({ project_id: 1, created_at: -1 });
activitySchema.index({ source: 1, action: 1, created_at: -1 });
activitySchema.index({ actor_id: 1, created_at: -1 });
activitySchema.index({ created_at: -1 });

module.exports = mongoose.model("Activity", activitySchema);
