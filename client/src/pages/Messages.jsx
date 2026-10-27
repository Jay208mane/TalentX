import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useAuth from "../context/useAuth";
import api from "../services/api";
import "../App.css";

export default function Messages() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/projects/mine")
      .then(({ data }) => {
        if (active) setProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch((err) => {
        if (active) {
          console.error("Load project conversations failed:", err);
          setError(err.response?.data?.message || "Unable to load project conversations.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const dashboardPath = user?.role === "client" ? "/client/dashboard" : "/freelancer/dashboard";

  return (
    <div className="tx-page-wrapper">
      <Navbar />
      <main className="tx-main-content">
        <div className="tx-container" style={{ padding: "32px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
            <Link to={dashboardPath} style={{ color: "var(--tx-green)", fontWeight: 600 }}>← Back to Workspace</Link>
            <span className="tx-role-pill">Project Chat</span>
          </div>
          <div className="tx-section-header" style={{ marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "1.7rem" }}>Project Conversations</h1>
              <p className="tx-section-subtitle">Each conversation is private to the client and freelancer on its project.</p>
            </div>
          </div>
          {error && <div className="tx-alert tx-alert-danger" role="alert">{error}</div>}
          {loading ? (
            <p role="status" style={{ padding: "28px 0" }}>Loading project conversations…</p>
          ) : projects.length === 0 ? (
            <div className="tx-stat-box">
              <h2 style={{ fontSize: "1.15rem" }}>No project conversations yet</h2>
              <p style={{ marginTop: "8px" }}>Chat becomes available when a project is created from an accepted proposal.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {projects.map((project) => (
                <article key={project._id} className="tx-stat-box" style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: "1.1rem" }}>{project.title}</h2>
                    <p style={{ marginTop: "5px" }}>
                      {user?.role === "client" ? `Freelancer: ${project.freelancer?.name}` : `Client: ${project.client?.name}`}
                      {" · "}{project.status}
                    </p>
                  </div>
                  <Link to={`/projects/${project._id}`} className="tx-btn tx-btn-primary tx-btn-sm">Open Project Chat</Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
