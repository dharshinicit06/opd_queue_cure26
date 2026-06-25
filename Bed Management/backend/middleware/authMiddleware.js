const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({
      success: false,
      message: "Token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({
      success: false,
      message: "Invalid token format",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.user = decoded;
    next();
  });
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: No role found in token",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Insufficient permissions",
      });
    }

    next();
  };
};

exports.verifyPatientTracking = (req, res, next) => {
  const { trackingCode } = req.params;

  if (!trackingCode) {
    return res.status(400).json({
      success: false,
      message: "Tracking code is required",
    });
  }

  const query = "SELECT queueId, tokenNumber, patientId, doctorId, priority, queueStatus, generatedTime, completedAt FROM opd_queue WHERE trackingCode = ? AND queueStatus IN ('Waiting', 'Serving')";
  db.query(query, [trackingCode], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid tracking code or token has been completed",
      });
    }

    req.queueData = results[0];
    next();
  });
};
