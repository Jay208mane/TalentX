import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ClientWorkspaceShell from "../../components/ClientWorkspaceShell";
import api from "../../services/api";

export default function ReceivedProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/proposals/received")
      .then(({ data }) => setProposals(Array.isArray(data.proposals) ? data.proposals : []))
      .catch((err) => {
        console.error("Load received proposals failed:", err);
        setError(err.response?.data?.message || "Unable to load received proposals.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const decide = async (proposal, decision) => {
    setBusyId(proposal._id);
    setError("");
    try {
      const { data } = await api.patch(`/proposals/${proposal._id}/decision`, { decision });
      if (data.project?._id) {
        setProposals((items) => items.map((item) =>
          item._id === proposal._id
            ? { ...item, status: "accepted", project: data.project._id }
            : item
        ));
      } else {
        setProposals((items) => items.map((item) =>
          item._id === proposal._id ? { ...item, status: "rejected" } : item
        ));
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update this proposal.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <ClientWorkspaceShell title="Received Proposals">
      <div className="tx-section-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Received Proposals</h1>
          <p className="tx-section-subtitle">Review applications for jobs you own and choose one freelancer per job.</p>
        </div>
        <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={load}>Refresh</button>
      </div>
      {error && <div className="tx-alert tx-alert-danger" role="alert">{error}</div>}
      {loading ? (
        <p role="status" style={{ color: "var(--tx-slate-500)", padding: "24px 0" }}>Loading proposals…</p>
      ) : proposals.length === 0 ? (
        <div className="tx-stat-box"><h3>No proposals received yet</h3><p>Proposals for your project listings will appear here.</p></div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {proposals.map((proposal) => (
            <article key={proposal._id} className="tx-stat-box">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem" }}>{proposal.job?.title || "Project listing"}</h2>
                  <p style={{ marginTop: "4px" }}>
                    Freelancer: <strong>{proposal.freelancer?.name || "Unknown freelancer"}</strong>
                    {" · "}Submitted {proposal.createdAt ? new Date(proposal.createdAt).toLocaleString() : "recently"}
                  </p>
                  <p style={{ marginTop: "8px" }}>
                    Proposed budget: <strong>${Number(proposal.bidAmount).toLocaleString()}</strong>
                    {" · "}Estimated duration: <strong>{proposal.duration}</strong>
                  </p>
                </div>
                <span className="tx-role-pill" style={{ textTransform: "capitalize" }}>{proposal.status}</span>
              </div>
              {expanded === proposal._id && (
                <div style={{ marginTop: "16px", padding: "16px", background: "var(--tx-slate-50)", borderRadius: "var(--tx-radius-md)" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>Cover letter</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{proposal.coverLetter}</p>
                  {proposal.freelancer?.email && <p style={{ marginTop: "8px" }}>Contact: {proposal.freelancer.email}</p>}
                </div>
              )}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  onClick={() => setExpanded(expanded === proposal._id ? "" : proposal._id)}
                >
                  {expanded === proposal._id ? "Hide Proposal" : "View Proposal"}
                </button>
                {proposal.status === "pending" && (
                  <>
                    <button type="button" className="tx-btn tx-btn-primary tx-btn-sm" disabled={busyId === proposal._id} onClick={() => decide(proposal, "accept")}>
                      {busyId === proposal._id ? "Saving…" : "Accept"}
                    </button>
                    <button type="button" className="tx-btn tx-btn-danger tx-btn-sm" disabled={busyId === proposal._id} onClick={() => decide(proposal, "reject")}>
                      Reject
                    </button>
                  </>
                )}
                {proposal.status === "accepted" && proposal.project && (
                  <Link to={`/projects/${proposal.project}`} className="tx-btn tx-btn-primary tx-btn-sm">Open Project</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </ClientWorkspaceShell>
  );
}
