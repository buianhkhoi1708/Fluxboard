const aiService = require("../services/ai.service");
const Task = require("../../task/models/task.model");
const Column = require("../../column/models/column.model");

exports.generateBoard = async (req, res, next) => {
  try {
    const { prompt, board_id } = req.body;
    if (!prompt || !board_id) {
      return res.status(400).json({
        success: false,
        error: { message: "Prompt and board_id are required" },
      });
    }

    const generatedData = await aiService.generateBoardContext(
      req.user.id,
      prompt,
    );

    const columns = await Column.find({ board_id: board_id });
    if (!columns || columns.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: "Board columns not found" },
      });
    }

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
        subtasks: (task.subtasks || []).map((st) => ({
          title: typeof st === "string" ? st : st.title || "Untitled",
          is_done: false,
        })),
        is_done: false,
        is_deleted: false,
        created_by: req.user.id,
      };
    });

    const savedTasks = await Task.insertMany(tasksToSave);

    const updates = {};
    savedTasks.forEach((task) => {
      const colId = task.column_id.toString();
      if (!updates[colId]) updates[colId] = [];
      updates[colId].push(task._id);
    });

    for (const colId in updates) {
      await Column.findByIdAndUpdate(colId, {
        $push: { task_order_ids: { $each: updates[colId] } },
      });
    }

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

exports.generateSmartTasks = async (req, res, next) => {
  try {
    const {
      board_id,
      project_id,
      prompt,
      member_ids,
      generation_mode,
      start_date,
    } = req.body;

    if (!board_id || !project_id || !prompt) {
      return res.status(400).json({
        success: false,
        error: { message: "board_id, project_id và prompt là bắt buộc" },
      });
    }

    const generatedData = await aiService.generateSmartTasks(
      req.user.id,
      board_id,
      project_id,
      prompt,
      member_ids || [],
      generation_mode || "SIMPLE",
      start_date,
    );

    res.status(200).json({ success: true, data: generatedData });
  } catch (error) {
    next(error);
  }
};

exports.getDeviationInsights = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.query.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { message: "Project ID is required" },
      });
    }

    const deviationData = await aiService.getDeviationInsights(projectId);

    res.status(200).json({ success: true, data: deviationData });
  } catch (error) {
    next(error);
  }
};
