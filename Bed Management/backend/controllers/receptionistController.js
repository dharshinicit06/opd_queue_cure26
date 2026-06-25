const db = require("../config/db");
const { getIO } = require("../services/socketService");
const { notificationService } = require("../services/notificationService");
const { findOrCreatePatientByPhone } = require("./patientController");
const { generateTokenQR } = require("../services/qrService");
const crypto = require("crypto");

// ─── Socket Event Helpers ───────────────────────────────────────
const emitQueueUpdate = (action, data = {}) => {
  try {
    getIO().emit("queueUpdated", { action, ...data, timestamp: Date.now() });
  } catch (e) {
    // socket not initialized yet
  }
};

// ─── Notifications ──────────────────────────────────────────────
const sendQueueNotifications = (calledQueueId, calledToken, calledPatientId, calledPatientName) => {
  notificationService.notify({
    queueId: calledQueueId,
    patientId: calledPatientId,
    patientName: calledPatientName,
    tokenNumber: calledToken,
    type: "token_serving",
    message: `Dear ${calledPatientName}, your token #${calledToken} is now being served. Please proceed to the doctor's room.`,
  }).then(() => {
    try { getIO().emit("notificationCreated", { type: "token_serving" }); } catch {}
  });

  const approachingQuery = `
    SELECT q.queueId, q.tokenNumber, q.patientId, p.name AS patientName
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    WHERE q.queueStatus = 'Waiting' AND DATE(q.generatedTime) = CURDATE()
    ORDER BY FIELD(q.priority, 'Emergency', 'Normal'), q.generatedTime ASC
    LIMIT 1 OFFSET 1
  `;
  db.query(approachingQuery, (err, rows) => {
    if (err || rows.length === 0) return;
    const approaching = rows[0];
    notificationService.notify({
      queueId: approaching.queueId,
      patientId: approaching.patientId,
      patientName: approaching.patientName,
      tokenNumber: approaching.tokenNumber,
      type: "token_approaching",
      message: `Dear ${approaching.patientName}, your token #${approaching.tokenNumber} is approaching. Please be ready at the reception area.`,
    }).then(() => {
      try { getIO().emit("notificationCreated", { type: "token_approaching" }); } catch {}
    });
  });
};

// ─── ADD PATIENT + GENERATE TOKEN ──────────────────────────────
// Single source of truth workflow:
//   1. Search patient by phoneNumber → reuse if exists
//   2. Check for active queue entry (Waiting/Serving) today
//   3. Generate token number
//   4. Insert into opd_queue
//   5. Emit socket events
exports.addPatientAndToken = (req, res) => {
  const { patientName, age, phoneNumber, doctorId, priority, gender, symptoms } = req.body;
  const patientPriority = priority === "Emergency" ? "Emergency" : "Normal";

  // ── Validation ──
  if (!patientName || !patientName.trim()) {
    return res.status(400).json({ message: "Patient name is required" });
  }
  if (!age || isNaN(age) || age < 0 || age > 150) {
    return res.status(400).json({ message: "Valid age is required" });
  }
  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.toString().trim())) {
    return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
  }
  if (!doctorId) {
    return res.status(400).json({ message: "Doctor selection is required" });
  }

    // ── Step 1: Find or create patient via shared helper (single source of truth) ──
    findOrCreatePatientByPhone(phoneNumber, patientName.trim(), age, gender, symptoms, (err, patientId, isNew) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    // ── Step 2: Check for active queue entry (no duplicates) ──
    const checkActive = `SELECT queueId, queueStatus FROM opd_queue
      WHERE patientId = ? AND queueStatus IN ('Waiting', 'Serving')
      AND DATE(generatedTime) = CURDATE()`;
    db.query(checkActive, [patientId], (err, activeEntries) => {
      if (err) {
        return res.status(500).json({ message: "Database error checking queue", error: err.message });
      }
      if (activeEntries.length > 0) {
        return res.status(409).json({
          message: "Patient already has an active queue entry for today",
          queueId: activeEntries[0].queueId,
          queueStatus: activeEntries[0].queueStatus,
          patientId,
        });
      }

      // ── Step 3: Generate token number ──
      const tokenQuery = patientPriority === "Emergency"
        ? `SELECT CONCAT('E', LPAD(COALESCE(MAX(CAST(SUBSTRING(tokenNumber, 2) AS UNSIGNED)), 0) + 1, 3, '0')) AS nextToken
           FROM opd_queue WHERE DATE(generatedTime) = CURDATE() AND priority = 'Emergency' AND tokenNumber LIKE 'E%'`
        : `SELECT COALESCE(MAX(CAST(tokenNumber AS UNSIGNED)), 100) + 1 AS nextToken
           FROM opd_queue WHERE DATE(generatedTime) = CURDATE() AND priority = 'Normal' AND tokenNumber REGEXP '^[0-9]+$'`;

      db.query(tokenQuery, (err, tokenRows) => {
        if (err) {
          return res.status(500).json({ message: "Error generating token", error: err.message });
        }

        const nextToken = tokenRows[0]?.nextToken || (patientPriority === "Emergency" ? "E001" : "101");

        // ── Step 4: Generate unique trackingCode ──
        const trackingCode = crypto.randomBytes(16).toString('hex');

        // ── Step 5: Insert into opd_queue ──
        const insertQueue = `INSERT INTO opd_queue (patientId, doctorId, tokenNumber, priority, queueStatus, generatedTime, trackingCode)
          VALUES (?, ?, ?, ?, 'Waiting', NOW(), ?)`;

        db.query(insertQueue, [patientId, doctorId, nextToken, patientPriority, trackingCode], (err, queueResult) => {
          if (err) {
            return res.status(500).json({ message: "Error adding to queue", error: err.message });
          }

          const queueId = queueResult.insertId;

          // ── Step 6: Emit socket event ──
          emitQueueUpdate("addPatient", {
            queueId,
            tokenNumber: nextToken,
            patientId,
            priority: patientPriority,
            patientName: patientName.trim(),
          });

          // ── Step 7: Generate QR code ──
          generateTokenQR(trackingCode).then(({ qrCode, trackingUrl }) => {
            res.status(201).json({
              message: isNew
                ? "Patient registered and token generated successfully"
                : "Existing patient reused and token generated successfully",
              queueId,
              tokenNumber: nextToken,
              patientId,
              priority: patientPriority,
              isNewPatient: isNew,
              trackingCode,
              qrCode,
              trackingUrl,
            });
          });
        });
      });
    });
  });
};

