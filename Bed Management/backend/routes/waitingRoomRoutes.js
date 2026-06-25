const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const waitingRoomController = require("../controllers/waitingRoomController");

router.get("/current", verifyToken, authorize("Admin", "Receptionist", "Doctor"), waitingRoomController.getCurrentServing);
router.get("/overview", verifyToken, authorize("Admin", "Receptionist", "Doctor"), waitingRoomController.getQueueOverview);
router.get("/lookup/:tokenNumber", verifyToken, authorize("Admin", "Receptionist", "Doctor"), waitingRoomController.lookupToken);
router.get("/settings", verifyToken, authorize("Admin", "Receptionist"), waitingRoomController.getSettings);

module.exports = router;
