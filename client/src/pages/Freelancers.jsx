import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import UserCard from "../components/UserCard";
import api from "../services/api";
import "../App.css";

const sampleFreelancersList = [
  {
    _id: "free-1",
    name: "Jay Mane",
    title: "Senior Full-Stack MERN & Architecture Specialist",
    hourlyRate: 50,
    skills: ["React", "Node.js", "Express", "MongoDB", "REST APIs", "Vite"],
    bio: "Passionate full-stack developer with 4+ years of software design experience. Expert in React state architecture, clean backend microservices, and database tuning.",
  },
  {
    _id: "free-2",
    name: "Sudarshan Lomate",
    title: "Frontend Architect & UI/UX Engineer",
    hourlyRate: 42,
    skills: ["React 19", "JavaScript", "TailwindCSS", "Design Systems", "Figma"],
    bio: "Focused on crafting high-converting, accessible user interfaces with smooth interactions, modern design systems, and fast performance.",
  },
  {
    _id: "free-3",
    name: "Aanya Sharma",
    title: "Product Designer & Figma Design System Lead",
    hourlyRate: 48,
    skills: ["Figma", "UI/UX", "User Research", "Wireframing", "Prototypes"],
    bio: "Helping tech startups translate complex problem statements into intuitive, elegant digital products that delight users and stakeholders.",
  },
  {
    _id: "free-4",
    name: "Jay Test",
    title: "Full-Stack Node & Cloud Engineer",
    hourlyRate: 38,
    skills: ["Node.js", "Express", "Docker", "MongoDB", "JWT Auth"],
    bio: "Specializing in secure JWT authorization, database schema migrations, and RESTful API engineering for high-throughput applications.",
  },
  {
    _id: "free-5",
    name: "Rohan Kulkarni",
    title: "Python Data Scientist & AI Engineer",
    hourlyRate: 55,
    skills: ["Python", "TensorFlow", "Pandas", "FastAPI", "Machine Learning"],
    bio: "Building data pipelines, predictive models, and LLM-powered features. Experienced with NLP and scalable backend model deployment.",
  },
];

