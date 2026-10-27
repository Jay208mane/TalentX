import { useState } from "react";
import api from "../services/api";

export default function AiProfileEnhancer({
  currentProfile,
  onApplyEnhancement,
  onProfileUpdated,
}) {
  const [targetFocus, setTargetFocus] = useState(
    currentProfile?.title || "Modern Full-Stack Web Applications & Clean Architecture"
  );
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [enhancement, setEnhancement] = useState(null);
  const [error, setError] = useState("");
  const [appliedNotice, setAppliedNotice] = useState("");
  const [savingToDatabase, setSavingToDatabase] = useState(false);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    setGenerating(true);
    setError("");
    setAppliedNotice("");

    try {
      const payload = {
        name: currentProfile?.name || "Freelancer",
        currentTitle: currentProfile?.title || "",
        currentBio: currentProfile?.bio || "",
        skills: currentProfile?.skills || [],
        experienceLevel: currentProfile?.experienceLevel || "intermediate",
        hourlyRate: currentProfile?.hourlyRate || 35,
        targetFocus,
        tone,
      };

      const res = await api.post("/ai/enhance-profile", payload);
      if (res.data?.success && res.data?.data) {
        setEnhancement(res.data.data);
      } else {
        setError("Unable to generate enhancements. Please try again.");
      }
    } catch (err) {
      console.error("AI enhancement request failed:", err);
      setError(
        err.response?.data?.message ||
          "Generation request encountered an issue. Please try again in a few moments."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyToForm = () => {
    if (!enhancement) return;
    if (onApplyEnhancement) {
      onApplyEnhancement({
        title: enhancement.enhancedTitle,
        bio: enhancement.enhancedBio,
        skills: enhancement.recommendedSkills,
        profileScore: enhancement.profileStrengthScore,
        valuePropositions: enhancement.valuePropositions,
        suggestedServices: enhancement.suggestedServices,
        aiEnhanced: true,
      });
    }
    setAppliedNotice("AI enhancements applied to profile fields!");
    setTimeout(() => setAppliedNotice(""), 3500);
  };

  const handleApplyAndSaveDirectly = async () => {
    if (!enhancement) return;
    setSavingToDatabase(true);
    setError("");
    setAppliedNotice("");

    try {
      const payload = {
        name: currentProfile?.name,
        title: enhancement.enhancedTitle,
        bio: enhancement.enhancedBio,
        skills: enhancement.recommendedSkills,
        hourlyRate: currentProfile?.hourlyRate,
        experienceLevel: currentProfile?.experienceLevel,
        profileScore: enhancement.profileStrengthScore,
        valuePropositions: enhancement.valuePropositions,
        suggestedServices: enhancement.suggestedServices,
        aiEnhanced: true,
      };

      const res = await api.put("/auth/profile", payload);
      if (res.data?.success) {
        if (onApplyEnhancement) onApplyEnhancement(payload);
        if (onProfileUpdated) onProfileUpdated(res.data.user);
        setAppliedNotice("✓ Enhancements saved directly to your live TalentX profile!");
        setTimeout(() => setAppliedNotice(""), 4500);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError(err.response?.data?.message || "Failed to save profile updates to database.");
    } finally {
      setSavingToDatabase(false);
    }
  };

  const score = enhancement?.profileStrengthScore || currentProfile?.profileScore || 75;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #f8fafc 0%, #f0fdf4 100%)",
        border: "1px solid #bbf7d0",
        borderRadius: "var(--tx-radius-xl)",
        padding: "28px",
        marginBottom: "32px",
        boxShadow: "0 10px 25px -5px rgba(16, 138, 0, 0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #108a00, #059669)",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: "99px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              ✨ GenAI Component
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--tx-slate-500)" }}>
              Optimized for Upwork & TalentX Client Search
            </span>
          </div>
          <h2 style={{ fontSize: "1.45rem", color: "var(--tx-slate-900)", margin: 0 }}>
            GenAI Profile Enhancer
          </h2>
          <p style={{ color: "var(--tx-slate-600)", fontSize: "0.92rem", marginTop: "4px" }}>
            Transform your skills and background into an elite, client-winning headline and compelling executive summary.
          </p>
        </div>

        {/* Profile Strength Gauge */}
        <div
          style={{
            background: "#ffffff",
            padding: "12px 18px",
            borderRadius: "var(--tx-radius-lg)",
            border: "1px solid #e2e8f0",
            minWidth: "160px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-500)", textTransform: "uppercase" }}>
            Profile Strength
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: score >= 90 ? "var(--tx-green)" : "#eab308", margin: "2px 0" }}>
            {score}%
          </div>
          <div
            style={{
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                background: score >= 90 ? "var(--tx-green)" : "#eab308",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="tx-alert tx-alert-danger" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {appliedNotice && (
        <div className="tx-alert tx-alert-success" style={{ marginBottom: "16px" }}>
          {appliedNotice}
        </div>
      )}

      {/* Input Controls */}
      <form onSubmit={handleGenerate} style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--tx-slate-700)", marginBottom: "6px" }}>
              Target Focus / Specialty Concept
            </label>
            <input
              type="text"
              className="tx-input"
              value={targetFocus}
              onChange={(e) => setTargetFocus(e.target.value)}
              placeholder="e.g. MERN Stack & Next.js SaaS, AI Agents, Mobile Apps"
              disabled={generating}
              style={{ background: "#ffffff" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--tx-slate-700)", marginBottom: "6px" }}>
              Tone of Voice
            </label>
            <select
              className="tx-input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={generating}
              style={{ background: "#ffffff" }}
            >
              <option value="professional">Professional & Authoritative</option>
              <option value="modern">Modern & Innovative</option>
              <option value="technical">Technical Specialist</option>
              <option value="client-focused">Client & Value-Focused</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "14px", display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="submit"
            className="tx-btn tx-btn-primary"
            disabled={generating}
            style={{
              padding: "10px 22px",
              background: "linear-gradient(135deg, #108a00, #059669)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {generating ? (
              <>
                <span className="tx-spinner-sm" />
                <span>Architecting Profile with AI...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{enhancement ? "Regenerate Enhancements" : "Enhance Profile with GenAI"}</span>
              </>
            )}
          </button>
          <span style={{ fontSize: "0.82rem", color: "var(--tx-slate-500)" }}>
            Instant intelligent optimization with zero downtime guarantee.
          </span>
        </div>
      </form>

      {/* Generated Results Showcase */}
      {enhancement && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "var(--tx-radius-lg)",
            padding: "24px",
            marginTop: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "1.15rem", margin: 0, color: "var(--tx-slate-900)" }}>
              AI Enhanced Recommendations
            </h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleApplyToForm}
                className="tx-btn tx-btn-outline tx-btn-sm"
              >
                Apply to Form Fields
              </button>
              <button
                type="button"
                onClick={handleApplyAndSaveDirectly}
                disabled={savingToDatabase}
                className="tx-btn tx-btn-primary tx-btn-sm"
              >
                {savingToDatabase ? "Saving..." : "✓ Apply & Save to Live Profile"}
              </button>
            </div>
          </div>

          {/* Enhanced Title */}
          <div style={{ marginBottom: "18px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-500)", textTransform: "uppercase" }}>
              Optimized Professional Headline
            </span>
            <div
              style={{
                marginTop: "6px",
                padding: "12px 16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "var(--tx-radius-md)",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--tx-slate-900)",
              }}
            >
              {enhancement.enhancedTitle}
            </div>
          </div>

          {/* Enhanced Bio */}
          <div style={{ marginBottom: "18px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-500)", textTransform: "uppercase" }}>
              Enhanced Executive Summary / Bio
            </span>
            <div
              style={{
                marginTop: "6px",
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "var(--tx-radius-md)",
                fontSize: "0.92rem",
                color: "var(--tx-slate-700)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {enhancement.enhancedBio}
            </div>
          </div>

          {/* Recommended Skills */}
          {enhancement.recommendedSkills?.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-500)", textTransform: "uppercase" }}>
                AI Recommended In-Demand Skills
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {enhancement.recommendedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "#ecfdf5",
                      color: "#065f46",
                      border: "1px solid #a7f3d0",
                      padding: "4px 12px",
                      borderRadius: "99px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    + {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Value Propositions & Service Highlights */}
          {enhancement.valuePropositions?.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-500)", textTransform: "uppercase" }}>
                Client Value Propositions
              </span>
              <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "var(--tx-slate-700)", fontSize: "0.88rem" }}>
                {enhancement.valuePropositions.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Tips */}
          {enhancement.optimizationTips?.length > 0 && (
            <div style={{ background: "#f1f5f9", padding: "12px 16px", borderRadius: "var(--tx-radius-md)" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--tx-slate-600)", textTransform: "uppercase" }}>
                💡 Actionable Tips for 100% Client Conversion
              </span>
              <ul style={{ margin: "6px 0 0 16px", padding: 0, fontSize: "0.85rem", color: "var(--tx-slate-600)" }}>
                {enhancement.optimizationTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
