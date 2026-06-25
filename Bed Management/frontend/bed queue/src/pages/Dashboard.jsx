import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";
import API from "../api/api";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalStaff: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalAppointments: 0,
    emergencyCases: 0,
    admittedPatients: 0,
    occupancyRate: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await API.get("/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data && res.data.stats) {
        setDashboardData(res.data.stats);
      }
    } catch (error) {
      console.log("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="dashboard-header">
            <h1>
               Hospital Dashboard
            </h1>
            <p>Welcome to Hospital Bed Management System</p>
          </div>

          {loading ? (
            <div className="loading">Loading dashboard...</div>
          ) : (
            <>
              <div className="stats-grid">
                <DashboardCard
                  title="Total Patients"
                  count={dashboardData.totalPatients}
                  icon={<i className="bi bi-people-fill" />}
                  color="#3498db"
                />
                <DashboardCard
                  title="Total Doctors"
                  count={dashboardData.totalDoctors}
                  icon={<i className="bi bi-heart-pulse" />}
                  color="#2ecc71"
                />
                <DashboardCard
                  title="Total Staff"
                  count={dashboardData.totalStaff}
                  icon={<i className="bi bi-person" />}
                  color="#1abc9c"
                />
                <DashboardCard
                  title="Total Beds"
                  count={dashboardData.totalBeds}
                  icon={<i className="bi bi-hospital" />}
                  color="#f39c12"
                />
                <DashboardCard
                  title="Occupied Beds"
                  count={dashboardData.occupiedBeds}
                  icon={<i className="bi bi-check-circle-fill" />}
                  color="#e74c3c"
                />
                <DashboardCard
                  title="Available Beds"
                  count={dashboardData.availableBeds}
                  icon={<i className="bi bi-dash-circle-fill" />}
                  color="#2ecc71"
                />
                <DashboardCard
                  title="Total Appointments"
                  count={dashboardData.totalAppointments}
                  icon={<i className="bi bi-calendar" />}
                  color="#1abc9c"
                />
                <DashboardCard
                  title="Emergency Cases"
                  count={dashboardData.emergencyCases}
                  icon={<i className="bi bi-exclamation-circle-fill" />}
                  color="#e74c3c"
                />
                <DashboardCard
                  title="Active Admissions"
                  count={dashboardData.admittedPatients}
                  icon={<i className="bi bi-person-plus" />}
                  color="#8B5CF6"
                />
              </div>

              <div className="dashboard-footer">
                <div className="quick-stats">
                  <div className="stat-box">
                    <h3>Bed Occupancy Rate</h3>
                    <p className="stat-percentage">
                      {dashboardData.totalBeds > 0
                        ? Math.round((dashboardData.occupiedBeds / dashboardData.totalBeds) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="stat-box">
                    <h3>Staff to Patient Ratio</h3>
                    <p className="stat-percentage">
                      {dashboardData.totalPatients > 0
                        ? (dashboardData.totalStaff / dashboardData.totalPatients).toFixed(2)
                        : 0}
                    </p>
                  </div>
                  <div className="stat-box">
                    <h3>Doctor to Patient Ratio</h3>
                    <p className="stat-percentage">
                      {dashboardData.totalPatients > 0
                        ? (dashboardData.totalDoctors / dashboardData.totalPatients).toFixed(2)
                        : 0}
                    </p>
                  </div>
                  <div className="stat-box">
                    <h3>Bed Occupancy Rate</h3>
                    <p className="stat-percentage">
                      {dashboardData.occupancyRate || (
                        dashboardData.totalBeds > 0
                          ? Math.round((dashboardData.occupiedBeds / dashboardData.totalBeds) * 100)
                          : 0
                      )}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;