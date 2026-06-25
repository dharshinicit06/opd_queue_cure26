const db = require("../config/db");

exports.getCurrentServing = (req, res) => {
  const query = `
    SELECT q.queueId, q.tokenNumber, q.queueStatus AS status, q.priority,
           DATE_FORMAT(q.generatedTime, '%Y-%m-%d %H:%i') AS createdAt,
           p.name AS patientName,
           d.doctorName
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    LEFT JOIN doctor d ON q.doctorId = d.doctorId
    WHERE q.queueStatus = 'Serving' AND DATE(q.generatedTime) = CURDATE()
    LIMIT 1
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    res.status(200).json({
      success: true,
      current: result.length > 0 ? result[0] : null,
    });
  });
};

exports.getQueueOverview = (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Waiting' AND DATE(generatedTime) = CURDATE()) AS waitingCount,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE()) AS servingCount,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Completed' AND DATE(generatedTime) = CURDATE()) AS completedCount,
      (SELECT tokenNumber FROM opd_queue WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE() LIMIT 1) AS currentToken,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Waiting' AND priority = 'Emergency' AND DATE(generatedTime) = CURDATE()) AS emergencyCount
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    res.status(200).json({ success: true, overview: result[0] });
  });
};

exports.lookupToken = (req, res) => {
  const rawToken = req.params.tokenNumber.trim();

  if (!rawToken) {
    return res.status(400).json({ success: false, message: "Valid token number is required" });
  }

  const findTokenQuery = `
    SELECT q.queueId, q.tokenNumber, q.queueStatus AS status, q.priority,
           DATE_FORMAT(q.generatedTime, '%Y-%m-%d %H:%i') AS createdAt,
           TIMESTAMPDIFF(MINUTE, q.generatedTime, NOW()) AS waitingMinutes,
           p.name AS patientName,
           d.doctorName
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    LEFT JOIN doctor d ON q.doctorId = d.doctorId
    WHERE q.tokenNumber = ? AND DATE(q.generatedTime) = CURDATE()
    LIMIT 1
  `;

  db.query(findTokenQuery, [rawToken], (err, tokenResult) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    if (tokenResult.length === 0) {
      return res.status(404).json({ success: false, message: "Token not found for today" });
    }

    const token = tokenResult[0];

    const currentQuery = `
      SELECT tokenNumber FROM opd_queue
      WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE()
      LIMIT 1
    `;

    db.query(currentQuery, (err, currentResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err.message });
      }

      const currentToken = currentResult.length > 0 ? currentResult[0].tokenNumber : null;

      const settingsQuery = "SELECT settingValue FROM queue_settings WHERE settingKey = 'avgConsultationTime'";
      db.query(settingsQuery, (err, settingsResult) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        const avgConsultationTime = settingsResult.length > 0 ? parseInt(settingsResult[0].settingValue, 10) : 10;

        let tokensAhead = 0;
        let estimatedWait = 0;
        let message = "";

        if (token.status === "Completed") {
          message = "Consultation completed.";
        } else if (token.status === "Skipped") {
          message = "Please contact reception.";
        } else if (token.status === "Serving") {
          message = "Please proceed to the consultation room.";
        } else if (token.status === "Waiting") {
          if (currentToken === null) {
            const waitingCountQuery = `
              SELECT COUNT(*) AS cnt FROM opd_queue
              WHERE queueStatus = 'Waiting' AND DATE(generatedTime) = CURDATE()
            `;
            db.query(waitingCountQuery, (err, countResult) => {
              if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
              }
              const waitingCount = countResult[0].cnt;
              if (waitingCount === 0) {
                message = "Please wait. Your turn is approaching.";
              } else {
                tokensAhead = 0;
                message = "Please wait. Your turn is approaching.";
              }
              return res.status(200).json({
                success: true,
                token: {
                  ...token,
                  currentToken,
                  tokensAhead,
                  estimatedWait,
                  avgConsultationTime,
                  message,
                },
              });
            });
            return;
          }

          const currentNum = parseInt(currentToken.toString().replace('E', ''), 10);
          const tokenNum = parseInt(rawToken.toString().replace('E', ''), 10);
          if (!isNaN(currentNum) && !isNaN(tokenNum)) {
            tokensAhead = tokenNum - currentNum;
          } else {
            tokensAhead = 0;
          }

          if (tokensAhead < 0) {
            tokensAhead = 0;
            message = "Please wait. Your turn is approaching.";
          } else if (tokensAhead === 0) {
            message = "Please wait. Your turn is approaching.";
          } else {
            estimatedWait = tokensAhead * avgConsultationTime;
          }
        }

        res.status(200).json({
          success: true,
          token: {
            ...token,
            currentToken,
            tokensAhead,
            estimatedWait,
            avgConsultationTime,
            message,
          },
        });
      });
    });
  });
};

exports.getSettings = (req, res) => {
  const query = "SELECT settingValue FROM queue_settings WHERE settingKey = 'avgConsultationTime'";
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.status(200).json({
      avgConsultationTime: result.length > 0 ? parseInt(result[0].settingValue, 10) : 10,
    });
  });
};
