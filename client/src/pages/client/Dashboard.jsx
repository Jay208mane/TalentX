import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import "../../App.css";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [initialPrefill] = useState(() => {
    try {
      const statePrefill = location.state?.prefillJob;
      const storedPrefill = localStorage.getItem("talentx_prefilled_job");
      const prefill =
        statePrefill || (storedPrefill ? JSON.parse(storedPrefill) : null);
      if (storedPrefill) {
        localStorage.removeItem("talentx_prefilled_job");
      }
      return prefill;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(
    () =>
      (initialPrefill ? "post-job" : location.state?.activeTab) || "overview"
  ); // 'overview', 'my-jobs', 'post-job', 'post-project', 'track-projects'
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [freelancersList, setFreelancersList] = useState([]);

  // Direct Project Posting State ("I want to make something" - Zero Pre-Money)
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    category: "Web & Mobile Development",
    skillsInput: "React, Node.js, Express, MongoDB",
    agreedAmount: "",
    expectedDeadline: "",
    freelancerId: "",
  });
  const [submittingProject, setSubmittingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectSuccess, setProjectSuccess] = useState("");

  // New Job Form State (Traditional Listing)
  const [jobForm, setJobForm] = useState(() => ({
    title: initialPrefill?.title || "",
    description: initialPrefill?.description || "",
    category: initialPrefill?.category || "Web & Mobile Development",
    skillsInput: initialPrefill?.skillsInput || "",
    budgetType: initialPrefill?.budgetType || "fixed",
    budget: initialPrefill?.budget ? String(initialPrefill.budget) : "",
    deadline: initialPrefill?.deadline || "",
  }));
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);

  const name = user?.name || "Client";
  const firstName = name.split(" ")[0];

  const reloadProjects = () => {
    setLoadingProjects(true);
    api
      .get("/projects/mine")
      .then((res) => {
        setProjects(Array.isArray(res.data?.projects) ? res.data.projects : []);
      })
      .catch((err) => console.error("Failed to reload projects:", err))
      .finally(() => setLoadingProjects(false));
  };

  useEffect(() => {
    api
      .get("/auth/freelancers")
      .then((res) => {
        if (res.data?.freelancers) {
          setFreelancersList(res.data.freelancers);
        }
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    api.get("/projects/mine")
      .then((res) => {
        if (isMounted) {
          setProjects(Array.isArray(res.data?.projects) ? res.data.projects : []);
        }
      })
      .catch((err) => {
        if (isMounted) console.error("Failed to fetch client projects:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingProjects(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCloseJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to close this project listing?")) return;
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

    if (jobForm.title.trim().length < 3) {
      setPostError("Project title must be at least 3 characters.");
      return;
    }

    if (jobForm.description.trim().length < 10) {
      setPostError("Project requirements must be at least 10 characters.");
      return;
    }

    const skills = jobForm.skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (jobForm.budget && Number(jobForm.budget) < 0) {
      setPostError("Budget must be zero or greater, or left blank to negotiate.");
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
        budget: jobForm.budget ? Number(jobForm.budget) : null,
        deadline: jobForm.deadline ? new Date(jobForm.deadline).toISOString() : null,
      };

      await api.post("/jobs", payload);

      setPostSuccess("Project listing published to the marketplace!");
      setJobForm({
        title: "",
        description: "",
        category: "Web & Mobile Development",
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
      setPostError(err.response?.data?.message || "Unable to publish the project. Please verify all details.");
    } finally {
      setSubmittingJob(false);
    }
  };

  const handlePostProjectSubmit = async (e) => {
    e.preventDefault();
    setProjectError("");
    setProjectSuccess("");

    if (projectForm.title.trim().length < 5) {
      setProjectError("Project title must be at least 5 characters.");
      return;
    }

    if (projectForm.description.trim().length < 10) {
      setProjectError("Describe what you want to make in at least 10 characters.");
      return;
    }

    let amount = 0;
    if (projectForm.agreedAmount && projectForm.agreedAmount.trim()) {
      const parsed = Number(projectForm.agreedAmount);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setProjectError("Provide a valid non-negative payment amount, or leave blank if negotiable.");
        return;
      }
      amount = parsed;
    }

    const skills = projectForm.skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setSubmittingProject(true);
      const payload = {
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        category: projectForm.category,
        requiredSkills: skills,
        agreedAmount: amount,
        expectedDeadline: projectForm.expectedDeadline || null,
        freelancerId: projectForm.freelancerId || null,
      };

      await api.post("/projects", payload);

      setProjectSuccess("Project posted successfully with ZERO upfront charges! Track progress in real-time.");
      setProjectForm({
        title: "",
        description: "",
        category: "Web & Mobile Development",
        skillsInput: "React, Node.js, Express, MongoDB",
        agreedAmount: "",
        expectedDeadline: "",
        freelancerId: "",
      });

      reloadProjects();
      setTimeout(() => {
        setActiveTab("track-projects");
        setProjectSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Create project failed:", err);
      setProjectError(
        err.response?.data?.message || "Failed to post project. Please verify all details."
      );
    } finally {
      setSubmittingProject(false);
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

          <Link
            to="/client/project-requirements"
            className="tx-sidebar-btn"
            style={{ position: "relative" }}
          >
            <span>✨</span>
            <span>AI Project Requirements</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.68rem",
                background: "var(--tx-green)",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              GENAI
            </span>
          </Link>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "post-project" ? "active" : ""}`}
            onClick={() => setActiveTab("post-project")}
            style={{ position: "relative" }}
          >
            <span>🚀</span>
            <span>Post a Project</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.68rem",
                background: "var(--tx-green)",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              $0 UPFRONT
            </span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "track-projects" ? "active" : ""}`}
            onClick={() => setActiveTab("track-projects")}
          >
            <span>📊</span>
            <span>Track Progress ({projects.length})</span>
          </button>

          <Link
            to="/client/project-requirements"
            className="tx-sidebar-btn"
            style={{ position: "relative" }}
          >
            <span>✨</span>
            <span>AI Project Requirements</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.68rem",
                background: "var(--tx-slate-200)",
                color: "var(--tx-slate-700)",
                padding: "2px 6px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              GENAI
            </span>
          </Link>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "post-job" ? "active" : ""}`}
            onClick={() => setActiveTab("post-job")}
          >
            <span>＋</span>
            <span>Create Project Listing</span>
          </button>

          <button
            type="button"
            className={`tx-sidebar-btn ${activeTab === "my-jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("my-jobs")}
          >
            <span>▤</span>
            <span>Manage Project Listings ({myJobs.length})</span>
          </button>

          <Link to="/client/proposals" className="tx-sidebar-btn">
            <span>📝</span>
            <span>Received Proposals</span>
          </Link>

          <Link to="/client/projects" className="tx-sidebar-btn">
            <span>📁</span>
            <span>Active Projects ({projects.length})</span>
          </Link>

          <Link to="/messages" className="tx-sidebar-btn">
            <span>💬</span>
            <span>Chat / Messages</span>
          </Link>

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
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <Link
                to="/client/project-requirements"
                className="tx-btn tx-btn-outline tx-btn-lg"
                style={{
                  borderColor: "var(--tx-green)",
                  color: "var(--tx-green-dark)",
                  fontWeight: 600,
                  backgroundColor: "var(--tx-white)",
                }}
              >
                ✨ AI Project Requirements
              </Link>
              <button
                type="button"
                className="tx-btn tx-btn-primary tx-btn-lg"
                onClick={() => setActiveTab("post-project")}
                style={{
                  background: "linear-gradient(135deg, #108a00, #059669)",
                  boxShadow: "0 4px 14px rgba(16, 138, 0, 0.3)",
                }}
              >
                🚀 Post What You Want to Build (Zero Upfront) ↗
              </button>
              <button
                type="button"
                className="tx-btn tx-btn-outline tx-btn-lg"
                onClick={() => setActiveTab("track-projects")}
              >
                📊 Track Project Progress ({projects.length})
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="tx-stats-cards-grid">
            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Total Postings</div>
              <div className="tx-stat-box-value">{myJobs.length}</div>
              <div className="tx-stat-box-desc">All created project listings</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Open Project Listings</div>
              <div className="tx-stat-box-value" style={{ color: "var(--tx-green-dark)" }}>
                {openJobsCount}
              </div>
              <div className="tx-stat-box-desc">Currently accepting proposals</div>
            </div>

            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Closed Postings</div>
              <div className="tx-stat-box-value">{closedJobsCount}</div>
              <div className="tx-stat-box-desc">Completed or archived listings</div>
            </div>
            <div className="tx-stat-box">
              <div className="tx-stat-box-title">Active Projects</div>
              <div className="tx-stat-box-value">{projects.length}</div>
              <div className="tx-stat-box-desc">Workspaces from accepted proposals</div>
            </div>
          </div>

          <section style={{ marginBottom: "28px" }}>
            <div className="tx-section-header" style={{ marginBottom: "14px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem" }}>Active Projects</h2>
                <p className="tx-section-subtitle">Review progress, deliverables, and conversations with freelancers.</p>
              </div>
              <Link to="/client/projects" className="tx-btn tx-btn-outline tx-btn-sm">All Projects →</Link>
            </div>
            {loadingProjects ? (
              <p role="status" style={{ color: "var(--tx-slate-500)" }}>Loading projects…</p>
            ) : projects.length === 0 ? (
              <p style={{ color: "var(--tx-slate-500)" }}>Projects will appear here when you accept a proposal.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {projects.slice(0, 2).map((project) => (
                  <article key={project._id} className="tx-stat-box" style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <strong>{project.title}</strong>
                      <p>{project.freelancer?.name} · {project.status} · {project.completionPercentage}% complete</p>
                    </div>
                    <Link to={`/projects/${project._id}`} className="tx-btn tx-btn-primary tx-btn-sm">Open Workspace</Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem" }}>Recent Project Listings</h2>
                  <p className="tx-section-subtitle">
                    Quickly review your latest active requirements and proposals.
                  </p>
                </div>
                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  onClick={() => setActiveTab("my-jobs")}
                >
                  Manage Project Listings →
                </button>
              </div>

              {loadingJobs ? (
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>Loading your project listings...</p>
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
                  <h3 style={{ marginBottom: "6px" }}>You Haven't Published Any Projects Yet</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px" }}>
                    Publish a project listing to start receiving proposals from freelancers.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setActiveTab("post-job")}
                  >
                    Create Your First Project
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
                          Budget: {job.budgetRange?.currency || "USD"} {job.budgetRange?.minimum ?? job.budget ?? "Negotiable"}{job.budgetRange?.maximum != null ? `–${job.budgetRange.maximum}` : ""} • Payment: {job.requirements?.paymentPreference || job.budgetType} • Posted:{" "}
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
                            Close Listing
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE PROJECT LISTING */}
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "24px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>
                    Create a Project Listing
                  </h2>
                  <p style={{ color: "var(--tx-slate-500)", margin: 0 }}>
                    Describe the project scope and skills. Budget and payment terms can be discussed with freelancers.
                  </p>
                </div>
                <Link
                  to="/client/project-requirements"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  style={{
                    borderColor: "var(--tx-green)",
                    color: "var(--tx-green-dark)",
                    fontWeight: 600,
                  }}
                >
                  ✨ Create requirements with AI
                </Link>
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
                  <label htmlFor="jobTitle">Project Title</label>
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
                      <option value="Web & Mobile Development">Web & Mobile Development</option>
                      <option value="AI & Machine Learning">AI & Machine Learning</option>
                      <option value="Cybersecurity & Cloud">Cybersecurity & Cloud</option>
                      <option value="Data Science & Analytics">Data Science & Analytics</option>
                      <option value="Software & Application Development">Software & Application Development</option>
                      <option value="UI/UX & Graphic Design">UI/UX & Graphic Design</option>
                      <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                      <option value="Content Writing & Documentation">Content Writing & Documentation</option>
                      <option value="Business & Virtual Assistance">Business & Virtual Assistance</option>
                      <option value="Academic & Research Support">Academic & Research Support</option>
                      <option value="Testing & Quality Assurance">Testing & Quality Assurance</option>
                      <option value="Other / Custom Project">Other / Custom Project</option>
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
                      <option value="fixed">Fixed Project Price</option>
                      <option value="milestone">Milestone-Based</option>
                      <option value="hourly">Hourly (agree rate later)</option>
                      <option value="negotiable">Negotiable</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="tx-form-group">
                    <label htmlFor="budget">
                      {jobForm.budgetType === "hourly" ? "Hourly rate (optional)" : "Proposed project budget (optional)"}
                    </label>
                    <input
                      id="budget"
                      type="number"
                      min="0"
                      className="tx-input"
                      placeholder="Leave blank to discuss"
                      value={jobForm.budget}
                      onChange={(e) => setJobForm({ ...jobForm, budget: e.target.value })}
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
                  <label htmlFor="skills">Required Skills (optional, comma separated)</label>
                  <input
                    id="skills"
                    type="text"
                    className="tx-input"
                    placeholder="e.g. React, Node.js, Express, MongoDB, CSS"
                    value={jobForm.skillsInput}
                    onChange={(e) => setJobForm({ ...jobForm, skillsInput: e.target.value })}
                  />
                </div>

                <div className="tx-form-group">
                  <label htmlFor="description">Project Requirements (Detailed Scope)</label>
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
                    {submittingJob ? "Publishing Project..." : "Publish Project Listing ↗"}
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
                  <h2 style={{ fontSize: "1.45rem" }}>My Project Listings</h2>
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
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>Loading project listings...</p>
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
                  <h3 style={{ marginBottom: "6px" }}>No Project Listings Found</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "16px" }}>
                    Get started by creating your first project listing.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setActiveTab("post-job")}
                  >
                    Create Project Listing
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
                          {job.budgetRange?.currency || "USD"} {job.budgetRange?.minimum ?? job.budget ?? "Negotiable"}{job.budgetRange?.maximum != null ? `–${job.budgetRange.maximum}` : ""}
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
                              Close Listing
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

          {/* TAB: POST DIRECT PROJECT ("What you want to build" - ZERO UPFRONT) */}
          {activeTab === "post-project" && (
            <div
              style={{
                background: "var(--tx-white)",
                border: "1px solid var(--tx-slate-200)",
                borderRadius: "var(--tx-radius-xl)",
                padding: "36px",
                maxWidth: "880px",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                  border: "1px solid #a7f3d0",
                  borderRadius: "var(--tx-radius-lg)",
                  padding: "18px 24px",
                  marginBottom: "28px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "2rem" }}>🛡️</div>
                <div>
                  <strong style={{ color: "#065f46", fontSize: "1.05rem", display: "block" }}>
                    TalentX Zero Pre-Money Guarantee
                  </strong>
                  <p style={{ color: "#047857", fontSize: "0.88rem", margin: "4px 0 0 0" }}>
                    No advance deposits or charges. You post your project concept directly, freelancers build it and report milestone progress, and payment is demanded only after project completion and your deliverable review.
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.6rem", marginBottom: "6px" }}>
                  What Do You Want to Make?
                </h2>
                <p style={{ color: "var(--tx-slate-500)", margin: 0 }}>
                  Describe your software, design, or app concept. Set the expected completion payout without paying any advance money.
                </p>
              </div>

              {projectError && (
                <div className="tx-alert tx-alert-danger" style={{ marginBottom: "20px" }}>
                  <span>⚠️</span> {projectError}
                </div>
              )}

              {projectSuccess && (
                <div className="tx-alert tx-alert-success" style={{ marginBottom: "20px" }}>
                  <span>✓</span> {projectSuccess}
                </div>
              )}

              <form onSubmit={handlePostProjectSubmit} className="tx-auth-form">
                <div className="tx-form-group">
                  <label htmlFor="projTitle">Project Title / Headline</label>
                  <input
                    id="projTitle"
                    type="text"
                    className="tx-input"
                    placeholder="e.g. Build an AI-Powered Document Search SaaS & Responsive Dashboard"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="tx-form-group">
                    <label htmlFor="projCategory">Domain / Category</label>
                    <select
                      id="projCategory"
                      className="tx-input"
                      value={projectForm.category}
                      onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    >
                      <option value="Web & Mobile Development">Web & Mobile Development</option>
                      <option value="AI & Machine Learning">AI & Machine Learning</option>
                      <option value="Cybersecurity & Cloud">Cybersecurity & Cloud</option>
                      <option value="Data Science & Analytics">Data Science & Analytics</option>
                      <option value="Software & Application Development">Software & Application Development</option>
                      <option value="UI/UX & Graphic Design">UI/UX & Graphic Design</option>
                      <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                      <option value="Content Writing & Documentation">Content Writing & Documentation</option>
                      <option value="Business & Virtual Assistance">Business & Virtual Assistance</option>
                      <option value="Academic & Research Support">Academic & Research Support</option>
                      <option value="Testing & Quality Assurance">Testing & Quality Assurance</option>
                      <option value="Other / Custom Project">Other / Custom Project</option>
                    </select>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="projBudget">Expected Payout ($ USD, Optional)</label>
                    <input
                      id="projBudget"
                      type="number"
                      min="0"
                      className="tx-input"
                      placeholder="Optional (e.g. 500) - Demanded upon completion"
                      value={projectForm.agreedAmount}
                      onChange={(e) => setProjectForm({ ...projectForm, agreedAmount: e.target.value })}
                    />
                    <small style={{ color: "var(--tx-slate-500)", marginTop: "4px", display: "block" }}>
                      Zero upfront charges. No mandatory budget; payment is demanded by the freelancer upon completion.
                    </small>
                  </div>
                </div>

                <div className="tx-form-group">
                  <label htmlFor="projDesc">Scope & What You Want Built</label>
                  <textarea
                    id="projDesc"
                    rows={6}
                    className="tx-input"
                    placeholder="Provide detailed specifications, user stories, required features, and acceptance criteria..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="tx-form-group">
                  <label htmlFor="projSkills">Required Technologies & Skills</label>
                  <input
                    id="projSkills"
                    type="text"
                    className="tx-input"
                    placeholder="React, Node.js, Express, MongoDB, TailwindCSS..."
                    value={projectForm.skillsInput}
                    onChange={(e) => setProjectForm({ ...projectForm, skillsInput: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="tx-form-group">
                    <label htmlFor="projDeadline">Target Completion Date (Optional)</label>
                    <input
                      id="projDeadline"
                      type="date"
                      className="tx-input"
                      value={projectForm.expectedDeadline}
                      onChange={(e) => setProjectForm({ ...projectForm, expectedDeadline: e.target.value })}
                    />
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="projFreelancer">Assign to Freelancer</label>
                    <select
                      id="projFreelancer"
                      className="tx-input"
                      value={projectForm.freelancerId}
                      onChange={(e) => setProjectForm({ ...projectForm, freelancerId: e.target.value })}
                    >
                      <option value="">Open to Marketplace (Let qualified freelancers claim)</option>
                      {freelancersList.map((f) => (
                        <option key={f._id} value={f._id}>
                          Direct Hire: {f.name} ({f.title || "Freelancer"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
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
                    disabled={submittingProject}
                    style={{ background: "linear-gradient(135deg, #108a00, #059669)", minWidth: "220px" }}
                  >
                    {submittingProject ? "Posting Project..." : "Post Project ($0 Upfront)"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: TRACK PROJECT PROGRESS */}
          {activeTab === "track-projects" && (
            <div>
              <div className="tx-section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem" }}>Live Project Tracking & Deliverables</h2>
                  <p className="tx-section-subtitle">
                    Monitor real-time progress, milestones, and deliverable reviews for all your active projects.
                  </p>
                </div>
                <button
                  type="button"
                  className="tx-btn tx-btn-primary tx-btn-sm"
                  onClick={() => setActiveTab("post-project")}
                >
                  ＋ Post Another Project
                </button>
              </div>

              {loadingProjects ? (
                <p style={{ color: "var(--tx-slate-500)", padding: "20px 0" }}>Loading tracked projects...</p>
              ) : projects.length === 0 ? (
                <div
                  style={{
                    background: "var(--tx-white)",
                    padding: "48px 24px",
                    borderRadius: "var(--tx-radius-lg)",
                    border: "1px dashed var(--tx-slate-300)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📁</div>
                  <h3 style={{ marginBottom: "6px" }}>No Active Projects Being Tracked</h3>
                  <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px", maxWidth: "480px", margin: "0 auto 20px" }}>
                    Post what you want to make with zero upfront charges. You can track progress bars, review milestones, and approve payment demands.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setActiveTab("post-project")}
                  >
                    Post What You Want to Build Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {projects.map((project) => (
                    <div
                      key={project._id}
                      style={{
                        background: "var(--tx-white)",
                        border: "1px solid var(--tx-slate-200)",
                        borderRadius: "var(--tx-radius-lg)",
                        padding: "24px",
                        boxShadow: "var(--tx-shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span className="tx-job-category-badge">{project.category || "Development"}</span>
                            <span
                              className="tx-role-pill"
                              style={{
                                background: project.demandPayment?.demanded
                                  ? "#fef3c7"
                                  : project.status === "Completed"
                                  ? "#ecfdf5"
                                  : "#e0f2fe",
                                color: project.demandPayment?.demanded
                                  ? "#92400e"
                                  : project.status === "Completed"
                                  ? "#065f46"
                                  : "#0369a1",
                                fontWeight: 700,
                              }}
                            >
                              {project.demandPayment?.demanded ? "⚡ PAYMENT DEMANDED" : project.status}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--tx-green)", fontWeight: 600 }}>
                              ✓ $0 Pre-Money
                            </span>
                          </div>
                          <h3 style={{ fontSize: "1.3rem", margin: "0 0 6px 0" }}>
                            <Link to={`/projects/${project._id}`}>{project.title}</Link>
                          </h3>
                          <div style={{ fontSize: "0.88rem", color: "var(--tx-slate-600)" }}>
                            Assigned to: <strong>{project.freelancer?.name || "Open for Claim"}</strong> · Agreed Payout: <strong>{project.agreedAmount > 0 ? `$${Number(project.agreedAmount).toLocaleString()} USD` : "Demanded on Completion"}</strong>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <Link
                            to={`/projects/${project._id}`}
                            className="tx-btn tx-btn-primary"
                            style={{
                              background: project.demandPayment?.demanded ? "linear-gradient(135deg, #d97706, #b45309)" : undefined,
                            }}
                          >
                            {project.demandPayment?.demanded ? "Review Deliverable & Pay Demand →" : "Track Progress Workspace →"}
                          </Link>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginTop: "12px", background: "var(--tx-slate-50)", padding: "14px 18px", borderRadius: "var(--tx-radius-md)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                          <strong style={{ color: "var(--tx-slate-700)" }}>Project Progress Tracker</strong>
                          <strong style={{ color: "var(--tx-green-dark)" }}>{project.completionPercentage || 0}% Complete</strong>
                        </div>
                        <div style={{ height: "8px", background: "var(--tx-slate-200)", borderRadius: "99px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${project.completionPercentage || 0}%`,
                              height: "100%",
                              background: "var(--tx-green)",
                              borderRadius: "99px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.8rem", color: "var(--tx-slate-500)" }}>
                          <span>Milestones: {project.milestones?.filter(m => m.status === "completed").length || 0} / {project.milestones?.length || 0}</span>
                          <span>Expected: {project.expectedDeadline ? new Date(project.expectedDeadline).toLocaleDateString() : "Flexible"}</span>
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