const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  is_done: {
    type: Boolean,
    default: false,
  },
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    column_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
      index: true,
    },

    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },

    author_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    completed_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    completed_at: {
      type: Date,
      default: null,
    },

    parent_task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },

    assignees_user_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    assignee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
      default: "TODO",
      index: true,
    },

    is_done: {
      type: Boolean,
      default: false,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    story_point: {
      type: Number,
      default: 0,
    },

    ai_suggested_point: {
      type: Number,
      default: 0,
    },

    ai_estimated_reason: {
      type: String,
      default: "",
    },

    start_date: {
      type: Date,
      default: null,
    },

    due_date: {
      type: Date,
      default: null,
    },

    tags: [
      {
        type: String,
      },
    ],

    subtasks: [subtaskSchema],

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

taskSchema.virtual("deadline_info", {
  ref: "TaskDeadline",
  localField: "_id",
  foreignField: "task_id",
  justOne: true,
});

taskSchema.set("toObject", { virtuals: true });
taskSchema.set("toJSON", { virtuals: true });

taskSchema.index({ board_id: 1, column_id: 1 });
taskSchema.index({ board_id: 1, is_deleted: 1 });
taskSchema.index({ assignees_user_id: 1, is_deleted: 1 });
taskSchema.index({ author_user_id: 1, is_deleted: 1 });
taskSchema.index({ completed_by_user_id: 1, is_deleted: 1 });

module.exports = mongoose.model("Task", taskSchema);
