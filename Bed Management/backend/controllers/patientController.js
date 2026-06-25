const db = require("../config/db");

// ─── Shared Helper (used by this controller AND receptionistController) ───
// Single source of truth for patient creation.
// Finds patient by phoneNumber or creates a new record.
// callback(err, patientId, isNew)
function findOrCreatePatientByPhone(phoneNumber, name, age, gender, symptoms, callback) {
  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return callback(new Error("Phone number must be exactly 10 digits."));
  }

  const findQuery = "SELECT patientId FROM patient WHERE phoneNumber = ?";
  db.query(findQuery, [phoneNumber], (err, rows) => {
    if (err) return callback(err);

    if (rows.length > 0) {
      return callback(null, rows[0].patientId, false);
    }

    const insertQuery = "INSERT INTO patient (name, age, phoneNumber, gender, symptoms) VALUES (?, ?, ?, ?, ?)";
    db.query(insertQuery, [name || null, age || null, phoneNumber, gender || null, symptoms || null], (err, result) => {
      if (err) return callback(err);
      callback(null, result.insertId, true);
    });
  });
}

// Expose helper for other controllers
exports.findOrCreatePatientByPhone = findOrCreatePatientByPhone;

// POST /api/patients/find-or-create
exports.findOrCreatePatient = (req, res) => {
  const { name, age, phoneNumber, gender, symptoms } = req.body;

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
  }

  const findQuery = "SELECT patientId, name, age, phoneNumber FROM patient WHERE phoneNumber = ?";
  db.query(findQuery, [phoneNumber], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (rows.length > 0) {
      return res.status(200).json({
        message: "Existing patient found",
        patientId: rows[0].patientId,
        isNew: false,
        patient: rows[0],
      });
    }

    const insertQuery = "INSERT INTO patient (name, age, phoneNumber, gender, symptoms, registrationDate) VALUES (?, ?, ?, ?, ?, NOW())";
    db.query(insertQuery, [name || null, age || null, phoneNumber, gender || null, symptoms || null], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error creating patient", error: err.message });
      }
      res.status(201).json({
        message: "Patient created successfully",
        patientId: result.insertId,
        isNew: true,
      });
    });
  });
};

// POST - Register Patient (with duplicate phone check)
exports.registerPatient = (req, res) => {
  const { name, age, gender, phoneNumber, symptoms } = req.body;

  // Validation
  if (!name || !name.toString().trim()) {
    return res.status(400).json({ message: "Patient name is required." });
  }

  if (!age || isNaN(age) || age < 0 || age > 150) {
    return res.status(400).json({ message: "Valid age is required." });
  }

  if (!gender || !gender.toString().trim()) {
    return res.status(400).json({ message: "Gender is required." });
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
  }

  // Check for existing patient with same phone number
  const checkDup = "SELECT patientId, name FROM patient WHERE phoneNumber = ?";
  db.query(checkDup, [phoneNumber], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (rows.length > 0) {
      return res.status(409).json({
        message: "A patient with this phone number already exists.",
        patientId: rows[0].patientId,
        existingPatient: rows[0],
      });
    }

    const query = "INSERT INTO patient (name, age, gender, phoneNumber, symptoms, registrationDate) VALUES (?, ?, ?, ?, ?, NOW())";

    db.query(query, [name, age, gender, phoneNumber, symptoms], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error registering patient", error: err.message });
      }

      res.status(201).json({
        message: "Patient Registered Successfully",
        patientId: result.insertId,
      });
    });
  });
};

// GET - Fetch All Patients
exports.getAllPatients = (req, res) => {
  const query = "SELECT * FROM patient ORDER BY patientId DESC";

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(200).json({
      message: "Patients fetched successfully",
      patients: result,
    });
  });
};

// GET - Fetch Patient By ID
exports.getPatientById = (req, res) => {
  const patientId = req.params.id;

  const query = "SELECT * FROM patient WHERE patientId = ?";

  db.query(query, [patientId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching patient",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    res.status(200).json({
      message: "Patient fetched successfully",
      patient: result[0],
    });
  });
};

// PUT - Update Patient
exports.updatePatient = (req, res) => {
  const patientId = req.params.id;
  const { name, age, gender, phoneNumber, symptoms } = req.body;

  // Validation
  if (!name || !name.toString().trim()) {
    return res.status(400).json({
      message: "Patient name is required.",
    });
  }

  if (!age || isNaN(age) || age < 0 || age > 150) {
    return res.status(400).json({
      message: "Valid age is required.",
    });
  }

  if (!gender || !gender.toString().trim()) {
    return res.status(400).json({
      message: "Gender is required.",
    });
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({
      message: "Phone number must be exactly 10 digits.",
    });
  }

  const query = `
    UPDATE patient
    SET name = ?, age = ?, gender = ?, phoneNumber = ?, symptoms = ?
    WHERE patientId = ?
  `;

  db.query(query, [name, age, gender, phoneNumber, symptoms, patientId], (err) => {
    if (err) {
      return res.status(500).json({
        message: "Error updating patient",
        error: err.message,
      });
    }

    res.status(200).json({
      message: "Patient updated successfully",
    });
  });
};

// DELETE - Delete Patient
exports.deletePatient = (req, res) => {
  const patientId = req.params.id;

  const deleteQueueQuery = "DELETE FROM opd_queue WHERE patientId = ?";
  const deleteAppointmentsQuery = "DELETE FROM appointment WHERE patientId = ?";
  const deleteAdmissionsQuery = "DELETE FROM admission WHERE patientId = ?";
  const deletePatientQuery = "DELETE FROM patient WHERE patientId = ?";

  db.query(deleteQueueQuery, [patientId], (err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting related queue entries", error: err.message });
    }

    db.query(deleteAppointmentsQuery, [patientId], (err) => {
      if (err) {
        return res.status(500).json({ message: "Error deleting related appointments", error: err.message });
      }

      db.query(deleteAdmissionsQuery, [patientId], (err) => {
        if (err) {
          return res.status(500).json({ message: "Error deleting related admissions", error: err.message });
        }

        db.query(deletePatientQuery, [patientId], (err) => {
          if (err) {
            return res.status(500).json({ message: "Error deleting patient", error: err.message });
          }

          res.status(200).json({ message: "Patient deleted successfully" });
        });
      });
    });
  });
};