const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');

// Mọi request phải đi qua check Auth
router.use(requireAuth);

// Các API quản lý Bảng & Cột
router.post('/', boardController.createBoard);
router.post('/columns', boardController.createColumn);
router.get('/:id', boardController.getBoardDetail);

// Các API quản lý Task (Thẻ công việc)
router.post('/tasks', taskController.createTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);
router.put('/tasks/:id/move', taskController.moveTask);

module.exports = router;