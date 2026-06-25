const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/receptionistController");

// Public route for patient tracking
router.get("/track/:trackingCode", receptionistController.getPatientTrackingByCode);

module.exports = router;
