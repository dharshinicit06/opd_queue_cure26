const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const { initializeSocket } = require("./services/socketService");
const patientRoutes = require("./routes/patientRoutes");
const patientTrackingRoutes = require("./routes/patientTrackingRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const bedRoutes = require("./routes/bedRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const staffRoutes = require("./routes/staffRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const receptionistRoutes = require("./routes/receptionistRoutes");
const waitingRoomRoutes = require("./routes/waitingRoomRoutes");
const opdAnalyticsRoutes = require("./routes/opdAnalyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const consultationNotesRoutes = require("./routes/consultationNotesRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Simple request logger for debugging
app.use((req, res, next) => {
  try {
    console.log('REQ', req.method, req.originalUrl, 'Headers:', { authorization: req.headers.authorization });
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// Patient API Routes
app.use("/api/patients", patientRoutes);

// Patient Tracking Routes (public)
app.use("/api", patientTrackingRoutes);

// Appointment API Routes
app.use("/api/appointments", appointmentRoutes);

// Department API Routes
app.use("/api/departments", departmentRoutes);

// Bed API Routes
app.use("/api/beds", bedRoutes);

// Admission API Routes
app.use("/api/admissions", admissionRoutes);

// Dashboard API Routes
app.use("/api/dashboard", dashboardRoutes);

// Admin API Routes
app.use("/api/admin", adminRoutes);

// Staff API Routes
app.use("/api/staff", staffRoutes);

// Doctor API Routes
app.use("/api/doctors", doctorRoutes);

// Receptionist API Routes
app.use("/api/receptionist", receptionistRoutes);

// Waiting Room API Routes (public, no auth)
app.use("/api/waiting-room", waitingRoomRoutes);

// OPD Analytics Routes
app.use("/api/opd-analytics", opdAnalyticsRoutes);

// Notification Routes
app.use("/api/notifications", notificationRoutes);

// Consultation Notes Routes
app.use("/api/consultation-notes", consultationNotesRoutes);

// Auth Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// DB Check
// DB Check - log detailed info but don't exit; allow server to start for easier debugging
db.query("SELECT 1", (err) => {
  if (err) {
    console.error("Database Connection Failed ❌", err.message || err);
  } else {
    console.log("Database Connected Successfully ✅");
  }
});

// Initialize Socket.IO
initializeSocket(server);

// Start Server with default port fallback
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Log registered routes for debugging
  try {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // routes registered directly on the app
        routes.push(middleware.route.path);
      } else if (middleware.name === 'router') {
        // router middleware
        middleware.handle.stack.forEach((handler) => {
          const routePath = handler.route && handler.route.path;
          const methods = handler.route && Object.keys(handler.route.methods).join(',').toUpperCase();
          if (routePath) routes.push(`/ (router) ${methods} ${routePath}`);
        });
      }
    });
    console.log('Registered routes:', routes);
  } catch (e) {
    console.error('Failed to enumerate routes', e.message || e);
  }
});