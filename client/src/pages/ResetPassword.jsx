import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "../App.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is invalid or has expired. Request a new password reset link.");
      return;
    }
    if (password.length < 8 || password.length > 128 || new TextEncoder().encode(password).length > 72) {
      setError("Use a password of 8–128 characters (maximum 72 UTF-8 bytes).");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password", { token, password });
      setSuccess(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to reset your password right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tx-auth-page">
      <section className="tx-auth-card" aria-labelledby="reset-password-title">
        <header className="tx-auth-header">
          <Link to="/" className="tx-auth-brand" aria-label="TalentX Homepage">
            <span className="tx-brand-icon"><span>T</span>X</span>
            <span>Talent<span className="tx-brand-accent">X</span></span>
          </Link>
          <h1 id="reset-password-title">Create a new password</h1>
          <p>Choose a strong password to secure your TalentX account.</p>
        </header>

        {error && (
          <div className="tx-alert tx-alert-danger" role="alert">
            {error}{" "}
            {(error.includes("expired") || error.includes("invalid")) && (
              <Link to="/forgot-password">Request another reset link</Link>
            )}
          </div>
        )}
        {success && (
          <div className="tx-alert tx-alert-success" role="status">
            {success} <Link to="/login">Go to Login</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tx-auth-form" noValidate>
          <div className="tx-form-group">
            <label htmlFor="new-password">New password</label>
            <div className="tx-password-wrap">
              <input
                id="new-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="tx-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
                disabled={Boolean(success)}
              />
              <button
                type="button"
                className="tx-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide new password" : "Show new password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <small className="tx-auth-help">At least 8 characters; maximum 72 UTF-8 bytes.</small>
          </div>

          <div className="tx-form-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <div className="tx-password-wrap">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="tx-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={Boolean(success)}
              />
              <button
                type="button"
                className="tx-password-toggle"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="tx-btn tx-btn-primary tx-btn-block tx-btn-lg"
            disabled={loading || Boolean(success)}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="tx-auth-switch">
          <Link to="/login">Return to Login</Link>
        </p>
      </section>
    </main>
  );
}