exports.getQueue = (req, res) => {
  const query = `
    SELECT
      q.queueId,
      q.tokenNumber,
      q.queueStatus AS status,
      q.priority,
      DATE_FORMAT(q.generatedTime, '%Y-%m-%d %H:%i') AS createdAt,
      TIMESTAMPDIFF(MINUTE, q.generatedTime, NOW()) AS waitingMinutes,
      p.patientId,
      p.name AS patientName,
      p.age,
      p.phoneNumber,
      d.doctorId,
      d.doctorName,
      q.trackingCode
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    LEFT JOIN doctor d ON q.doctorId = d.doctorId
    WHERE q.queueStatus IN ('Waiting', 'Serving')
      AND DATE(q.generatedTime) = CURDATE()
    ORDER BY FIELD(q.priority, 'Emergency', 'Normal'), q.generatedTime ASC
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching queue", error: err.message });
    }

    res.status(200).json({
      message: "Queue fetched successfully",
      queue: result,
    });
  });
};

exports.callNextPatient = (req, res) => {
  const checkCurrentQuery = "SELECT queueId, tokenNumber, patientId FROM opd_queue WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE()";

  db.query(checkCurrentQuery, (err, currentResult) => {
    if (err) {
      return res.status(500).json({ message: "Error checking current patient", error: err.message });
    }

    const completeCurrent = () => {
      return new Promise((resolve, reject) => {
        if (currentResult.length > 0) {
          const curr = currentResult[0];
          db.query("UPDATE opd_queue SET queueStatus = 'Completed', completedAt = NOW() WHERE queueId = ?", [curr.queueId], (err) => {
            if (err) reject(err);
            else {
              // Emit event for the completed patient
              emitQueueUpdate("complete", { queueId: curr.queueId, tokenNumber: curr.tokenNumber });
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    };

    completeCurrent()
      .then(() => {
        const fairnessQuery = `
          SELECT COUNT(*) AS recentEmergency FROM (
            SELECT priority FROM opd_queue
            WHERE queueStatus IN ('Serving', 'Completed')
              AND completedAt IS NOT NULL
              AND DATE(generatedTime) = CURDATE()
            ORDER BY completedAt DESC
            LIMIT 2
          ) AS recent WHERE priority = 'Emergency'
        `;

        db.query(fairnessQuery, (err, fairResult) => {
          if (err) {
            return res.status(500).json({ message: "Error checking fairness", error: err.message });
          }

          const recentEmergency = fairResult[0]?.recentEmergency || 0;
          const hasNormalWaiting = `SELECT 1 AS found FROM opd_queue WHERE queueStatus = 'Waiting' AND priority = 'Normal' AND DATE(generatedTime) = CURDATE() LIMIT 1`;

          db.query(hasNormalWaiting, (err, normalResult) => {
            if (err) {
              return res.status(500).json({ message: "Error checking normal queue", error: err.message });
            }

            const normalExists = normalResult.length > 0;
            const serveNormal = normalExists && recentEmergency >= 2;

            const selectBase = "SELECT q.queueId, q.tokenNumber, q.patientId, q.doctorId, q.priority, p.name AS patientName FROM opd_queue q LEFT JOIN patient p ON q.patientId = p.patientId";
            const getNextQuery = serveNormal
              ? `${selectBase} WHERE q.queueStatus = 'Waiting' AND q.priority = 'Normal' AND DATE(q.generatedTime) = CURDATE() ORDER BY q.generatedTime ASC LIMIT 1`
              : `${selectBase} WHERE q.queueStatus = 'Waiting' AND DATE(q.generatedTime) = CURDATE() ORDER BY FIELD(q.priority, 'Emergency', 'Normal'), q.generatedTime ASC LIMIT 1`;

            db.query(getNextQuery, (err, nextPatient) => {
              if (err) {
                return res.status(500).json({ message: "Error fetching next patient", error: err.message });
              }

              if (!nextPatient.length) {
                return res.status(400).json({ success: false, message: "No waiting patients in queue." });
              }

              const np = nextPatient[0];
              // BUGFIX: Only set queueStatus, do NOT set completedAt (that's for Completed status only)
              db.query("UPDATE opd_queue SET queueStatus = 'Serving' WHERE queueId = ?", [np.queueId], (err) => {
                if (err) {
                  return res.status(500).json({ message: "Error updating patient status", error: err.message });
                }

                emitQueueUpdate("callNext", {
                  queueId: np.queueId,
                  tokenNumber: np.tokenNumber,
                  patientId: np.patientId,
                  priority: np.priority,
                  patientName: np.patientName,
                });

                sendQueueNotifications(np.queueId, np.tokenNumber, np.patientId, np.patientName);

                res.status(200).json({
                  success: true,
                  message: "Next patient called successfully",
                  queueId: np.queueId,
                  tokenNumber: np.tokenNumber,
                  priority: np.priority,
                  patientName: np.patientName,
                });
              });
            });
          });
        });
      })
      .catch((err) => {
        res.status(500).json({ message: "Database error", error: err.message });
      });
  });
};

exports.completeToken = (req, res) => {
  const queueId = req.params.id;
  if (!queueId) {
    return res.status(400).json({ success: false, message: "Queue ID is required." });
  }

  const checkQuery = `SELECT q.queueId, q.queueStatus, q.tokenNumber, q.patientId, q.priority, p.name AS patientName, q.trackingCode
    FROM opd_queue q LEFT JOIN patient p ON q.patientId = p.patientId WHERE q.queueId = ?`;
  db.query(checkQuery, [queueId], (err, checkResult) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error checking queue status", error: err.message });
    }
    if (checkResult.length === 0) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }
    if (checkResult[0].queueStatus === "Completed") {
      return res.status(400).json({ success: false, message: "This token is already completed." });
    }

    const entry = checkResult[0];
    db.query("UPDATE opd_queue SET queueStatus = 'Completed', completedAt = NOW() WHERE queueId = ?", [queueId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Error completing token", error: err.message });
      }

      // Emit to all connected clients: Receptionist, Waiting Room, Analytics
      emitQueueUpdate("complete", {
        queueId,
        tokenNumber: entry.tokenNumber,
        patientId: entry.patientId,
        priority: entry.priority,
        patientName: entry.patientName,
        trackingCode: entry.trackingCode,
      });

      res.status(200).json({ success: true, message: "Token marked as Completed successfully", queueId });
    });
  });
};

// ─── PATIENT TRACKING BY TRACKING CODE (public) ─────────────────
exports.getPatientTrackingByCode = (req, res) => {
  const { trackingCode } = req.params;

  if (!trackingCode) {
    return res.status(400).json({ success: false, message: "Tracking code is required" });
  }

  const query = `
    SELECT
      q.queueId, q.tokenNumber, q.queueStatus AS status, q.priority,
      DATE_FORMAT(q.generatedTime, '%Y-%m-%d %H:%i') AS createdAt,
      TIMESTAMPDIFF(MINUTE, q.generatedTime, NOW()) AS waitingMinutes,
      p.patientId, p.name AS patientName, p.age, p.phoneNumber,
      d.doctorId, d.doctorName,
      q.trackingCode
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    LEFT JOIN doctor d ON q.doctorId = d.doctorId
    WHERE q.trackingCode = ? AND q.queueStatus IN ('Waiting', 'Serving')
    LIMIT 1
  `;

  db.query(query, [trackingCode], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid tracking code or token has been completed" });
    }

    const entry = rows[0];

    const countAheadQuery = `
      SELECT COUNT(*) AS tokensAhead
      FROM opd_queue
      WHERE queueStatus IN ('Waiting', 'Serving')
        AND DATE(generatedTime) = CURDATE()
        AND (FIELD(priority, 'Emergency', 'Normal') < FIELD(?, 'Emergency', 'Normal')
          OR (FIELD(priority, 'Emergency', 'Normal') = FIELD(?, 'Emergency', 'Normal')
            AND generatedTime < ?))
    `;

    db.query(countAheadQuery, [entry.priority, entry.priority, entry.createdAt], (err2, countRows) => {
      if (err2) {
        return res.status(500).json({ success: false, message: "Error calculating queue position", error: err2.message });
      }

      const tokensAhead = countRows[0]?.tokensAhead || 0;

      const avgQuery = "SELECT settingValue FROM queue_settings WHERE settingKey = 'avgConsultationTime'";
      db.query(avgQuery, (err3, settingsRows) => {
        if (err3) {
          return res.status(500).json({ success: false, message: "Error fetching settings", error: err3.message });
        }

        const avgConsultationTime = settingsRows.length > 0 ? parseInt(settingsRows[0].settingValue, 10) : 10;
        const estimatedWait = tokensAhead * avgConsultationTime;

        res.status(200).json({
          success: true,
          currentPatient: {
            ...entry,
            tokensAhead,
            estimatedWait,
          },
        });
      });
    });
  });
};

exports.getCurrentPatient = (req, res) => {
  const query = `
    SELECT q.queueId, q.tokenNumber, q.queueStatus AS status, q.priority,
           DATE_FORMAT(q.generatedTime, '%Y-%m-%d %H:%i') AS createdAt,
           TIMESTAMPDIFF(MINUTE, q.generatedTime, NOW()) AS waitingMinutes,
           p.patientId, p.name AS patientName, p.age, p.phoneNumber,
           d.doctorId, d.doctorName,
           q.trackingCode
    FROM opd_queue q
    LEFT JOIN patient p ON q.patientId = p.patientId
    LEFT JOIN doctor d ON q.doctorId = d.doctorId
    WHERE q.queueStatus = 'Serving' AND DATE(q.generatedTime) = CURDATE()
    LIMIT 1
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching current patient", error: err.message });
    }
    if (result.length === 0) {
      return res.status(200).json({ success: true, currentPatient: null, message: "No patient currently being served" });
    }
    res.status(200).json({ success: true, currentPatient: result[0] });
  });
};

