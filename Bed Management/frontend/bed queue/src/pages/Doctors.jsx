import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import API from "../api/api";
import "../styles/Pages.css";

function Doctors() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === "Admin";

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [formData, setFormData] = useState({
    doctorName: "",
    phone: "",
    departmentId: "",
    specialization: "",
    shift: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchDoctors();
    if (isAdmin) fetchDepartments();
  }, [navigate, isAdmin]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await API.get("/doctors/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.doctors) {
        setDoctors(
          res.data.doctors.map((doctor) => ({
            ...doctor,
            phone: doctor.phoneNumber || doctor.phone || "",
            departmentName: doctor.deptName || doctor.departmentName || "",
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/departments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.departments) {
        setDepartments(
          res.data.departments.map((dept) => ({
            ...dept,
            departmentId: dept.deptId || dept.departmentId,
            departmentName: dept.deptName || dept.departmentName,
          }))
        );
      }
    } catch (error) {
      console.log("Error fetching departments:", error);
    }
  };

   const resetForm = () => {
     setFormData({
       doctorName: "",
       phone: "",
       departmentId: "",
       specialization: "",
       shift: "",
     });
     setEditingDoctorId(null);
   };

   const handleSaveDoctor = async () => {
     // Validation
     if (!formData.doctorName.trim()) {
       alert("Doctor name is required.");
       return;
     }

     if (!/^\d{10}$/.test(formData.phone.toString().trim())) {
       alert("Phone number must be exactly 10 digits.");
       return;
     }

     if (!formData.departmentId) {
       alert("Department is required.");
       return;
     }

     if (!formData.specialization.trim()) {
       alert("Specialization is required.");
       return;
     }

     if (!formData.shift) {
       alert("Shift is required.");
       return;
     }

     try {
       const token = localStorage.getItem("token");
       const payload = {
         doctorName: formData.doctorName,
         specialization: formData.specialization,
         phoneNumber: formData.phone,
         shift: formData.shift,
         deptId: formData.departmentId,
       };

       if (editingDoctorId) {
         await API.put(`/doctors/update/${editingDoctorId}`, payload, {
           headers: { Authorization: `Bearer ${token}` },
         });
         alert("Doctor updated successfully!");
       } else {
         await API.post("/doctors/add", payload, {
           headers: { Authorization: `Bearer ${token}` },
         });
         alert("Doctor added successfully!");
       }

       resetForm();
       setShowForm(false);
       fetchDoctors();
     } catch (error) {
       alert(error.response?.data?.message || "Error saving doctor");
     }
   };

   const editDoctor = (doctor) => {
     setFormData({
       doctorName: doctor.doctorName || "",
       phone: doctor.phone || "",
       departmentId: doctor.deptId || doctor.departmentId || "",
       specialization: doctor.specialization || "",
       shift: doctor.shift || "",
     });
     setEditingDoctorId(doctor.doctorId);
     setShowForm(true);
   };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Delete this doctor record?")) return;

    try {
      const token = localStorage.getItem("token");
      await API.delete(`/doctors/delete/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Doctor deleted successfully!");
      fetchDoctors();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting doctor");
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const term = searchTerm.toLowerCase();
    return (
      doctor.doctorName?.toLowerCase().includes(term) ||
      doctor.specialization?.toLowerCase().includes(term) ||
      doctor.departmentName?.toLowerCase().includes(term) ||
      doctor.phone?.toString().includes(term)
    );
  });

    const columns = [
      { key: "doctorId", label: "ID" },
      { key: "doctorName", label: "Name" },
      { key: "specialization", label: "Specialization" },
      { key: "phone", label: "Phone" },
      { key: "shift", label: "Shift" },
      { key: "departmentName", label: "Department" },
    ];

  const actions = isAdmin ? [
    { label: "Edit", type: "edit", onClick: editDoctor },
    { label: "Delete", type: "delete", onClick: (row) => handleDeleteDoctor(row.doctorId) },
  ] : [];

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>
                 {isAdmin ? "Doctors Management" : "Doctors"}
              </h1>
              <p>{isAdmin ? "Manage all hospital doctors" : "View and search doctors"}</p>
            </div>
            {isAdmin && (
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
                {showForm ? "Cancel" : "+ Add Doctor"}
              </button>
            )}
          </div>

          {isAdmin && showForm && (
            <div className="form-container">
              <h3>{editingDoctorId ? "Edit Doctor" : "Add New Doctor"}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Doctor Name"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
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
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
            <input
              type="text"
              placeholder="Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            />
            <select
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
            >
              <option value="">Select Shift</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
            </select>
              </div>
              <button className="btn btn-success" onClick={handleSaveDoctor}>
                {editingDoctorId ? "Update Doctor" : "Add Doctor"}
              </button>
            </div>
          )}

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="loading">Loading doctors...</div>
          ) : (
            <DataTable columns={columns} data={filteredDoctors} actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Doctors;
