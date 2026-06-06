const express = require("express");
const router = express.Router();
const boardController = require("../controllers/board.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../../common/middlewares/requirePermission");

router.use(requireAuth);

router.post(
  "/",
  requirePermission("BOARD", "CREATE", "PROJECT"),
  boardController.createBoard,
);

router.get("/:id", boardController.getBoardDetail);

router.put(
  "/:id",
  requirePermission("BOARD", "UPDATE", "PROJECT"),
  boardController.updateBoard,
);

router.delete(
  "/:id",
  requirePermission("BOARD", "DELETE", "PROJECT"),
  boardController.deleteBoard,
);

module.exports = router;
