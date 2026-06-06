const Column = require("../models/column.model");
const Board = require("../../board/models/board.model");
const AppError = require("../../../common/exceptions/AppError");
const Task = require("../../task/models/task.model");

exports.createColumn = async (boardId, name) => {
  const board = await Board.findById(boardId);
  if (!board) throw new AppError("Board not found", 404, "NOT_FOUND");

  const newColumn = await Column.create({
    board_id: boardId,
    name,
    task_order_ids: [],
  });

  board.column_order_ids.push(newColumn._id);
  await board.save();

  return newColumn;
};

exports.updateColumn = async (columnId, name) => {
  const updatedCol = await Column.findByIdAndUpdate(
    columnId,
    { name },
    { new: true },
  );
  if (!updatedCol) throw new AppError("Column not found", 404, "NOT_FOUND");
  return updatedCol;
};

exports.deleteColumn = async (columnId) => {
  const column = await Column.findById(columnId);
  if (!column) throw new AppError("Column not found", 404, "NOT_FOUND");

  await Board.findByIdAndUpdate(column.board_id, {
    $pull: { column_order_ids: columnId },
  });

  column.is_deleted = true;
  await column.save();

  await Task.updateMany(
    { column_id: columnId },
    { $set: { is_deleted: true } },
  );

  return true;
};
