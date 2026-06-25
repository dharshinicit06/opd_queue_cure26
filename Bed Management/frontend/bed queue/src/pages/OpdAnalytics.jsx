import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import API from "../api/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { connectSocket, disconnectSocket, onQueueUpdated } from "../services/socket";
import "../styles/OpdAnalytics.css";

const PIE_COLORS = ["#F59E0B", "#2563EB", "#22C55E"];
const STATUS_LABELS = { Waiting: "Waiting", Serving: "Serving", Completed: "Completed" };

const formatTime = (dt) => {
  const d = new Date(dt);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

function OpdAnalytics() {
  const [summary, setSummary] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [doctorLoad, setDoctorLoad] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorSort, setDoctorSort] = useState({ key: null, dir: "asc" });

  const fetchAll = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [s, h, d, dist, act] = await Promise.all([
        API.get("/opd-analytics/summary", { headers }),
        API.get("/opd-analytics/hourly-trend", { headers }),
        API.get("/opd-analytics/doctor-load", { headers }),
        API.get("/opd-analytics/status-distribution", { headers }),
        API.get("/opd-analytics/recent-activity", { headers }),
      ]);
      setSummary(s.data.summary);
      setHourlyData(h.data.hourlyData);
      setDoctorLoad(d.data.doctorLoad);
      setDistribution(dist.data.distribution);
      setActivity(act.data.activity);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    connectSocket();
    const unsubscribe = onQueueUpdated(fetchAll);
    return () => { unsubscribe(); disconnectSocket(); };
  }, [fetchAll]);

  const totalPatients = summary
    ? (summary.patientsWaiting || 0) + (summary.patientsServedToday || 0) + (distribution.find(d => d.status === "Serving")?.count || 0)
    : 0;

  const distChartData = distribution.map(d => ({
    name: STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  const distTotal = distChartData.reduce((s, d) => s + d.value, 0);

  const sortedDoctors = [...doctorLoad]
    .filter(d => d.doctorName.toLowerCase().includes(doctorSearch.toLowerCase()))
    .sort((a, b) => {
      if (!doctorSort.key) return 0;
      const va = a[doctorSort.key], vb = b[doctorSort.key];
      return doctorSort.dir === "asc" ? va - vb : vb - va;
    });

  const handleSort = (key) => {
    setDoctorSort(prev => prev.key === key && prev.dir === "asc" ? { key, dir: "desc" } : { key, dir: "asc" });
  };

  const SortIcon = ({ column }) => (
    <span className="sort-icon">{doctorSort.key === column ? (doctorSort.dir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
  );

  return (
    <div className="analytics-layout">
      <Navbar />
      <div className="analytics-body">
        <Sidebar />
        <main className="analytics-main">
          <div className="analytics-header">
            <h1 className="analytics-title">OPD Analytics Dashboard</h1>
            <p className="analytics-subtitle">Real-time queue performance and patient flow overview</p>
          </div>

          {loading ? (
            <div className="analytics-loading"><div className="spinner" /></div>
          ) : (
            <>
              {/* KPI Cards */}
              <section className="kpi-grid">
                <div className="kpi-card kpi-waiting">
                  <div className="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></div>
                  <div className="kpi-body">
                    <span className="kpi-value">{summary?.patientsWaiting ?? 0}</span>
                    <span className="kpi-label">Patients Waiting</span>
                  </div>
                </div>
                <div className="kpi-card kpi-serving">
                  <div className="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg></div>
                  <div className="kpi-body">
                    <span className="kpi-value">{distribution.find(d => d.status === "Serving")?.count ?? 0}</span>
                    <span className="kpi-label">Currently Serving</span>
                  </div>
                </div>
                <div className="kpi-card kpi-completed">
                  <div className="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                  <div className="kpi-body">
                    <span className="kpi-value">{summary?.patientsServedToday ?? 0}</span>
                    <span className="kpi-label">Completed Today</span>
                  </div>
                </div>
                <div className="kpi-card kpi-emergency">
                  <div className="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                  <div className="kpi-body">
                    <span className="kpi-value">{summary?.emergencyTotal ?? 0}</span>
                    <span className="kpi-label">Emergency Patients</span>
                  </div>
                </div>
              </section>

              {/* Status Bar */}
              <section className="status-bar">
                <span className="status-bar-title">Current Queue Status</span>
                <div className="status-badges">
                  <span className="badge badge-waiting">Waiting: {summary?.patientsWaiting ?? 0}</span>
                  <span className="badge badge-serving">Serving: {distribution.find(d => d.status === "Serving")?.count ?? 0}</span>
                  <span className="badge badge-completed">Completed: {summary?.patientsServedToday ?? 0}</span>
                  <span className="badge badge-emergency">Emergency: {summary?.emergencyTotal ?? 0}</span>
                  <span className="badge badge-total">Total: {totalPatients}</span>
                </div>
              </section>

              {/* Charts */}
              <section className="charts-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Hourly Patient Arrivals</h3>
                    <span className="chart-badge">Today</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={hourlyData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748B" }} interval={3} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                      <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Queue Status Distribution</h3>
                    <span className="chart-badge">Live</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={distChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={4} dataKey="value">
                        {distChartData.map((_entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} formatter={(val, name) => [`${val} patients`, name]} />
                      <Legend
                        verticalAlign="bottom"
                        height={44}
                        formatter={(value) => <span style={{ color: "#475569", fontSize: 13 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-labels">
                    {distChartData.map((d, i) => (
                      <div key={i} className="pie-label-row">
                        <span className="pie-dot" style={{ background: PIE_COLORS[i] }} />
                        <span className="pie-name">{d.name}</span>
                        <span className="pie-count">{d.value}</span>
                        <span className="pie-pct">({distTotal ? Math.round(d.value / distTotal * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Doctor Workload + Recent Activity */}
              <section className="bottom-grid">
                <div className="chart-card doctor-card">
                  <div className="chart-header">
                    <h3>Doctor Workload</h3>
                    <input
                      className="doctor-search"
                      type="text"
                      placeholder="Search doctor..."
                      value={doctorSearch}
                      onChange={e => setDoctorSearch(e.target.value)}
                    />
                  </div>
                  <div className="doctor-table-wrap">
                    <table className="doctor-table">
                      <thead>
                        <tr>
                          <th>Doctor Name</th>
                          <th onClick={() => handleSort("waiting")} className="sortable">Waiting <SortIcon column="waiting" /></th>
                          <th onClick={() => handleSort("serving")} className="sortable">Serving <SortIcon column="serving" /></th>
                          <th onClick={() => handleSort("completed")} className="sortable">Completed <SortIcon column="completed" /></th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDoctors.length === 0 ? (
                          <tr><td colSpan={5} className="empty-cell">No doctors found</td></tr>
                        ) : sortedDoctors.map(d => (
                          <tr key={d.doctorId}>
                            <td className="doctor-name">{d.doctorName}</td>
                            <td><span className="tb-waiting">{d.waiting}</span></td>
                            <td><span className="tb-serving">{d.serving}</span></td>
                            <td><span className="tb-completed">{d.completed}</span></td>
                            <td className="tb-total">{d.waiting + d.serving + d.completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="chart-card activity-card">
                  <div className="chart-header">
                    <h3>Recent Activity</h3>
                    <span className="chart-badge">Latest 10</span>
                  </div>
                  <div className="activity-timeline">
                    {activity.length === 0 ? (
                      <div className="empty-cell" style={{ padding: "40px 0", textAlign: "center" }}>No activity yet today</div>
                    ) : activity.map((a, i) => (
                      <div key={i} className={`activity-item activity-${a.status.toLowerCase()}`}>
                        <div className="activity-dot" />
                        <div className="activity-content">
                          <div className="activity-header-row">
                            <span className="activity-action">{a.action}</span>
                            <span className="activity-time">{formatTime(a.time)}</span>
                          </div>
                          <span className="activity-desc">{a.patientName} &middot; Token {a.tokenNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default OpdAnalytics;
