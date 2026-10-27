import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../App.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: normalizedEmail });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to process your request right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tx-auth-page">
      <section className="tx-auth-card" aria-labelledby="forgot-password-title">
        <header className="tx-auth-header">
          <Link to="/" className="tx-auth-brand" aria-label="TalentX Homepage">
            <span className="tx-brand-icon"><span>T</span>X</span>
            <span>Talent<span className="tx-brand-accent">X</span></span>
          </Link>
          <h1 id="forgot-password-title">Forgot your password?</h1>
          <p>Enter your registered email address to receive a password reset link.</p>
        </header>

        {error && <div className="tx-alert tx-alert-danger" role="alert">{error}</div>}
        {message && <div className="tx-alert tx-alert-success" role="status">{message}</div>}

        <form onSubmit={handleSubmit} className="tx-auth-form" noValidate>
          <div className="tx-form-group">
            <label htmlFor="reset-email">Email address</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. yourname@example.com"
              className="tx-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
          </div>
          <button
            type="submit"
            className="tx-btn tx-btn-primary tx-btn-block tx-btn-lg"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="tx-auth-switch">
          Remembered your password? <Link to="/login">Return to Login</Link>
        </p>
      </section>
    </main>
  );
}
