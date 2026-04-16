const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);
router.get('/:id', userController.getUserById);

module.exports = router;