const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// POST - Add Doctor (Admin only)
router.post("/add", verifyToken, authorize("Admin"), doctorController.addDoctor);

// GET - Get All Doctors (Admin, Doctor, Receptionist)
router.get("/all", verifyToken, authorize("Admin", "Doctor", "Receptionist"), doctorController.getAllDoctors);

// GET - Get Doctor by ID (Admin, Doctor)
router.get("/:id", verifyToken, authorize("Admin", "Doctor"), doctorController.getDoctorById);

// GET - Get Doctors by Department (Admin, Doctor)
router.get("/department/:deptId", verifyToken, authorize("Admin", "Doctor"), doctorController.getDoctorsByDepartment);

// PUT - Update Doctor (Admin only)
router.put("/update/:id", verifyToken, authorize("Admin"), doctorController.updateDoctor);

// DELETE - Delete Doctor (Admin only)
router.delete("/delete/:id", verifyToken, authorize("Admin"), doctorController.deleteDoctor);

module.exports = router;