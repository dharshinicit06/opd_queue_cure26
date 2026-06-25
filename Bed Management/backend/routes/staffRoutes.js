const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// POST - Add Staff (Admin only)
router.post("/add", verifyToken, authorize("Admin"), staffController.addStaff);

// GET - All Staff (Admin only)
router.get("/all", verifyToken, authorize("Admin"), staffController.getAllStaff);

// GET - Staff by ID (Admin only)
router.get("/:id", verifyToken, authorize("Admin"), staffController.getStaffById);

// PUT - Update Staff (Admin only)
router.put("/update/:id", verifyToken, authorize("Admin"), staffController.updateStaff);

// DELETE - Delete Staff (Admin only)
router.delete("/delete/:id", verifyToken, authorize("Admin"), staffController.deleteStaff);

module.exports = router;
