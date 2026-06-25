const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");

const dashboardController = require("../controllers/dashboardController");

router.get("/stats", verifyToken, authorize("Admin", "Doctor"), dashboardController.getDashboardStats);

module.exports = router;