exports.getQueueStats = (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Waiting' AND DATE(generatedTime) = CURDATE()) AS waitingCount,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Serving' AND DATE(generatedTime) = CURDATE()) AS servingCount,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Completed' AND DATE(generatedTime) = CURDATE()) AS completedCount,
      (SELECT COUNT(*) FROM opd_queue WHERE queueStatus = 'Waiting' AND priority = 'Emergency' AND DATE(generatedTime) = CURDATE()) AS emergencyCount
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching stats", error: err.message });
    }
    res.status(200).json({ success: true, stats: result[0] });
  });
};

exports.updateConsultationTime = (req, res) => {
  const { minutes } = req.body;
  if (!minutes || isNaN(minutes) || minutes < 1 || minutes > 120) {
    return res.status(400).json({ message: "Consultation time must be between 1 and 120 minutes." });
  }

  const query = "INSERT INTO queue_settings (settingKey, settingValue) VALUES ('avgConsultationTime', ?) ON DUPLICATE KEY UPDATE settingValue = ?";
  db.query(query, [minutes.toString(), minutes.toString()], (err) => {
    if (err) {
      return res.status(500).json({ message: "Error updating consultation time", error: err.message });
    }
    res.status(200).json({ message: "Consultation time updated successfully", avgConsultationTime: minutes });
  });
};

exports.getConsultationTime = (req, res) => {
  const query = "SELECT settingValue FROM queue_settings WHERE settingKey = 'avgConsultationTime'";
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching consultation time", error: err.message });
    }
    const avgConsultationTime = result.length > 0 ? parseInt(result[0].settingValue, 10) : 10;
    res.status(200).json({ avgConsultationTime });
  });
};
