import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import "../../App.css";

const jobStatuses = [
  ["open", "Open"],
  ["in_progress", "In Progress"],
  ["completed", "Completed"],
  ["closed", "Closed"],
];

const filterControlStyle = {
  display: "block",
  width: "100%",
  minWidth: "150px",
  marginTop: "6px",
  padding: "10px 12px",
  border: "1px solid var(--tx-slate-200)",
  borderRadius: "var(--tx-radius-md)",
  background: "var(--tx-white)",
};

function formatStatus(status) {
  return jobStatuses.find(([value]) => value === status)?.[1] || status;
}

function formatBudget(job) {
  const amount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(job.budget);
  return `${job.budgetType === "hourly" ? "$" + amount + "/hr" : "$" + amount}`;
}

export default function MarketplaceReports() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;
    const params = { page };

    if (status) params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    api
      .get("/admin/marketplace-reports", { params })
      .then(({ data }) => {
        if (isCurrentRequest) setReport(data);
      })
      .catch((err) => {
        if (isCurrentRequest) {
          console.error("Marketplace report fetch error:", err);
          setError(
            err.response?.data?.message ||
              "Unable to load marketplace reports. Please try again."
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [status, startDate, endDate, page, reloadKey]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const resetFilters = () => {
    setLoading(true);
    setError("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setReloadKey((key) => key + 1);
  };

  const stats = report?.stats;

  return (
    <div className="tx-dashboard-layout">
      <aside className="tx-dashboard-sidebar">
        <Link to="/" className="tx-sidebar-brand">
          <span className="tx-brand-icon">
            <span>T</span>X
          </span>
          <span style={{ fontFamily: "var(--tx-font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
            Talent<span className="tx-brand-accent">X</span>
          </span>
        </Link>

        <div className="tx-sidebar-role-badge" style={{ color: "#b45309", backgroundColor: "#fef3c7" }}>
          Platform Admin
        </div>

        <nav className="tx-sidebar-nav">
          <Link to="/admin/dashboard" className="tx-sidebar-btn">
            <span>▦</span>
            <span>Platform Overview</span>
          </Link>
          <Link to="/admin/users" className="tx-sidebar-btn">
            <span>👥</span>
            <span>User Management</span>
          </Link>
          <Link to="/admin/activity" className="tx-sidebar-btn">
            <span>📋</span>
            <span>Login Audit Activity</span>
          </Link>
          <Link to="/admin/marketplace" className="tx-sidebar-btn active" aria-current="page">
            <span>🔍</span>
            <span>View Marketplace</span>
          </Link>
        </nav>

        <div className="tx-sidebar-footer">
          <button type="button" onClick={handleLogout} className="tx-btn tx-btn-subtle tx-btn-block">
            Log Out
          </button>
        </div>
      </aside>

      <div className="tx-dashboard-main">
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">
            System / <strong>Administrator Portal</strong> / Marketplace Reports
          </div>
          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}>
              <strong>{user?.name || "Admin"}</strong>
              <span style={{ color: "#d97706", fontWeight: 600 }}>Super Admin</span>
            </div>
            <div className="tx-avatar-badge" style={{ backgroundColor: "#1e293b" }}>
              A
            </div>
          </div>
        </header>

        <main className="tx-dashboard-body">
          <div
            className="tx-welcome-banner"
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              borderColor: "var(--tx-slate-300)",
            }}
          >
            <div>
              <h1>Marketplace Reports</h1>
              <p style={{ color: "var(--tx-slate-600)", maxWidth: "620px" }}>
                Review marketplace activity and job records from the platform database.
              </p>
            </div>
            <button
              type="button"
              className="tx-btn tx-btn-subtle"
              onClick={() => {
                setLoading(true);
                setError("");
                setReloadKey((key) => key + 1);
              }}
            >
              Refresh Data
            </button>
          </div>

          {error && (
            <div className="tx-alert tx-alert-danger" role="alert" style={{ marginBottom: "24px" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <section
            aria-label="Marketplace filters"
            style={{
              background: "var(--tx-white)",
              border: "1px solid var(--tx-slate-200)",
              borderRadius: "var(--tx-radius-lg)",
              padding: "20px 24px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", alignItems: "end" }}>
              <label style={{ color: "var(--tx-slate-700)", fontWeight: 600, fontSize: "0.9rem" }}>
                Job status
                <select
                  value={status}
                  onChange={(event) => {
                    setLoading(true);
                    setError("");
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  style={filterControlStyle}
                >
                  <option value="">All statuses</option>
                  {jobStatuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label style={{ color: "var(--tx-slate-700)", fontWeight: 600, fontSize: "0.9rem" }}>
                Created from
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => {
                    setLoading(true);
                    setError("");
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  style={filterControlStyle}
                />
              </label>
              <label style={{ color: "var(--tx-slate-700)", fontWeight: 600, fontSize: "0.9rem" }}>
                Created through
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setLoading(true);
                    setError("");
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  style={filterControlStyle}
                />
              </label>
              <button type="button" className="tx-btn tx-btn-outline" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          </section>

          <section className="tx-stats-cards-grid" aria-label="Marketplace statistics">
            {[
              ["Total Marketplace Jobs", stats?.totalJobs],
              ["Open Projects", stats?.openJobs],
              ["Closed Jobs", stats?.closedJobs],
              ["Total Proposals / Applications", stats?.totalProposals],
            ].map(([label, value]) => (
              <div className="tx-stat-box" key={label}>
                <div className="tx-stat-box-title">{label}</div>
                <div className="tx-stat-box-value">
                  {loading || !stats ? "—" : Number(value).toLocaleString()}
                </div>
                <div className="tx-stat-box-desc">
                  {status
                    ? "Counts use the date range; status filters the job list"
                    : startDate || endDate
                      ? "Within the selected creation date range"
                      : "Across all marketplace records"}
                </div>
              </div>
            ))}
          </section>

          <section
            style={{
              background: "var(--tx-white)",
              border: "1px solid var(--tx-slate-200)",
              borderRadius: "var(--tx-radius-lg)",
              padding: "24px",
              overflowX: "auto",
            }}
          >
            <div className="tx-section-header" style={{ marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem" }}>Marketplace Jobs</h2>
                <p className="tx-section-subtitle">
                  {report
                    ? `${report.pagination.totalJobs.toLocaleString()} matching job${report.pagination.totalJobs === 1 ? "" : "s"}`
                    : "Job records matching the selected filters"}
                </p>
              </div>
            </div>

            {loading ? (
              <p role="status" style={{ padding: "20px 0", color: "var(--tx-slate-500)" }}>
                Loading marketplace records…
              </p>
            ) : error ? null : report?.jobs?.length ? (
              <>
                <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--tx-slate-200)", color: "var(--tx-slate-500)", fontSize: "0.82rem" }}>
                      <th style={{ padding: "12px 14px" }}>PROJECT TITLE</th>
                      <th style={{ padding: "12px 14px" }}>CLIENT</th>
                      <th style={{ padding: "12px 14px" }}>BUDGET</th>
                      <th style={{ padding: "12px 14px" }}>STATUS</th>
                      <th style={{ padding: "12px 14px" }}>CREATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.jobs.map((job) => (
                      <tr key={job._id} style={{ borderBottom: "1px solid var(--tx-slate-100)", fontSize: "0.9rem" }}>
                        <td style={{ padding: "14px", fontWeight: 600, color: "var(--tx-slate-900)" }}>{job.title}</td>
                        <td style={{ padding: "14px", color: "var(--tx-slate-600)" }}>{job.client?.name || "—"}</td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>{formatBudget(job)}</td>
                        <td style={{ padding: "14px" }}>
                          <span className="tx-role-pill" style={{ textTransform: "capitalize" }}>
                            {formatStatus(job.status)}
                          </span>
                        </td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap", color: "var(--tx-slate-500)" }}>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {report.pagination.pages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "20px" }}>
                    <span style={{ color: "var(--tx-slate-500)", fontSize: "0.9rem" }}>
                      Page {report.pagination.page} of {report.pagination.pages}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="tx-btn tx-btn-outline"
                        disabled={page <= 1 || loading}
                        onClick={() => {
                          setLoading(true);
                          setError("");
                          setPage((currentPage) => currentPage - 1);
                        }}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="tx-btn tx-btn-outline"
                        disabled={page >= report.pagination.pages || loading}
                        onClick={() => {
                          setLoading(true);
                          setError("");
                          setPage((currentPage) => currentPage + 1);
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ padding: "20px 0", color: "var(--tx-slate-500)" }}>
                No marketplace jobs match these filters.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
