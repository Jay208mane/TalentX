import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useAuth from "../context/useAuth";
import "../App.css";

export default function Profile() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [title, setTitle] = useState(user?.title || "Senior Full-Stack Specialist");
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate || 45);
  const [bio, setBio] = useState(
    user?.bio ||
      "Experienced independent professional delivering modern, scalable web applications with MERN stack, clean architecture, and responsive user experiences."
  );
  const [skills, setSkills] = useState(
    user?.skills || ["React", "Node.js", "Express", "MongoDB", "JavaScript"]
  );
  const [newSkill, setNewSkill] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      name,
      title,
      hourlyRate: Number(hourlyRate),
      bio,
      skills,
    };

    if (token) {
      login(token, updatedUser);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const dashboardPath =
    user?.role === "client"
      ? "/client/dashboard"
      : user?.role === "admin"
      ? "/admin/dashboard"
      : "/freelancer/dashboard";

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        <div className="tx-container" style={{ padding: "40px 24px" }}>
          {/* Top navigation link */}
          <div style={{ marginBottom: "20px" }}>
            <Link to={dashboardPath} style={{ color: "var(--tx-green)", fontWeight: 600 }}>
              ← Back to {user?.role ? `${user.role} workspace` : "Dashboard"}
            </Link>
          </div>

          <div
            style={{
              maxWidth: "840px",
              margin: "0 auto",
              background: "var(--tx-white)",
              border: "1px solid var(--tx-slate-200)",
              borderRadius: "var(--tx-radius-xl)",
              padding: "40px",
              boxShadow: "var(--tx-shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <div>
                <h1 style={{ fontSize: "1.85rem", marginBottom: "4px" }}>Your Profile & Settings</h1>
                <p style={{ color: "var(--tx-slate-500)" }}>
                  Manage how your profile appears to clients and collaborators on TalentX.
                </p>
              </div>
              <span className="tx-role-pill" style={{ textTransform: "uppercase" }}>
                {user?.role || "Member"}
              </span>
            </div>

            {savedSuccess && (
              <div className="tx-alert tx-alert-success" style={{ marginBottom: "24px" }}>
                <span>✓</span> Profile information saved successfully!
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="tx-auth-form">
              {/* Basic Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="tx-form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    className="tx-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="tx-form-group">
                  <label htmlFor="email">Email Address (Read-only)</label>
                  <input
                    id="email"
                    type="email"
                    className="tx-input"
                    value={user?.email || ""}
                    disabled
                    style={{ backgroundColor: "var(--tx-slate-100)", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              {/* Title & Rate */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div className="tx-form-group">
                  <label htmlFor="title">Professional Title</label>
                  <input
                    id="title"
                    type="text"
                    className="tx-input"
                    placeholder="e.g. Full-Stack MERN Architect & Consultant"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="tx-form-group">
                  <label htmlFor="rate">Hourly Rate ($ USD)</label>
                  <input
                    id="rate"
                    type="number"
                    className="tx-input"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
              </div>

              {/* Bio / Overview */}
              <div className="tx-form-group">
                <label htmlFor="bio">Professional Overview / Bio</label>
                <textarea
                  id="bio"
                  rows={4}
                  className="tx-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* Skills Tags Manager */}
              <div className="tx-form-group">
                <label>Skills & Competencies</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    className="tx-input"
                    placeholder="Add a new skill (e.g. Next.js, Redux, Docker)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tx-btn tx-btn-subtle"
                    onClick={handleAddSkill}
                  >
                    Add Skill
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="tx-btn tx-btn-subtle"
                  onClick={() => navigate(dashboardPath)}
                >
                  Cancel
                </button>
                <button type="submit" className="tx-btn tx-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
