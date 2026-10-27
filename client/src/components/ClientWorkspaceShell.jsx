import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import "../App.css";

export default function ClientWorkspaceShell({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || "Client";

  return (
    <div className="tx-dashboard-layout">
      <aside className="tx-dashboard-sidebar">
        <Link to="/" className="tx-sidebar-brand">
          <span className="tx-brand-icon"><span>T</span>X</span>
          <span style={{ fontFamily: "var(--tx-font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
            Talent<span className="tx-brand-accent">X</span>
          </span>
        </Link>
        <div className="tx-sidebar-role-badge">Client Workspace</div>
        <nav className="tx-sidebar-nav">
          <Link to="/client/dashboard" className="tx-sidebar-btn"><span>▦</span><span>Dashboard Overview</span></Link>
          <Link to="/client/jobs" className="tx-sidebar-btn"><span>▤</span><span>My Project Listings</span></Link>
          <Link to="/client/proposals" className="tx-sidebar-btn"><span>📝</span><span>Received Proposals</span></Link>
          <Link to="/client/projects" className="tx-sidebar-btn"><span>📁</span><span>Active Projects</span></Link>
          <Link to="/messages" className="tx-sidebar-btn"><span>💬</span><span>Chat / Messages</span></Link>
          <Link to="/profile" className="tx-sidebar-btn"><span>👤</span><span>Company Profile</span></Link>
        </nav>
        <div className="tx-sidebar-footer">
          <button
            type="button"
            className="tx-btn tx-btn-subtle tx-btn-block"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log Out
          </button>
        </div>
      </aside>
      <div className="tx-dashboard-main">
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">Workspace / <strong>Client Dashboard</strong> / {title}</div>
          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}>
              <strong>{name}</strong><span>Client Account</span>
            </div>
            <div className="tx-avatar-badge">{name[0]?.toUpperCase()}</div>
          </div>
        </header>
        <main className="tx-dashboard-body">{children}</main>
      </div>
    </div>
  );
}
