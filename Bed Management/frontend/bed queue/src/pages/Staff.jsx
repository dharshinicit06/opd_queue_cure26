import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import API from "../api/api";
import "../styles/Pages.css";

function Staff() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [formData, setFormData] = useState({
    staffName: "",
    phone: "",
    role: "",
    shiftTiming: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchStaff();
  }, [navigate]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await API.get("/staff/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.staff) {
        setStaff(
          res.data.staff.map((member) => ({
            ...member,
            phone: member.phoneNumber || member.phone || "",
            position: member.role || member.position || "",
            managedBy: member.adminName || member.department || "",
          }))
        );
      }
    } catch (error) {
      console.log("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ staffName: "", phone: "", role: "", shiftTiming: "" });
    setEditingStaffId(null);
  };

  const handleSaveStaff = async () => {
    if (!formData.staffName.trim()) {
      alert("Staff name is required.");
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.phone.toString().trim())) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    if (!formData.role.trim()) {
      alert("Role is required.");
      return;
    }

    if (!formData.shiftTiming) {
      alert("Shift is required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        staffName: formData.staffName,
        role: formData.role,
        phoneNumber: formData.phone,
        shiftTiming: formData.shiftTiming,
      };

      if (editingStaffId) {
        await API.put(`/staff/update/${editingStaffId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Staff member updated successfully!");
      } else {
        await API.post("/staff/add", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Staff member added successfully!");
      }

      resetForm();
      setShowForm(false);
      fetchStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving staff");
    }
  };

  const editStaff = (member) => {
    setFormData({
      staffName: member.staffName || "",
      phone: member.phone || "",
      role: member.role || member.position || "",
      shiftTiming: member.shiftTiming || "",
    });
    setEditingStaffId(member.staffId);
    setShowForm(true);
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Delete this staff member?")) return;
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/staff/delete/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Staff member deleted successfully!");
      fetchStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting staff");
    }
  };

  const filteredStaff = staff.filter((member) => {
    const term = searchTerm.toLowerCase();
    return (
      member.staffName?.toLowerCase().includes(term) ||
      member.position?.toLowerCase().includes(term) ||
      member.managedBy?.toLowerCase().includes(term) ||
      member.phone?.toString().includes(term)
    );
  });

  const columns = [
    { key: "staffId", label: "ID" },
    { key: "staffName", label: "Name" },
    { key: "position", label: "Role" },
    { key: "phone", label: "Phone" },
    { key: "shiftTiming", label: "Shift" },
    { key: "managedBy", label: "Managed By" },
  ];

  const actions = [
    { label: "Edit", type: "edit", onClick: editStaff },
    { label: "Delete", type: "delete", onClick: (row) => handleDeleteStaff(row.staffId) },
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
                 Staff Management
              </h1>
              <p>Manage hospital staff members</p>
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
              {showForm ? "Cancel" : "+ Add Staff"}
            </button>
          </div>

          {showForm && (
            <div className="form-container">
              <h3>{editingStaffId ? "Edit Staff Member" : "Add New Staff Member"}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={formData.staffName}
                  onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone (10 digits)"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: value });
                  }}
                />
            <input
              type="text"
              placeholder="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
            <select
              value={formData.shiftTiming}
              onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
            >
              <option value="">Select Shift</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
            </select>
              </div>
              <button className="btn btn-success" onClick={handleSaveStaff}>
                {editingStaffId ? "Update Staff" : "Add Staff"}
              </button>
            </div>
          )}

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="loading">Loading staff...</div>
          ) : (
            <DataTable columns={columns} data={filteredStaff} actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Staff;
