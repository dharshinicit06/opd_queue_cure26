import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import API from "../api/api";
import "../styles/Pages.css";

function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    priority: "normal",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const [appointmentsRes, patientsRes, doctorsRes] = await Promise.all([
        API.get("/appointments/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/patients/all", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/doctors/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (appointmentsRes.data && appointmentsRes.data.appointments) {
        setAppointments(
          appointmentsRes.data.appointments.map((appointment) => ({
            ...appointment,
            patientName: appointment.patientName || appointment.name || "",
            doctorName: appointment.doctorName || "",
            status: appointment.status || "Booked",
          }))
        );
      }
      if (patientsRes.data && patientsRes.data.patients) {
        setPatients(
          patientsRes.data.patients.map((patient) => ({
            ...patient,
            patientName: patient.name || patient.patientName || "",
          }))
        );
      }
      if (doctorsRes.data && doctorsRes.data.doctors) {
        setDoctors(
          doctorsRes.data.doctors.map((doctor) => ({
            ...doctor,
            doctorName: doctor.doctorName || "",
          }))
        );
      }
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()) {
      alert("Please complete all appointment fields before saving.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await API.post("/appointments/book", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const generatedToken = response.data?.token;
      const appointmentDetails = response.data?.appointment;
      alert(
        generatedToken
          ? `Appointment booked successfully! Token #${generatedToken.tokenNumber} (${generatedToken.priority}) generated.`
          : "Appointment booked successfully!"
      );

      setFormData({
        patientId: "",
        doctorId: "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
        priority: "normal",
      });
      setShowForm(false);
      fetchData();

      window.localStorage.setItem("queueRefresh", Date.now().toString());
      window.dispatchEvent(new Event("queueRefresh"));

      if (appointmentDetails) {
        console.log("Booked appointment:", appointmentDetails);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Error booking appointment");
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      const token = localStorage.getItem("token");
      await API.put(`/appointments/cancel/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Appointment cancelled successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error cancelling appointment");
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    if (!window.confirm("Mark this appointment as complete?")) return;
    try {
      const token = localStorage.getItem("token");
      await API.put(`/appointments/complete/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Appointment marked as completed!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error completing appointment");
    }
  };

   const renderStatusBadge = (status) => {
     const normalized = String(status || "Booked").trim();
     const statusKey = normalized.toLowerCase();
     return <span className={`badge status-${statusKey}`}>{normalized}</span>;
   };

  const filteredAppointments = appointments.filter((appointment) => {
    const term = searchTerm.toLowerCase();
    return (
      appointment.patientName?.toLowerCase().includes(term) ||
      appointment.doctorName?.toLowerCase().includes(term) ||
      appointment.reason?.toLowerCase().includes(term) ||
      appointment.appointmentDate?.toLowerCase().includes(term)
    );
  });

  const displayedAppointments = filteredAppointments.filter(
    (appointment) => showHistory || appointment.status === "Booked"
  );

  const columns = [
    { key: "appointmentId", label: "ID" },
    { key: "patientName", label: "Patient" },
    { key: "doctorName", label: "Doctor" },
    { key: "appointmentDate", label: "Date" },
    { key: "appointmentTime", label: "Time" },
    { key: "status", label: "Status", render: (value) => renderStatusBadge(value) },
  ];

  const actions = [
    {
      label: "Cancel",
      type: "delete",
      onClick: (row) => handleCancelAppointment(row.appointmentId),
      disabled: (row) => row.status !== "Booked",
    },
    {
      label: "Complete",
      type: "success",
      onClick: (row) => handleCompleteAppointment(row.appointmentId),
      disabled: (row) => row.status !== "Booked",
    },
  ];

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>
                 Appointments Management
              </h1>
              <p>Manage patient appointments with doctors</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowForm((prev) => !prev)}>
                {showForm ? "Cancel" : "+ Book Appointment"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowHistory((prev) => !prev)}>
                {showHistory ? "Hide History" : "Show Active Only"}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="form-container">
              <h3>Book New Appointment</h3>
              <div className="form-grid">
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                >
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.patientName}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
                <input
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                />
                <input
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Reason for Appointment"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <button className="btn btn-success" onClick={handleBookAppointment}>
                Book Appointment
              </button>
            </div>
          )}

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="loading">Loading appointments...</div>
          ) : (
            <DataTable columns={columns} data={displayedAppointments} actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Appointments;
