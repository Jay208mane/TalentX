import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardPath = () => {
    if (!user) return "/login";
    if (user.role === "client") return "/client/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/freelancer/dashboard";
  };

  return (
    <header className="tx-navbar-wrap">
      <div className="tx-navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="tx-navbar-brand" aria-label="TalentX Homepage">
          <span className="tx-brand-icon">
            <span>T</span>X
          </span>
          <span className="tx-brand-text">
            Talent<span className="tx-brand-accent">X</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="tx-nav-links" aria-label="Main Navigation">
          <NavLink
            to="/freelancers"
            className={({ isActive }) =>
              `tx-nav-link ${isActive ? "active" : ""}`
            }
          >
            Find Talent
          </NavLink>
          <a href="/#how-it-works" className="tx-nav-link">
            How It Works
          </a>
          <a href="/#about" className="tx-nav-link">
            Why TalentX
          </a>
        </nav>

        {/* Right Actions / Auth state */}
        <div className="tx-nav-actions">
          {isAuthenticated && user ? (
            <div className="tx-user-menu">
              <Link to={getDashboardPath()} className="tx-btn tx-btn-subtle">
                <span>Dashboard</span>
                <span className="tx-role-pill">{user.role}</span>
              </Link>
              <div className="tx-avatar-badge" title={user.name}>
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="tx-btn tx-btn-outline tx-btn-sm"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="tx-guest-actions">
              <Link to="/login" className="tx-btn tx-btn-ghost">
                Log In
              </Link>
              <Link to="/register" className="tx-btn tx-btn-primary">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="tx-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="tx-hamburger-line"></span>
            <span className="tx-hamburger-line"></span>
            <span className="tx-hamburger-line"></span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="tx-mobile-drawer">
          <NavLink
            to="/freelancers"
            className="tx-mobile-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Find Talent
          </NavLink>
          <a
            href="/#how-it-works"
            className="tx-mobile-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            How It Works
          </a>
          <a
            href="/#about"
            className="tx-mobile-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Why TalentX
          </a>
          <div className="tx-mobile-divider"></div>
          {isAuthenticated && user ? (
            <div className="tx-mobile-auth">
              <div className="tx-mobile-user-info">
                <strong>{user.name}</strong>
                <span className="tx-role-pill">{user.role}</span>
              </div>
              <Link
                to={getDashboardPath()}
                className="tx-btn tx-btn-primary tx-btn-block"
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="tx-btn tx-btn-outline tx-btn-block"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="tx-mobile-auth">
              <Link
                to="/login"
                className="tx-btn tx-btn-outline tx-btn-block"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="tx-btn tx-btn-primary tx-btn-block"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
