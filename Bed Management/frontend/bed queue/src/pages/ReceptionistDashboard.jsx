import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/api";
import { connectSocket, onQueueUpdated, getSocket } from "../services/socket";
import "../styles/ReceptionistDashboard.css";

const formatTime = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const waitingTimeColor = (mins) => {
  if (mins == null) return "";
  if (mins <= 10) return "wt-green";
  if (mins <= 20) return "wt-orange";
  return "wt-red";
};

function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [stats, setStats] = useState({ waitingCount: 0, servingCount: 0, completedCount: 0, emergencyCount: 0 });
  const [avgConsultationTime, setAvgConsultationTime] = useState(10);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);

  const [formData, setFormData] = useState({ patientName: "", age: "", phoneNumber: "", doctorId: "", priority: "Normal", gender: "", symptoms: "" });
  const [formErrors, setFormErrors] = useState({});
  const [generatedToken, setGeneratedToken] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortKey, setSortKey] = useState("generatedTime");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showSettings, setShowSettings] = useState(false);
  const [settingsValue, setSettingsValue] = useState(10);

  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    connectSocket();
    fetchDoctors();
    fetchSettings();
    fetchAllData();
    const socket = getSocket();
    if (socket) {
      socket.on("doctor:updated", fetchDoctors);
      return () => { socket.off("doctor:updated", fetchDoctors); };
    }
  }, []);

  useEffect(() => {
    const cleanup = onQueueUpdated(() => { fetchQueueOnly(); fetchActivity(); });
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (generatedToken) { const t = setTimeout(() => setGeneratedToken(null), 8000); return () => clearTimeout(t); }
  }, [generatedToken]);

  const closeQrModal = useCallback(() => {
    setQrData(null);
  }, []);

  const downloadQr = useCallback(() => {
    if (!qrData?.qrCode) return;
    const link = document.createElement("a");
    link.download = `token-${qrData.tokenNumber}.png`;
    link.href = qrData.qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrData]);

  const printQr = useCallback(() => {
    if (!qrData?.qrCode) return;
    const win = window.open("");
    win.document.write(`<img src="${qrData.qrCode}" onload="window.print();window.close()" />`);
  }, [qrData]);

  const copyLink = useCallback(() => {
    if (!qrData?.trackingUrl) return;
    navigator.clipboard.writeText(qrData.trackingUrl);
    setSuccessMessage("Tracking link copied to clipboard!");
  }, [qrData]);

  const whatsappShare = useCallback(() => {
    if (!qrData?.trackingUrl) return;
    const text = encodeURIComponent(`Your OPD token #${qrData.tokenNumber} is ready. Track your queue status here: ${qrData.trackingUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [qrData]);

  useEffect(() => {
    if (successMessage) { const t = setTimeout(() => setSuccessMessage(""), 5000); return () => clearTimeout(t); }
  }, [successMessage]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchQueueOnly(), fetchStats(), fetchCurrent(), fetchActivity()]);
    setLoading(false);
  };

  const fetchQueueOnly = async () => {
    try {
      const res = await API.get("/receptionist/queue", { headers: authHeaders });
      if (res.data?.queue) setQueue(res.data.queue);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/receptionist/stats", { headers: authHeaders });
      if (res.data?.stats) setStats(res.data.stats);
    } catch {}
  };

  const fetchCurrent = async () => {
    try {
      const res = await API.get("/receptionist/current", { headers: authHeaders });
      setCurrentPatient(res.data?.currentPatient ?? null);
    } catch {}
  };

  const fetchActivity = async () => {
    try {
      const res = await API.get("/opd-analytics/recent-activity", { headers: authHeaders });
      if (res.data?.activity) setActivity(res.data.activity);
    } catch {}
  };

  const fetchDoctors = async () => {
    try {
      const res = await API.get("/doctors/all", { headers: authHeaders });
      if (res.data?.doctors) setDoctors(res.data.doctors);
    } catch (err) {
      console.error("Failed to fetch doctors:", err.response?.data || err.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await API.get("/receptionist/settings", { headers: authHeaders });
      if (res.data?.avgConsultationTime) {
        setAvgConsultationTime(res.data.avgConsultationTime);
        setSettingsValue(res.data.avgConsultationTime);
      }
    } catch {}
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.patientName.trim()) errs.patientName = "Name is required";
    if (!formData.age || isNaN(formData.age) || +formData.age < 0 || +formData.age > 150) errs.age = "Valid age (0-150) required";
    if (!/^\d{10}$/.test(formData.phoneNumber.toString().trim())) errs.phoneNumber = "10-digit phone required";
    if (!formData.doctorId) errs.doctorId = "Select a doctor";
    if (!formData.gender) errs.gender = "Gender is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPatient = async () => {
    if (!validateForm()) return;
    try {
      const res = await API.post("/receptionist/patient-token", {
        patientName: formData.patientName.trim(),
        age: formData.age,
        phoneNumber: formData.phoneNumber,
        doctorId: formData.doctorId,
        priority: formData.priority,
        gender: formData.gender,
        symptoms: formData.symptoms,
      }, { headers: authHeaders });
      setGeneratedToken(res.data.tokenNumber);
      setQrData({ tokenNumber: res.data.tokenNumber, trackingCode: res.data.trackingCode, qrCode: res.data.qrCode, trackingUrl: res.data.trackingUrl });
      setSuccessMessage(res.data.isNewPatient
        ? `Patient registered. Token #${res.data.tokenNumber} generated.`
        : `Existing patient reused. Token #${res.data.tokenNumber} generated.`);
      setFormData({ patientName: "", age: "", phoneNumber: "", doctorId: "", priority: "Normal", gender: "", symptoms: "" });
      setFormErrors({});
      setError("");
      await fetchAllData();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Error adding patient";
      if (status === 409) {
        setError(`${msg} — Patient already in queue (${err.response.data.queueStatus || "active"}).`);
      } else {
        setError(msg);
      }
    }
  };

  const handleCallNext = async () => {
    try {
      await API.put("/receptionist/call-next", {}, { headers: authHeaders });
      setError("");
      await fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || "Error calling next patient");
    }
  };

  const handleComplete = async (queueId) => {
    try {
      await API.put(`/receptionist/complete/${queueId}`, {}, { headers: authHeaders });
      setError("");
      await fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || "Error completing token");
    }
  };

  const handleUpdateSettings = async () => {
    if (!settingsValue || isNaN(settingsValue) || settingsValue < 1 || settingsValue > 120) {
      setError("Consultation time must be 1-120 minutes");
      return;
    }
    try {
      await API.put("/receptionist/settings", { minutes: parseInt(settingsValue, 10) }, { headers: authHeaders });
      setAvgConsultationTime(settingsValue);
      setShowSettings(false);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Error updating settings");
    }
  };

  const resetFilters = () => {
    setSearchText("");
    setFilterStatus("all");
    setFilterDoctor("all");
    setFilterPriority("all");
    setCurrentPage(1);
  };

  const filteredQueue = useMemo(() => {
    let items = [...queue];
    const term = searchText.toLowerCase();
    if (term) {
      items = items.filter(i =>
        i.tokenNumber?.toString().includes(term) ||
        i.patientName?.toLowerCase().includes(term) ||
        i.doctorName?.toLowerCase().includes(term)
      );
    }
    if (filterStatus !== "all") items = items.filter(i => i.status === filterStatus);
    if (filterDoctor !== "all") items = items.filter(i => i.doctorName === filterDoctor);
    if (filterPriority !== "all") items = items.filter(i => i.priority === filterPriority);
    items.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "waitingMinutes") { va = va ?? 0; vb = vb ?? 0; return sortDir === "asc" ? va - vb : vb - va; }
      va = String(va ?? "").toLowerCase(); vb = String(vb ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return items;
  }, [queue, searchText, filterStatus, filterDoctor, filterPriority, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredQueue.length / pageSize);
  const pagedQueue = filteredQueue.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSortKey(prev => prev === key && sortKey === key ? key : key);
    setSortDir(prev => sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc");
  };

  const SortIcon = ({ col }) => (
    <span className="r-sort-icon">{sortKey === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
  );

  const doctorNames = [...new Set(queue.map(i => i.doctorName).filter(Boolean))];

  return (
    <div className="recep-layout">
      <Navbar />
      <div className="recep-body">
        <Sidebar />
        <main className="recep-main">
          {/* Token Generated Toast */}
          {generatedToken && !qrData && (
            <div className="recep-toast">
              <div className="recep-toast-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div>
                  <div className="recep-toast-label">Token Generated</div>
                  <div className="recep-toast-token">#{generatedToken}</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && <div className="recep-alert recep-alert-error"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> {error}</div>}
          {successMessage && <div className="recep-alert recep-alert-success"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> {successMessage}</div>}

          {/* KPI Cards */}
          <section className="rkpi-grid">
            <div className="rkpi-card rkpi-waiting">
              <div className="rkpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></div>
              <div className="rkpi-body"><span className="rkpi-val">{stats.waitingCount}</span><span className="rkpi-label">Waiting</span></div>
            </div>
            <div className="rkpi-card rkpi-serving">
              <div className="rkpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg></div>
              <div className="rkpi-body"><span className="rkpi-val">{stats.servingCount}</span><span className="rkpi-label">Serving</span></div>
            </div>
            <div className="rkpi-card rkpi-emergency">
              <div className="rkpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
              <div className="rkpi-body"><span className="rkpi-val">{stats.emergencyCount}</span><span className="rkpi-label">Emergency</span></div>
            </div>
            <div className="rkpi-card rkpi-completed">
              <div className="rkpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
              <div className="rkpi-body"><span className="rkpi-val">{stats.completedCount}</span><span className="rkpi-label">Completed Today</span></div>
            </div>
          </section>

          {/* Two-Column: Form + Queue Status */}
          <section className="recep-two-col">
            {/* Left: Registration Form */}
            <div className="recep-form-card">
              <div className="recep-form-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                <span>Register New Patient</span>
              </div>
              <div className="recep-form-body">
                <div className="rf-field">
                  <label className={`rf-label ${formData.patientName ? "rf-filled" : ""}`}>Patient Name</label>
                  <input className={`rf-input ${formErrors.patientName ? "rf-error" : ""}`} type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} />
                  {formErrors.patientName && <span className="rf-err">{formErrors.patientName}</span>}
                </div>
                <div className="rf-row">
                  <div className="rf-field">
                    <label className={`rf-label ${formData.age ? "rf-filled" : ""}`}>Age</label>
                    <input className={`rf-input ${formErrors.age ? "rf-error" : ""}`} type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} min="0" max="150" />
                    {formErrors.age && <span className="rf-err">{formErrors.age}</span>}
                  </div>
                  <div className="rf-field">
                    <label className={`rf-label ${formData.phoneNumber ? "rf-filled" : ""}`}>Phone Number</label>
                    <input className={`rf-input ${formErrors.phoneNumber ? "rf-error" : ""}`} type="tel" value={formData.phoneNumber} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setFormData({...formData, phoneNumber: v}); }} maxLength="10" />
                    {formErrors.phoneNumber && <span className="rf-err">{formErrors.phoneNumber}</span>}
                  </div>
                </div>
                <div className="rf-field">
                  <label className={`rf-label ${formData.doctorId ? "rf-filled" : ""}`}>Doctor</label>
                  <select className={`rf-input rf-select ${formErrors.doctorId ? "rf-error" : ""}`} value={formData.doctorId} onChange={e => setFormData({...formData, doctorId: e.target.value})}>
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.doctorName} - {d.deptName || d.specialization || ""}</option>)}
                  </select>
                  {formErrors.doctorId && <span className="rf-err">{formErrors.doctorId}</span>}
                </div>
                <div className="rf-field">
                  <label className={`rf-label ${formData.gender ? "rf-filled" : ""}`}>Gender</label>
                  <select className={`rf-input rf-select ${formErrors.gender ? "rf-error" : ""}`} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.gender && <span className="rf-err">{formErrors.gender}</span>}
                </div>
                <div className="rf-field">
                  <label className={`rf-label ${formData.symptoms ? "rf-filled" : ""}`}>Symptoms</label>
                  <input className={`rf-input ${formErrors.symptoms ? "rf-error" : ""}`} type="text" value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} />
                  {formErrors.symptoms && <span className="rf-err">{formErrors.symptoms}</span>}
                </div>
                <div className="rf-priority">
                  <span className="rf-pri-label">Priority</span>
                  <div className="rf-pri-options">
                    <label className={`rf-pri-opt ${formData.priority === "Normal" ? "pri-active" : ""}`}>
                      <input type="radio" name="pri" value="Normal" checked={formData.priority === "Normal"} onChange={e => setFormData({...formData, priority: e.target.value})} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      Normal
                    </label>
                    <label className={`rf-pri-opt rf-pri-emerg ${formData.priority === "Emergency" ? "pri-active" : ""}`}>
                      <input type="radio" name="pri" value="Emergency" checked={formData.priority === "Emergency"} onChange={e => setFormData({...formData, priority: e.target.value})} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Emergency
                    </label>
                  </div>
                </div>
                <button className="rf-submit" onClick={handleAddPatient}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Generate Token
                </button>
              </div>
            </div>

            {/* Right: Current Queue Status + Quick Actions */}
            <div className="recep-right-col">
              <div className="recep-current-card">
                <div className="rcc-header">
                  <span className="rcc-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Now Serving
                  </span>
                  {currentPatient && <span className="rcc-badge">In Progress</span>}
                </div>
                {currentPatient ? (
                  <div className="rcc-body">
                    <div className="rcc-token-ring">
                      <span className="rcc-token-num">{currentPatient.tokenNumber}</span>
                    </div>
                    <div className="rcc-details">
                      <div className="rcc-row"><span className="rcc-lbl">Patient</span><span className="rcc-val">{currentPatient.patientName}</span></div>
                      <div className="rcc-row"><span className="rcc-lbl">Doctor</span><span className="rcc-val">{currentPatient.doctorName}</span></div>
                      <div className="rcc-row"><span className="rcc-lbl">Priority</span><span className="rcc-val">
                        <span className={`rbadge rbadge-${currentPatient.priority === "Emergency" ? "emergency" : "normal"}`}>
                          {currentPatient.priority === "Emergency" ? "\uD83D\uDD34" : "\uD83D\uDFE2"} {currentPatient.priority}
                        </span>
                      </span></div>
                      <div className="rcc-row"><span className="rcc-lbl">Wait</span><span className={`rcc-val ${waitingTimeColor(currentPatient.waitingMinutes)}`}>{currentPatient.waitingMinutes ?? 0} min</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="rcc-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                    <span className="rcc-empty-text">No patient currently being served</span>
                    <span className="rcc-empty-sub">Call next patient to begin</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="recep-actions">
                <button className="ract ract-primary" onClick={handleAddPatient}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Generate Token
                </button>
                <button className="ract ract-call" onClick={handleCallNext} disabled={stats.waitingCount === 0}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 8 14 13 10 22 12 2"/></svg>
                  Call Next
                </button>
                {currentPatient && (
                  <button className="ract ract-complete" onClick={() => handleComplete(currentPatient.queueId)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Complete
                  </button>
                )}
                <button className="ract ract-refresh" onClick={fetchAllData}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Refresh
                </button>
                <button className="ract ract-settings" onClick={() => { setSettingsValue(avgConsultationTime); setShowSettings(true); }} title="Settings">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
            </div>
          </section>

          {/* Search & Filter Toolbar */}
          <section className="recep-toolbar">
            <div className="rt-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search token, patient, doctor..." value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }} />
            </div>
            <select className="rt-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Status</option>
              <option value="Waiting">Waiting</option>
              <option value="Serving">Serving</option>
              <option value="Completed">Completed</option>
            </select>
            <select className="rt-select" value={filterDoctor} onChange={e => { setFilterDoctor(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Doctors</option>
              {doctorNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="rt-select" value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="Emergency">Emergency</option>
            </select>
            <button className="rt-reset" onClick={resetFilters}>Reset Filters</button>
          </section>

          {/* Queue Table */}
          <section className="recep-table-wrap">
            {loading ? (
              <div className="rt-loading"><div className="spinner" /></div>
            ) : filteredQueue.length === 0 ? (
              <div className="rt-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="rt-empty-title">No Patients In Queue</span>
                <span className="rt-empty-sub">All patients have been served today</span>
              </div>
            ) : (
              <>
                <div className="rt-scroll">
                  <table className="rtable">
                    <thead>
                      <tr>
                        <th className="rt-th-token" onClick={() => toggleSort("tokenNumber")}>Token <SortIcon col="tokenNumber" /></th>
                        <th onClick={() => toggleSort("patientName")}>Patient <SortIcon col="patientName" /></th>
                        <th onClick={() => toggleSort("doctorName")}>Doctor <SortIcon col="doctorName" /></th>
                        <th onClick={() => toggleSort("priority")}>Priority <SortIcon col="priority" /></th>
                        <th onClick={() => toggleSort("status")}>Status <SortIcon col="status" /></th>
                        <th onClick={() => toggleSort("waitingMinutes")}>Wait Time <SortIcon col="waitingMinutes" /></th>
                        <th onClick={() => toggleSort("createdAt")}>Created <SortIcon col="createdAt" /></th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedQueue.map((row) => (
                        <tr key={row.queueId} className={`${row.status === "Serving" ? "rt-row-serving" : ""} ${row.priority === "Emergency" && row.status === "Waiting" ? "rt-row-emerg" : ""}`}>
                          <td><span className="rt-token">{row.tokenNumber}</span></td>
                          <td className="rt-patient-cell">
                            {row.status === "Serving" && <span className="rt-serving-badge">Serving</span>}
                            <span>{row.patientName}</span>
                          </td>
                          <td>{row.doctorName}</td>
                          <td><span className={`rbadge rbadge-${row.priority === "Emergency" ? "emergency" : "normal"}`}>{row.priority === "Emergency" ? "\uD83D\uDD34" : "\uD83D\uDFE2"} {row.priority}</span></td>
                          <td><span className={`rbadge rbadge-${row.status?.toLowerCase() || "waiting"}`}>{row.status === "Waiting" ? "\uD83D\uDFE1" : row.status === "Serving" ? "\uD83D\uDD35" : "\uD83D\uDFE2"} {row.status}</span></td>
                          <td><span className={`rt-wt ${waitingTimeColor(row.waitingMinutes)}`}>{row.waitingMinutes ?? 0} min</span></td>
                          <td className="rt-created">{formatTime(row.createdAt)}</td>
                          <td className="rt-actions">
                            {row.status === "Waiting" && (
                              <button className="ract-sm ract-sm-call" onClick={() => handleCallNext()} title="Call patient">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 8 14 13 10 22 12 2"/></svg>
                                Call
                              </button>
                            )}
                            {row.status === "Serving" && (
                              <button className="ract-sm ract-sm-complete" onClick={() => handleComplete(row.queueId)} title="Complete consultation">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                Complete
                              </button>
                            )}
                            {row.status === "Completed" && (
                              <span className="ract-done">Done</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="rt-pagination">
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                    <span className="rt-page-info">Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Recent Activity */}
          <section className="recep-activity">
            <div className="ract-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Recent Activity</span>
              <span className="ract-badge">Latest 10</span>
            </div>
            <div className="ract-timeline">
              {activity.length === 0 ? (
                <div className="ract-empty">No activity yet today</div>
              ) : activity.map((a, i) => (
                <div key={i} className={`ract-item ract-${a.status?.toLowerCase() || "waiting"}`}>
                  <div className="ract-dot" />
                  <div className="ract-content">
                    <span className="ract-action">{a.action}</span>
                    <span className="ract-desc">{a.patientName} &middot; Token {a.tokenNumber}</span>
                  </div>
                  <span className="ract-time">{formatTime(a.time)}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="recep-overlay" onClick={() => setShowSettings(false)}>
          <div className="recep-modal" onClick={e => e.stopPropagation()}>
            <div className="recep-modal-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Consultation Settings</span>
              <button className="recep-modal-close" onClick={() => setShowSettings(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="recep-modal-body">
              <div className="recep-modal-field">
                <label>Average Consultation Time (minutes)</label>
                <input type="number" value={settingsValue} onChange={e => setSettingsValue(e.target.value)} min="1" max="120" />
                <span className="recep-modal-hint">Default: 10 min. Range: 1-120 min.</span>
              </div>
            </div>
            <div className="recep-modal-footer">
              <button className="recep-modal-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="recep-modal-save" onClick={handleUpdateSettings}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Success Modal */}
      {qrData && (
        <div className="recep-overlay" onClick={closeQrModal}>
          <div className="recep-modal qr-modal" onClick={e => e.stopPropagation()}>
            <div className="recep-modal-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Token Generated Successfully</span>
              <button className="recep-modal-close" onClick={closeQrModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="recep-modal-body qr-modal-body">
              <div className="qr-token-display">
                <span className="qr-token-label">Token Number</span>
                <span className="qr-token-number">#{qrData.tokenNumber}</span>
              </div>
              <div className="qr-tracking-code-display">
                <span className="qr-tracking-code-label">Tracking Code</span>
                <span className="qr-tracking-code-value">{qrData.trackingCode}</span>
              </div>
              {qrData.qrCode ? (
                <div className="qr-image-wrap">
                  <img src={qrData.qrCode} alt={`QR Code for token ${qrData.tokenNumber}`} className="qr-image" />
                </div>
              ) : (
                <div className="qr-image-wrap qr-fallback">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                  <p>QR code unavailable. Use the tracking link instead.</p>
                </div>
              )}
              <div className="qr-tracking-link">
                <span className="qr-link-label">Tracking URL</span>
                <div className="qr-link-row">
                  <input type="text" readOnly value={qrData.trackingUrl || ""} className="qr-link-input" />
                  <button className="qr-link-copy" onClick={copyLink} title="Copy link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div className="qr-actions">
                <button className="qr-btn qr-btn-download" onClick={downloadQr}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download QR
                </button>
                <button className="qr-btn qr-btn-print" onClick={printQr}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print QR
                </button>
                <button className="qr-btn qr-btn-whatsapp" onClick={whatsappShare}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionistDashboard;
