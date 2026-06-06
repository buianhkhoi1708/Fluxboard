const Task = require("../models/task.model");
const Attachment = require("../models/attachment.model");
const AppError = require("../../../common/exceptions/AppError");
const socketConfig = require("../../../common/config/socket");
const s3Service = require("../../media/services/s3.service");

const emitBoardEvent = (boardId, eventName, payload) => {
  const io = socketConfig.getIo();
  if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

exports.addAttachment = async (taskId, userId, fileData) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError("Task not found", 404, "NOT_FOUND");

  const attachment = await Attachment.create({
    task_id: taskId,
    user_id: userId,
    file_name: fileData.file_name,
    file_url: fileData.file_url,
    mime_type: fileData.mime_type,
  });

  emitBoardEvent(task.board_id, "attachmentAdded", attachment);
  return attachment;
};

exports.getTaskAttachments = async (taskId) => {
  return await Attachment.find({ task_id: taskId }).sort({ created_at: -1 });
};

exports.deleteAttachment = async (attachmentId, userId) => {
  const attachment = await Attachment.findById(attachmentId);
  if (!attachment) throw new AppError("Attachment not found", 404, "NOT_FOUND");

  if (attachment.user_id.toString() !== userId.toString()) {
    throw new AppError(
      "Unauthorized to delete this attachment",
      403,
      "FORBIDDEN",
    );
  }

  if (attachment.file_url) {
    await s3Service.deleteFile(attachment.file_url);
  }

  await Attachment.findByIdAndDelete(attachmentId);

  const task = await Task.findById(attachment.task_id);
  if (task) emitBoardEvent(task.board_id, "attachmentDeleted", attachmentId);

  return true;
};

exports.deleteAllByTaskId = async (taskId) => {
  const attachments = await Attachment.find({ task_id: taskId });
  for (const att of attachments) {
    if (att.file_url) {
      await s3Service.deleteFile(att.file_url);
    }
  }
  await Attachment.deleteMany({ task_id: taskId });
};
