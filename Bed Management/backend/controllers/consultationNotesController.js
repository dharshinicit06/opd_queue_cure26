const db = require("../config/db");

exports.createNote = (req, res) => {
  const { patientId, appointmentId, notes } = req.body;
  const doctorId = req.user.userId || req.user.doctorId;

  if (!patientId) {
    return res.status(400).json({ message: "Patient ID is required." });
  }

  if (!notes || !notes.trim()) {
    return res.status(400).json({ message: "Notes content is required." });
  }

  if (req.user.role !== "Doctor") {
    return res.status(403).json({ message: "Only doctors can create consultation notes." });
  }

  const patientQuery = "SELECT patientId FROM patient WHERE patientId = ?";
  db.query(patientQuery, [patientId], (err, patientRows) => {
    if (err) {
      return res.status(500).json({ message: "Database error validating patient", error: err.message });
    }

    if (patientRows.length === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    if (appointmentId) {
      const appointmentQuery = "SELECT appointmentId FROM appointment WHERE appointmentId = ? AND doctorId = ?";
      db.query(appointmentQuery, [appointmentId, doctorId], (err, appointmentRows) => {
        if (err) {
          return res.status(500).json({ message: "Database error validating appointment", error: err.message });
        }

        if (appointmentRows.length === 0) {
          return res.status(404).json({ message: "Appointment not found or not assigned to you." });
        }

        insertNote(patientId, doctorId, appointmentId, notes.trim(), res);
      });
    } else {
      insertNote(patientId, doctorId, null, notes.trim(), res);
    }
  });
};

function insertNote(patientId, doctorId, appointmentId, notes, res) {
  const query = `
    INSERT INTO consultation_notes (patientId, doctorId, appointmentId, notes)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [patientId, doctorId, appointmentId, notes], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error creating consultation note", error: err.message });
    }

    res.status(201).json({
      message: "Consultation note created successfully",
      note: {
        noteId: result.insertId,
        patientId,
        doctorId,
        appointmentId,
        notes,
        createdAt: new Date(),
      },
    });
  });
}

exports.getNotesForPatient = (req, res) => {
  const { patientId } = req.params;

  const query = `
    SELECT cn.noteId, cn.patientId, cn.doctorId, cn.appointmentId, cn.notes, cn.createdAt, cn.updatedAt,
           d.doctorName
    FROM consultation_notes cn
    JOIN doctor d ON cn.doctorId = d.doctorId
    WHERE cn.patientId = ?
    ORDER BY cn.createdAt DESC
  `;

  db.query(query, [patientId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching consultation notes", error: err.message });
    }

    res.status(200).json({
      message: "Consultation notes fetched successfully",
      notes: result,
    });
  });
};

exports.getNotesForAppointment = (req, res) => {
  const { appointmentId } = req.params;

  const query = `
    SELECT cn.noteId, cn.patientId, cn.doctorId, cn.appointmentId, cn.notes, cn.createdAt, cn.updatedAt,
           d.doctorName
    FROM consultation_notes cn
    JOIN doctor d ON cn.doctorId = d.doctorId
    WHERE cn.appointmentId = ?
    ORDER BY cn.createdAt DESC
  `;

  db.query(query, [appointmentId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching consultation notes", error: err.message });
    }

    res.status(200).json({
      message: "Consultation notes fetched successfully",
      notes: result,
    });
  });
};

exports.getMyNotes = (req, res) => {
  const doctorId = req.user.userId || req.user.doctorId;

  const query = `
    SELECT cn.noteId, cn.patientId, cn.doctorId, cn.appointmentId, cn.notes, cn.createdAt, cn.updatedAt,
           p.name AS patientName
    FROM consultation_notes cn
    JOIN patient p ON cn.patientId = p.patientId
    WHERE cn.doctorId = ?
    ORDER BY cn.createdAt DESC
  `;

  db.query(query, [doctorId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching consultation notes", error: err.message });
    }

    res.status(200).json({
      message: "Consultation notes fetched successfully",
      notes: result,
    });
  });
};

exports.updateNote = (req, res) => {
  const { noteId } = req.params;
  const { notes } = req.body;
  const doctorId = req.user.userId || req.user.doctorId;

  if (!notes || !notes.trim()) {
    return res.status(400).json({ message: "Notes content is required." });
  }

  if (req.user.role !== "Doctor") {
    return res.status(403).json({ message: "Only doctors can update consultation notes." });
  }

  const checkQuery = "SELECT noteId FROM consultation_notes WHERE noteId = ? AND doctorId = ?";
  db.query(checkQuery, [noteId, doctorId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Note not found or you don't have permission to edit it." });
    }

    const updateQuery = "UPDATE consultation_notes SET notes = ? WHERE noteId = ?";
    db.query(updateQuery, [notes.trim(), noteId], (err) => {
      if (err) {
        return res.status(500).json({ message: "Error updating consultation note", error: err.message });
      }

      res.status(200).json({ message: "Consultation note updated successfully", noteId });
    });
  });
};

exports.deleteNote = (req, res) => {
  const { noteId } = req.params;
  const doctorId = req.user.userId || req.user.doctorId;

  if (req.user.role !== "Doctor") {
    return res.status(403).json({ message: "Only doctors can delete consultation notes." });
  }

  const checkQuery = "SELECT noteId FROM consultation_notes WHERE noteId = ? AND doctorId = ?";
  db.query(checkQuery, [noteId, doctorId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Note not found or you don't have permission to delete it." });
    }

    const deleteQuery = "DELETE FROM consultation_notes WHERE noteId = ?";
    db.query(deleteQuery, [noteId], (err) => {
      if (err) {
        return res.status(500).json({ message: "Error deleting consultation note", error: err.message });
      }

      res.status(200).json({ message: "Consultation note deleted successfully" });
    });
  });
};