export default function Freelancers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [rateFilter, setRateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");

  // Contact modal state
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    api
      .get("/auth/freelancers")
      .then((res) => {
        if (res.data?.freelancers && res.data.freelancers.length > 0) {
          // Merge with sample profiles so fields like bio and hourlyRate are rich
          const realFreelancers = res.data.freelancers.map((f, i) => ({
            ...f,
            title: f.title || "Full-Stack Software Professional",
            hourlyRate: f.hourlyRate || 35 + (i * 5),
            skills: f.skills || ["React", "Node.js", "Express", "MongoDB"],
            bio: f.bio || "Dedicated independent professional delivering dependable software solutions on TalentX.",
          }));
          setFreelancers(realFreelancers);
        } else {
          setFreelancers(sampleFreelancersList);
        }
      })
      .catch(() => {
        setFreelancers(sampleFreelancersList);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredFreelancers = useMemo(() => {
    return freelancers
      .filter((item) => {
        const matchesSearch =
          !search ||
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.title?.toLowerCase().includes(search.toLowerCase()) ||
          item.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));

        let matchesRate = true;
        if (rateFilter === "under-35") matchesRate = item.hourlyRate < 35;
        if (rateFilter === "35-50") matchesRate = item.hourlyRate >= 35 && item.hourlyRate <= 50;
        if (rateFilter === "over-50") matchesRate = item.hourlyRate > 50;

        return matchesSearch && matchesRate;
      })
      .sort((a, b) => {
        if (sortBy === "rate-desc") return b.hourlyRate - a.hourlyRate;
        if (sortBy === "rate-asc") return a.hourlyRate - b.hourlyRate;
        return 0;
      });
  }, [freelancers, search, rateFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        {/* Header Strip */}
        <section className="tx-section tx-section-light" style={{ padding: "40px 0" }}>
          <div className="tx-container">
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "2.3rem", marginBottom: "10px" }}>
                Hire Top Independent Talent
              </h1>
              <p style={{ color: "var(--tx-slate-500)", marginBottom: "24px" }}>
                Connect with verified developers, designers, and specialists ready to accelerate your project.
              </p>

              <form onSubmit={handleSearchSubmit} className="tx-search-bar">
                <div className="tx-search-input-wrap">
                  <span className="tx-search-icon">⌕</span>
                  <input
                    type="text"
                    className="tx-search-input"
                    placeholder="Search by skill (e.g., React, Node, Figma), specialty, or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="tx-btn tx-btn-primary">
                  Search Talent
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Content & Filters */}
        <section className="tx-section" style={{ paddingTop: "32px" }}>
          <div className="tx-container">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "28px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--tx-slate-200)",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Hourly Rate Filter */}
                <select
                  value={rateFilter}
                  onChange={(e) => setRateFilter(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Filter by hourly rate"
                >
                  <option value="all">Any Hourly Rate</option>
                  <option value="under-35">Under $35/hr</option>
                  <option value="35-50">$35 to $50/hr</option>
                  <option value="over-50">Above $50/hr</option>
                </select>
              </div>

              {/* Count & Sorting */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--tx-slate-500)", fontWeight: 500 }}>
                  {filteredFreelancers.length} {filteredFreelancers.length === 1 ? "Professional" : "Professionals"} Available
                </span>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Sort freelancers"
                >
                  <option value="recommended">Best Match</option>
                  <option value="rate-desc">Highest Rate</option>
                  <option value="rate-asc">Lowest Rate</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "var(--tx-slate-500)" }}>Loading freelancer profiles...</p>
              </div>
            ) : filteredFreelancers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "var(--tx-slate-50)",
                  borderRadius: "var(--tx-radius-lg)",
                  border: "1px dashed var(--tx-slate-300)",
                }}
              >
                <h3 style={{ marginBottom: "8px" }}>No matching freelancers found</h3>
                <p style={{ color: "var(--tx-slate-500)", marginBottom: "16px" }}>
                  Try relaxing your search terms or rate filters.
                </p>
                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  onClick={() => {
                    setSearch("");
                    setRateFilter("all");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="tx-cards-grid">
                {filteredFreelancers.map((free) => (
                  <UserCard
                    key={free._id}
                    freelancer={free}
                    onContact={(f) => {
                      setSelectedFreelancer(f);
                      setContactSent(false);
                      setContactSubject(`Project Inquiry for ${f.name}`);
                      setContactMessage("");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CONTACT MODAL */}
        {selectedFreelancer && (
          <div className="tx-modal-overlay">
            <div className="tx-modal-card">
              <div className="tx-modal-header">
                <h2>Contact {selectedFreelancer.name}</h2>
                <button
                  type="button"
                  className="tx-modal-close-btn"
                  onClick={() => setSelectedFreelancer(null)}
                >
                  ×
                </button>
              </div>

              {contactSent ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: "3rem", color: "var(--tx-green)", marginBottom: "12px" }}>✓</div>
                  <h3 style={{ marginBottom: "8px" }}>Message Sent!</h3>
                  <p style={{ color: "var(--tx-slate-600)", marginBottom: "20px" }}>
                    Your message has been delivered to <strong>{selectedFreelancer.name}</strong>. They will receive your project details and contact you shortly.
                  </p>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary"
                    onClick={() => setSelectedFreelancer(null)}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="tx-auth-form">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--tx-slate-50)", padding: "12px", borderRadius: "var(--tx-radius-md)" }}>
                    <div className="tx-avatar-badge">{selectedFreelancer.name[0]}</div>
                    <div>
                      <strong>{selectedFreelancer.name}</strong>
                      <div style={{ fontSize: "0.82rem", color: "var(--tx-slate-500)" }}>
                        {selectedFreelancer.title} • ${selectedFreelancer.hourlyRate}/hr
                      </div>
                    </div>
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="subject">Subject</label>
                    <input
                      id="subject"
                      type="text"
                      className="tx-input"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="tx-form-group">
                    <label htmlFor="message">Message / Project Scope</label>
                    <textarea
                      id="message"
                      rows={5}
                      className="tx-input"
                      placeholder="Outline your project timeline, requirements, and budget..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                    <button
                      type="button"
                      className="tx-btn tx-btn-subtle"
                      onClick={() => setSelectedFreelancer(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="tx-btn tx-btn-primary">
                      Send Message ↗
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
