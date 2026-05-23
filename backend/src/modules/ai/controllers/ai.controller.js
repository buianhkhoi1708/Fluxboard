const aiService = require("../services/ai.service");
const Task = require("../../task/models/task.model"); // Sếp nhớ import đúng đường dẫn model Task
const Column = require("../../column/models/column.model");

exports.generateBoard = async (req, res, next) => {
  try {
    const { prompt, board_id } = req.body;
    if (!prompt || !board_id) {
      return res
        .status(400)
        .json({
          success: false,
          error: { message: "Prompt and board_id are required" },
        });
    }

    // 1. Gọi AI
    const generatedData = await aiService.generateBoardContext(
      req.user.id,
      prompt,
    );

    // 2. Lấy danh sách cột
    const columns = await Column.find({ board_id: board_id });
    if (!columns || columns.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: { message: "Board columns not found" },
        });
    }

    // 3. Chuẩn hóa Task
    const tasksToSave = generatedData.tasks.map((task) => {
      const foundCol = columns.find(
        (c) => c.name.toLowerCase() === task.column_name.toLowerCase(),
      );

      return {
        title: task.title,
        description: task.description,
        priority: task.priority,
        board_id: board_id,
        column_id: foundCol ? foundCol._id : columns[0]._id,

        // 🚀 FIX LỖI VALIDATION: Map string thành object { title, is_done }
        subtasks: (task.subtasks || []).map((st) => ({
          title: typeof st === "string" ? st : st.title || "Untitled",
          is_done: false,
        })),

        is_done: false,
        is_deleted: false,
        created_by: req.user.id,
      };
    });

    // 4. Lưu Task vào DB
    const savedTasks = await Task.insertMany(tasksToSave);

    // 5. 🚀 CẬP NHẬT task_order_ids CHO TỪNG CỘT
    // Nhóm các task theo column_id để cập nhật hàng loạt (tối ưu hơn)
    const updates = {};
    savedTasks.forEach((task) => {
      const colId = task.column_id.toString();
      if (!updates[colId]) updates[colId] = [];
      updates[colId].push(task._id);
    });

    // Thực hiện cập nhật mảng vào từng cột
    for (const colId in updates) {
      await Column.findByIdAndUpdate(colId, {
        $push: { task_order_ids: { $each: updates[colId] } },
      });
    }

    // 6. Trả về kết quả
    res.status(200).json({ success: true, data: savedTasks });
  } catch (error) {
    next(error);
  }
};
exports.generateInsights = async (req, res, next) => {
  try {
    const projectId = req.body.projectId || req.params.projectId;
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, error: { message: "Project ID is required" } });
    }

    const insights = await aiService.generateInsights(req.user.id, projectId);
    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    next(error);
  }
};

exports.generateSubtasks = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ success: false, error: { message: "Task title is required" } });
    }

    const subtasks = await aiService.generateSubtasks(
      req.user.id,
      title,
      description,
    );
    res.status(200).json({ success: true, data: subtasks });
  } catch (error) {
    next(error);
  }
};

exports.summarizeTaskActivity = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    const summary = await aiService.summarizeTaskActivity(req.user.id, taskId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
