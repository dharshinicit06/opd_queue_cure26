const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const { fullName, username, email, password, role } = req.body;

  if (!fullName || !username || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 64) {
    return res.status(400).json({ message: "Invalid password hash" });
  }

  const validRoles = ["Admin", "Receptionist", "Doctor"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters" });
  }

  try {
    const checkQuery = "SELECT userId FROM users WHERE username = ? OR email = ?";
    db.query(checkQuery, [username, email], async (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      if (rows.length > 0) {
        return res.status(409).json({ message: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = "INSERT INTO users (fullName, username, email, password, role) VALUES (?, ?, ?, ?, ?)";
      db.query(insertQuery, [fullName, username, email, hashedPassword, role], (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Error creating user", error: err.message });
        }
        res.status(201).json({
          message: "User registered successfully",
          user: { userId: result.insertId, fullName, username, email, role },
        });
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const query = "SELECT userId, fullName, username, email, password, role, isActive FROM users WHERE username = ? OR email = ?";
  db.query(query, [username, username], async (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact administrator." });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.userId, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          userId: user.userId,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (compareErr) {
      res.status(500).json({ message: "Authentication error", error: compareErr.message });
    }
  });
};

exports.getMe = (req, res) => {
  const query = "SELECT userId, fullName, username, email, role, isActive, createdAt FROM users WHERE userId = ?";
  db.query(query, [req.user.userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: rows[0] });
  });
};
