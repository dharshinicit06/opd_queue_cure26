const db = require("../config/db");

// GET - Dashboard Stats (Upgraded)
exports.getDashboardStats = (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM patient) AS totalPatients,
      (SELECT COUNT(*) FROM doctor) AS totalDoctors,
      (SELECT COUNT(*) FROM department) AS totalDepartments,
      (SELECT COUNT(*) FROM appointment) AS totalAppointments,

      (SELECT COUNT(*) FROM patient WHERE registrationDate = CURDATE()) AS patientsToday,
      (SELECT COUNT(*) FROM appointment WHERE appointmentDate = CURDATE()) AS appointmentsToday,

      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus='Waiting') AS waitingTokens,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus='Serving') AS inProgressTokens,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus='Completed') AS doneTokens,

      (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus)='available') AS availableBeds,
      (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus)='occupied') AS occupiedBeds,
      (SELECT COUNT(*) FROM bed) AS totalBeds,

      (SELECT COUNT(*) FROM staff) AS totalStaff,

      (SELECT COUNT(*) FROM appointment WHERE LOWER(reason) LIKE '%emerg%') AS emergencyCases,

      (SELECT COUNT(*) FROM bed b LEFT JOIN ward w ON b.wardId = w.wardId WHERE LOWER(b.bedStatus)='available' AND (LOWER(b.bedType)='icu' OR LOWER(w.wardType)='icu')) AS availableICU,
      (SELECT COUNT(*) FROM bed b LEFT JOIN ward w ON b.wardId = w.wardId WHERE LOWER(b.bedStatus)='available' AND (LOWER(b.bedType)='general' OR LOWER(w.wardType)='general')) AS availableGeneral,
      (SELECT COUNT(*) FROM bed b LEFT JOIN ward w ON b.wardId = w.wardId WHERE LOWER(b.bedStatus)='available' AND (LOWER(b.bedType)='emergency' OR LOWER(w.wardType)='emergency')) AS availableEmergency,

      (SELECT COUNT(*) FROM admission WHERE admissionStatus IN ('Admitted','Under Treatment')) AS admittedPatients,
      (SELECT COUNT(*) FROM admission WHERE admissionStatus='Discharged') AS dischargedPatients,

      ROUND(
        (SELECT COUNT(*) FROM bed WHERE LOWER(bedStatus)='occupied') * 100.0 /
        NULLIF((SELECT COUNT(*) FROM bed), 0), 1
      ) AS occupancyRate
  `;

  const occupiedBedsQuery = `
    SELECT bedId, bedType, roomNo, wardId
    FROM bed
    WHERE bedStatus = 'Occupied'
    ORDER BY bedId DESC
  `;

  db.query(statsQuery, (err, statsResult) => {
    if (err) {
      return res.status(500).json({
        message: "Error fetching dashboard stats",
        error: err.message,
      });
    }

    db.query(occupiedBedsQuery, (err, occupiedBedsResult) => {
      if (err) {
        return res.status(500).json({
          message: "Error fetching occupied beds",
          error: err.message,
        });
      }

      res.status(200).json({
        message: "Dashboard stats fetched successfully",
        stats: statsResult[0],
        occupiedBeds: occupiedBedsResult,
      });
    });
  });
};