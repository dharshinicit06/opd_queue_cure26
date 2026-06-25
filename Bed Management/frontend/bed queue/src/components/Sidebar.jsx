import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Sidebar.css";

function Sidebar() {
  const location = useLocation();
  const { logout, role } = useAuth();

  const menuByRole = {
    Admin: [
      {
        title: "Hospital Operations",
        items: [
          { path: "/patients", label: "Patients", icon: "bi-people-fill" },
          { path: "/departments", label: "Departments", icon: "bi-hospital" },
          { path: "/doctors", label: "Doctors", icon: "bi-person-badge" },
        ],
      },
      {
        title: "Inpatient Management",
        items: [
          { path: "/admissions", label: "Admissions", icon: "bi-person-plus" },
          { path: "/beds", label: "Bed Management", icon: "bi-layers" },
        ],
      },
      {
        title: "Queue Operations",
        items: [
          { path: "/receptionist", label: "Receptionist", icon: "bi-person-badge" },
          { path: "/waiting-room", label: "Waiting Room", icon: "bi-tv" },
          { path: "/opd-analytics", label: "Analytics", icon: "bi-graph-up-arrow" },
        ],
      },
      {
        title: "Administration",
        items: [
          { path: "/staff", label: "Staff", icon: "bi-people" },
          { path: "/appointments", label: "Appointments", icon: "bi-calendar" },
        ],
      },
    ],
    Receptionist: [
      {
        title: "Queue Operations",
        items: [
          { path: "/receptionist", label: "Receptionist Dashboard", icon: "bi-person-badge" },
          { path: "/waiting-room", label: "Waiting Room", icon: "bi-tv" },
        ],
      },
      {
        title: "Doctors",
        items: [
          { path: "/doctors", label: "Doctors", icon: "bi-person-badge" },
        ],
      },
      {
        title: "Patients",
        items: [
          { path: "/patients", label: "Patient Records", icon: "bi-people-fill" },
        ],
      },
    ],
  };

  const sections = menuByRole[role] || menuByRole.Admin;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Navigation</h3>
      </div>
      <ul className="sidebar-menu">
        {sections.map((section) => (
          <li key={section.title} className="sidebar-section">
            <span className="sidebar-section-title">{section.title}</span>
            {section.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            ))}
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <i className="bi bi-box-arrow-right" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
