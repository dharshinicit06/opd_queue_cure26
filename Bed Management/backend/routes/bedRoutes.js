const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");

const bedController = require("../controllers/bedController");

// GET - All Beds (Admin, Doctor)
router.get("/all", verifyToken, authorize("Admin", "Doctor"), bedController.getAllBeds);

// GET - All Wards (Admin, Doctor)
router.get("/wards", verifyToken, authorize("Admin", "Doctor"), bedController.getAllWards);

// GET - Available Beds by Type (Admin, Doctor)
router.get("/available/:type", verifyToken, authorize("Admin", "Doctor"), bedController.getAvailableBedsByType);

// POST - Add Bed (Admin only)
router.post("/add", verifyToken, authorize("Admin"), bedController.addBed);

// PUT - Update Bed (Admin only)
router.put("/update/:id", verifyToken, authorize("Admin"), bedController.updateBed);

// DELETE - Delete Bed (Admin only)
router.delete("/delete/:id", verifyToken, authorize("Admin"), bedController.deleteBed);

module.exports = router;
