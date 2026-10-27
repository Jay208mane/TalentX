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

  const [proposals, setProposals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openProjects, setOpenProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const name = user?.name || "Freelancer";
  const firstName = name.split(" ")[0];

  const reloadData = () => {
    Promise.all([
      api.get("/jobs").catch(() => ({ data: { jobs: [] } })),
      api.get("/proposals/mine").catch(() => ({ data: { proposals: [] } })),
      api.get("/projects/mine").catch(() => ({ data: { projects: [] } })),
      api.get("/projects/open").catch(() => ({ data: { projects: [] } })),
    ])
      .then(([jobsRes, proposalsRes, projectsRes, openRes]) => {
        setJobs(Array.isArray(jobsRes.data?.jobs) ? jobsRes.data.jobs : []);
        setProposals(Array.isArray(proposalsRes.data?.proposals) ? proposalsRes.data.proposals : []);
        setProjects(Array.isArray(projectsRes.data?.projects) ? projectsRes.data.projects : []);
        setOpenProjects(Array.isArray(openRes.data?.projects) ? openRes.data.projects : []);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleClaimProject = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/claim`);
      alert("Project accepted! Work has begun with zero upfront fees. You can demand payout after completion.");
      reloadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to accept project.");
    }
  };

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

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/freelancer/profile"
            className="tx-btn tx-btn-outline tx-btn-lg"
            style={{
              borderColor: "var(--tx-green)",
              color: "var(--tx-green-dark)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>✨</span>
            <span>Enhance Profile with GenAI</span>
          </Link>
          <Link
            to="/freelancer/jobs"
            className="tx-btn tx-btn-primary tx-btn-lg"
          >
            Explore Live Jobs ↗
          </Link>
        </div>
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

        <div className="tx-stat-box">
          <div className="tx-stat-box-title">Active Projects</div>
          <div className="tx-stat-box-value">{projects.length}</div>
          <div className="tx-stat-box-desc">Accepted client projects</div>
        </div>
      </div>

      {/* Open Client Projects (Zero Upfront • Direct Completion) */}
      {openProjects.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <div className="tx-section-header" style={{ marginBottom: "14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.35rem", margin: 0 }}>Open Projects to Build</h2>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "2px 8px",
                    borderRadius: "99px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  $0 PRE-MONEY
                </span>
              </div>
              <p className="tx-section-subtitle">
                Clients posted what they want to make. Claim a project, build it, and demand payment upon completion.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {openProjects.slice(0, 3).map((op) => (
              <article
                key={op._id}
                style={{
                  background: "var(--tx-white)",
                  border: "1px solid var(--tx-slate-200)",
                  borderRadius: "var(--tx-radius-lg)",
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  boxShadow: "var(--tx-shadow-sm)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span className="tx-job-category-badge">{op.category || "Development"}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>
                      Posted by {op.client?.name || "Client"}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.2rem", margin: "0 0 6px 0" }}>
                    {op.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--tx-slate-600)", margin: "0 0 10px 0", maxWidth: "680px" }}>
                    {op.description?.slice(0, 150)}...
                  </p>
                  <div className="tx-job-skills">
                    {op.requiredSkills?.map((s, idx) => (
                      <span key={idx} className="tx-skill-tag">{s}</span>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: "180px" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--tx-slate-900)", marginBottom: "4px" }}>
                    {op.agreedAmount > 0 ? `$${Number(op.agreedAmount).toLocaleString()} USD` : "Negotiable / On Completion"}
                  </div>
                  <span style={{ display: "block", fontSize: "0.78rem", color: "var(--tx-green-dark)", fontWeight: 600, marginBottom: "12px" }}>
                    Demand payment on completion
                  </span>
                  <button
                    type="button"
                    onClick={() => handleClaimProject(op._id)}
                    className="tx-btn tx-btn-primary tx-btn-sm"
                    style={{ background: "linear-gradient(135deg, #108a00, #059669)", width: "100%" }}
                  >
                    Take On This Project ↗
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Active Projects Tracker */}
      <section style={{ marginBottom: "28px" }}>
        <div className="tx-section-header" style={{ marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>Your Active Projects</h2>
            <p className="tx-section-subtitle">Continue work, submit progress updates, and demand payment upon completion.</p>
          </div>
          <Link to="/freelancer/projects" className="tx-btn tx-btn-outline tx-btn-sm">All Projects →</Link>
        </div>
        {projects.length === 0 ? (
          <p style={{ color: "var(--tx-slate-500)" }}>Accepted project workspaces will appear here.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {projects.slice(0, 2).map((project) => (
              <article key={project._id} className="tx-stat-box" style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <strong>{project.title}</strong>
                  <p>{project.client?.name} · {project.status} · {project.completionPercentage}% complete</p>
                </div>
                <Link to={`/projects/${project._id}`} className="tx-btn tx-btn-primary tx-btn-sm">Open Workspace & Demand Payment</Link>
              </article>
            ))}
          </div>
        )}
      </section>

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
              View All Projects →
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
                Browse Projects
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
                      {prop.job?.title || prop.jobTitle || "Untitled Job"}
                    </h4>

                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--tx-slate-500)",
                      }}
                    >
                      Applied on:{" "}
                      {prop.createdAt || prop.appliedAt
                        ? new Date(
                          prop.createdAt || prop.appliedAt
                        ).toLocaleDateString()
                        : "Recently"}
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
