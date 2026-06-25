import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/api";
import { io } from "socket.io-client";
import "../styles/Pages.css";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Admissions() {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({ activeAdmissions: 0, dischargedToday: 0, totalAdmissions: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    departmentId: "",
    bedType: "General",
    reason: "",
    admissionDate: "",
  });

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [admissionsRes, patientsRes, doctorsRes, deptsRes, statsRes] = await Promise.all([
        API.get("/admissions/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/patients/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/doctors/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/departments/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/admissions/stats", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (admissionsRes.data?.admissions) setAdmissions(admissionsRes.data.admissions);
      if (patientsRes.data?.patients) setPatients(patientsRes.data.patients);
      if (doctorsRes.data?.doctors) setDoctors(doctorsRes.data.doctors);
      if (deptsRes.data?.departments) setDepartments(deptsRes.data.departments);
      if (statsRes.data?.stats) setStats(statsRes.data.stats);
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchData();
  }, [token, navigate, fetchData]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("admissionUpdated", () => { fetchData(); });
    return () => socket.disconnect();
  }, [fetchData]);

  const handleAdmitPatient = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.departmentId || !formData.bedType) {
      alert("Please select patient, doctor, department, and bed type.");
      return;
    }
    try {
      await API.post("/admissions/admit", formData, { headers: { Authorization: `Bearer ${token}` } });
      alert("Patient admitted successfully!");
      setFormData({ patientId: "", doctorId: "", departmentId: "", bedType: "General", reason: "", admissionDate: "" });
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error admitting patient");
    }
  };

  const handleDischarge = async (admissionId) => {
    if (!window.confirm("Discharge this patient?")) return;
    try {
      await API.put(`/admissions/discharge/${admissionId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert("Patient discharged successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error discharging patient");
    }
  };

  const handleStatusUpdate = async (admissionId, status) => {
    try {
      await API.put(`/admissions/status/${admissionId}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error updating status");
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      "Admitted": "badge-blue",
      "Under Treatment": "badge-yellow",
      "Discharged": "badge-green",
    };
    return <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>;
  };

  const filteredAdmissions = admissions.filter((a) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || [
      a.patientName, a.doctorName, a.departmentName, a.bedType, a.roomNo?.toString(),
    ].some((v) => v?.toLowerCase().includes(term));

    if (activeTab === "active") return matchSearch && a.admissionStatus !== "Discharged";
    return matchSearch && a.admissionStatus === "Discharged";
  });

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>Admissions</h1>
              <p>Manage inpatient admissions and discharges</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Admit Patient"}
            </button>
          </div>

          {showForm && (
            <div className="admission-form">
              <h3>New Admission</h3>
              <div className="form-grid">
                <select value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}>
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>{p.name}</option>
                  ))}
                </select>
                <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, doctorId: "" })}>
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.deptId} value={d.deptId}>{d.deptName}</option>
                  ))}
                </select>
                <select value={formData.doctorId} onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}>
                  <option value="">Select Doctor</option>
                  {doctors
                    .filter((doc) => !formData.departmentId || doc.deptId == formData.departmentId)
                    .map((doc) => (
                      <option key={doc.doctorId} value={doc.doctorId}>{doc.doctorName}</option>
                    ))}
                </select>
                <select value={formData.bedType} onChange={(e) => setFormData({ ...formData, bedType: e.target.value })}>
                  <option value="General">General</option>
                  <option value="ICU">ICU</option>
                  <option value="Emergency">Emergency</option>
                </select>
                <input type="date" value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} />
                <input type="text" placeholder="Reason for admission" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
              </div>
              <button className="btn btn-success" onClick={handleAdmitPatient}>Admit Patient</button>
            </div>
          )}

          <div className="stats-row">
            <div className="mini-card">
              <span className="mini-card-value">{stats.activeAdmissions}</span>
              <span className="mini-card-label">Active Admissions</span>
            </div>
            <div className="mini-card">
              <span className="mini-card-value">{stats.dischargedToday}</span>
              <span className="mini-card-label">Discharged Today</span>
            </div>
            <div className="mini-card">
              <span className="mini-card-value">{stats.totalAdmissions}</span>
              <span className="mini-card-label">Total All Time</span>
            </div>
          </div>

          <div className="search-bar">
            <i className="bi bi-search" />
            <input type="text" placeholder="Search by patient, doctor, bed..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
              Active ({admissions.filter((a) => a.admissionStatus !== "Discharged").length})
            </button>
            <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
              Discharged ({admissions.filter((a) => a.admissionStatus === "Discharged").length})
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading admissions...</div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-inbox" />
              <p>{activeTab === "active" ? "No active admissions" : "No discharged patients"}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Department</th>
                    <th>Bed</th>
                    <th>Doctor</th>
                    <th>Admitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmissions.map((a, i) => (
                    <tr key={a.admissionId}>
                      <td>{i + 1}</td>
                      <td><strong>{a.patientName}</strong></td>
                      <td>{a.departmentName || "-"}</td>
                      <td>{a.bedType} - {a.roomNo}</td>
                      <td>{a.doctorName}</td>
                      <td>{a.admissionDate?.split("T")[0]}</td>
                      <td>{getStatusBadge(a.admissionStatus)}</td>
                      <td>
                        {a.admissionStatus === "Admitted" && (
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-warning" onClick={() => handleStatusUpdate(a.admissionId, "Under Treatment")}>
                              Start Treatment
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDischarge(a.admissionId)}>
                              Discharge
                            </button>
                          </div>
                        )}
                        {a.admissionStatus === "Under Treatment" && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDischarge(a.admissionId)}>
                            Discharge
                          </button>
                        )}
                        {a.admissionStatus === "Discharged" && (
                          <span className="text-muted">{a.dischargeDate?.split("T")[0] || "Discharged"}</span>
                        )}
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

export default Admissions;
