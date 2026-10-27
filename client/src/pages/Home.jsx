import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JobCard from "../components/JobCard";
import UserCard from "../components/UserCard";
import api from "../services/api";
import "../App.css";

const categories = [
  {
    icon: "💻",
    name: "Web & Mobile Development",
    count: "450+ Active Skills",
    query: "Development",
  },
  {
    icon: "🎨",
    name: "UI/UX & Creative Design",
    count: "320+ Active Skills",
    query: "Design",
  },
  {
    icon: "📊",
    name: "AI & Data Science",
    count: "180+ Active Skills",
    query: "Data",
  },
  {
    icon: "✍️",
    name: "Content & Copywriting",
    count: "210+ Active Skills",
    query: "Writing",
  },
  {
    icon: "📣",
    name: "Digital Marketing & SEO",
    count: "190+ Active Skills",
    query: "Marketing",
  },
  {
    icon: "🔒",
    name: "DevOps & Cloud Systems",
    count: "140+ Active Skills",
    query: "DevOps",
  },
];

// Realistic demo fallback data when database collections are fresh/empty
const sampleFeaturedJobs = [
  {
    _id: "demo-job-1",
    title: "Full-Stack MERN Developer for SaaS MVP Redesign",
    category: "Web Development",
    description:
      "Looking for a senior MERN developer to polish our React front-end, improve component hierarchy, and optimize Express endpoints for our next launch.",
    budget: 850,
    budgetType: "fixed",
    skills: ["React", "Node.js", "Express", "MongoDB", "UI/UX"],
    client: { name: "NovaTech Solutions" },
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-job-2",
    title: "Senior UI/UX Designer for B2B Analytics Dashboard",
    category: "Design",
    description:
      "Need a modern, Upwork-inspired dashboard system created in Figma. Experience with design tokens, responsive layouts, and user journeys is required.",
    budget: 45,
    budgetType: "hourly",
    skills: ["Figma", "UI/UX Design", "Wireframing", "Design System"],
    client: { name: "Apex Global Labs" },
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-job-3",
    title: "REST API Integration & JWT Authentication Specialist",
    category: "Backend Development",
    description:
      "We need an experienced Node/Express engineer to review our token verification middleware, role-based guards, and write clean integration tests.",
    budget: 600,
    budgetType: "fixed",
    skills: ["Node.js", "JWT", "Security", "REST API"],
    client: { name: "CloudScale Systems" },
    createdAt: new Date().toISOString(),
  },
];

