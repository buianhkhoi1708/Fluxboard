const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const taskController = require('../controllers/task.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

router.post('/', boardController.createBoard);
router.get('/:id', boardController.getBoardDetail);

router.post('/tasks', taskController.createTask);
router.put('/tasks/:id/move', taskController.moveTask);

module.exports = router;