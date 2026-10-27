import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useAuth from "../context/useAuth";
import api from "../services/api";
import { projectCategories } from "./client/projectCategories";
import "../App.css";


export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Proposal modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [duration, setDuration] = useState("Less than 1 month");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const [proposalError, setProposalError] = useState("");


  useEffect(() => {
    let cancelled = false;

    api
      .get(`/jobs/${id}`)
      .then((res) => {
        if (cancelled) return;

        const fetchedJob = res.data?.job;

        if (fetchedJob) {
          setJob(fetchedJob);
          setBidAmount(fetchedJob.budget || "");
        } else {
          setJob(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Failed to load project:", error.response?.data || error.message);
        setJob(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);


  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/jobs/${id}` } } });
      return;
    }
    if (user?.role !== "freelancer") {
      alert("Only freelancers can submit project proposals.");
      return;
    }

    setProposalError("");
    setProposalSuccess(false);

    setShowApplyModal(true);
  };


  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    setProposalError("");

    if (user?.role !== "freelancer") {
      setProposalError("Only freelancers can submit proposals.");
      return;
    }

    if (!job?._id || job._id === "demo-details") {
      setProposalError("This project is unavailable. Please refresh and try again.");
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount < 1) {
      setProposalError("Enter a valid bid amount of at least 1.");
      return;
    }

    if (coverLetter.trim().length < 20) {
      setProposalError("Your cover letter must contain at least 20 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/proposals", {
        jobId: job._id,
        bidAmount: amount,
        duration,
        coverLetter: coverLetter.trim(),
      });

      setProposalSuccess(true);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to submit your proposal. Please try again.";

      setProposalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="tx-page-wrapper">
        <Navbar />
        <main className="tx-main-content" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
          <p style={{ color: "var(--tx-slate-500)" }}>Loading project details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="tx-page-wrapper">
        <Navbar />
        <main className="tx-main-content" style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>Project Not Found</h2>
          <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px" }}>
            The project you are looking for is no longer open or does not exist.
          </p>
          <Link to="/jobs" className="tx-btn tx-btn-primary">
            Browse All Projects
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const clientName = typeof job.client === "object" ? job.client?.name : "Verified Client";
  const apiBaseUrl = api.defaults.baseURL || "http://localhost:5000/api";
  const currency = job.budgetRange?.currency || "USD";
  const hasBudgetRange = job.budgetRange?.minimum != null || job.budgetRange?.maximum != null;
  const formattedBudget = hasBudgetRange
    ? `${currency} ${job.budgetRange.minimum ?? "—"} – ${job.budgetRange.maximum ?? "—"}`
    : job.budgetType === "negotiable" || job.budget == null
      ? "To be agreed"
      : job.budgetType === "hourly"
        ? `${currency} ${job.budget} / hour`
        : `${currency} ${Number(job.budget).toLocaleString()}`;
  const paymentPreference = job.requirements?.paymentPreference ||
    ({ fixed: "Fixed Project Price", hourly: "Hourly", milestone: "Milestone-Based", negotiable: "Negotiable" }[job.budgetType] || "Project terms");

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        <div className="tx-container" style={{ padding: "40px 24px" }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: "24px", fontSize: "0.9rem", color: "var(--tx-slate-500)" }}>
            <Link to="/jobs" style={{ color: "var(--tx-green)", fontWeight: 600 }}>
              ← Back to All Projects
            </Link>{" "}
            / {job.category || "General"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.3fr 1fr",
              gap: "36px",
              alignItems: "start",
            }}
          >
            {/* Main Project Information Column */}
            <div
              style={{
                background: "var(--tx-white)",
                border: "1px solid var(--tx-slate-200)",
                borderRadius: "var(--tx-radius-xl)",
                padding: "36px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <span className="tx-job-category-badge">{job.category}</span>
                  <h1 style={{ fontSize: "2rem", marginTop: "12px", color: "var(--tx-slate-900)" }}>
                    {job.title}
                  </h1>
                </div>
                <button
                  type="button"
                  className={`tx-save-btn ${isSaved ? "saved" : ""}`}
                  onClick={() => setIsSaved(!isSaved)}
                  title={isSaved ? "Saved" : "Save Project"}
                  style={{ fontSize: "1.6rem" }}
                >
                  {isSaved ? "★" : "☆"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  padding: "16px 0",
                  borderTop: "1px solid var(--tx-slate-100)",
                  borderBottom: "1px solid var(--tx-slate-100)",
                  marginBottom: "28px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                    PROJECT BUDGET
                  </span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--tx-green-dark)" }}>
                    {formattedBudget}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                    PAYMENT PREFERENCE
                  </span>
                  <strong style={{ fontSize: "1.05rem", color: "var(--tx-slate-800)" }}>
                    {paymentPreference}
                  </strong>
                </div>

                {job.requirements?.projectType && (
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>PROJECT TYPE</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--tx-slate-800)" }}>{job.requirements.projectType}</strong>
                  </div>
                )}

                {job.requirements?.experiencePreference && (
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>EXPERIENCE PREFERENCE</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--tx-slate-800)" }}>{job.requirements.experiencePreference}</strong>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                    POSTED ON
                  </span>
                  <strong style={{ fontSize: "1.05rem", color: "var(--tx-slate-800)" }}>
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently posted"}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                    STATUS
                  </span>
                  <span className="tx-role-pill" style={{ textTransform: "capitalize" }}>
                    {job.status || "Open"}
                  </span>
                </div>
              </div>

              {/* Project requirements */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Project Requirements</h3>
                <div style={{ whiteSpace: "pre-line", color: "var(--tx-slate-700)", lineHeight: 1.7, fontSize: "1.02rem" }}>
                  {job.description}
                </div>
              </div>

              {job.requirements?.generated && (
                <div style={{ display: "grid", gap: 18, marginBottom: 28 }}>
                  {[
                    ["overview", "Project overview"],
                    ["problemStatement", "Problem statement"],
                    ["objectives", "Objectives"],
                    ["scopeOfWork", "Scope of work"],
                    ["tasksAndMilestones", "Tasks and milestones"],
                    ["functionalRequirements", "Functional requirements"],
                    ["nonFunctionalRequirements", "Non-functional requirements"],
                    ["testingAcceptanceCriteria", "Testing and acceptance criteria"],
                    ["estimatedTimeline", "Estimated timeline"],
                    ["assumptions", "Assumptions to clarify"],
                    ["dependencies", "Dependencies"],
                    ["openQuestions", "Questions for the client"],
                  ].map(([key, label]) => {
                    const value = job.requirements.generated[key];
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    return (
                      <section key={key}>
                        <h3 style={{ fontSize: "1.05rem", marginBottom: 6 }}>{label}</h3>
                        {Array.isArray(value)
                          ? <ul style={{ paddingLeft: 22 }}>{value.map((item, index) => <li key={`${key}-${index}`} style={{ marginBottom: 4 }}>{item}</li>)}</ul>
                          : <p style={{ whiteSpace: "pre-line", lineHeight: 1.65 }}>{value}</p>}
                      </section>
                    );
                  })}
                </div>
              )}

              {Object.values(job.requirements?.categoryDetails || {}).some(Boolean) && (
                <section style={{ display: "grid", gap: 12, marginBottom: 24 }}>
                  <h3 style={{ fontSize: "1.05rem", margin: 0 }}>Category-specific details</h3>
                  {(projectCategories[job.category]?.fields || []).map((field) => {
                    const value = job.requirements.categoryDetails[field.key];
                    return value ? (
                      <div key={field.key}>
                        <strong>{field.label}</strong>
                        <p style={{ whiteSpace: "pre-line", lineHeight: 1.65, margin: "4px 0 0" }}>{value}</p>
                      </div>
                    ) : null;
                  })}
                </section>
              )}

              {job.skills && job.skills.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "12px" }}>Required Skills</h3>
                  <div className="tx-job-skills">
                    {job.skills.map((skill, index) => (
                      <span key={index} className="tx-skill-tag" style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.requirements?.tools?.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: 12 }}>Preferred Tools and Technologies</h3>
                  <p>{job.requirements.tools.join(", ")}</p>
                </section>
              )}
              {job.requirements?.referenceLinks?.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: 12 }}>Reference Links</h3>
                  <ul>{job.requirements.referenceLinks.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer">{link}</a></li>)}</ul>
                </section>
              )}
              {job.requirements?.referenceFiles?.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: 12 }}>Reference Files</h3>
                  <ul>{job.requirements.referenceFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <a href={`${apiBaseUrl}/jobs/${job._id}/references/${index}`}>{file.name}</a>
                    </li>
                  ))}</ul>
                </section>
              )}
            </div>

            {/* Sidebar Column: Actions & Client Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Action Box */}
              <div
                style={{
                  background: "var(--tx-white)",
                  border: "1px solid var(--tx-slate-200)",
                  borderRadius: "var(--tx-radius-lg)",
                  padding: "24px",
                  boxShadow: "var(--tx-shadow-sm)",
                }}
              >
                <button
                  type="button"
                  className="tx-btn tx-btn-primary tx-btn-block tx-btn-lg"
                  onClick={handleApplyClick}
                  style={{ marginBottom: "12px" }}
                >
                  Submit a Proposal ↗
                </button>

                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-block"
                  onClick={() => setIsSaved(!isSaved)}
                >
                  {isSaved ? "Saved Project ✓" : "Save Project for Later"}
                </button>

                <p style={{ fontSize: "0.82rem", color: "var(--tx-slate-500)", textAlign: "center", marginTop: "14px" }}>
                  Submit a proposal with your approach, timeline, and proposed payment terms.
                </p>
              </div>

              {/* Client Info Card */}
              <div
                style={{
                  background: "var(--tx-white)",
                  border: "1px solid var(--tx-slate-200)",
                  borderRadius: "var(--tx-radius-lg)",
                  padding: "24px",
                }}
              >
                <h4 style={{ fontSize: "1.05rem", marginBottom: "16px" }}>About the Client</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div className="tx-avatar-badge" style={{ width: "42px", height: "42px" }}>
                    {clientName[0]}
                  </div>
                  <div><strong>{clientName}</strong></div>
                </div>

                <div style={{ fontSize: "0.88rem", color: "var(--tx-slate-600)", display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px", borderTop: "1px solid var(--tx-slate-100)", paddingTop: "14px" }}>
                  {job.client?.createdAt && (
                    <div><strong>Member since:</strong> {new Date(job.client.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                  )}
                  {job.deadline && (
                    <div><strong>Target deadline:</strong> {new Date(job.deadline).toLocaleDateString()}</div>
                  )}
                  <div><strong>Project listing status:</strong> <span style={{ textTransform: "capitalize" }}>{job.status}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PROPOSAL APPLICATION MODAL */}
        {showApplyModal && (
          <div className="tx-modal-overlay">
            <div className="tx-modal-card">
              <div className="tx-modal-header">
                <h2>Submit a Proposal</h2>
                <button
                  type="button"
                  className="tx-modal-close-btn"
                  onClick={() => {
                    setShowApplyModal(false);
                    setProposalSuccess(false);
                  }}
                >
                  ×
                </button>
              </div>

              {proposalSuccess ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: "3rem", color: "var(--tx-green)", marginBottom: "12px" }}>✓</div>
                  <h3 style={{ marginBottom: "8px" }}>Proposal Submitted Successfully!</h3>
                  <p style={{ color: "var(--tx-slate-600)", marginBottom: "24px" }}>
                    Your proposal for <strong>{job.title}</strong> has been transmitted to the client. You can track this in your Freelancer Dashboard.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                      type="button"
                      className="tx-btn tx-btn-primary"
                      onClick={() => navigate("/freelancer/dashboard")}
                    >
                      Go to Dashboard
                    </button>
                    <button
                      type="button"
                      className="tx-btn tx-btn-subtle"
                      onClick={() => {
                        setShowApplyModal(false);
                        setProposalSuccess(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProposalSubmit} className="tx-auth-form">
                  <div style={{ background: "var(--tx-slate-50)", padding: "14px", borderRadius: "var(--tx-radius-md)", marginBottom: "8px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>Applying for:</div>
                    <strong>{job.title}</strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--tx-green-dark)", marginTop: "2px" }}>
                      Client's Budget: {formattedBudget}
                    </div>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="bid">Your Bid Amount ($ USD)</label>
                    <input
                      id="bid"
                      type="number"
                      min="1"
                      max="100000000"
                      step="0.01"
                      className="tx-input"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="e.g. 500"
                      required
                    />
                    <small style={{ color: "var(--tx-slate-500)" }}>
                      TalentX 0% minor-project service fee applies. You receive: ${bidAmount || 0}
                    </small>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="duration">Estimated Duration</label>
                    <select
                      id="duration"
                      className="tx-input"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option value="Less than 1 week">Less than 1 week</option>
                      <option value="Less than 1 month">Less than 1 month</option>
                      <option value="1 to 3 months">1 to 3 months</option>
                      <option value="More than 3 months">More than 3 months</option>
                    </select>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="coverLetter">Cover Letter</label>
                    <textarea
                      id="coverLetter"
                      rows={5}
                      className="tx-input"
                      placeholder="Describe your recent experience with this stack, how you will tackle the project, and any relevant portfolio links..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      required
                    />
                  </div>
                  {proposalError && (
                    <p
                      role="alert"
                      style={{
                        color: "#dc2626",
                        background: "#fef2f2",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {proposalError}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                    <button
                      type="button"
                      className="tx-btn tx-btn-subtle"
                      onClick={() => setShowApplyModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="tx-btn tx-btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting Proposal..." : "Submit Proposal ↗"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
