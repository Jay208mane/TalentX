import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../App.css";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawingId, setWithdrawingId] = useState("");

  const loadProposals = () => {
    setLoading(true);
    setError("");
    api
      .get("/proposals/mine")
      .then((res) => {
        setProposals(Array.isArray(res.data?.proposals) ? res.data.proposals : []);
      })
      .catch((err) => {
        console.error("Failed to load proposals:", err);
        setError(
          err.response?.data?.message || "Unable to fetch your proposals right now."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get("/proposals/mine")
      .then((res) => {
        if (isMounted) {
          setProposals(Array.isArray(res.data?.proposals) ? res.data.proposals : []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load proposals:", err);
          setError(
            err.response?.data?.message || "Unable to fetch your proposals right now."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWithdraw = async (proposalId) => {
    setWithdrawingId(proposalId);
    setError("");
    try {
      await api.patch(`/proposals/${proposalId}/withdraw`);
      loadProposals();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to withdraw this proposal.");
    } finally {
      setWithdrawingId("");
    }
  };

  return (
    <section className="tx-freelancer-proposals-section">
      <div className="tx-section-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "6px" }}>My Submitted Proposals</h1>
          <p className="tx-section-subtitle">
            Track your bids, project timelines, client responses, and application status.
          </p>
        </div>
        <Link to="/freelancer/jobs" className="tx-btn tx-btn-primary tx-btn-sm">
          Browse Open Projects →
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "var(--tx-slate-500)" }}>Loading your proposals...</p>
        </div>
      ) : error ? (
        <div className="tx-alert tx-alert-danger" style={{ marginBottom: "20px" }}>
          <span>⚠️</span> {error}
          <button
            type="button"
            onClick={loadProposals}
            className="tx-btn tx-btn-subtle tx-btn-sm"
            style={{ marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      ) : proposals.length === 0 ? (
        <div
          style={{
            background: "var(--tx-white)",
            padding: "48px 24px",
            borderRadius: "var(--tx-radius-lg)",
            border: "1px dashed var(--tx-slate-300)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📝</div>
          <h3 style={{ marginBottom: "6px" }}>No Proposals Submitted Yet</h3>
          <p style={{ color: "var(--tx-slate-500)", marginBottom: "20px", maxWidth: "460px", margin: "0 auto 20px" }}>
            When you propose on marketplace projects, your offer, timeline, and status will appear here.
          </p>
          <Link to="/freelancer/jobs" className="tx-btn tx-btn-primary">
            Explore Marketplace Projects ↗
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {proposals.map((prop) => {
            const jobTitle = prop.job?.title || "Project Listing";
            const jobId = prop.job?._id || prop.job;
            const category = prop.job?.category || "General";
            const appliedDate = prop.createdAt
              ? new Date(prop.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recently";

            const statusColors = {
              pending: { bg: "var(--tx-slate-100)", text: "var(--tx-slate-700)" },
              accepted: { bg: "var(--tx-green-light)", text: "var(--tx-green-dark)" },
              rejected: { bg: "#fee2e2", text: "#991b1b" },
              withdrawn: { bg: "var(--tx-slate-100)", text: "var(--tx-slate-500)" },
            };
            const currentStatusColor =
              statusColors[prop.status] || statusColors.pending;

            return (
              <article
                key={prop._id}
                style={{
                  background: "var(--tx-white)",
                  border: "1px solid var(--tx-slate-200)",
                  borderRadius: "var(--tx-radius-md)",
                  padding: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span className="tx-job-category-badge">{category}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>
                      Submitted: {appliedDate}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", marginBottom: "8px" }}>
                    {jobId ? (
                      <Link to={`/jobs/${jobId}`}>{jobTitle}</Link>
                    ) : (
                      jobTitle
                    )}
                  </h3>

                  <div style={{ fontSize: "0.9rem", color: "var(--tx-slate-600)", marginBottom: "12px" }}>
                    <strong>Estimated Duration:</strong> {prop.duration}
                  </div>

                  <p
                    style={{
                      fontSize: "0.92rem",
                      color: "var(--tx-slate-700)",
                      backgroundColor: "var(--tx-slate-50)",
                      padding: "12px 16px",
                      borderRadius: "var(--tx-radius-sm)",
                      borderLeft: "3px solid var(--tx-green)",
                      fontStyle: "italic",
                    }}
                  >
                    "{prop.coverLetter}"
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "8px",
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--tx-slate-500)", display: "block" }}>
                      Your Bid
                    </span>
                    <strong
                      style={{
                        fontSize: "1.45rem",
                        color: "var(--tx-green-dark)",
                      }}
                    >
                      ${Number(prop.bidAmount || 0).toLocaleString()}
                    </strong>
                  </div>

                  <span
                    className="tx-role-pill"
                    style={{
                      backgroundColor: currentStatusColor.bg,
                      color: currentStatusColor.text,
                      textTransform: "capitalize",
                      fontWeight: 600,
                    }}
                  >
                    {prop.status || "Pending"}
                  </span>

                  {jobId && (
                    <Link
                      to={`/jobs/${jobId}`}
                      className="tx-btn tx-btn-subtle tx-btn-sm"
                      style={{ marginTop: "8px" }}
                    >
                      View Original Job →
                    </Link>
                  )}
                  {prop.project?._id && (
                    <Link
                      to={`/projects/${prop.project._id}`}
                      className="tx-btn tx-btn-primary tx-btn-sm"
                      style={{ marginTop: "8px" }}
                    >
                      Open Project Workspace →
                    </Link>
                  )}
                  {prop.status === "pending" && (
                    <button
                      type="button"
                      className="tx-btn tx-btn-outline tx-btn-sm"
                      style={{ marginTop: "8px" }}
                      disabled={withdrawingId === prop._id}
                      onClick={() => handleWithdraw(prop._id)}
                    >
                      {withdrawingId === prop._id ? "Withdrawing…" : "Withdraw Proposal"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
