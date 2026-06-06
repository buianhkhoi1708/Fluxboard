const express = require("express");
const router = express.Router();
const columnController = require("../controllers/column.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../../common/middlewares/requirePermission");

router.use(requireAuth);

router.post(
  "/",
  requirePermission("COLUMN", "CREATE", "PROJECT"),
  columnController.createColumn,
);

router.put(
  "/:id",
  requirePermission("COLUMN", "UPDATE", "PROJECT"),
  columnController.updateColumn,
);

router.delete(
  "/:id",
  requirePermission("COLUMN", "DELETE", "PROJECT"),
  columnController.deleteColumn,
);

module.exports = router;
