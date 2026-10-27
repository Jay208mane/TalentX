import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../services/api";
import "../App.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error("Invalid response received from server.");
      }

      // Update state and storage atomically
      login(token, user);

      // Determine redirect path
      const rolePaths = {
        freelancer: "/freelancer/dashboard",
        client: "/client/dashboard",
        admin: "/admin/dashboard",
      };

      const defaultTarget = rolePaths[user.role] || "/freelancer/dashboard";
      const originPath = location.state?.from?.pathname;
      const target = originPath && originPath !== "/login" ? originPath : defaultTarget;

      navigate(target, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Please verify your email and password."
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
          <h1>Welcome back</h1>
          <p>Sign in to your TalentX account to continue</p>
        </div>

        {error && (
          <div className="tx-alert tx-alert-danger" role="alert" style={{ marginBottom: "20px" }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tx-auth-form" noValidate>
          <div className="tx-form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. yourname@example.com"
              className="tx-input"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="tx-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="tx-auth-inline-link">
                Forgot Password?
              </Link>
            </div>
            <div className="tx-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
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
            {loading ? "Signing in..." : "Log In to TalentX"}
          </button>
        </form>

        <p className="tx-auth-switch">
          Don't have an account yet?{" "}
          <Link to="/register">Create an account</Link>
        </p>

        <Link to="/" className="tx-auth-back-link">
          ← Back to homepage
        </Link>
      </div>
    </main>
  );
}