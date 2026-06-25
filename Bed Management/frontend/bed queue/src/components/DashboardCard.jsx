import "../styles/Cards.css";

function DashboardCard({ title, count, icon, color }) {
  return (
    <div className="dashboard-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="card-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="card-content">
        <h3>{title}</h3>
        <p className="card-value">{count || 0}</p>
      </div>
    </div>
  );
}

export default DashboardCard;
