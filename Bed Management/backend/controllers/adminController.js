const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// POST - Admin Register
exports.adminRegister = async (req, res) => {
  const { adminName, username, password } = req.body;

  if (!adminName || !username || !password) {
    return res.status(400).json({
      message: "All fields are required (adminName, username, password)",
    });
  }

  // Check if username exists
  const checkQuery = "SELECT * FROM hospital_admin WHERE username = ?";

  db.query(checkQuery, [username], async (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error checking username",
        error: err.message,
      });
    }

    if (result.length > 0) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    // Hash password

const shaPassword = crypto
  .createHash("sha256")
  .update(password)
  .digest("hex");

const hashedPassword = await bcrypt.hash(
  shaPassword,
  10
);

    const insertQuery =
      "INSERT INTO hospital_admin (adminName, username, password) VALUES (?, ?, ?)";

    db.query(
      insertQuery,
      [adminName, username, hashedPassword],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            message: "Error registering admin",
            error: err.message,
          });
        }

        res.status(201).json({
          message: "Admin registered successfully",
          admin: {
            adminId: result.insertId,
            adminName,
            username,
          },
        });
      }
    );
  });
};

// POST - Admin Login (JWT)
exports.adminLogin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  const query = "SELECT * FROM hospital_admin WHERE username = ?";

  db.query(query, [username], async (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Login error",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const admin = result[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        adminId: admin.adminId,
        username: admin.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Admin login successful",
      token: token,
      admin: {
        adminId: admin.adminId,
        adminName: admin.adminName,
        username: admin.username,
      },
    });
  });
};
