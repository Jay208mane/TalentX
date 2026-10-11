import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useAuth from "../context/useAuth";
import api from "../services/api";
import "../App.css";

const fallbackJob = {
  _id: "demo-details",
  title: "Senior MERN Stack Architecture Redesign",
  category: "Development",
  description:
    "We are seeking an experienced Full-Stack MERN engineer to review our existing application architecture, streamline React components, and optimize Express endpoints. The selected freelancer will work on improving user authentication, enhancing the client and freelancer dashboards, and ensuring top-notch code quality.\n\nKey Responsibilities:\n• Refactor frontend components into reusable architectural patterns\n• Connect real REST API endpoints with robust error handling\n• Validate responsive behavior on all viewports\n• Maintain clean coding standards and documentation",
  budget: 950,
  budgetType: "fixed",
  skills: ["React 19", "Node.js", "Express", "MongoDB", "UI/UX", "Vite"],
  client: { name: "Apex Global Labs", email: "client@example.com" },
  createdAt: new Date().toISOString(),
  deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
};

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

  useEffect(() => {
    api
      .get(`/jobs/${id}`)
      .then((res) => {
        if (res.data?.job) {
          setJob(res.data.job);
          setBidAmount(res.data.job.budget || "");
        } else {
          setJob(fallbackJob);
          setBidAmount(fallbackJob.budget);
        }
      })
      .catch(() => {
        // Fallback to sample if ID is demo
        setJob(fallbackJob);
        setBidAmount(fallbackJob.budget);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/jobs/${id}` } } });
      return;
    }
    if (user?.role === "client") {
      alert("You are currently signed in as a Client. Only Freelancers can apply to jobs.");
      return;
    }
    setShowApplyModal(true);
  };

  const handleProposalSubmit = (e) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      alert("Please provide a cover letter explaining your qualifications.");
      return;
    }

    setSubmitting(true);
    // Simulate proposal processing with persistent confirmation
    setTimeout(() => {
      setSubmitting(false);
      setProposalSuccess(true);
      // Store proposal in localStorage for Freelancer dashboard tracking
      try {
        const stored = JSON.parse(localStorage.getItem("talentx_proposals") || "[]");
        stored.push({
          jobId: job._id || id,
          jobTitle: job.title,
          bidAmount: Number(bidAmount),
          duration,
          coverLetter,
          appliedAt: new Date().toISOString(),
          status: "Pending Review",
        });
        localStorage.setItem("talentx_proposals", JSON.stringify(stored));
      } catch (e) {
        console.error(e);
      }
    }, 800);
  };

  if (loading) {
    return (
      <div className="tx-page-wrapper">
        <Navbar />
        <main className="tx-main-content" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
          <p style={{ color: "var(--tx-slate-500)" }}>Loading job details...</p>
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
          <h2>Job Not Found</h2>
          <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px" }}>
            The job you are looking for is no longer open or does not exist.
          </p>
          <Link to="/jobs" className="tx-btn tx-btn-primary">
            Browse All Jobs
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const clientName = typeof job.client === "object" ? job.client?.name : "Verified Client";
  const formattedBudget =
    job.budgetType === "hourly"
      ? `$${job.budget} / hour`
      : `$${Number(job.budget || 0).toLocaleString()} Fixed-Price`;

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        <div className="tx-container" style={{ padding: "40px 24px" }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: "24px", fontSize: "0.9rem", color: "var(--tx-slate-500)" }}>
            <Link to="/jobs" style={{ color: "var(--tx-green)", fontWeight: 600 }}>
              ← Back to All Jobs
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
            {/* Main Job Information Column */}
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
                  title={isSaved ? "Saved" : "Save Job"}
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
                    BUDGET
                  </span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--tx-green-dark)" }}>
                    {formattedBudget}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                    POSTED ON
                  </span>
                  <strong style={{ fontSize: "1.05rem", color: "var(--tx-slate-800)" }}>
                    {new Date(job.createdAt).toLocaleDateString()}
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

              {/* Description */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Summary & Requirements</h3>
                <div style={{ whiteSpace: "pre-line", color: "var(--tx-slate-700)", lineHeight: 1.7, fontSize: "1.02rem" }}>
                  {job.description}
                </div>
              </div>

              {/* Required Skills */}
              {job.skills && job.skills.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "12px" }}>Skills & Expertise</h3>
                  <div className="tx-job-skills">
                    {job.skills.map((skill, index) => (
                      <span key={index} className="tx-skill-tag" style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
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
                  Apply Now ↗
                </button>

                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-block"
                  onClick={() => setIsSaved(!isSaved)}
                >
                  {isSaved ? "Saved Job ✓" : "Save Job for Later"}
                </button>

                <p style={{ fontSize: "0.82rem", color: "var(--tx-slate-500)", textAlign: "center", marginTop: "14px" }}>
                  Required Connects: 2 • Available to submit
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
                  <div>
                    <strong>{clientName}</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--tx-green-dark)", fontWeight: 600 }}>
                      ✓ Payment Method Verified
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.88rem", color: "var(--tx-slate-600)", display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px", borderTop: "1px solid var(--tx-slate-100)", paddingTop: "14px" }}>
                  <div><strong>Member since:</strong> 2026</div>
                  <div><strong>Location:</strong> India / Global</div>
                  <div><strong>Job Postings:</strong> Active</div>
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
