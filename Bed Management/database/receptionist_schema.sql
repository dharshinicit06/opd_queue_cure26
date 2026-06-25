-- Receptionist Dashboard - OPD Queue Management Schema

CREATE TABLE IF NOT EXISTS opd_queue (
  queueId INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  doctorId INT NOT NULL,
  tokenNumber INT NOT NULL,
  queueStatus VARCHAR(20) DEFAULT 'Waiting',
  generatedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patient(patientId) ON DELETE CASCADE,
  FOREIGN KEY (doctorId) REFERENCES doctor(doctorId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_settings (
  settingId INT PRIMARY KEY AUTO_INCREMENT,
  settingKey VARCHAR(100) UNIQUE NOT NULL,
  settingValue VARCHAR(255) NOT NULL
);

INSERT IGNORE INTO queue_settings (settingKey, settingValue) VALUES ('avgConsultationTime', '10');
