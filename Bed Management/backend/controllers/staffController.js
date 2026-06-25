const db = require("../config/db");

// POST - Add Staff
exports.addStaff = (req, res) => {
  const { staffName, role, phoneNumber, shiftTiming } = req.body;
  const adminId = req.admin?.adminId || req.body.adminId;

  const query = `
    INSERT INTO staff (staffName, role, phoneNumber, shiftTiming, adminId)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [staffName, role, phoneNumber, shiftTiming, adminId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error adding staff",
          error: err.message,
        });
      }

      res.status(201).json({
        message: "Staff added successfully",
        staffId: result.insertId,
      });
    }
  );
};

// GET - View All Staff
exports.getAllStaff = (req, res) => {
  const query = `
    SELECT s.staffId, s.staffName, s.role, s.phoneNumber, s.shiftTiming,
           a.adminName
    FROM staff s
    LEFT JOIN hospital_admin a ON s.adminId = a.adminId
    ORDER BY s.staffId DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching staff",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Staff fetched successfully",
      staff: result,
    });
  });
};

// GET - Get Staff by ID
exports.getStaffById = (req, res) => {
  const staffId = req.params.id;

  const query = `
    SELECT * FROM staff
    WHERE staffId = ?
  `;

  db.query(query, [staffId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching staff",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    res.status(200).json({
      message: "Staff fetched successfully",
      staff: result[0],
    });
  });
};

// PUT - Update Staff
exports.updateStaff = (req, res) => {
  const staffId = req.params.id;
  const { staffName, role, phoneNumber, shiftTiming } = req.body;

  const query = `
    UPDATE staff
    SET staffName = ?, role = ?, phoneNumber = ?, shiftTiming = ?
    WHERE staffId = ?
  `;

  db.query(
    query,
    [staffName, role, phoneNumber, shiftTiming, staffId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error updating staff",
          error: err.message,
        });
      }

      res.status(200).json({
        message: "Staff updated successfully",
      });
    }
  );
};

// DELETE - Delete Staff
exports.deleteStaff = (req, res) => {
  const staffId = req.params.id;

  const query = `DELETE FROM staff WHERE staffId = ?`;

  db.query(query, [staffId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error deleting staff",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Staff deleted successfully",
    });
  });
};