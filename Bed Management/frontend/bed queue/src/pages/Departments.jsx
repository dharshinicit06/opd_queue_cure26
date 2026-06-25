import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import API from "../api/api";
import "../styles/Pages.css";

function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [formData, setFormData] = useState({
    departmentName: "",
    description: "",
    location: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchDepartments();
  }, [navigate]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await API.get("/departments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.departments) {
        setDepartments(
          res.data.departments.map((dept) => ({
            ...dept,
            departmentId: dept.deptId,
            // normalize backend column `deptName` to frontend `departmentName`
            departmentName: dept.deptName || dept.departmentName || "",
          }))
        );
      }
    } catch (error) {
      console.log("Error fetching departments:", error);
      alert("Failed to load departments: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ departmentName: "", description: "", location: "" });
    setEditingDepartmentId(null);
  };

  const handleSaveDepartment = async () => {
    if (!formData.departmentName.trim()) {
      alert("Department name is required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (editingDepartmentId) {
        await API.put(`/departments/update/${editingDepartmentId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // update local state for edited department
        setDepartments((prev) =>
          prev.map((d) =>
            d.departmentId === editingDepartmentId || d.deptId === editingDepartmentId
              ? { ...d, departmentName: formData.departmentName, description: formData.description, location: formData.location }
              : d
          )
        );
        alert("Department updated successfully!");
      } else {
        const response = await API.post("/departments/add", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // If backend returns the created department, append it immediately
        const newDept = response.data?.department;
        if (newDept) {
          const normalized = {
            ...newDept,
            departmentId: newDept.deptId,
            departmentName: newDept.deptName || newDept.departmentName || formData.departmentName,
          };
          setDepartments((prev) => [normalized, ...prev]);
        } else {
          // fallback: refresh list
          await fetchDepartments();
        }
        alert("Department added successfully!");
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.message || "Error saving department");
    }
  };

  const editDepartment = (dept) => {
    setFormData({
      departmentName: dept.departmentName,
      description: dept.description,
      location: dept.location,
    });
    setEditingDepartmentId(dept.departmentId || dept.deptId);
    setShowForm(true);
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/departments/delete/${departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Department deleted successfully!");
      fetchDepartments();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting department");
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const term = searchTerm.toLowerCase();
    return (
      dept.departmentName?.toLowerCase().includes(term) ||
      dept.description?.toLowerCase().includes(term) ||
      dept.location?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "departmentId", label: "ID" },
    { key: "departmentName", label: "Name" },
    { key: "description", label: "Description" },
    { key: "location", label: "Location" },
  ];

  const actions = [
    { label: "Edit", type: "edit", onClick: editDepartment },
    { label: "Delete", type: "delete", onClick: (row) => handleDeleteDepartment(row.departmentId) },
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
                 Departments Management
              </h1>
              <p>Manage hospital departments</p>
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
              {showForm ? "Cancel" : "+ Add Department"}
            </button>
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {showForm && (
            <div className="form-container">
              <h3>{editingDepartmentId ? "Edit Department" : "Add New Department"}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <button className="btn btn-success" onClick={handleSaveDepartment}>
                {editingDepartmentId ? "Update Department" : "Add Department"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading departments...</div>
          ) : (
            <DataTable columns={columns} data={filteredDepartments} actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Departments;
