const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/authMiddleware");
const receptionistController = require("../controllers/receptionistController");

router.post("/patient-token", verifyToken, authorize("Admin", "Receptionist"), receptionistController.addPatientAndToken);
router.get("/queue", verifyToken, authorize("Admin", "Receptionist"), receptionistController.getQueue);
router.put("/call-next", verifyToken, authorize("Admin", "Receptionist"), receptionistController.callNextPatient);
router.put("/complete/:id", verifyToken, authorize("Admin", "Receptionist"), receptionistController.completeToken);
router.get("/current", verifyToken, authorize("Admin", "Receptionist"), receptionistController.getCurrentPatient);
router.get("/stats", verifyToken, authorize("Admin", "Receptionist"), receptionistController.getQueueStats);
router.get("/settings", verifyToken, authorize("Admin", "Receptionist"), receptionistController.getConsultationTime);
router.put("/settings", verifyToken, authorize("Admin", "Receptionist"), receptionistController.updateConsultationTime);

module.exports = router;