const sampleFeaturedFreelancers = [
  {
    _id: "demo-free-1",
    name: "Jay Mane",
    title: "Senior Full-Stack Engineer & Architect",
    hourlyRate: 50,
    skills: ["React", "Node.js", "Express", "MongoDB", "Architecture"],
    bio: "Passionate full-stack developer with deep experience designing scalable REST APIs, reactive client applications, and clean database schemas.",
  },
  {
    _id: "demo-free-2",
    name: "Sudarshan Lomate",
    title: "Frontend Architect & UI Specialist",
    hourlyRate: 40,
    skills: ["React 19", "JavaScript", "CSS3", "Design Systems", "Vite"],
    bio: "Specializing in high-performance web applications, responsive user interfaces, and intuitive interactive experiences.",
  },
  {
    _id: "demo-free-3",
    name: "Aanya Sharma",
    title: "Product Designer & UI/UX Consultant",
    hourlyRate: 45,
    skills: ["Figma", "Design Systems", "Prototyping", "User Research"],
    bio: "Helping early-stage startups and enterprise teams craft polished digital products that users love.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchTab, setSearchTab] = useState("jobs"); // 'jobs' or 'talent'
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowTab, setWorkflowTab] = useState("clients"); // 'clients' or 'freelancers'
  
  const [jobs, setJobs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    // Attempt to fetch real open jobs from backend
    api
      .get("/jobs")
      .then((res) => {
        if (res.data?.jobs && res.data.jobs.length > 0) {
          setJobs(res.data.jobs.slice(0, 3));
        } else {
          setJobs(sampleFeaturedJobs);
        }
      })
      .catch(() => {
        // If unauthenticated or backend empty, show sample showcase
        setJobs(sampleFeaturedJobs);
      })
      .finally(() => {
        setLoadingJobs(false);
      });

    // Try fetching freelancers
    api
      .get("/auth/freelancers")
      .then((res) => {
        if (res.data?.freelancers && res.data.freelancers.length > 0) {
          setFreelancers(res.data.freelancers.slice(0, 3));
        } else {
          setFreelancers(sampleFeaturedFreelancers);
        }
      })
      .catch(() => {
        setFreelancers(sampleFeaturedFreelancers);
      });
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTab === "jobs") {
      navigate(`/jobs?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/freelancers?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        {/* ================= HERO SECTION ================= */}
        <section className="tx-hero" id="home">
          <div className="tx-container">
            <div className="tx-hero-grid">
              {/* Left Column: Messaging & Search */}
              <div className="tx-hero-content">
                <div className="tx-hero-badge">
                  <span className="tx-pulse-dot"></span>
                  The Premier MCA Freelance Marketplace
                </div>

                <h1 className="tx-hero-title">
                  Find the Right Talent.{" "}
                  <span className="tx-hero-title-accent">Build Your Future.</span>
                </h1>

                <p className="tx-hero-desc">
                  TalentX seamlessly bridges ambitious businesses and top-tier
                  independent freelancers for high-impact projects and flexible collaborations,
                  and verified project collaboration.
                </p>

                {/* Dual Search Box */}
                <div className="tx-search-card">
                  <div className="tx-search-tabs">
                    <button
                      type="button"
                      className={`tx-search-tab-btn ${
                        searchTab === "jobs" ? "active" : ""
                      }`}
                      onClick={() => setSearchTab("jobs")}
                    >
                      Explore Projects
                    </button>
                    <button
                      type="button"
                      className={`tx-search-tab-btn ${
                        searchTab === "talent" ? "active" : ""
                      }`}
                      onClick={() => setSearchTab("talent")}
                    >
                      Find Freelancers
                    </button>
                  </div>

                  <form className="tx-search-bar" onSubmit={handleSearchSubmit}>
                    <div className="tx-search-input-wrap">
                      <span className="tx-search-icon">⌕</span>
                      <input
                        type="text"
                        className="tx-search-input"
                        placeholder={
                          searchTab === "jobs"
                            ? "Search project title, skill, or keyword..."
                            : "Search freelancers by skill, specialty, or name..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="tx-btn tx-btn-primary">
                      Search
                    </button>
                  </form>
                </div>

                {/* Popular Tags */}
                <div className="tx-popular-tags">
                  <span>Popular:</span>
                  <Link to="/jobs?search=React" className="tx-tag-pill">
                    React
                  </Link>
                  <Link to="/jobs?search=Node.js" className="tx-tag-pill">
                    Node.js
                  </Link>
                  <Link to="/jobs?search=Figma" className="tx-tag-pill">
                    UI/UX Design
                  </Link>
                  <Link to="/jobs?search=MongoDB" className="tx-tag-pill">
                    MongoDB
                  </Link>
                  <Link to="/jobs?search=Python" className="tx-tag-pill">
                    Python
                  </Link>
                </div>
              </div>

              {/* Right Column: Hero Visual Card */}
              <div className="tx-hero-visual-wrap">
                <div className="tx-hero-visual-card">
                  <div className="tx-hero-stat-badge">★ 99% Satisfaction</div>

                  <div className="tx-card-preview-header">
                    <div className="tx-card-avatar-large">TX</div>
                    <div>
                      <h4>Direct Contract Hub</h4>
                      <p>Full-Stack MERN Architecture</p>
                    </div>
                  </div>

                  <div className="tx-card-metrics-row">
                    <div className="tx-metric-col">
                      <strong>100%</strong>
                      <span>Verified Roles</span>
                    </div>
                    <div className="tx-metric-col">
                      <strong>$0</strong>
                      <span>Hidden Fees</span>
                    </div>
                    <div className="tx-metric-col">
                      <strong>Fast</strong>
                      <span>Project Match</span>
                    </div>
                  </div>

                  <div className="tx-featured-sample-job">
                    <h5>Latest Featured Opportunity</h5>
                    <div className="tx-sample-title">
                      Senior MERN Stack Architecture Redesign
                    </div>
                    <div className="tx-job-skills">
                      <span className="tx-skill-tag">React 19</span>
                      <span className="tx-skill-tag">Express</span>
                      <span className="tx-skill-tag">MongoDB</span>
                    </div>
                    <Link
                      to="/jobs"
                      className="tx-btn tx-btn-outline tx-btn-sm tx-btn-block"
                      style={{ marginTop: "12px" }}
                    >
                      Browse All Projects →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CATEGORIES SECTION ================= */}
        <section className="tx-section tx-section-light" id="categories">
          <div className="tx-container">
            <div className="tx-section-header">
              <div className="tx-section-title-wrap">
                <h2>Browse Talent by Category</h2>
                <p className="tx-section-subtitle">
                  Explore top domains where skilled freelancers deliver
                  world-class results.
                </p>
              </div>
              <Link to="/jobs" className="tx-btn tx-btn-ghost">
                All Categories →
              </Link>
            </div>

            <div className="tx-category-grid">
              {categories.map((cat) => (
                <Link
                  to={`/jobs?category=${encodeURIComponent(cat.query)}`}
                  className="tx-category-card"
                  key={cat.name}
                >
                  <div className="tx-category-icon-box">{cat.icon}</div>
                  <div>
                    <h3>{cat.name}</h3>
                    <div className="tx-category-meta">
                      <span>{cat.count}</span>
                      <span className="tx-category-arrow">↗</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= FEATURED JOBS SECTION ================= */}
        <section className="tx-section" id="jobs">
          <div className="tx-container">
            <div className="tx-section-header">
              <div className="tx-section-title-wrap">
                <h2>Featured Opportunities</h2>
                <p className="tx-section-subtitle">
                  Discover high-value freelance projects posted by verified
                  clients.
                </p>
              </div>
              <Link to="/jobs" className="tx-btn tx-btn-outline">
                View All Projects →
              </Link>
            </div>

            {loadingJobs ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p>Loading opportunities...</p>
              </div>
            ) : (
              <div className="tx-cards-grid">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================= FEATURED FREELANCERS ================= */}
        <section className="tx-section tx-section-light" id="talent">
          <div className="tx-container">
            <div className="tx-section-header">
              <div className="tx-section-title-wrap">
                <h2>Top-Rated Freelancers</h2>
                <p className="tx-section-subtitle">
                  Work with proven independent professionals ready to start on
                  your project.
                </p>
              </div>
              <Link to="/freelancers" className="tx-btn tx-btn-outline">
                Find More Freelancers →
              </Link>
            </div>

            <div className="tx-cards-grid">
              {freelancers.map((free) => (
                <UserCard key={free._id} freelancer={free} />
              ))}
            </div>
          </div>
        </section>

        {/* ================= HOW TALENTX WORKS ================= */}
        <section className="tx-section" id="how-it-works">
          <div className="tx-container">
            <div className="tx-section-title-wrap" style={{ textAlign: "center", marginBottom: "32px" }}>
              <h2>How TalentX Works</h2>
              <p className="tx-section-subtitle">
                A streamlined workflow built for clarity, speed, and trusted collaboration.
              </p>
            </div>

            <div className="tx-workflow-tabs">
              <button
                type="button"
                className={`tx-workflow-tab-btn ${
                  workflowTab === "clients" ? "active" : ""
                }`}
                onClick={() => setWorkflowTab("clients")}
              >
                For Clients Looking to Hire
              </button>
              <button
                type="button"
                className={`tx-workflow-tab-btn ${
                  workflowTab === "freelancers" ? "active" : ""
                }`}
                onClick={() => setWorkflowTab("freelancers")}
              >
                For Freelancers Seeking Work
              </button>
            </div>

            {workflowTab === "clients" ? (
              <div className="tx-steps-grid">
                <div className="tx-step-card">
                  <div className="tx-step-number">1</div>
                  <h3>Post a Project with Clear Scope</h3>
                  <p>
                    Describe your requirements, required skills, and set a fixed
                    or hourly budget. Receive applications from talented professionals.
                  </p>
                </div>
                <div className="tx-step-card">
                  <div className="tx-step-number">2</div>
                  <h3>Review Profiles & Proposals</h3>
                  <p>
                    Compare freelancer experience, hourly rates, and verified
                    skills to select the ideal candidate for your needs.
                  </p>
                </div>
                <div className="tx-step-card">
                  <div className="tx-step-number">3</div>
                  <h3>Collaborate & Complete Work</h3>
                  <p>
                    Track progress through your dedicated Client Workspace with
                    full transparency from kickoff to completion.
                  </p>
                </div>
              </div>
            ) : (
              <div className="tx-steps-grid">
                <div className="tx-step-card">
                  <div className="tx-step-number">1</div>
                  <h3>Create Your Professional Profile</h3>
                  <p>
                    Highlight your core stack, set your hourly rate, and showcase
                    your real abilities to prospective clients.
                  </p>
                </div>
                <div className="tx-step-card">
                  <div className="tx-step-number">2</div>
                  <h3>Explore & Propose on Projects</h3>
                  <p>
                    Filter projects matching your skills, submit tailored proposals,
                    and connect directly with hiring managers.
                  </p>
                </div>
                <div className="tx-step-card">
                  <div className="tx-step-number">3</div>
                  <h3>Deliver & Build Your Reputation</h3>
                  <p>
                    Manage active projects inside your Freelancer Dashboard and
                    build long-term relationships with clients.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================= VALUE PROPOSITIONS & ABOUT ================= */}
        <section className="tx-section tx-section-light" id="about">
          <div className="tx-container">
            <div className="tx-section-title-wrap" style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2>Why Choose TalentX?</h2>
              <p className="tx-section-subtitle">
                Engineered with modern standards to provide a dependable freelance experience.
              </p>
            </div>

            <div className="tx-benefits-grid">
              <div className="tx-benefit-card">
                <div className="tx-benefit-icon">🛡️</div>
                <h3>Role-Enforced Security</h3>
                <p>
                  Built with JWT authentication and strict server-side
                  role-based access control, protecting client, freelancer, and
                  admin workspaces.
                </p>
              </div>

              <div className="tx-benefit-card">
                <div className="tx-benefit-icon">⚡</div>
                <h3>Instant Discovery</h3>
                <p>
                  Keyword and category filters let you quickly uncover the exact
                  match for your project without wading through cluttered feeds.
                </p>
              </div>

              <div className="tx-benefit-card">
                <div className="tx-benefit-icon">🤝</div>
                <h3>Dedicated Workspaces</h3>
                <p>
                  Tailored dashboards provide customized tools for publishing projects,
                  submitting proposals, and monitoring accounts seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION BANNER ================= */}
        <section className="tx-section">
          <div className="tx-container">
            <div className="tx-cta-banner">
              <div>
                <h2>Ready to Start Your Next Chapter?</h2>
                <p>
                  Join TalentX today to hire exceptional freelancers or find your
                  next high-value opportunity.
                </p>
              </div>
              <div className="tx-cta-actions">
                <Link to="/register" className="tx-btn tx-btn-primary tx-btn-lg">
                  Get Started Now ↗
                </Link>
                <Link to="/login" className="tx-btn tx-btn-subtle tx-btn-lg">
                  Log In to Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}