import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import Footer from "../components/Footer";
import JobCard from "../components/JobCard";
import api from "../services/api";
import { projectCategories } from "./client/projectCategories";
import "../App.css";

export default function Jobs({ workspace = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "All";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [budgetType, setBudgetType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let isMounted = true;
    api
      .get("/jobs")
      .then((res) => {
      if (isMounted) {
        setJobs(Array.isArray(res.data?.jobs) ? res.data.jobs : []);
      }
      })
      .catch((err) => {
      if (isMounted) {
        console.error("Failed to load marketplace jobs:", err);
        setError(err.response?.data?.message || "Unable to load marketplace jobs.");
      }
      })
      .finally(() => {
      if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
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
          job.category?.toLowerCase().includes(category.toLowerCase()) ||
          job.requirements?.subcategory?.toLowerCase().includes(category.toLowerCase());

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
    <div className="tx-jobs-workspace">
      <main className="tx-main-content">
        {/* Header / Search Strip */}
        <section className="tx-section tx-section-light" style={{ padding: "40px 0" }}>
          <div className="tx-container">
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "2.3rem", marginBottom: "10px" }}>
                Explore Freelance Projects
              </h1>
              <p style={{ color: "var(--tx-slate-500)", marginBottom: "24px" }}>
                Explore practical projects and collaboration opportunities posted by clients.
              </p>

              <form onSubmit={handleSearchSubmit} className="tx-search-bar">
                <div className="tx-search-input-wrap">
                  <span className="tx-search-icon">⌕</span>
                  <input
                    type="text"
                    className="tx-search-input"
                    placeholder="Search project title, scope, or skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="tx-btn tx-btn-primary">
                  Search Projects
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
                  {Object.keys(projectCategories).map((name) => <option key={name} value={name}>{name}</option>)}
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
                  <option value="milestone">Milestone-Based</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>

              {/* Sorting and Count */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--tx-slate-500)", fontWeight: 500 }}>
                  {filteredJobs.length} {filteredJobs.length === 1 ? "Project" : "Projects"} Available
                </span>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="tx-input"
                  style={{ width: "auto", padding: "8px 12px", fontSize: "0.9rem" }}
                  aria-label="Sort projects"
                >
                  <option value="newest">Newest First</option>
                  <option value="budget-desc">Highest Budget Range</option>
                  <option value="budget-asc">Lowest Budget Range</option>
                </select>
              </div>
            </div>

            {/* Jobs Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "var(--tx-slate-500)" }}>Loading opportunities...</p>
              </div>
            ) : error ? (
              <div className="tx-alert tx-alert-danger" role="alert">
                <span>⚠️</span> {error}
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
                <h3 style={{ marginBottom: "8px" }}>No matching projects found</h3>
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
      {!workspace && <Footer />}
    </div>
  );
}
