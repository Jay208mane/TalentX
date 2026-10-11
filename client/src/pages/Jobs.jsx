import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JobCard from "../components/JobCard";
import api from "../services/api";
import "../App.css";

// Realistic fallback demo jobs if database has 0 postings
const sampleJobsData = [
  {
    _id: "demo-1",
    title: "Senior MERN Stack Engineer for SaaS Marketplace Redesign",
    category: "Development",
    description:
      "We are seeking an experienced Full-Stack MERN engineer to implement clean component hierarchy, integrate REST endpoints, and ensure reliable JWT authentication flows.",
    budget: 950,
    budgetType: "fixed",
    skills: ["React 19", "Node.js", "Express", "MongoDB", "REST API"],
    client: { name: "Apex Technologies" },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: "demo-2",
    title: "Upwork-Style UI/UX Design System for Freelance Platform",
    category: "Design",
    description:
      "Looking for a seasoned UI/UX designer to craft a modern, clean marketplace layout. Deliverables include Figma component library, wireframes, and high-fidelity views.",
    budget: 45,
    budgetType: "hourly",
    skills: ["Figma", "UI/UX Design", "Wireframing", "Design System"],
    client: { name: "Visionary Media" },
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    _id: "demo-3",
    title: "Express Backend API Optimization & Mongo Indexing",
    category: "Development",
    description:
      "Need a Node backend developer to audit our database queries, add compound indexes, and implement rate-limiting and logging middleware.",
    budget: 550,
    budgetType: "fixed",
    skills: ["Node.js", "MongoDB", "Express", "Performance"],
    client: { name: "DataFlow Systems" },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    _id: "demo-4",
    title: "Technical Content Writer for Cloud Architecture Guide",
    category: "Writing",
    description:
      "Looking for a tech writer to compose an in-depth, hands-on developer article covering scalable web applications, microservices, and containerization.",
    budget: 35,
    budgetType: "hourly",
    skills: ["Technical Writing", "Cloud", "Developer Documentation"],
    client: { name: "DevPulse Insights" },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    _id: "demo-5",
    title: "Machine Learning Model Pipeline for Talent Matching",
    category: "Data",
    description:
      "Develop a Python-based recommendation model to match job postings with relevant freelancer skill sets using TF-IDF and semantic similarity.",
    budget: 1200,
    budgetType: "fixed",
    skills: ["Python", "Machine Learning", "NLP", "Pandas"],
    client: { name: "Cognitive Solutions" },
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "All";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [budgetType, setBudgetType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    api
      .get("/jobs")
      .then((res) => {
        if (res.data?.jobs && res.data.jobs.length > 0) {
          setJobs(res.data.jobs);
        } else {
          setJobs(sampleJobsData);
        }
      })
      .catch(() => {
        setJobs(sampleJobsData);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesSearch =
          !search ||
          job.title?.toLowerCase().includes(search.toLowerCase()) ||
          job.description?.toLowerCase().includes(search.toLowerCase()) ||
          job.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory =
          category === "All" ||
          job.category?.toLowerCase().includes(category.toLowerCase());

        const matchesBudgetType =
          budgetType === "all" || job.budgetType === budgetType;

        return matchesSearch && matchesCategory && matchesBudgetType;
      })
      .sort((a, b) => {
        if (sortBy === "budget-desc") return (b.budget || 0) - (a.budget || 0);
        if (sortBy === "budget-asc") return (a.budget || 0) - (b.budget || 0);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [jobs, search, category, budgetType, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search, category });
  };

  return (
    <div className="tx-page-wrapper">
      <Navbar />

      <main className="tx-main-content">
        {/* Header / Search Strip */}
        <section className="tx-section tx-section-light" style={{ padding: "40px 0" }}>
          <div className="tx-container">
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "2.3rem", marginBottom: "10px" }}>
                Find Your Next Freelance Project
              </h1>
              <p style={{ color: "var(--tx-slate-500)", marginBottom: "24px" }}>
                Explore thousands of verified jobs posted by clients worldwide.
              </p>

              <form onSubmit={handleSearchSubmit} className="tx-search-bar">
                <div className="tx-search-input-wrap">
                  <span className="tx-search-icon">⌕</span>
                  <input
                    type="text"
                    className="tx-search-input"
                    placeholder="Search by job title, keyword, or required skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="tx-btn tx-btn-primary">
                  Search Jobs
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Content area: Filters & Listing */}
        <section className="tx-section" style={{ paddingTop: "32px" }}>
          <div className="tx-container">
            {/* Filter controls bar */}
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
                {/* Category select */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Filter by category"
                >
                  <option value="All">All Categories</option>
                  <option value="Development">Development</option>
                  <option value="Design">UI/UX & Design</option>
                  <option value="Data">Data & AI</option>
                  <option value="Writing">Content & Writing</option>
                  <option value="Marketing">Marketing</option>
                </select>

                {/* Budget type select */}
                <select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Filter by payment type"
                >
                  <option value="all">Any Budget Type</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>

              {/* Sorting and Count */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--tx-slate-500)", fontWeight: 500 }}>
                  {filteredJobs.length} {filteredJobs.length === 1 ? "Job" : "Jobs"} Available
                </span>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Sort jobs"
                >
                  <option value="newest">Newest First</option>
                  <option value="budget-desc">Highest Budget</option>
                  <option value="budget-asc">Lowest Budget</option>
                </select>
              </div>
            </div>

            {/* Jobs Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "var(--tx-slate-500)" }}>Loading opportunities...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "var(--tx-slate-50)",
                  borderRadius: "var(--tx-radius-lg)",
                  border: "1px dashed var(--tx-slate-300)",
                }}
              >
                <h3 style={{ marginBottom: "8px" }}>No matching jobs found</h3>
                <p style={{ color: "var(--tx-slate-500)", marginBottom: "16px" }}>
                  Try adjusting your search terms or clearing your filters.
                </p>
                <button
                  type="button"
                  className="tx-btn tx-btn-outline tx-btn-sm"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setBudgetType("all");
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="tx-cards-grid">
                {filteredJobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
