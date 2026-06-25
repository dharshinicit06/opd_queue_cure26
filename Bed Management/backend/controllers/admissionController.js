const db = require("../config/db");
const { getIO } = require("../services/socketService");

const emitAdmissionEvent = (action, data = {}) => {
  try {
    getIO().emit("admissionUpdated", { action, ...data, timestamp: Date.now() });
  } catch (e) {}
};

// POST - Admit Patient (assign bed + doctor + department)
exports.admitPatient = (req, res) => {
  const { patientId, doctorId, departmentId, bedType, admissionDate, reason } = req.body;

  if (!patientId || !doctorId || !departmentId || !bedType) {
    return res.status(400).json({ message: "Patient, doctor, department, and bed type are required." });
  }

  const targetDate = admissionDate || new Date();
  const admissionReason = reason ? String(reason).trim() : "General admission";

  // Find available bed of requested type
  const findBedQuery = `
    SELECT b.bedId, b.roomNo, b.bedType, w.wardName
    FROM bed b
    LEFT JOIN ward w ON b.wardId = w.wardId
    WHERE LOWER(b.bedStatus) = 'available'
      AND (LOWER(b.bedType) = LOWER(?) OR LOWER(w.wardType) = LOWER(?))
    LIMIT 1
  `;

  db.query(findBedQuery, [bedType, bedType], (err, availableBed) => {
    if (err) return res.status(500).json({ message: "Error finding available bed", error: err.message });
    if (!availableBed.length) return res.status(404).json({ message: `No available ${bedType} bed found.` });

    const bedId = availableBed[0].bedId;
    const roomNo = availableBed[0].roomNo;

    const insertQuery = `
      INSERT INTO admission (patientId, doctorId, departmentId, bedId, admissionDate, admissionStatus, reason)
      VALUES (?, ?, ?, ?, ?, 'Admitted', ?)
    `;

    db.query(insertQuery, [patientId, doctorId, departmentId, bedId, targetDate, admissionReason], (insertErr, result) => {
      if (insertErr) return res.status(500).json({ message: "Error creating admission", error: insertErr.message });

      const updateBedQuery = "UPDATE bed SET bedStatus = 'Occupied' WHERE bedId = ?";
      db.query(updateBedQuery, [bedId], (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Admission created but bed status update failed", error: updateErr.message });

        emitAdmissionEvent("admitted", {
          admissionId: result.insertId,
          patientId,
          doctorId,
          departmentId,
          bedId,
          roomNo,
          status: "Admitted",
        });

        res.status(201).json({
          message: "Patient admitted successfully",
          admissionId: result.insertId,
          bedId,
          roomNo,
        });
      });
    });
  });
};

// PUT - Update admission status (Under Treatment / Discharged)
exports.updateAdmissionStatus = (req, res) => {
  const admissionId = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status is required." });
  if (!["Under Treatment", "Discharged"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'Under Treatment' or 'Discharged'." });
  }

  if (status === "Discharged") {
    return exports.dischargePatient(req, res);
  }

  db.query("UPDATE admission SET admissionStatus = ? WHERE admissionId = ?", [status, admissionId], (err, result) => {
    if (err) return res.status(500).json({ message: "Error updating admission status", error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Admission not found." });

    emitAdmissionEvent("statusUpdated", { admissionId, status });
    res.status(200).json({ message: `Admission status updated to ${status}`, admissionId, status });
  });
};

// PUT - Discharge Patient
exports.dischargePatient = (req, res) => {
  const admissionId = req.params.id;

  const findQuery = "SELECT bedId, patientId FROM admission WHERE admissionId = ? AND admissionStatus IN ('Admitted', 'Under Treatment')";
  db.query(findQuery, [admissionId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error finding admission", error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Admission not found or already discharged." });

    const bedId = rows[0].bedId;
    const patientId = rows[0].patientId;

    db.query("UPDATE admission SET admissionStatus = 'Discharged', dischargeDate = NOW() WHERE admissionId = ?", [admissionId], (dischargeErr) => {
      if (dischargeErr) return res.status(500).json({ message: "Error discharging patient", error: dischargeErr.message });

      db.query("UPDATE bed SET bedStatus = 'Available' WHERE bedId = ?", [bedId], (bedErr) => {
        if (bedErr) return res.status(500).json({ message: "Discharged but bed not freed.", error: bedErr.message });

        emitAdmissionEvent("discharged", { admissionId, patientId, bedId });

        res.status(200).json({ message: "Patient discharged successfully", admissionId });
      });
    });
  });
};

// GET - All Admissions (with patient, doctor, department, bed details)
exports.getAllAdmissions = (req, res) => {
  const query = `
    SELECT a.admissionId, a.admissionDate, a.dischargeDate, a.admissionStatus, a.reason,
           p.patientId, p.name AS patientName, p.phoneNumber,
           d.doctorId, d.doctorName,
           dep.deptId AS departmentId, dep.deptName AS departmentName,
           b.bedId, b.bedType, b.roomNo, w.wardName
    FROM admission a
    JOIN patient p ON a.patientId = p.patientId
    JOIN doctor d ON a.doctorId = d.doctorId
    LEFT JOIN department dep ON a.departmentId = dep.deptId
    JOIN bed b ON a.bedId = b.bedId
    LEFT JOIN ward w ON b.wardId = w.wardId
    ORDER BY a.admissionId DESC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching admissions", error: err.message });
    res.status(200).json({ message: "Admissions fetched", admissions: result });
  });
};

// GET - Active Admissions (Admitted + Under Treatment)
exports.getActiveAdmissions = (req, res) => {
  const query = `
    SELECT a.admissionId, a.admissionDate, a.admissionStatus, a.reason,
           p.patientId, p.name AS patientName, p.phoneNumber,
           d.doctorId, d.doctorName,
           dep.deptId AS departmentId, dep.deptName AS departmentName,
           b.bedId, b.bedType, b.roomNo, w.wardName
    FROM admission a
    JOIN patient p ON a.patientId = p.patientId
    JOIN doctor d ON a.doctorId = d.doctorId
    LEFT JOIN department dep ON a.departmentId = dep.deptId
    JOIN bed b ON a.bedId = b.bedId
    LEFT JOIN ward w ON b.wardId = w.wardId
    WHERE a.admissionStatus IN ('Admitted', 'Under Treatment')
    ORDER BY a.admissionId DESC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching active admissions", error: err.message });
    res.status(200).json({ message: "Active admissions fetched", admissions: result });
  });
};

// GET - Admission Occupancy Stats
exports.getAdmissionStats = (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM admission WHERE admissionStatus IN ('Admitted', 'Under Treatment')) AS activeAdmissions,
      (SELECT COUNT(*) FROM admission WHERE admissionStatus = 'Discharged' AND DATE(dischargeDate) = CURDATE()) AS dischargedToday,
      (SELECT COUNT(*) FROM admission) AS totalAdmissions,
      (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus) = 'available') AS availableBeds,
      (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus) = 'occupied') AS occupiedBeds,
      (SELECT COUNT(*) FROM bed) AS totalBeds,
      (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus) = 'maintenance') AS maintenanceBeds,
      (SELECT COUNT(*) FROM admission GROUP BY departmentId ORDER BY COUNT(*) DESC LIMIT 1) AS busiestDeptAdmissions,
      ROUND(
        (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus) = 'occupied') * 100.0 /
        NULLIF((SELECT COUNT(*) FROM bed), 0), 1
      ) AS occupancyRate
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching admission stats", error: err.message });
    res.status(200).json({ message: "Stats fetched", stats: result[0] });
  });
};
