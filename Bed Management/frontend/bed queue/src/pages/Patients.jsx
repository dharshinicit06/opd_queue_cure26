import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import API from "../api/api";
import "../styles/Pages.css";

function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [formData, setFormData] = useState({
    patientName: "",
    phone: "",
    gender: "",
    age: "",
    symptoms: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchPatients();
  }, [navigate]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await API.get("/patients/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.patients) {
        setPatients(
          res.data.patients.map((patient) => ({
            ...patient,
            patientName: patient.name || patient.patientName || "Unknown",
            phone: patient.phoneNumber || patient.phone || "",
          }))
        );
      }
    } catch (error) {
      console.log("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ patientName: "", phone: "", gender: "", age: "", symptoms: "" });
    setEditingPatientId(null);
  };

  const handleSavePatient = async () => {
    // Validation
    if (!formData.patientName.trim()) {
      alert("Patient name is required.");
      return;
    }

    if (!formData.age || isNaN(formData.age) || formData.age < 0 || formData.age > 150) {
      alert("Valid age is required.");
      return;
    }

    if (!formData.gender) {
      alert("Gender is required.");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.toString().trim())) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.patientName,
        age: formData.age,
        gender: formData.gender,
        phoneNumber: formData.phone,
        symptoms: formData.symptoms,
      };

      if (editingPatientId) {
        await API.put(`/patients/update/${editingPatientId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Patient updated successfully!");
      } else {
        await API.post("/patients/register", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Patient registered successfully!");
      }

      resetForm();
      setShowForm(false);
      fetchPatients();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving patient");
    }
  };

  const editPatient = (patient) => {
    setFormData({
      patientName: patient.patientName || "",
      phone: patient.phone || "",
      gender: patient.gender || "",
      age: patient.age || "",
      symptoms: patient.symptoms || "",
    });
    setEditingPatientId(patient.patientId);
    setShowForm(true);
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm("Delete this patient record?")) return;

    try {
      const token = localStorage.getItem("token");
      await API.delete(`/patients/delete/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Patient deleted successfully!");
      fetchPatients();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting patient");
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase();
    return (
      patient.patientName?.toLowerCase().includes(term) ||
      patient.phone?.toString().includes(term) ||
      patient.gender?.toLowerCase().includes(term) ||
      patient.symptoms?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "patientId", label: "ID" },
    { key: "patientName", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "gender", label: "Gender" },
    { key: "age", label: "Age" },
    { key: "symptoms", label: "Symptoms" },
  ];

  const actions = [
    { label: "Edit", type: "edit", onClick: editPatient },
    { label: "Delete", type: "delete", onClick: (row) => handleDeletePatient(row.patientId) },
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
                Patients Management
              </h1>
              <p>Manage all hospital patients</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (showForm) {
                  resetForm();
                  setShowForm(false);
                } else {
                  setShowForm(true);
                }
              }}
            >
              {showForm ? "Cancel" : "+ Add Patient"}
            </button>
          </div>

          {showForm && (
            <div className="form-container">
              <h3>{editingPatientId ? "Edit Patient" : "Register New Patient"}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone (10 digits)"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: value });
                  }}
                  maxLength="10"
                />
                <input
                  type="text"
                  placeholder="Symptoms"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                />
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <button className="btn btn-success" onClick={handleSavePatient}>
                {editingPatientId ? "Update Patient" : "Register Patient"}
              </button>
            </div>
          )}

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading">Loading patients...</div>
          ) : (
            <DataTable columns={columns} data={filteredPatients} actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Patients;
