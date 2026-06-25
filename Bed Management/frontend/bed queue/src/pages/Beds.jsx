import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/api";
import { io } from "socket.io-client";
import "../styles/Pages.css";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Beds() {
  const navigate = useNavigate();
  const [beds, setBeds] = useState([]);
  const [wards, setWards] = useState([]);
  const [stats, setStats] = useState({ totalBeds: 0, availableBeds: 0, occupiedBeds: 0, maintenanceBeds: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [wardFilter, setWardFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ roomNo: "", bedType: "General", bedStatus: "Available", wardId: "" });
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("token");

  const fetchBeds = useCallback(async () => {
    try {
      setLoading(true);
      const [bedsRes, wardsRes, statsRes] = await Promise.all([
        API.get("/beds/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/beds/wards", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        API.get("/admissions/stats", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (bedsRes.data?.beds) setBeds(bedsRes.data.beds);
      if (wardsRes.data?.wards) setWards(wardsRes.data.wards);
      if (statsRes.data?.stats) setStats(statsRes.data.stats);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchBeds();
  }, [token, navigate, fetchBeds]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("bedUpdated", () => { fetchBeds(); });
    socket.on("admissionUpdated", () => { fetchBeds(); });
    return () => socket.disconnect();
  }, [fetchBeds]);

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "available") return <span className="badge badge-green">Available</span>;
    if (s === "occupied") return <span className="badge badge-red">Occupied</span>;
    if (s === "maintenance") return <span className="badge badge-yellow">Maintenance</span>;
    return <span className="badge badge-gray">{status}</span>;
  };

  const resetForm = () => {
    setFormData({ roomNo: "", bedType: "General", bedStatus: "Available", wardId: "" });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.roomNo?.toString().trim() || !formData.bedType?.trim()) {
      alert("Room number and bed type are required.");
      return;
    }
    try {
      const payload = { ...formData, wardId: formData.wardId || null };
      if (editingId) {
        await API.put(`/beds/update/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await API.post("/beds/add", payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      resetForm();
      setShowForm(false);
      fetchBeds();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving bed");
    }
  };

  const editBed = (bed) => {
    setFormData({ roomNo: bed.roomNo || bed.bedNumber || "", bedType: bed.bedType || "", bedStatus: bed.status || "Available", wardId: bed.wardId || "" });
    setEditingId(bed.bedId);
    setShowForm(true);
  };

  const handleDelete = async (bedId) => {
    if (!window.confirm("Delete this bed?")) return;
    try {
      await API.delete(`/beds/delete/${bedId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchBeds();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting bed");
    }
  };

  const filteredBeds = beds.filter((bed) => {
    const matchWard = wardFilter === "all" || bed.wardId == wardFilter;
    const matchStatus = statusFilter === "all" || bed.status?.toLowerCase() === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || [bed.roomNo?.toString(), bed.bedType, bed.wardName].some((v) => v?.toLowerCase().includes(term));
    return matchWard && matchStatus && matchSearch;
  });

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>Bed Management</h1>
              <p>Manage ward beds and availability</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              {showForm ? "Cancel" : "+ Add Bed"}
            </button>
          </div>

          {showForm && (
            <div className="admission-form">
              <h3>{editingId ? "Edit Bed" : "Add New Bed"}</h3>
              <div className="form-grid">
                <input type="text" placeholder="Room Number" value={formData.roomNo} onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })} />
                <select value={formData.bedType} onChange={(e) => setFormData({ ...formData, bedType: e.target.value })}>
                  <option value="General">General</option>
                  <option value="ICU">ICU</option>
                  <option value="Emergency">Emergency</option>
                </select>
                <select value={formData.wardId} onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}>
                  <option value="">Select Ward</option>
                  {wards.map((w) => (<option key={w.wardId} value={w.wardId}>{w.wardName}</option>))}
                </select>
                <select value={formData.bedStatus} onChange={(e) => setFormData({ ...formData, bedStatus: e.target.value })}>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <button className="btn btn-success" onClick={handleSave}>{editingId ? "Update Bed" : "Add Bed"}</button>
            </div>
          )}

          <div className="stats-row">
            <div className="mini-card"><span className="mini-card-value">{stats.totalBeds}</span><span className="mini-card-label">Total Beds</span></div>
            <div className="mini-card"><span className="mini-card-value" style={{ color: "#22C55E" }}>{stats.availableBeds}</span><span className="mini-card-label">Available</span></div>
            <div className="mini-card"><span className="mini-card-value" style={{ color: "#EF4444" }}>{stats.occupiedBeds}</span><span className="mini-card-label">Occupied</span></div>
            <div className="mini-card"><span className="mini-card-value" style={{ color: "#F59E0B" }}>{stats.maintenanceBeds}</span><span className="mini-card-label">Maintenance</span></div>
          </div>

          <div className="filter-bar">
            <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
              <i className="bi bi-search" />
              <input type="text" placeholder="Search by room, type, ward..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="filter-select">
              <option value="all">All Wards</option>
              {wards.map((w) => (<option key={w.wardId} value={w.wardId}>{w.wardName}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Loading beds...</div>
          ) : filteredBeds.length === 0 ? (
            <div className="empty-state"><i className="bi bi-inbox" /><p>No beds found</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Ward</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeds.map((bed, i) => (
                    <tr key={bed.bedId}>
                      <td>{i + 1}</td>
                      <td><strong>{bed.roomNo || bed.bedNumber}</strong></td>
                      <td>{bed.bedType}</td>
                      <td>{bed.wardName || "-"}</td>
                      <td>{getStatusBadge(bed.status || bed.bedStatus)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-primary" onClick={() => editBed(bed)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bed.bedId)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Beds;
