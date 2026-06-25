const db = require("../config/db");
const { getIO } = require("../services/socketService");

// POST - Add Doctor
exports.addDoctor = (req, res) => {
  const { doctorName, specialization, phoneNumber, shift, deptId } =
    req.body;

  // Validation
  if (!doctorName || !doctorName.toString().trim()) {
    return res.status(400).json({
      message: "Doctor name is required.",
    });
  }

  if (!deptId) {
    return res.status(400).json({
      message: "Department is required.",
    });
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({
      message: "Phone number must be exactly 10 digits.",
    });
  }

  if (!specialization || !specialization.toString().trim()) {
    return res.status(400).json({
      message: "Specialization is required.",
    });
  }

  if (!shift || !shift.toString().trim()) {
    return res.status(400).json({
      message: "Shift is required.",
    });
  }

  const query = `
    INSERT INTO doctor (doctorName, specialization, phoneNumber, shift, deptId)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [doctorName, specialization, phoneNumber, shift, deptId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error adding doctor",
          error: err.message,
        });
      }

      res.status(201).json({
        message: "Doctor added successfully",
        doctorId: result.insertId,
      });
      getIO().emit("doctor:updated", { action: "added", doctorId: result.insertId, timestamp: Date.now() });
    }
  );
};

// GET - Fetch All Doctors
exports.getAllDoctors = (req, res) => {
  const query = `
    SELECT d.doctorId, d.doctorName, d.specialization, d.phoneNumber,
           d.shift, d.deptId,
           dp.deptName AS deptName
    FROM doctor d
    JOIN department dp ON d.deptId = dp.deptId
    ORDER BY d.doctorId DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching doctors",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Doctors fetched successfully",
      doctors: result,
    });
  });
};

// GET - Fetch Doctor by ID
exports.getDoctorById = (req, res) => {
  const doctorId = req.params.id;

  const query = `
    SELECT d.doctorId, d.doctorName, d.specialization, d.phoneNumber,
           d.shift, d.deptId,
           dp.deptName AS deptName
    FROM doctor d
    JOIN department dp ON d.deptId = dp.deptId
    WHERE d.doctorId = ?
  `;

  db.query(query, [doctorId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching doctor",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      message: "Doctor fetched successfully",
      doctor: result[0],
    });
  });
};

// GET - Fetch Doctors by Department ID
exports.getDoctorsByDepartment = (req, res) => {
  const deptId = req.params.deptId;

  const query = `
    SELECT doctorId, doctorName, specialization, phoneNumber,
           shift, deptId
    FROM doctor
    WHERE deptId = ?
    ORDER BY doctorId DESC
  `;

  db.query(query, [deptId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching doctors by department",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Doctors fetched successfully",
      doctors: result,
    });
  });
};

// PUT - Update Doctor
exports.updateDoctor = (req, res) => {
  const doctorId = req.params.id;
  const { doctorName, specialization, phoneNumber, shift, deptId } =
    req.body;

  // Validation
  if (!doctorName || !doctorName.toString().trim()) {
    return res.status(400).json({
      message: "Doctor name is required.",
    });
  }

  if (!deptId) {
    return res.status(400).json({
      message: "Department is required.",
    });
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({
      message: "Phone number must be exactly 10 digits.",
    });
  }

  if (!specialization || !specialization.toString().trim()) {
    return res.status(400).json({
      message: "Specialization is required.",
    });
  }

  if (!shift || !shift.toString().trim()) {
    return res.status(400).json({
      message: "Shift is required.",
    });
  }

  const query = `
    UPDATE doctor
    SET doctorName = ?, specialization = ?, phoneNumber = ?, 
        shift = ?, deptId = ?
    WHERE doctorId = ?
  `;

  db.query(
    query,
    [doctorName, specialization, phoneNumber, shift, deptId, doctorId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error updating doctor",
          error: err.message,
        });
      }

      res.status(200).json({
        message: "Doctor updated successfully",
      });
      getIO().emit("doctor:updated", { action: "updated", doctorId, timestamp: Date.now() });
    }
  );
};

// DELETE - Delete Doctor
exports.deleteDoctor = (req, res) => {
  const doctorId = req.params.id;

  const deleteAppointmentsQuery = "DELETE FROM appointment WHERE doctorId = ?";
  const deleteAdmissionsQuery = "DELETE FROM admission WHERE doctorId = ?";
  const deleteDoctorQuery = "DELETE FROM doctor WHERE doctorId = ?";

  db.query(deleteAppointmentsQuery, [doctorId], (err) => {
    if (err) {
      return res.status(500).json({
        message: "Error deleting related appointments for doctor",
        error: err.message,
      });
    }

    db.query(deleteAdmissionsQuery, [doctorId], (err) => {
      if (err) {
        return res.status(500).json({
          message: "Error deleting related admissions for doctor",
          error: err.message,
        });
      }

      db.query(deleteDoctorQuery, [doctorId], (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error deleting doctor",
            error: err.message,
          });
        }

        res.status(200).json({
          message: "Doctor deleted successfully",
        });
        getIO().emit("doctor:updated", { action: "deleted", doctorId, timestamp: Date.now() });
      });
    });
  });
};