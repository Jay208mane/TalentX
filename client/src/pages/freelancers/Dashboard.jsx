import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../context/useAuth";
import JobCard from "../../components/JobCard";
import api from "../../services/api";
import "../../App.css";

export default function FreelancerDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("recommended");
  const [jobs, setJobs] = useState([]);

  const [proposals] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("talentx_proposals") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);

  const name = user?.name || "Freelancer";
  const firstName = name.split(" ")[0];

  useEffect(() => {
    api
      .get("/jobs")
      .then((res) => {
        setJobs(
          Array.isArray(res.data?.jobs)
            ? res.data.jobs
            : []
        );
      })
      .catch(() => {
        setJobs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="freelancer-dashboard-content">

      {/* Welcome Banner */}
      <div className="tx-welcome-banner">
        <div>
          <h1>Welcome back, {firstName}!</h1>
          <p
            style={{
              color: "var(--tx-slate-600)",
              maxWidth: "580px",
            }}
          >
            Ready to take on your next challenge? Browse open
            jobs tailored to your skill profile or review
            submitted proposals.
          </p>
        </div>

        <Link
          to="/freelancer/jobs"
          className="tx-btn tx-btn-primary tx-btn-lg"
        >
          Explore Live Jobs ↗
        </Link>
      </div>

      {/* Statistics */}
      <div className="tx-stats-cards-grid">
        <div className="tx-stat-box">
          <div className="tx-stat-box-title">
            Active Proposals
          </div>
          <div className="tx-stat-box-value">
            {proposals.length}
          </div>
          <div className="tx-stat-box-desc">
            Submitted applications
          </div>
        </div>

        <div className="tx-stat-box">
          <div className="tx-stat-box-title">
            Available Jobs
          </div>
          <div className="tx-stat-box-value">
            {jobs.length}
          </div>
          <div className="tx-stat-box-desc">
            Open marketplace listings
          </div>
        </div>

        <div className="tx-stat-box">
          <div className="tx-stat-box-title">
            Profile Status
          </div>
          <div
            className="tx-stat-box-value"
            style={{
              fontSize: "1.5rem",
              color: "var(--tx-green)",
            }}
          >
            Active
          </div>
          <div className="tx-stat-box-desc">
            Freelancer account status
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="tx-dashboard-tabs">
        <button
          type="button"
          className={`tx-sidebar-btn ${activeTab === "recommended" ? "active" : ""
            }`}
          onClick={() => setActiveTab("recommended")}
        >
          Recommended Jobs
        </button>

        <button
          type="button"
          className={`tx-sidebar-btn ${activeTab === "proposals" ? "active" : ""
            }`}
          onClick={() => setActiveTab("proposals")}
        >
          My Proposals ({proposals.length})
        </button>
      </div>

      {/* Recommended Jobs */}
      {activeTab === "recommended" && (
        <section>
          <div
            className="tx-section-header"
            style={{ marginBottom: "20px" }}
          >
            <div>
              <h2 style={{ fontSize: "1.45rem" }}>
                Recommended Jobs for You
              </h2>
              <p className="tx-section-subtitle">
                Explore opportunities matching your skills.
              </p>
            </div>

            <Link
              to="/freelancer/jobs"
              className="tx-btn tx-btn-outline tx-btn-sm"
            >
              View All Jobs →
            </Link>
          </div>

          {loading ? (
            <p style={{ color: "var(--tx-slate-500)" }}>
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
              <h3>No jobs available yet</h3>

              <p
                style={{
                  color: "var(--tx-slate-600)",
                  margin: "12px 0 20px",
                }}
              >
                New opportunities will appear here when jobs
                are available in the marketplace.
              </p>

              <Link
                to="/freelancer/jobs"
                className="tx-btn tx-btn-primary"
              >
                Find Work
              </Link>
            </div>
          ) : (
            <div className="tx-cards-grid">
              {jobs.slice(0, 4).map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Submitted Proposals */}
      {activeTab === "proposals" && (
        <section>
          <div
            className="tx-section-header"
            style={{ marginBottom: "20px" }}
          >
            <div>
              <h2 style={{ fontSize: "1.45rem" }}>
                My Submitted Proposals
              </h2>

              <p className="tx-section-subtitle">
                Track your job applications and proposal status.
              </p>
            </div>

            <Link
              to="/freelancer/jobs"
              className="tx-btn tx-btn-primary tx-btn-sm"
            >
              Find More Jobs ↗
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
              <h3>No Proposals Submitted Yet</h3>

              <p
                style={{
                  color: "var(--tx-slate-500)",
                  margin: "12px 0 20px",
                }}
              >
                Your submitted proposals will appear here.
              </p>

              <Link
                to="/freelancer/jobs"
                className="tx-btn tx-btn-primary"
              >
                Browse Open Jobs
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {proposals.map((prop, idx) => (
                <div
                  key={prop._id || idx}
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
                    <h4
                      style={{
                        fontSize: "1.1rem",
                        marginBottom: "4px",
                      }}
                    >
                      {prop.jobTitle || "Untitled Job"}
                    </h4>

                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--tx-slate-500)",
                      }}
                    >
                      Applied on:{" "}
                      {prop.appliedAt
                        ? new Date(
                          prop.appliedAt
                        ).toLocaleDateString()
                        : "Date unavailable"}
                      {" "}• Turnaround: {prop.duration || "Not specified"}
                    </div>

                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--tx-slate-600)",
                        marginTop: "8px",
                        fontStyle: "italic",
                      }}
                    >
                      {prop.coverLetter
                        ? `${prop.coverLetter.slice(0, 100)}...`
                        : "No cover letter provided."}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "var(--tx-green-dark)",
                      }}
                    >
                      ${prop.bidAmount ?? 0}
                    </div>

                    <span
                      className="tx-role-pill"
                      style={{
                        marginTop: "4px",
                        display: "inline-block",
                      }}
                    >
                      {prop.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
