
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const menuItems = [
  { label: "Overview", icon: "▦", path: "/dashboard" },
  { label: "Find Work", icon: "⌕", path: "/jobs" },
  { label: "My Projects", icon: "▤", path: "/projects" },
  { label: "Messages", icon: "✉", path: "/messages" },
  { label: "My Profile", icon: "♙", path: "/profile" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Overview");

  let user;
  try {
    user = JSON.parse(localStorage.getItem("talentx_user") || "{}");
  } catch {
    user = {};
  }

  const name = user.name || "TalentX Member";
  const role = user.role || "freelancer";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  function logout() {
    localStorage.removeItem("talentx_token");
    localStorage.removeItem("talentx_user");
    navigate("/login", { replace: true });
  }

  function selectItem(item) {
    setActive(item.label);

    if (item.path !== "/dashboard") {
      navigate(item.path);
    }
  }

  return (
    <div className="tx-dashboard">
      <aside className="tx-sidebar">
        <Link to="/" className="tx-brand">
          <span className="tx-brand-symbol">T<span>X</span></span>
          <span className="tx-brand-name">Talent<span>X</span></span>
        </Link>

        <div className="tx-workspace-label">WORKSPACE</div>

        <nav className="tx-side-nav" aria-label="Dashboard navigation">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => selectItem(item)}
              className={`tx-nav-item ${
                active === item.label ? "active" : ""
              }`}
            >
              <span className="tx-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {active === item.label && (
                <span className="tx-active-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="tx-sidebar-spacer" />

        <div className="tx-sidebar-help">
          <div className="tx-help-icon">?</div>
          <strong>Need a hand?</strong>
          <p>Keep building your next opportunity with TalentX.</p>
          <a href="mailto:support@talentx.example">Get support ↗</a>
        </div>

        <button className="tx-logout" onClick={logout} type="button">
          <span className="tx-nav-icon">↪</span>
          Log out
        </button>
      </aside>

      <main className="tx-main">
        <header className="tx-topbar">
          <div>
            <div className="tx-breadcrumb">Workspace / Overview</div>
            <h1>Dashboard</h1>
          </div>

          <div className="tx-topbar-user">
            <div className="tx-topbar-user-info">
              <strong>{name}</strong>
              <span>
                {role === "client" ? "Client account" : "Freelancer account"}
              </span>
            </div>
            <div className="tx-avatar">{initials || "T"}</div>
          </div>
        </header>

        <section className="tx-welcome">
          <div>
            <span className="tx-eyebrow">YOUR TALENTX WORKSPACE</span>
            <h2>Welcome back, {name.split(" ")[0]}! <span>✳</span></h2>
            <p>
              {role === "client"
                ? "Find skilled professionals and bring your next idea to life."
                : "Your next opportunity starts with one small step."}
            </p>
          </div>

          <Link to="/jobs" className="tx-primary-button">
            {role === "client" ? "Find talent" : "Explore jobs"} <span>↗</span>
          </Link>
        </section>

        <section className="tx-stats-grid">
          <article className="tx-stat-card">
            <div className="tx-stat-top">
              <span>Active projects</span>
              <span className="tx-stat-icon green">▤</span>
            </div>
            <strong>0</strong>
            <p>Your current projects</p>
          </article>

          <article className="tx-stat-card">
            <div className="tx-stat-top">
              <span>Unread messages</span>
              <span className="tx-stat-icon purple">✉</span>
            </div>
            <strong>0</strong>
            <p>Conversations to catch up on</p>
          </article>

          <article className="tx-stat-card">
            <div className="tx-stat-top">
              <span>Profile status</span>
              <span className="tx-stat-icon orange">♙</span>
            </div>
            <strong className="tx-stat-status">Getting started</strong>
            <p>Complete your profile to stand out</p>
          </article>
        </section>

        <section className="tx-content-grid">
          <article className="tx-panel tx-project-panel">
            <div className="tx-panel-heading">
              <div>
                <h3>Get started with TalentX</h3>
                <p>A few steps to get your workspace ready.</p>
              </div>
              <span className="tx-panel-symbol">✳</span>
            </div>

            <div className="tx-checklist">
              <div className="tx-check-item">
                <span className="tx-check-number">01</span>
                <div>
                  <strong>Your account is ready</strong>
                  <p>You have successfully signed in.</p>
                </div>
                <span className="tx-check-complete">✓</span>
              </div>

              <div className="tx-check-item">
                <span className="tx-check-number">02</span>
                <div>
                  <strong>Complete your profile</strong>
                  <p>Add your skills, experience and introduction.</p>
                </div>
                <button
                  className="tx-text-button"
                  onClick={() => navigate("/profile")}
                  type="button"
                >
                  Open →
                </button>
              </div>

              <div className="tx-check-item">
                <span className="tx-check-number">03</span>
                <div>
                  <strong>
                    {role === "client" ? "Explore professionals" : "Explore jobs"}
                  </strong>
                  <p>
                    {role === "client"
                      ? "Start looking for people who fit your project."
                      : "Discover opportunities that match your skills."}
                  </p>
                </div>
                <button
                  className="tx-text-button"
                  onClick={() => navigate("/jobs")}
                  type="button"
                >
                  Explore →
                </button>
              </div>
            </div>
          </article>

          <article className="tx-panel tx-quick-panel">
            <div className="tx-panel-heading">
              <div>
                <h3>Quick actions</h3>
                <p>Jump straight into your next task.</p>
              </div>
            </div>

            <button
              className="tx-action-card"
              onClick={() => navigate("/jobs")}
              type="button"
            >
              <span className="tx-action-icon">⌕</span>
              <span>
                <strong>{role === "client" ? "Find talent" : "Browse jobs"}</strong>
                <small>Discover new opportunities</small>
              </span>
              <span className="tx-action-arrow">↗</span>
            </button>

            <button
              className="tx-action-card"
              onClick={() => navigate("/profile")}
              type="button"
            >
              <span className="tx-action-icon lavender">♙</span>
              <span>
                <strong>Edit your profile</strong>
                <small>Showcase your skills</small>
              </span>
              <span className="tx-action-arrow">↗</span>
            </button>

            <button
              className="tx-action-card"
              onClick={() => navigate("/messages")}
              type="button"
            >
              <span className="tx-action-icon peach">✉</span>
              <span>
                <strong>Open messages</strong>
                <small>Connect with others</small>
              </span>
              <span className="tx-action-arrow">↗</span>
            </button>
          </article>
        </section>

        <footer className="tx-dashboard-footer">
          <span>© 2026 TalentX</span>
          <span>Built for talent. Designed for possibility.</span>
        </footer>
      </main>
    </div>
  );
}