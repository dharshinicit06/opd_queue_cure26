const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const {
  getSummary,
  getHourlyTrend,
  getDoctorLoad,
  getStatusDistribution,
  getRecentActivity,
} = require("../controllers/opdAnalyticsController");

router.get("/summary", verifyToken, authorize("Admin", "Doctor"), getSummary);
router.get("/hourly-trend", verifyToken, authorize("Admin", "Doctor"), getHourlyTrend);
router.get("/doctor-load", verifyToken, authorize("Admin", "Doctor"), getDoctorLoad);
router.get("/status-distribution", verifyToken, authorize("Admin", "Doctor"), getStatusDistribution);
router.get("/recent-activity", verifyToken, authorize("Admin", "Doctor"), getRecentActivity);

module.exports = router;
