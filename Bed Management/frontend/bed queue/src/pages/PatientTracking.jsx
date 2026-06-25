import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import { onQueueUpdated } from "../services/socket";
import "../styles/PatientTracking.css";

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

function PatientTracking() {
  const { trackingCode } = useParams();
  const navigate = useNavigate();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trackingCode) {
      navigate("/login");
      return;
    }

    fetchTrackingData();

    onQueueUpdated(() => {
      fetchTrackingData();
    });
  }, [trackingCode, navigate]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/track/${trackingCode}`);
      if (res.data.currentPatient) {
        setQueueData(res.data.currentPatient);
      } else {
        setError(res.data.message || "No patient found with this tracking code");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Error fetching tracking data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="loading">Loading tracking data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="error-message">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate("/login")} className="btn-login">Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (!queueData) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="no-data">
            <h2>No Active Token</h2>
            <p>Your token is not currently active or has been completed.</p>
            <button onClick={() => navigate("/login")} className="btn-login">Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-wrapper">
      <div className="tracking-container">
        <div className="tracking-header">
          <h1>Patient Queue Status</h1>
          <p>Tracking Code: {trackingCode}</p>
        </div>

        <div className="tracking-content">
          <div className="token-info-card">
            <div className="token-ring">
              <span className="token-number">{queueData.tokenNumber}</span>
            </div>
            <div className="token-details">
              <div className="detail-row">
                <span className="detail-label">Patient Name:</span>
                <span className="detail-value">{queueData.patientName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Doctor:</span>
                <span className="detail-value">{queueData.doctorName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Priority:</span>
                <span className="detail-value priority-badge {queueData.priority === 'Emergency' ? 'emergency' : 'normal'}">
                  {queueData.priority === 'Emergency' ? '🚨 Emergency' : '📋 Normal'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Wait Time:</span>
                <span className={`detail-value ${waitingTimeColor(queueData.waitingMinutes)}`}>
                  {queueData.waitingMinutes ?? 0} minutes
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-badge ${queueData.status?.toLowerCase() || 'waiting'}`}>
                  {queueData.status === 'Waiting' ? '⏳ Waiting' : queueData.status === 'Serving' ? '👨‍⚕️ Serving' : '✅ Completed'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estimated Wait Time:</span>
                <span className="detail-value">
                  {queueData.priority === 'Emergency' ? 'Immediate' : queueData.estimatedWait != null ? `${queueData.estimatedWait} minutes` : 'Calculating...'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tokens Ahead:</span>
                <span className="detail-value">
                  {queueData.tokensAhead != null ? queueData.tokensAhead : queueData.status === 'Serving' ? '0' : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="queue-info-cards">
            <div className="info-card">
              <div className="info-icon">📊</div>
              <div className="info-content">
                <h3>Current Status</h3>
                <p className={`status-text ${queueData.status?.toLowerCase() || 'waiting'}`}>{queueData.status}</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⏱️</div>
              <div className="info-content">
                <h3>Wait Time</h3>
                <p className={waitingTimeColor(queueData.waitingMinutes)}>{queueData.waitingMinutes ?? 0} min</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">👨‍⚕️</div>
              <div className="info-content">
                <h3>Doctor</h3>
                <p>{queueData.doctorName}</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">📋</div>
              <div className="info-content">
                <h3>Priority</h3>
                <p>{queueData.priority}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientTracking;
