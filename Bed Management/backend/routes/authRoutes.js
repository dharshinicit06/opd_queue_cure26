const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getMe);

module.exports = router;
