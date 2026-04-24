const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);
router.get('/', dashboardController.getDashboardData);

module.exports = router;