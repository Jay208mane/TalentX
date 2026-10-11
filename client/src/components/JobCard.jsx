import { useState } from "react";
import { Link } from "react-router-dom";

export default function JobCard({ job, onSaveToggle }) {
  const [isSaved, setIsSaved] = useState(false);

  if (!job) return null;

  const jobId = job._id || job.id;
  const clientName = typeof job.client === "object" ? job.client?.name : job.clientName || "TalentX Client";
  const postedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "Recently posted";

  const formattedBudget = job.budgetType === "hourly" 
    ? `$${job.budget}/hr` 
    : `$${Number(job.budget || 0).toLocaleString()}`;

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
    if (onSaveToggle) onSaveToggle(jobId, !isSaved);
  };

  return (
    <article className="tx-job-card">
      <div className="tx-job-card-header">
        <div className="tx-job-meta-top">
          <span className="tx-job-category-badge">{job.category || "General"}</span>
          <span className="tx-job-posted-time">Posted {postedDate}</span>
        </div>
        <button
          type="button"
          className={`tx-save-btn ${isSaved ? "saved" : ""}`}
          onClick={handleSave}
          title={isSaved ? "Saved job" : "Save this job"}
          aria-label={isSaved ? "Saved job" : "Save this job"}
        >
          {isSaved ? "★" : "☆"}
        </button>
      </div>

      <h3 className="tx-job-title">
        <Link to={`/jobs/${jobId}`}>{job.title}</Link>
      </h3>

      <div className="tx-job-budget-row">
        <span className="tx-budget-amount">{formattedBudget}</span>
        <span className="tx-budget-type">
          {job.budgetType === "hourly" ? "Hourly Rate" : "Fixed Price"}
        </span>
        <span className="tx-badge-dot">•</span>
        <span className="tx-client-label">Client: {clientName}</span>
      </div>

      <p className="tx-job-desc">
        {job.description && job.description.length > 200
          ? `${job.description.slice(0, 200)}...`
          : job.description}
      </p>

      {job.skills && job.skills.length > 0 && (
        <div className="tx-job-skills">
          {job.skills.map((skill, index) => (
            <span key={index} className="tx-skill-tag">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="tx-job-card-footer">
        <span className="tx-verified-badge">
          <span className="tx-check-icon">✓</span> Payment Verified
        </span>
        <Link to={`/jobs/${jobId}`} className="tx-btn tx-btn-subtle tx-btn-sm">
          View Details →
        </Link>
      </div>
    </article>
  );
}
