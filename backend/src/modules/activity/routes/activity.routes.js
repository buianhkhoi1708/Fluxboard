const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);
router.get('/projects/:projectId', activityController.getProjectActivities);

module.exports = router;