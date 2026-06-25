const express = require("express");
const router = express.Router();
const consultationNotesController = require("../controllers/consultationNotesController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

router.post("/notes", verifyToken, authorize("Doctor"), consultationNotesController.createNote);

router.get("/notes/my-notes", verifyToken, authorize("Doctor"), consultationNotesController.getMyNotes);

router.get("/notes/patient/:patientId", verifyToken, authorize("Admin", "Receptionist", "Doctor"), consultationNotesController.getNotesForPatient);

router.get("/notes/appointment/:appointmentId", verifyToken, authorize("Admin", "Receptionist", "Doctor"), consultationNotesController.getNotesForAppointment);

router.put("/notes/:noteId", verifyToken, authorize("Doctor"), consultationNotesController.updateNote);

router.delete("/notes/:noteId", verifyToken, authorize("Doctor"), consultationNotesController.deleteNote);

module.exports = router;