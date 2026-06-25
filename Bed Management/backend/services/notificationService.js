const db = require("../config/db");

class NotificationProvider {
  async send(notification) {
    throw new Error("send() must be implemented by subclass");
  }
}

class MockNotificationProvider extends NotificationProvider {
  async send(notification) {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO notifications (queueId, patientId, patientName, tokenNumber, notificationType, message, channel) VALUES (?, ?, ?, ?, ?, ?, ?)";
      db.query(sql, [notification.queueId, notification.patientId, notification.patientName, notification.tokenNumber, notification.type, notification.message, "mock"], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

class TwilioSmsProvider extends NotificationProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async send(notification) {
    // Future: integrate Twilio SDK here
    // const twilio = require('twilio')(this.config.accountSid, this.config.authToken);
    // return twilio.messages.create({ body: notification.message, from: this.config.from, to: notification.phone });
    console.log("[TwilioSmsProvider] Would send SMS:", notification.message);
  }
}

class WhatsAppProvider extends NotificationProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async send(notification) {
    // Future: integrate WhatsApp Business API here
    console.log("[WhatsAppProvider] Would send WhatsApp:", notification.message);
  }
}

class NotificationService {
  constructor() {
    this.providers = [new MockNotificationProvider()];
  }

  addProvider(provider) {
    this.providers.push(provider);
  }

  async notify(notification) {
    const results = [];
    for (const provider of this.providers) {
      try {
        const result = await provider.send(notification);
        results.push({ provider: provider.constructor.name, success: true, result });
      } catch (err) {
        results.push({ provider: provider.constructor.name, success: false, error: err.message });
      }
    }
    return results;
  }
}

const notificationService = new NotificationService();

module.exports = { notificationService, NotificationService, MockNotificationProvider, TwilioSmsProvider, WhatsAppProvider };
