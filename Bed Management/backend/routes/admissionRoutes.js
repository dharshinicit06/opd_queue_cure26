const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");

const admissionController = require("../controllers/admissionController");

// POST - Admit Patient (Admin, Receptionist)
router.post("/admit", verifyToken, authorize("Admin", "Receptionist"), admissionController.admitPatient);

// PUT - Update Admission Status (Admin, Receptionist)
router.put("/status/:id", verifyToken, authorize("Admin", "Receptionist"), admissionController.updateAdmissionStatus);

// PUT - Discharge Patient (Admin, Receptionist)
router.put("/discharge/:id", verifyToken, authorize("Admin", "Receptionist"), admissionController.dischargePatient);

// GET - All Admissions (Admin, Receptionist, Doctor)
router.get("/all", verifyToken, authorize("Admin", "Receptionist", "Doctor"), admissionController.getAllAdmissions);

// GET - Active Admissions (Admin, Receptionist, Doctor)
router.get("/active", verifyToken, authorize("Admin", "Receptionist", "Doctor"), admissionController.getActiveAdmissions);

// GET - Admission Stats (Admin, Receptionist)
router.get("/stats", verifyToken, authorize("Admin", "Receptionist"), admissionController.getAdmissionStats);

module.exports = router;
