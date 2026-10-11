import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import "../../App.css";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'my-jobs', 'post-job'
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // New Job Form State
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    category: "Development",
    skillsInput: "",
    budgetType: "fixed",
    budget: "",
    deadline: "",
  });
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);

  const name = user?.name || "Client";
  const firstName = name.split(" ")[0];

  const reloadMyJobs = () => {
    setLoadingJobs(true);
    api
      .get("/jobs/mine")
      .then((res) => {
        if (res.data?.jobs) {
          setMyJobs(res.data.jobs);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch client jobs:", err);
      })
      .finally(() => {
        setLoadingJobs(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get("/jobs/mine")
      .then((res) => {
        if (isMounted && res.data?.jobs) {
          setMyJobs(res.data.jobs);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch client jobs:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingJobs(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCloseJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to close this job listing?")) return;
    try {
      await api.patch(`/jobs/${jobId}/close`);
      reloadMyJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to close the job.");
    }
  };

  const handlePostJobSubmit = async (e) => {
    e.preventDefault();
    setPostError("");
    setPostSuccess("");

    if (jobForm.title.trim().length < 5) {
      setPostError("Job title must be at least 5 characters.");
      return;
    }

    if (jobForm.description.trim().length < 20) {
      setPostError("Job description must be at least 20 characters.");
      return;
    }

    const skills = jobForm.skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      setPostError("Please provide at least 1 required skill (comma-separated).");
      return;
    }

    if (!jobForm.budget || Number(jobForm.budget) <= 0) {
      setPostError("Budget must be greater than zero.");
      return;
    }

    try {
      setSubmittingJob(true);
      const payload = {
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        category: jobForm.category,
        skills,
        budgetType: jobForm.budgetType,
        budget: Number(jobForm.budget),
        deadline: jobForm.deadline ? new Date(jobForm.deadline).toISOString() : null,
      };

      await api.post("/jobs", payload);

      setPostSuccess("Job posted successfully to the marketplace!");
      setJobForm({
        title: "",
        description: "",
        category: "Development",
        skillsInput: "",
        budgetType: "fixed",
        budget: "",
        deadline: "",
      });

      reloadMyJobs();
      setTimeout(() => {
        setActiveTab("my-jobs");
        setPostSuccess("");
      }, 1000);
    } catch (err) {
      console.error("Create job failed:", err);
      setPostError(
        err.response?.data?.message || "Unable to post job. Please verify all details."
      );
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openJobsCount = myJobs.filter((j) => j.status === "open").length;
  const closedJobsCount = myJobs.filter((j) => j.status === "closed").length;

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

        <div className="tx-sidebar-role-badge">Client Workspace</div>

        <nav className="tx-sidebar-nav">
          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span>▦</span>
            <span>Dashboard Overview</span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "post-job" ? "active" : ""}`}
            onClick={() => setActiveTab("post-job")}
          >
            <span>＋</span>
            <span>Post a New Job</span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "my-jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("my-jobs")}
          >
            <span>▤</span>
            <span>Manage My Jobs ({myJobs.length})</span>
          </button>

          <Link to="/freelancers" className="tx-sidebar-btn">
            <span>⌕</span>
            <span>Find Freelancers</span>
          </Link>

          <Link to="/profile" className="tx-sidebar-btn">
            <span>👤</span>
            <span>Company Profile</span>
          </Link>
        </nav>

        <div className="tx-sidebar-footer">
          <button type="button" onClick={handleLogout} className="tx-btn tx-btn-subtle tx-btn-block">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="tx-dashboard-main">
        {/* Topbar */}
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">
            Workspace / <strong>Client Dashboard</strong>
          </div>

          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}>
              <strong>{name}</strong>
              <span>Client Account</span>
            </div>
            <div className="tx-avatar-badge">{name[0]}</div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="tx-dashboard-body">
          {/* Welcome Banner */}
          <div className="tx-welcome-banner">
            <div>
              <h1>Welcome, {firstName}!</h1>
              <p style={{ color: "var(--tx-slate-600)", maxWidth: "580px" }}>
                Publish project requirements, hire qualified independent freelancers,
                and track your postings in real time.
              </p>
            </div>
            <button
              type="button"
              className="tx-btn tx-btn-primary tx-btn-lg"
              onClick={() => setActiveTab("post-job")}
            >
              Post a New Job ↗
            </button>
          </div>

          {/* Stats Grid */}
          <div className="tx-stats-cards-grid">
            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Total Postings</div>
              <div className="tx-stat-box-value">{myJobs.length}</div>
              <div className="tx-stat-box-desc">All created job listings</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Active Open Jobs</div>
              <div className="tx-stat-box-value" style={{ color: "var(--tx-green-dark)" }}>
                {openJobsCount}
              </div>
              <div className="tx-stat-box-desc">Currently accepting proposals</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Closed Postings</div>
              <div className="tx-stat-box-value">{closedJobsCount}</div>
              <div className="tx-stat-box-desc">Completed or archived jobs</div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>Recent Job Postings</h2>
                  <p className="tx-section-subtitle">
                    Quickly review your latest active requirements and proposals.
                  </p>
                </div>
                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  onClick={() => setActiveTab("my-jobs")}
                >
                  Manage All Jobs →
                </button>
              </div>

              {loadingJobs ? (
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>Loading your jobs...</p>
              ) : myJobs.length === 0 ? (
                <div
                  style={{
                    background: "var(--tx-white)",
                    padding: "48px 24px",
                    borderRadius: "var(--tx-radius-lg)",
                    border: "1px dashed var(--tx-slate-300)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>💼</div>
                  <h3 style={{ marginBottom: "6px" }}>You Haven't Posted Any Jobs Yet</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px" }}>
                    Create your first job listing to start receiving proposals from skilled freelancers.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setActiveTab("post-job")}
                  >
                    Post Your First Job Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {myJobs.slice(0, 3).map((job) => (
                    <div
                      key={job._id}
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
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="tx-job-category-badge">{job.category}</span>
                          <span className="tx-role-pill" style={{ textTransform: "capitalize" }}>
                            {job.status}
                          </span>
                        </div>
                        <h4 style={{ fontSize: "1.15rem", marginBottom: "4px" }}>
                          <Link to={`/jobs/${job._id}`}>{job.title}</Link>
                        </h4>
                        <div style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>
                          Budget: ${job.budget} ({job.budgetType}) • Posted:{" "}
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <Link to={`/jobs/${job._id}`} className="tx-btn tx-btn-subtle tx-btn-sm">
                          View Details
                        </Link>
                        {job.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleCloseJob(job._id)}
                            className="tx-btn tx-btn-danger tx-btn-sm"
                          >
                            Close Job
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POST A JOB */}
          {activeTab === "post-job" && (
            <div
              style={{
                background: "var(--tx-white)",
                border: "1px solid var(--tx-slate-200)",
                borderRadius: "var(--tx-radius-xl)",
                padding: "36px",
                maxWidth: "840px",
              }}
            >
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Post a New Job Requirement</h2>
                <p style={{ color: "var(--tx-slate-500)" }}>
                  Connect with independent professionals by specifying your scope, budget, and required skills.
                </p>
              </div>

              {postError && (
                <div className="tx-alert tx-alert-danger" style={{ marginBottom: "20px" }}>
                  <span>⚠️</span> {postError}
                </div>
              )}

              {postSuccess && (
                <div className="tx-alert tx-alert-success" style={{ marginBottom: "20px" }}>
                  <span>✓</span> {postSuccess}
                </div>
              )}

              <form onSubmit={handlePostJobSubmit} className="tx-auth-form">
                <div className="tx-form-group">
                  <label htmlFor="jobTitle">Job Title</label>
                  <input
                    id="jobTitle"
                    type="text"
                    className="tx-input"
                    placeholder="e.g. Build a Responsive React Website for SaaS Launch"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="tx-form-group">
                    <label htmlFor="jobCategory">Category</label>
                    <select
                      id="jobCategory"
                      className="tx-input"
                      value={jobForm.category}
                      onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })}
                    >
                      <option value="Development">Web & Mobile Development</option>
                      <option value="Design">UI/UX & Design</option>
                      <option value="Data">Data & AI</option>
                      <option value="Writing">Content & Writing</option>
                      <option value="Marketing">Digital Marketing</option>
                    </select>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="budgetType">Budget Type</label>
                    <select
                      id="budgetType"
                      className="tx-input"
                      value={jobForm.budgetType}
                      onChange={(e) => setJobForm({ ...jobForm, budgetType: e.target.value })}
                    >
                      <option value="fixed">Fixed Price ($)</option>
                      <option value="hourly">Hourly Rate ($/hr)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="tx-form-group">
                    <label htmlFor="budget">
                      {jobForm.budgetType === "hourly" ? "Hourly Rate ($/hr)" : "Total Budget ($)"}
                    </label>
                    <input
                      id="budget"
                      type="number"
                      min="1"
                      className="tx-input"
                      placeholder="e.g. 500"
                      value={jobForm.budget}
                      onChange={(e) => setJobForm({ ...jobForm, budget: e.target.value })}
                      required
                    />
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="deadline">Target Deadline (Optional)</label>
                    <input
                      id="deadline"
                      type="date"
                      className="tx-input"
                      value={jobForm.deadline}
                      onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="tx-form-group">
                  <label htmlFor="skills">Required Skills (Comma separated)</label>
                  <input
                    id="skills"
                    type="text"
                    className="tx-input"
                    placeholder="e.g. React, Node.js, Express, MongoDB, CSS"
                    value={jobForm.skillsInput}
                    onChange={(e) => setJobForm({ ...jobForm, skillsInput: e.target.value })}
                    required
                  />
                </div>

                <div className="tx-form-group">
                  <label htmlFor="description">Job Description (Detailed Scope)</label>
                  <textarea
                    id="description"
                    rows={6}
                    className="tx-input"
                    placeholder="Describe the background of your project, key deliverables, technical requirements, and expectations..."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="tx-btn tx-btn-subtle"
                    onClick={() => setActiveTab("overview")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="tx-btn tx-btn-primary tx-btn-lg"
                    disabled={submittingJob}
                  >
                    {submittingJob ? "Posting Job..." : "Post Job to Marketplace ↗"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MANAGE MY JOBS */}
          {activeTab === "my-jobs" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>All My Job Postings</h2>
                  <p className="tx-section-subtitle">
                    Review status, view descriptions, or close open listings.
                  </p>
                </div>
                <button
                  type="button"
                  className="tx-btn tx-btn-primary tx-btn-sm"
                  onClick={() => setActiveTab("post-job")}
                >
                  ＋ Post Another Job
                </button>
              </div>

              {loadingJobs ? (
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>Loading jobs...</p>
              ) : myJobs.length === 0 ? (
                <div
                  style={{
                    background: "var(--tx-white)",
                    padding: "48px 24px",
                    borderRadius: "var(--tx-radius-lg)",
                    border: "1px dashed var(--tx-slate-300)",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ marginBottom: "6px" }}>No Job Postings Found</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "16px" }}>
                    Get started by creating your first project listing.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setActiveTab("post-job")}
                  >
                    Post a Job
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {myJobs.map((job) => (
                    <div
                      key={job._id}
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
                      <div style={{ maxWidth: "680px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="tx-job-category-badge">{job.category}</span>
                          <span
                            className="tx-role-pill"
                            style={{
                              backgroundColor: job.status === "open" ? "var(--tx-green-light)" : "var(--tx-slate-100)",
                              color: job.status === "open" ? "var(--tx-green-dark)" : "var(--tx-slate-600)",
                              textTransform: "capitalize",
                            }}
                          >
                            {job.status}
                          </span>
                        </div>
                        <h4 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>
                          <Link to={`/jobs/${job._id}`}>{job.title}</Link>
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "var(--tx-slate-600)", marginBottom: "8px" }}>
                          {job.description?.slice(0, 140)}...
                        </p>
                        <div className="tx-job-skills">
                          {job.skills?.map((s, idx) => (
                            <span key={idx} className="tx-skill-tag">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <strong style={{ fontSize: "1.2rem", color: "var(--tx-slate-900)" }}>
                          ${job.budget}
                        </strong>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Link to={`/jobs/${job._id}`} className="tx-btn tx-btn-subtle tx-btn-sm">
                            View Details
                          </Link>
                          {job.status === "open" && (
                            <button
                              type="button"
                              onClick={() => handleCloseJob(job._id)}
                              className="tx-btn tx-btn-danger tx-btn-sm"
                            >
                              Close Job
                            </button>
                          )}
                        </div>
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