const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const appointmentController = require("../controllers/appointmentController");

// POST - Book Appointment (Admin, Receptionist)
router.post("/book", verifyToken, authorize("Admin", "Receptionist"), appointmentController.bookAppointment);

// GET - Get All Appointments (Admin, Receptionist, Doctor)
router.get("/all", verifyToken, authorize("Admin", "Receptionist", "Doctor"), appointmentController.getAllAppointments);

// PUT - Cancel Appointment (Admin, Receptionist)
router.put("/cancel/:id", verifyToken, authorize("Admin", "Receptionist"), appointmentController.cancelAppointment);

// PUT - Complete Appointment (Admin, Receptionist, Doctor)
router.put("/complete/:id", verifyToken, authorize("Admin", "Receptionist", "Doctor"), appointmentController.completeAppointment);

module.exports = router;