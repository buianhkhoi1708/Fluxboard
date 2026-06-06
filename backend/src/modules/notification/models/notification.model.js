const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    reference_type: {
      type: String,
      default: "TASK",
      index: true,
    },

    action_url: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    email_html: {
      type: String,
    },

    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SENT"],
      default: "SENT",
      index: true,
    },

    send_at: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
  },
);

notificationSchema.index({ recipient_id: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1 });
notificationSchema.index({ type: 1, reference_id: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
