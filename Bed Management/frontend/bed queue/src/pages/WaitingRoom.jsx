import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/api";
import { connectSocket, onQueueUpdated } from "../services/socket";
import "../styles/Pages.css";
import "../styles/WaitingRoom.css";

function WaitingRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentServing, setCurrentServing] = useState(null);
  const [overview, setOverview] = useState({ waitingCount: 0, servingCount: 0, completedCount: 0, currentToken: null, emergencyCount: 0 });
  const [tokenInput, setTokenInput] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  const lookupTokenRef = useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [currentRes, overviewRes] = await Promise.all([
        API.get("/waiting-room/current", { headers }),
        API.get("/waiting-room/overview", { headers }),
      ]);

      if (currentRes.data?.success) setCurrentServing(currentRes.data.current);
      if (overviewRes.data?.success) setOverview(overviewRes.data.overview);
    } catch (error) {
      console.log("Error fetching waiting room data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const doLookup = useCallback(async (tokenNumber) => {
    if (!tokenNumber) return;
    try {
      setLookupError("");
      lookupTokenRef.current = tokenNumber;
      const headers = getHeaders();
      const res = await API.get(`/waiting-room/lookup/${encodeURIComponent(tokenNumber)}`, { headers });
      if (res.data?.success) {
        setLookupResult(res.data.token);
      } else {
        setLookupError(res.data?.message || "Token not found");
        setLookupResult(null);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setLookupError("Invalid or expired token.");
      } else {
        setLookupError(error.response?.data?.message || "Error looking up token");
      }
      setLookupResult(null);
    }
  }, []);

  const refreshLookup = useCallback(async () => {
    const tn = lookupTokenRef.current;
    if (!tn) return;
    try {
      const headers = getHeaders();
      const res = await API.get(`/waiting-room/lookup/${encodeURIComponent(tn)}`, { headers });
      if (res.data?.success) {
        setLookupResult(res.data.token);
      }
    } catch (error) {
      console.log("Error refreshing lookup:", error);
    }
  }, []);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setTokenInput(urlToken.toUpperCase());
      setIsScanMode(true);
      doLookup(urlToken);
    }
  }, [searchParams, doLookup]);

  useEffect(() => {
    fetchData();
    const socket = connectSocket();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    setConnected(socket.connected);

    const cleanup = onQueueUpdated(() => {
      fetchData();
      refreshLookup();
    });

    return () => {
      cleanup();
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [fetchData, refreshLookup]);

  useEffect(() => {
    if (!isScanMode) return;
    const interval = setInterval(refreshLookup, 30000);
    return () => clearInterval(interval);
  }, [isScanMode, refreshLookup]);

  const handleLookup = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setLookupError("Please enter a valid token number");
      setLookupResult(null);
      return;
    }
    setIsScanMode(false);
    await doLookup(trimmed);
  };

  const handleClearLookup = () => {
    setTokenInput("");
    setLookupResult(null);
    setLookupError("");
    lookupTokenRef.current = null;
    setIsScanMode(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLookup();
  };

  return (
    <div className={`dashboard-wrapper ${isScanMode ? "scan-mode" : ""}`}>
      <Navbar />
      <div className="dashboard-container">
        {!isScanMode && <Sidebar />}
        <div className={`main-content ${isScanMode ? "scan-content" : ""}`}>
          <div className="page-header">
            <div>
              <h1>Patient Waiting Room</h1>
              {!isScanMode && <p>OPD Queue Status Display</p>}
              {isScanMode && <p>Track your queue status in real-time</p>}
            </div>
            <div className="page-header-actions">
              <span className={`connection-status ${connected ? "connected" : "disconnected"}`}>
                <i className={`bi ${connected ? "bi-wifi" : "bi-wifi-off"}`} />
                {connected ? "Live" : "Reconnecting..."}
              </span>
            </div>
          </div>

          <div className={`waiting-room-grid ${isScanMode ? "scan-layout" : ""}`}>
            {!isScanMode && (
              <div className="waiting-room-main">
                <div className="now-serving-card">
                  <div className="now-serving-label">Now Serving</div>
                  {currentServing ? (
                    <>
                      <div className="now-serving-token">#{currentServing.tokenNumber}</div>
                      <div className="now-serving-name">{currentServing.patientName}</div>
                      <div className="now-serving-doctor">
                        <i className="bi bi-person-badge" /> {currentServing.doctorName}
                      </div>
                      {currentServing.priority && (
                        <span className={`badge badge-priority-${currentServing.priority === "Emergency" ? "emergency" : "normal"} now-serving-priority`}>
                          <i className={`bi ${currentServing.priority === "Emergency" ? "bi-exclamation-triangle-fill" : "bi-person-fill"}`} />
                          {currentServing.priority}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="now-serving-empty">
                      <i className="bi bi-clock-history" />
                      <p>No patient currently being served</p>
                    </div>
                  )}
                </div>

                <div className="status-cards-row">
                  <div className="status-card status-card-waiting">
                    <div className="status-card-value">{overview.waitingCount}</div>
                    <div className="status-card-label">Waiting</div>
                  </div>
                  <div className="status-card status-card-emergency">
                    <div className="status-card-value">{overview.emergencyCount}</div>
                    <div className="status-card-label">Emergency</div>
                  </div>
                  <div className="status-card status-card-serving">
                    <div className="status-card-value">{overview.servingCount}</div>
                    <div className="status-card-label">Serving</div>
                  </div>
                  <div className="status-card status-card-done">
                    <div className="status-card-value">{overview.completedCount}</div>
                    <div className="status-card-label">Completed</div>
                  </div>
                </div>
              </div>
            )}

            <div className={`waiting-room-side ${isScanMode ? "scan-side-full" : ""}`}>
              <div className="token-lookup-card">
                {!isScanMode && (
                  <>
                    <h3><i className="bi bi-search" /> Check Your Token</h3>
                    <p className="lookup-hint">Enter your token number to see your position and estimated wait time.</p>
                  </>
                )}
                {isScanMode && (
                  <div className="scan-header">
                    <div className="scan-badge">
                      <i className="bi bi-qr-code-scan" /> QR Scanned
                    </div>
                  </div>
                )}
                <div className="lookup-input-group">
                  <input
                    type="text"
                    placeholder="Enter Token Number (e.g. 101 or E001)"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    className="form-control"
                  />
                  <button className="btn btn-primary" onClick={handleLookup}>
                    <i className="bi bi-arrow-right" /> Check
                  </button>
                  {lookupResult && (
                    <button className="btn btn-secondary" onClick={handleClearLookup} title="Clear">
                      <i className="bi bi-x-lg" />
                    </button>
                  )}
                </div>

                {lookupError && (
                  <div className="lookup-error">
                    <i className="bi bi-exclamation-circle" /> {lookupError}
                  </div>
                )}

                {lookupResult && (
                  <div className="lookup-result scan-result">
                    <div className="lookup-result-header">
                      <div className="lookup-token-info">
                        <span className="lookup-token-label">Your Token</span>
                        <span className="lookup-token-number">#{lookupResult.tokenNumber}</span>
                      </div>
                  {lookupResult.priority === "Emergency" && (
                    <span className="badge badge-priority-emergency" style={{ marginRight: 8 }}>
                      <i className="bi bi-exclamation-triangle-fill" /> Emergency
                    </span>
                  )}
                  <span className={`badge badge-${(lookupResult.status || "").toLowerCase()}`}>
                    {lookupResult.status}
                  </span>
                    </div>

                    <div className="wait-time-grid">
                      <div className="wait-time-item">
                        <span className="wait-time-label">Current Token</span>
                        <span className="wait-time-value">
                          {lookupResult.currentToken ? `#${lookupResult.currentToken}` : "None"}
                        </span>
                      </div>
                      <div className="wait-time-item">
                        <span className="wait-time-label">Your Token</span>
                        <span className="wait-time-value">#{lookupResult.tokenNumber}</span>
                      </div>
                      <div className="wait-time-item highlight">
                        <span className="wait-time-label">Tokens Ahead</span>
                        <span className="wait-time-value">{lookupResult.tokensAhead}</span>
                      </div>
                      <div className="wait-time-item highlight">
                        <span className="wait-time-label">Est. Wait Time</span>
                        <span className="wait-time-value wait-time-estimate">
                          {lookupResult.estimatedWait > 0
                            ? `~${lookupResult.estimatedWait} min`
                            : "Now"}
                        </span>
                      </div>
                    </div>

                    {lookupResult.message && (
                      <div className={`lookup-status-message ${lookupResult.status === "Waiting" ? "waiting" : lookupResult.status === "Serving" ? "serving" : lookupResult.status === "Skipped" ? "skipped" : "completed"}`}>
                        <i className="bi bi-info-circle-fill" /> {lookupResult.message}
                      </div>
                    )}

                    <div className="lookup-details">
                      <div className="lookup-detail-item">
                        <span className="lookup-detail-label">Patient</span>
                        <span className="lookup-detail-value">{lookupResult.patientName}</span>
                      </div>
                      <div className="lookup-detail-item">
                        <span className="lookup-detail-label">Doctor</span>
                        <span className="lookup-detail-value">{lookupResult.doctorName}</span>
                      </div>
                      {lookupResult.priority && (
                        <div className="lookup-detail-item">
                          <span className="lookup-detail-label">Priority</span>
                          <span className="lookup-detail-value">
                            <span className={`badge badge-priority-${lookupResult.priority === "Emergency" ? "emergency" : "normal"}`}>
                              <i className={`bi ${lookupResult.priority === "Emergency" ? "bi-exclamation-triangle-fill" : "bi-person-fill"}`} />
                              {lookupResult.priority}
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="lookup-detail-item">
                        <span className="lookup-detail-label">Avg Consultation</span>
                        <span className="lookup-detail-value">{lookupResult.avgConsultationTime} min</span>
                      </div>
                    </div>

                    {isScanMode && (
                      <div className="scan-refresh-notice">
                        <i className="bi bi-arrow-clockwise" /> Auto-refreshing every 30s
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isScanMode && (
                <div className="waiting-info-card">
                  <h3><i className="bi bi-info-circle" /> How It Works</h3>
                  <ul className="waiting-info-list">
                    <li><i className="bi bi-1-circle" /> Get your token from the receptionist</li>
                    <li><i className="bi bi-2-circle" /> Enter your token number above to check your position</li>
                    <li><i className="bi bi-3-circle" /> Wait until your token number is called</li>
                    <li><i className="bi bi-4-circle" /> Proceed to the designated doctor's room</li>
                  </ul>
                  <p className="waiting-info-note">
                    <i className="bi bi-clock" /> Estimated wait time is calculated based on the
                    average consultation time set by the receptionist.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaitingRoom;
