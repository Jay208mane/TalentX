import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../services/api";
import "../App.css";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "freelancer",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleRoleSelect = (selectedRole) => {
    setForm({ ...form, role: selectedRole });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please provide your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please provide a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });

      const data = response.data;

      if (data.token && data.user) {
        login(data.token, data.user);
        setSuccess("Account created successfully! Redirecting...");

        const paths = {
          freelancer: "/freelancer/dashboard",
          client: "/client/dashboard",
          admin: "/admin/dashboard",
        };

        setTimeout(() => {
          navigate(paths[data.user.role] || "/freelancer/dashboard", {
            replace: true,
          });
        }, 600);
      } else {
        setSuccess("Account registered! Please log in.");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 800);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        err.response?.data?.message ||
          "Unable to complete registration. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tx-auth-page">
      <div className="tx-auth-card">
        <div className="tx-auth-header">
          <Link to="/" className="tx-auth-brand" aria-label="TalentX Homepage">
            <span className="tx-brand-icon">
              <span>T</span>X
            </span>
            <span>
              Talent<span className="tx-brand-accent">X</span>
            </span>
          </Link>
          <h1>Join TalentX</h1>
          <p>Find great opportunities or hire extraordinary talent</p>
        </div>

        {error && (
          <div className="tx-alert tx-alert-danger" role="alert" style={{ marginBottom: "20px" }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="tx-alert tx-alert-success" role="status" style={{ marginBottom: "20px" }}>
            <span>✓</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tx-auth-form" noValidate>
          {/* Account Role Selector */}
          <div className="tx-form-group">
            <label>I want to:</label>
            <div className="tx-role-selector">
              <div
                className={`tx-role-option ${
                  form.role === "freelancer" ? "active" : ""
                }`}
                onClick={() => handleRoleSelect("freelancer")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleRoleSelect("freelancer")}
              >
                <strong>Work as a Freelancer</strong>
                <span>Find jobs & build contracts</span>
              </div>

              <div
                className={`tx-role-option ${
                  form.role === "client" ? "active" : ""
                }`}
                onClick={() => handleRoleSelect("client")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleRoleSelect("client")}
              >
                <strong>Hire as a Client</strong>
                <span>Post jobs & hire talent</span>
              </div>
            </div>
          </div>

          <div className="tx-form-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              className="tx-input"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="tx-form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. alex@example.com"
              className="tx-input"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="tx-form-group">
            <label htmlFor="password">Password (at least 8 characters)</label>
            <div className="tx-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a secure password"
                className="tx-input"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="tx-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="tx-btn tx-btn-primary tx-btn-block tx-btn-lg"
            disabled={loading}
          >
            {loading ? "Creating your account..." : "Create Account ↗"}
          </button>
        </form>

        <p className="tx-auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <Link to="/" className="tx-auth-back-link">
          ← Back to homepage
        </Link>
      </div>
    </main>
  );
}