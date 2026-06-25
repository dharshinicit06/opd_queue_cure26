const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const patientController = require("../controllers/patientController");

// POST - Register Patient (Admin, Receptionist)
router.post("/register", verifyToken, authorize("Admin", "Receptionist"), patientController.registerPatient);

// POST - Find or Create Patient (Admin, Receptionist)
router.post("/find-or-create", verifyToken, authorize("Admin", "Receptionist"), patientController.findOrCreatePatient);

// GET - Get All Patients (Admin, Receptionist, Doctor - view only)
router.get("/all", verifyToken, authorize("Admin", "Receptionist", "Doctor"), patientController.getAllPatients);

// GET - Get Patient By ID (Admin, Receptionist, Doctor - view only)
router.get("/:id", verifyToken, authorize("Admin", "Receptionist", "Doctor"), patientController.getPatientById);

// PUT - Update Patient (Admin, Receptionist)
router.put("/update/:id", verifyToken, authorize("Admin", "Receptionist"), patientController.updatePatient);

// DELETE - Delete Patient (Admin only)
router.delete("/delete/:id", verifyToken, authorize("Admin"), patientController.deletePatient);

module.exports = router;