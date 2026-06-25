const db = require("../config/db");

exports.getSummary = (req, res) => {
  const query = `
    SELECT
      (SELECT tokenNumber FROM opd_queue WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE() LIMIT 1) AS currentToken,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Waiting' AND DATE(generatedTime) = CURDATE()) AS patientsWaiting,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Completed' AND DATE(generatedTime) = CURDATE()) AS patientsServedToday,
      (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, generatedTime, completedAt)), 1) FROM opd_queue WHERE queueStatus IN ('Serving', 'Completed') AND completedAt IS NOT NULL AND DATE(generatedTime) = CURDATE()) AS avgWaitingTime,
      (SELECT COUNT(*) FROM opd_queue WHERE priority = 'Emergency' AND DATE(generatedTime) = CURDATE()) AS emergencyTotal,
      (SELECT COUNT(*) FROM opd_queue WHERE priority = 'Emergency' AND queueStatus = 'Waiting' AND DATE(generatedTime) = CURDATE()) AS emergencyWaiting
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching OPD summary", error: err.message });
    }
    res.status(200).json({ success: true, summary: result[0] });
  });
};

exports.getHourlyTrend = (req, res) => {
  const query = `
    SELECT
      HOUR(generatedTime) AS hour,
      COUNT(*) AS total
    FROM opd_queue
    WHERE DATE(generatedTime) = CURDATE()
    GROUP BY HOUR(generatedTime)
    ORDER BY hour
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching hourly trend", error: err.message });
    }
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const found = result.find(r => r.hour === h);
      hours.push({ hour: `${String(h).padStart(2, '0')}:00`, count: found ? found.total : 0 });
    }
    res.status(200).json({ success: true, hourlyData: hours });
  });
};

exports.getDoctorLoad = (req, res) => {
  const query = `
    SELECT
      d.doctorId,
      d.doctorName,
      COALESCE(SUM(CASE WHEN q.queueStatus = 'Waiting' THEN 1 ELSE 0 END), 0) AS waiting,
      COALESCE(SUM(CASE WHEN q.queueStatus = 'Serving' THEN 1 ELSE 0 END), 0) AS serving,
      COALESCE(SUM(CASE WHEN q.queueStatus = 'Completed' THEN 1 ELSE 0 END), 0) AS completed
    FROM doctor d
    LEFT JOIN opd_queue q ON d.doctorId = q.doctorId AND DATE(q.generatedTime) = CURDATE()
    GROUP BY d.doctorId, d.doctorName
    ORDER BY (waiting + serving + completed) DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching doctor load", error: err.message });
    }
    res.status(200).json({ success: true, doctorLoad: result });
  });
};

exports.getRecentActivity = (req, res) => {
  const query = `
    SELECT
      q.queueId,
      q.tokenNumber,
      q.queueStatus,
      q.generatedTime,
      q.completedAt,
      p.name AS patientName
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    WHERE DATE(q.generatedTime) = CURDATE()
    ORDER BY GREATEST(q.generatedTime, COALESCE(q.completedAt, q.generatedTime)) DESC
    LIMIT 10
  `;
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching recent activity", error: err.message });
    }
    const activity = result.map(row => {
      const time = row.queueStatus === "Completed" && row.completedAt
        ? row.completedAt
        : row.generatedTime;
      const action = row.queueStatus === "Waiting"
        ? "Token Generated"
        : row.queueStatus === "Serving"
        ? "Patient Called"
        : "Consultation Completed";
      return {
        time,
        patientName: row.patientName || "Unknown",
        tokenNumber: row.tokenNumber,
        action,
        status: row.queueStatus,
      };
    });
    res.status(200).json({ success: true, activity });
  });
};

exports.getStatusDistribution = (req, res) => {
  const query = `
    SELECT
      queueStatus AS status,
      COUNT(*) AS count
    FROM opd_queue
    WHERE DATE(generatedTime) = CURDATE()
    GROUP BY queueStatus
    ORDER BY FIELD(queueStatus, 'Waiting', 'Serving', 'Completed')
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching status distribution", error: err.message });
    }
    res.status(200).json({ success: true, distribution: result });
  });
};
