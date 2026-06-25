const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");

const departmentController = require("../controllers/departmentController");

// GET - Get All Departments (Admin, Doctor)
router.get("/all", verifyToken, authorize("Admin", "Doctor"), departmentController.getAllDepartments);

// POST - Add Department (Admin only)
router.post("/add", verifyToken, authorize("Admin"), departmentController.addDepartment);

// PUT - Update Department (Admin only)
router.put("/update/:id", verifyToken, authorize("Admin"), departmentController.updateDepartment);

// DELETE - Delete Department (Admin only)
router.delete("/delete/:id", verifyToken, authorize("Admin"), departmentController.deleteDepartment);

module.exports = router;
