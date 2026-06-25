const db = require("../config/db");
const { getIO } = require("../services/socketService");

const emitBedEvent = (action, data = {}) => {
  try {
    getIO().emit("bedUpdated", { action, ...data, timestamp: Date.now() });
  } catch (e) {}
};

// GET - All Wards
exports.getAllWards = (req, res) => {
  const query = "SELECT wardId, wardName, wardType FROM ward ORDER BY wardName ASC";
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching wards", error: err.message });
    res.status(200).json({ message: "Wards fetched", wards: result });
  });
};

// GET - All Beds
exports.getAllBeds = (req, res) => {
  const query = `
    SELECT b.bedId, b.bedType, b.roomNo AS bedNumber, b.bedStatus AS status,
           b.wardId, w.wardName, w.wardType
    FROM bed b
    LEFT JOIN ward w ON b.wardId = w.wardId
    ORDER BY b.bedId DESC
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching beds", error: err.message });
    res.status(200).json({ message: "Beds fetched", beds: result });
  });
};

// GET - Available Beds By Type
exports.getAvailableBedsByType = (req, res) => {
  const bedType = req.params.type;
  const query = `
    SELECT b.bedId, b.bedType, b.roomNo, b.bedStatus, b.wardId, w.wardName
    FROM bed b LEFT JOIN ward w ON b.wardId = w.wardId
    WHERE LOWER(b.bedStatus) = 'available'
      AND (LOWER(b.bedType) = LOWER(?) OR LOWER(w.wardType) = LOWER(?))
    ORDER BY b.bedId ASC
  `;
  db.query(query, [bedType, bedType], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching available beds", error: err.message });
    res.status(200).json({ message: "Available beds fetched", availableBeds: result });
  });
};

// POST - Add Bed
exports.addBed = (req, res) => {
  const { roomNo, bedType, bedStatus, wardId } = req.body;
  if (!roomNo || !roomNo.toString().trim() || !bedType || !bedType.toString().trim()) {
    return res.status(400).json({ message: "Room number and bed type are required." });
  }

  const query = "INSERT INTO bed (roomNo, bedType, bedStatus, wardId) VALUES (?, ?, ?, ?)";
  db.query(query, [roomNo, bedType, bedStatus || "Available", wardId || null], (err, result) => {
    if (err) return res.status(500).json({ message: "Error adding bed", error: err.message });
    emitBedEvent("added", { bedId: result.insertId, roomNo, bedType, bedStatus: bedStatus || "Available", wardId });
    res.status(201).json({ message: "Bed added successfully", bedId: result.insertId });
  });
};

// PUT - Update Bed
exports.updateBed = (req, res) => {
  const bedId = req.params.id;
  const { roomNo, bedType, bedStatus, wardId } = req.body;

  const query = "UPDATE bed SET roomNo = ?, bedType = ?, bedStatus = ?, wardId = ? WHERE bedId = ?";
  db.query(query, [roomNo, bedType, bedStatus, wardId || null, bedId], (err) => {
    if (err) return res.status(500).json({ message: "Error updating bed", error: err.message });
    emitBedEvent("updated", { bedId, roomNo, bedType, bedStatus, wardId });
    res.status(200).json({ message: "Bed updated successfully" });
  });
};

// DELETE - Delete Bed
exports.deleteBed = (req, res) => {
  const bedId = req.params.id;

  db.query("DELETE FROM admission WHERE bedId = ?", [bedId], (err) => {
    if (err) return res.status(500).json({ message: "Error clearing admissions for bed", error: err.message });
    db.query("DELETE FROM bed WHERE bedId = ?", [bedId], (err) => {
      if (err) return res.status(500).json({ message: "Error deleting bed", error: err.message });
      emitBedEvent("deleted", { bedId });
      res.status(200).json({ message: "Bed deleted successfully" });
    });
  });
};
