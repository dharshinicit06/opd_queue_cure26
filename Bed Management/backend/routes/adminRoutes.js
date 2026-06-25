const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

// Admin Register
router.post("/register", adminController.adminRegister);

// Admin Login
router.post("/login", adminController.adminLogin);

module.exports = router;