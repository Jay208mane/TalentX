import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import JobCard from "../../components/JobCard";
import api from "../../services/api";
import "../../App.css";

export default function FreelancerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recommended");
  const [jobs, setJobs] = useState([]);
  const [proposals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("talentx_proposals") || "[]");
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const name = user?.name || "Freelancer";
  const firstName = name.split(" ")[0];

  useEffect(() => {
    // Fetch recommended jobs from backend
    api
      .get("/jobs")
      .then((res) => {
        if (res.data?.jobs) {
          setJobs(res.data.jobs);
        }
      })
      .catch(() => {
        // Fallback demo jobs if none
        setJobs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

        <div className="tx-sidebar-role-badge">Freelancer Workspace</div>

        <nav className="tx-sidebar-nav">
          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "recommended" ? "active" : ""}`}
            onClick={() => setActiveTab("recommended")}
          >
            <span>▦</span>
            <span>Dashboard Overview</span>
          </button>

          <Link to="/jobs" className="tx-sidebar-btn">
            <span>⌕</span>
            <span>Find Work</span>
          </Link>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "proposals" ? "active" : ""}`}
            onClick={() => setActiveTab("proposals")}
          >
            <span>▤</span>
            <span>My Proposals ({proposals.length})</span>
          </button>

          <Link to="/profile" className="tx-sidebar-btn">
            <span>👤</span>
            <span>My Profile</span>
          </Link>
        </nav>

        <div className="tx-sidebar-footer">
          <button type="button" onClick={handleLogout} className="tx-btn tx-btn-subtle tx-btn-block">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="tx-dashboard-main">
        {/* Topbar */}
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">
            Workspace / <strong>Freelancer Dashboard</strong>
          </div>

          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}>
              <strong>{name}</strong>
              <span>Freelancer Account</span>
            </div>
            <div className="tx-avatar-badge">{name[0]}</div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="tx-dashboard-body">
          {/* Welcome Banner */}
          <div className="tx-welcome-banner">
            <div>
              <h1>Welcome back, {firstName}!</h1>
              <p style={{ color: "var(--tx-slate-600)", maxWidth: "580px" }}>
                Ready to take on your next challenge? Browse open jobs tailored to
                your skill profile or review submitted proposals.
              </p>
            </div>
            <Link to="/jobs" className="tx-btn tx-btn-primary tx-btn-lg">
              Explore Live Jobs ↗
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="tx-stats-cards-grid">
            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Active Proposals</div>
              <div className="tx-stat-box-value">{proposals.length}</div>
              <div className="tx-stat-box-desc">Submitted applications</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Available Jobs</div>
              <div className="tx-stat-box-value">{jobs.length}</div>
              <div className="tx-stat-box-desc">Open marketplace listings</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Profile Status</div>
              <div className="tx-stat-box-value" style={{ fontSize: "1.5rem", color: "var(--tx-green)" }}>
                Active
              </div>
              <div className="tx-stat-box-desc">Verified Freelancer account</div>
            </div>
          </div>

          {/* Tabs View */}
          {activeTab === "recommended" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>Recommended Jobs for You</h2>
                  <p className="tx-section-subtitle">
                    Recent opportunities matching high-demand web development and design skills.
                  </p>
                </div>
                <Link to="/jobs" className="tx-btn tx-btn-outline tx-btn-sm">
                  View All Marketplace Jobs →
                </Link>
              </div>

              {loading ? (
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>
                  Loading job recommendations...
                </p>
              ) : jobs.length === 0 ? (
                <div
                  style={{
                    background: "var(--tx-white)",
                    padding: "40px",
                    borderRadius: "var(--tx-radius-lg)",
                    border: "1px solid var(--tx-slate-200)",
                    textAlign: "center",
                  }}
                >
                  <p style={{ color: "var(--tx-slate-600)", marginBottom: "16px" }}>
                    No jobs currently posted in the database. Clients can post new jobs from their Client Dashboard.
                  </p>
                  <Link to="/jobs" className="tx-btn tx-btn-primary">
                    Browse Sample Showcase Jobs
                  </Link>
                </div>
              ) : (
                <div className="tx-cards-grid">
                  {jobs.slice(0, 4).map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "proposals" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>My Submitted Proposals</h2>
                  <p className="tx-section-subtitle">
                    Track the progress and review status of your active job applications.
                  </p>
                </div>
                <Link to="/jobs" className="tx-btn tx-btn-primary tx-btn-sm">
                  Find More Jobs to Apply ↗
                </Link>
              </div>

              {proposals.length === 0 ? (
                <div
                  style={{
                    background: "var(--tx-white)",
                    padding: "48px 24px",
                    borderRadius: "var(--tx-radius-lg)",
                    border: "1px dashed var(--tx-slate-300)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📝</div>
                  <h3 style={{ marginBottom: "6px" }}>No Proposals Submitted Yet</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px" }}>
                    When you apply to jobs, your proposals and bid amounts will appear here.
                  </p>
                  <Link to="/jobs" className="tx-btn tx-btn-primary">
                    Browse Open Jobs
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {proposals.map((prop, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--tx-white)",
                        border: "1px solid var(--tx-slate-200)",
                        borderRadius: "var(--tx-radius-md)",
                        padding: "20px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>
                          {prop.jobTitle}
                        </h4>
                        <div style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>
                          Applied on: {new Date(prop.appliedAt).toLocaleDateString()} • Turnaround: {prop.duration}
                        </div>
                        <p style={{ fontSize: "0.9rem", color: "var(--tx-slate-600)", marginTop: "8px", fontStyle: "italic" }}>
                          "{prop.coverLetter?.slice(0, 100)}..."
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--tx-green-dark)" }}>
                          ${prop.bidAmount}
                        </div>
                        <span className="tx-role-pill" style={{ marginTop: "4px", display: "inline-block" }}>
                          {prop.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}