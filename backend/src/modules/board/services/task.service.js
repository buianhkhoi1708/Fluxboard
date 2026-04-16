const mongoose = require('mongoose');
const Task = require('../models/task.model');
const Column = require('../models/column.model');

exports.createTask = async (taskData) => {
    const taskCount = await Task.countDocuments({ column_id: taskData.column_id });
    return await Task.create({ ...taskData, order: taskCount });
};

exports.moveTask = async (taskId, sourceColumnId, destColumnId, sourceIndex, destIndex) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const task = await Task.findById(taskId).session(session);

        if (sourceColumnId === destColumnId) {
            if (sourceIndex < destIndex) {
                await Task.updateMany(
                    { column_id: sourceColumnId, order: { $gt: sourceIndex, $lte: destIndex } },
                    { $inc: { order: -1 } },
                    { session }
                );
            } else if (sourceIndex > destIndex) {
                await Task.updateMany(
                    { column_id: sourceColumnId, order: { $gte: destIndex, $lt: sourceIndex } },
                    { $inc: { order: 1 } },
                    { session }
                );
            }
            task.order = destIndex;
        } else {
            await Task.updateMany(
                { column_id: sourceColumnId, order: { $gt: sourceIndex } },
                { $inc: { order: -1 } },
                { session }
            );
            await Task.updateMany(
                { column_id: destColumnId, order: { $gte: destIndex } },
                { $inc: { order: 1 } },
                { session }
            );
            task.column_id = destColumnId;
            task.order = destIndex;
        }

        await task.save({ session });
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
    return true;
};