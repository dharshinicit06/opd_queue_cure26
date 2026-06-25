const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const { getNotificationLogs } = require("../controllers/notificationController");

router.get("/logs", verifyToken, authorize("Admin"), getNotificationLogs);

module.exports = router;
