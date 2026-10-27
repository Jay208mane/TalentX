import { useState } from "react";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import AiProfileEnhancer from "../../components/AiProfileEnhancer";
import "../../App.css";

export default function FreelancerProfile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [title, setTitle] = useState(user?.title || "Senior Full-Stack MERN Architect");
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate ?? 45);
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || "intermediate");
  const [location, setLocation] = useState(user?.location || "Remote");
  const [bio, setBio] = useState(
    user?.bio ||
      "Passionate full-stack software engineer delivering robust, scalable web architectures, clean RESTful APIs, and high-converting responsive user experiences."
  );
  const [skills, setSkills] = useState(
    Array.isArray(user?.skills) && user.skills.length > 0
      ? user.skills
      : ["React", "Node.js", "Express", "MongoDB", "JavaScript"]
  );
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleApplyAiEnhancement = (enhancement) => {
    if (enhancement.title) setTitle(enhancement.title);
    if (enhancement.bio) setBio(enhancement.bio);
    if (Array.isArray(enhancement.recommendedSkills) && enhancement.recommendedSkills.length > 0) {
      setSkills(Array.from(new Set([...skills, ...enhancement.recommendedSkills])));
    } else if (Array.isArray(enhancement.skills) && enhancement.skills.length > 0) {
      setSkills(Array.from(new Set([...skills, ...enhancement.skills])));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSavedSuccess(false);

    try {
      const payload = {
        name: name.trim(),
        title: title.trim(),
        hourlyRate: Number(hourlyRate),
        experienceLevel,
        location: location.trim(),
        bio: bio.trim(),
        skills,
      };

      const res = await api.put("/auth/profile", payload);
      if (res.data?.success && res.data.user) {
        if (updateUser) {
          updateUser(res.data.user);
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error("Save profile failed:", err);
      setSaveError(err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", padding: "16px 0" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.85rem", color: "var(--tx-slate-900)", marginBottom: "6px" }}>
          Freelancer Profile & AI Optimizer
        </h1>
        <p style={{ color: "var(--tx-slate-600)" }}>
          Enhance your marketplace ranking and win high-budget client projects with AI-crafted headlines and summaries.
        </p>
      </div>

      {/* AI Profile Enhancer Component */}
      <AiProfileEnhancer
        currentProfile={{
          name,
          title,
          bio,
          skills,
          experienceLevel,
          hourlyRate,
          profileScore: user?.profileScore,
        }}
        onApplyEnhancement={handleApplyAiEnhancement}
        onProfileUpdated={(updated) => {
          if (updateUser) updateUser(updated);
          if (updated.title) setTitle(updated.title);
          if (updated.bio) setBio(updated.bio);
          if (updated.skills) setSkills(updated.skills);
        }}
      />

      {saveError && (
        <div className="tx-alert tx-alert-danger" style={{ marginBottom: "20px" }}>
          {saveError}
        </div>
      )}

      {savedSuccess && (
        <div className="tx-alert tx-alert-success" style={{ marginBottom: "24px" }}>
          ✓ Freelancer profile saved successfully to MongoDB Atlas!
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--tx-slate-200)",
          borderRadius: "var(--tx-radius-xl)",
          padding: "32px",
          boxShadow: "var(--tx-shadow-sm)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", marginBottom: "20px", color: "var(--tx-slate-900)" }}>
          Profile Details & Marketplace Presentation
        </h2>

        <form onSubmit={handleSaveProfile} className="tx-auth-form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="tx-form-group">
              <label htmlFor="fl-name">Full Name</label>
              <input
                id="fl-name"
                type="text"
                className="tx-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="tx-form-group">
              <label htmlFor="fl-email">Email Address (Registered)</label>
              <input
                id="fl-email"
                type="email"
                className="tx-input"
                value={user?.email || ""}
                disabled
                style={{ backgroundColor: "var(--tx-slate-100)", cursor: "not-allowed" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px" }}>
            <div className="tx-form-group">
              <label htmlFor="fl-title">Professional Headline / Title</label>
              <input
                id="fl-title"
                type="text"
                className="tx-input"
                placeholder="e.g. Senior Full-Stack MERN Architect"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="tx-form-group">
              <label htmlFor="fl-rate">Hourly Rate ($/hr)</label>
              <input
                id="fl-rate"
                type="number"
                min="0"
                max="1000"
                className="tx-input"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>

            <div className="tx-form-group">
              <label htmlFor="fl-level">Experience Level</label>
              <select
                id="fl-level"
                className="tx-input"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                <option value="entry">Entry Level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Senior / Expert</option>
              </select>
            </div>
          </div>

          <div className="tx-form-group">
            <label htmlFor="fl-location">Location / Timezone</label>
            <input
              id="fl-location"
              type="text"
              className="tx-input"
              placeholder="e.g. Remote (UTC+5:30), Mumbai, India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="tx-form-group">
            <label htmlFor="fl-bio">Professional Overview / Bio</label>
            <textarea
              id="fl-bio"
              rows={5}
              className="tx-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {/* Skills Management */}
          <div className="tx-form-group">
            <label>Skills & Core Competencies</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                className="tx-input"
                placeholder="Add a new skill (e.g. Docker, TypeScript, GraphQL)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
              />
              <button
                type="button"
                className="tx-btn tx-btn-subtle"
                onClick={handleAddSkill}
              >
                + Add
              </button>
            </div>

            <div className="tx-job-skills">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="tx-skill-tag"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    style={{ color: "var(--tx-slate-400)", fontWeight: 700, padding: 0 }}
                    title="Remove skill"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
            <button
              type="submit"
              className="tx-btn tx-btn-primary"
              disabled={saving}
              style={{ minWidth: "160px" }}
            >
              {saving ? "Saving to Database..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}