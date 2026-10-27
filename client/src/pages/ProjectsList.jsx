import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../App.css";

export default function ProjectsList({ embedded = false }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/projects/mine")
      .then(({ data }) => setProjects(Array.isArray(data.projects) ? data.projects : []))
      .catch((err) => {
        console.error("Load projects failed:", err);
        setError(err.response?.data?.message || "Unable to load projects.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const content = (
    <section>
      <div className="tx-section-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>My Projects</h1>
          <p className="tx-section-subtitle">Accepted projects, progress, deliverables, payment status, and chat.</p>
        </div>
        <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={load}>Refresh</button>
      </div>
      {error && <div className="tx-alert tx-alert-danger" role="alert">{error}</div>}
      {loading ? (
        <p role="status" style={{ color: "var(--tx-slate-500)", padding: "24px 0" }}>Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="tx-stat-box">
          <h3>No projects yet</h3>
          <p style={{ marginTop: "8px" }}>A project workspace appears here after a client accepts a proposal.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {projects.map((project) => (
            <article key={project._id} className="tx-stat-box">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem" }}>{project.title}</h2>
                  <p style={{ marginTop: "5px" }}>
                    {project.client?.name} · {project.freelancer?.name}
                    {project.agreedAmount > 0 ? ` · $${Number(project.agreedAmount).toLocaleString()}` : " · Demanded upon completion"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="tx-role-pill">{project.status}</span>
                  <p style={{ marginTop: "6px", fontSize: "0.85rem" }}>
                    {project.completionPercentage}% complete
                    {project.expectedDeadline ? ` · Due ${new Date(project.expectedDeadline).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ height: "8px", borderRadius: "999px", background: "var(--tx-slate-100)", margin: "14px 0" }}>
                <div style={{ width: `${project.completionPercentage}%`, height: "100%", borderRadius: "inherit", background: "var(--tx-green)" }} />
              </div>
              <Link to={`/projects/${project._id}`} className="tx-btn tx-btn-primary tx-btn-sm">Open Project Workspace</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return embedded ? content : <div className="tx-dashboard-body">{content}</div>;
}
