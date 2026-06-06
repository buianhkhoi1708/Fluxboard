const express = require("express");
const router = express.Router();

const deadlineController = require("../controllers/deadline.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");

router.use(requireAuth);

router.get("/task/:taskId", deadlineController.getDeadlineByTask);

router.post("/task/:taskId/extend", deadlineController.requestExtension);

router.put("/task/:taskId/approve", deadlineController.approveExtension);

router.put("/task/:taskId/reject", deadlineController.rejectExtension);

module.exports = router;
