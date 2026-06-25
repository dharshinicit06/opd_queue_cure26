const db = require("../config/db");

exports.getNotificationLogs = (req, res) => {
  const query = `
    SELECT notificationId, queueId, patientId, patientName, tokenNumber,
           notificationType, message, channel, status,
           DATE_FORMAT(sentAt, '%Y-%m-%d %H:%i:%s') AS sentAt
    FROM notifications
    ORDER BY sentAt DESC
    LIMIT 100
  `;
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching notifications", error: err.message });
    }
    res.status(200).json({ success: true, notifications: result });
  });
};
