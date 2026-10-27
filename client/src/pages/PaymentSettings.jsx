import { useEffect, useState } from "react";
import api from "../services/api";

export default function PaymentSettings() {
  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/payment-preferences/mine")
      .then(({ data }) => {
        if (!data.preference) return;
        setMethod(data.preference.method);
        setDisplayLabel(data.preference.displayLabel);
        setUpiId(data.preference.details?.upiId || "");
        setAccountName(data.preference.details?.accountName || "");
        setAccountNumber(data.preference.details?.accountNumber || "");
        setIfsc(data.preference.details?.ifsc || "");
      })
      .catch((err) => {
        console.error("Load payment settings failed:", err);
        setError(err.response?.data?.message || "Unable to load payment settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const details = method === "upi"
        ? { upiId }
        : { accountName, accountNumber, ifsc };
      const { data } = await api.put("/payment-preferences/mine", { method, details });
      setDisplayLabel(data.preference.displayLabel);
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">Loading payment settings…</p>;

  return (
    <section style={{ maxWidth: "760px" }}>
      <div className="tx-section-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Payment Settings</h1>
          <p className="tx-section-subtitle">Save how you prefer to receive manual project payments.</p>
        </div>
      </div>
      {error && <div role="alert" className="tx-alert tx-alert-danger" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && <div role="status" className="tx-alert tx-alert-success" style={{ marginBottom: "16px" }}>{success}</div>}
      {displayLabel && <p style={{ marginBottom: "16px" }}>Current method: <strong>{displayLabel}</strong></p>}
      <form className="tx-stat-box tx-auth-form" onSubmit={save}>
        <div className="tx-form-group">
          <label htmlFor="payment-method">Preferred payment method</label>
          <select id="payment-method" className="tx-input" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="upi">UPI (manual transfer)</option>
            <option value="bank_transfer">Bank transfer (NEFT/IMPS)</option>
          </select>
        </div>
        {method === "upi" ? (
          <div className="tx-form-group">
            <label htmlFor="upi-id">UPI ID</label>
            <input id="upi-id" className="tx-input" value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@bank" autoComplete="off" required />
          </div>
        ) : (
          <>
            <div className="tx-form-group">
              <label htmlFor="beneficiary-name">Beneficiary name</label>
              <input id="beneficiary-name" className="tx-input" value={accountName} onChange={(event) => setAccountName(event.target.value)} autoComplete="name" required />
            </div>
            <div className="tx-form-group">
              <label htmlFor="account-number">Bank account number</label>
              <input id="account-number" className="tx-input" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} inputMode="numeric" autoComplete="off" required />
            </div>
            <div className="tx-form-group">
              <label htmlFor="ifsc-code">IFSC code</label>
              <input id="ifsc-code" className="tx-input" value={ifsc} onChange={(event) => setIfsc(event.target.value)} autoCapitalize="characters" autoComplete="off" required />
            </div>
          </>
        )}
        <p style={{ fontSize: "0.88rem", color: "var(--tx-slate-500)", marginBottom: "16px" }}>
          Details are encrypted at rest and shared only with the client on an approved project awaiting payment. Never enter a UPI PIN, OTP, bank password, or card security code. TalentX does not currently process payments through a gateway.
        </p>
        <button type="submit" className="tx-btn tx-btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Payment Method"}
        </button>
      </form>
    </section>
  );
}
