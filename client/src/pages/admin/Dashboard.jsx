import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import "../../App.css";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'users', 'activity'
  const [stats, setStats] = useState({
    totalUsers: 0,
    freelancers: 0,
    clients: 0,
    totalJobs: 0,
    openJobs: 0,
    closedJobs: 0,
    totalLogins: 0,
  });
  const [usersList, setUsersList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const name = user?.name || "Admin";

  const reloadAdminData = () => {
    setLoading(true);
    setError("");

    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/activity"),
    ])
      .then(([statsRes, usersRes, actRes]) => {
        setStats(statsRes.data);
        setUsersList(usersRes.data.users || []);
        setActivitiesList(actRes.data.activities || []);
      })
      .catch((err) => {
        console.error("Admin data fetch error:", err);
        setError(
          err.response?.data?.message ||
            "Unable to load administrative data. Please ensure you are logged in with admin credentials."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/activity"),
    ])
      .then(([statsRes, usersRes, actRes]) => {
        if (isMounted) {
          setStats(statsRes.data);
          setUsersList(usersRes.data.users || []);
          setActivitiesList(actRes.data.activities || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Admin data fetch error:", err);
          setError(
            err.response?.data?.message ||
              "Unable to load administrative data. Please ensure you are logged in with admin credentials."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    if (
      !window.confirm(
        `Are you sure you want to change user status to "${newStatus}"?`
      )
    )
      return;

    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      reloadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user status.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="tx-dashboard-layout">
      {/* Sidebar */}
      <aside className="tx-dashboard-sidebar">
        <Link to="/" className="tx-sidebar-brand">
          <span className="tx-brand-icon">
            <span>T</span>X
          </span>
          <span style={{ fontFamily: "var(--tx-font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
            Talent<span className="tx-brand-accent">X</span>
          </span>
        </Link>

        <div className="tx-sidebar-role-badge" style={{ color: "#b45309", backgroundColor: "#fef3c7" }}>
          Platform Admin
        </div>

        <nav className="tx-sidebar-nav">
          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span>▦</span>
            <span>Platform Overview</span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span>👥</span>
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <span>📋</span>
            <span>Login Audit Activity</span>
          </button>

          <Link to="/jobs" className="tx-sidebar-btn">
            <span>🔍</span>
            <span>View Marketplace</span>
          </Link>
        </nav>

        <div className="tx-sidebar-footer">
          <button type="button" onClick={handleLogout} className="tx-btn tx-btn-subtle tx-btn-block">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="tx-dashboard-main">
        {/* Topbar */}
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">
            System / <strong>Administrator Portal</strong>
          </div>

          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}>
              <strong>{name}</strong>
              <span style={{ color: "#d97706", fontWeight: 600 }}>Super Admin</span>
            </div>
            <div className="tx-avatar-badge" style={{ backgroundColor: "#1e293b" }}>
              A
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="tx-dashboard-body">
          {error && (
            <div className="tx-alert tx-alert-danger" style={{ marginBottom: "24px" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Welcome Banner */}
          <div className="tx-welcome-banner" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderColor: "var(--tx-slate-300)" }}>
            <div>
              <h1>TalentX Admin Control Console</h1>
              <p style={{ color: "var(--tx-slate-600)", maxWidth: "620px" }}>
                Live platform operations, user account management, and security audit logs backed directly by MongoDB.
              </p>
            </div>
            <button
              type="button"
              className="tx-btn tx-btn-subtle"
              onClick={reloadAdminData}
            >
              🔄 Refresh Data
            </button>
          </div>

          {/* Stats Cards */}
          <div className="tx-stats-cards-grid">
            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Total Users</div>
              <div className="tx-stat-box-value">{stats.totalUsers}</div>
              <div className="tx-stat-box-desc">
                {stats.freelancers} Freelancers • {stats.clients} Clients
              </div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Marketplace Jobs</div>
              <div className="tx-stat-box-value">{stats.totalJobs}</div>
              <div className="tx-stat-box-desc">
                {stats.openJobs} Open • {stats.closedJobs} Closed
              </div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Security Logins</div>
              <div className="tx-stat-box-value" style={{ color: "var(--tx-green-dark)" }}>
                {stats.totalLogins}
              </div>
              <div className="tx-stat-box-desc">Audited access events</div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>Platform Breakdown & Health</h2>
                  <p className="tx-section-subtitle">
                    Distribution of users and jobs across TalentX.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                {/* Users breakdown card */}
                <div
                  style={{
                    background: "var(--tx-white)",
                    border: "1px solid var(--tx-slate-200)",
                    borderRadius: "var(--tx-radius-lg)",
                    padding: "24px",
                  }}
                >
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "16px" }}>User Distribution</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Freelancers</span>
                      <strong>{stats.freelancers}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Clients</span>
                      <strong>{stats.clients}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Administrators</span>
                      <strong>{stats.totalUsers - (stats.freelancers + stats.clients)}</strong>
                    </div>
                  </div>
                </div>

                {/* Job Breakdown card */}
                <div
                  style={{
                    background: "var(--tx-white)",
                    border: "1px solid var(--tx-slate-200)",
                    borderRadius: "var(--tx-radius-lg)",
                    padding: "24px",
                  }}
                >
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "16px" }}>Jobs & Market Health</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Total Jobs Created</span>
                      <strong>{stats.totalJobs}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Active Open Jobs</span>
                      <strong style={{ color: "var(--tx-green-dark)" }}>{stats.openJobs}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--tx-slate-100)", paddingBottom: "8px" }}>
                      <span>Completed / Closed</span>
                      <strong>{stats.closedJobs}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div
              style={{
                background: "var(--tx-white)",
                border: "1px solid var(--tx-slate-200)",
                borderRadius: "var(--tx-radius-lg)",
                padding: "24px",
                overflowX: "auto",
              }}
            >
              <h2 style={{ fontSize: "1.45rem", marginBottom: "16px" }}>User Accounts</h2>
              {loading ? (
                <p>Loading users...</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--tx-slate-200)", color: "var(--tx-slate-500)", fontSize: "0.85rem" }}>
                      <th style={{ padding: "12px 14px" }}>NAME</th>
                      <th style={{ padding: "12px 14px" }}>EMAIL</th>
                      <th style={{ padding: "12px 14px" }}>ROLE</th>
                      <th style={{ padding: "12px 14px" }}>STATUS</th>
                      <th style={{ padding: "12px 14px" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u._id} style={{ borderBottom: "1px solid var(--tx-slate-100)", fontSize: "0.92rem" }}>
                        <td style={{ padding: "14px", fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: "14px", color: "var(--tx-slate-600)" }}>{u.email}</td>
                        <td style={{ padding: "14px" }}>
                          <span className="tx-role-pill">{u.role}</span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              backgroundColor: u.status === "active" ? "var(--tx-green-light)" : "#fee2e2",
                              color: u.status === "active" ? "var(--tx-green-dark)" : "var(--tx-danger)",
                            }}
                          >
                            {u.status || "active"}
                          </span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          {u.role !== "admin" && (
                            <button
                              type="button"
                              className={`tx-btn tx-btn-sm ${u.status === "active" ? "tx-btn-danger" : "tx-btn-outline"}`}
                              onClick={() => handleToggleStatus(u._id, u.status || "active")}
                            >
                              {u.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: LOGIN ACTIVITY */}
          {activeTab === "activity" && (
            <div
              style={{
                background: "var(--tx-white)",
                border: "1px solid var(--tx-slate-200)",
                borderRadius: "var(--tx-radius-lg)",
                padding: "24px",
                overflowX: "auto",
              }}
            >
              <h2 style={{ fontSize: "1.45rem", marginBottom: "16px" }}>Recent Authentication Activity</h2>
              {loading ? (
                <p>Loading activity logs...</p>
              ) : activitiesList.length === 0 ? (
                <p style={{ color: "var(--tx-slate-500)" }}>No login activity recorded yet.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--tx-slate-200)", color: "var(--tx-slate-500)", fontSize: "0.85rem" }}>
                      <th style={{ padding: "12px 14px" }}>TIMESTAMP</th>
                      <th style={{ padding: "12px 14px" }}>EMAIL</th>
                      <th style={{ padding: "12px 14px" }}>EVENT</th>
                      <th style={{ padding: "12px 14px" }}>REASON</th>
                      <th style={{ padding: "12px 14px" }}>IP ADDRESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitiesList.map((act) => (
                      <tr key={act._id} style={{ borderBottom: "1px solid var(--tx-slate-100)", fontSize: "0.88rem" }}>
                        <td style={{ padding: "12px 14px", color: "var(--tx-slate-500)" }}>
                          {new Date(act.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 500 }}>{act.email}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: act.event === "login_success" ? "var(--tx-green-light)" : "#fee2e2",
                              color: act.event === "login_success" ? "var(--tx-green-dark)" : "var(--tx-danger)",
                            }}
                          >
                            {act.event}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textTransform: "capitalize" }}>{act.reason}</td>
                        <td style={{ padding: "12px 14px", color: "var(--tx-slate-500)" }}>{act.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}