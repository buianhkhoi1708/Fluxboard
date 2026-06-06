const mongoose = require("mongoose");

const aiContextSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      default: null,
      index: true,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    prompt_text: {
      type: String,
      required: true,
      trim: true,
    },

    context_type: {
      type: String,
      enum: [
        "GENERATE_BOARD",
        "GENERATE_SMART_TASKS",
        "GENERATE_INSIGHTS",
        "GENERATE_SUBTASKS",
        "SUMMARIZE_ACTIVITY",
        "DEVIATION_INSIGHTS",
      ],
      required: true,
      index: true,
    },

    messages: [
      {
        role: {
          type: String,
          enum: ["user", "model"],
          required: true,
        },
        content: {
          type: String,
          default: "",
        },
      },
    ],

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

aiContextSchema.index({ board_id: 1, context_type: 1, is_deleted: 1 });
aiContextSchema.index({ project_id: 1, context_type: 1, is_deleted: 1 });
aiContextSchema.index({ user_id: 1, created_at: -1 });

module.exports =
  mongoose.models.AiContext || mongoose.model("AiContext", aiContextSchema);
