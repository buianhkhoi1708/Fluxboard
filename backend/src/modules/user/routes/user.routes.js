const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// ==========================================
// API DỮ LIỆU CÁ NHÂN (ME)
// ==========================================
router.get('/me', userController.getCurrentProfile);
router.put('/me', userController.updateProfile);
router.put('/me/password', userController.changePassword);

router.get('/me/preferences', userController.getPreferences);
router.put('/me/preferences', userController.updatePreferences);

// ==========================================
// API TỔ CHỨC & HỆ THỐNG
// ==========================================
// Chú ý: /unassigned phải nằm trên /:id
router.get('/unassigned', requirePermission('ORGANIZATION', 'READ'), userController.getUnassignedUsers);

router.get('/:id', userController.getUserById);
router.put('/:id/assign-team', requirePermission('ORGANIZATION', 'WRITE'), userController.assignToTeam);

module.exports = router;