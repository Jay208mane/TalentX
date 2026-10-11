import { Link } from "react-router-dom";

export default function UserCard({ freelancer, onContact }) {
  if (!freelancer) return null;

  const id = freelancer._id || freelancer.id;
  const name = freelancer.name || "Freelancer";
  const title = freelancer.title || "Full-Stack Specialist & Developer";
  const hourlyRate = freelancer.hourlyRate || 35;
  const skills = freelancer.skills || ["React", "JavaScript", "Node.js", "MongoDB"];
  const bio = freelancer.bio || freelancer.description || "Passionate professional focused on delivering robust web solutions, scalable APIs, and clean modern interfaces.";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <article className="tx-freelancer-card">
      <div className="tx-freelancer-top">
        <div className="tx-freelancer-avatar">
          {initials || "TX"}
        </div>
        <div className="tx-freelancer-info">
          <div className="tx-name-row">
            <h3 className="tx-freelancer-name">{name}</h3>
            <span className="tx-badge-verified" title="Identity Verified">✓</span>
          </div>
          <p className="tx-freelancer-title">{title}</p>
        </div>
      </div>

      <div className="tx-freelancer-rate-row">
        <div className="tx-rate-block">
          <span className="tx-rate-number">${hourlyRate}</span>
          <span className="tx-rate-unit">/ hr</span>
        </div>
        <span className="tx-success-rating">
          ★ 98% Job Success
        </span>
      </div>

      <p className="tx-freelancer-bio">
        {bio.length > 140 ? `${bio.slice(0, 140)}...` : bio}
      </p>

      <div className="tx-freelancer-skills">
        {skills.slice(0, 4).map((skill, index) => (
          <span key={index} className="tx-skill-tag">
            {skill}
          </span>
        ))}
        {skills.length > 4 && (
          <span className="tx-skill-more">+{skills.length - 4}</span>
        )}
      </div>

      <div className="tx-freelancer-footer">
        <Link to={`/freelancers/${id}`} className="tx-btn tx-btn-subtle tx-btn-sm tx-flex-1">
          View Profile
        </Link>
        {onContact && (
          <button
            type="button"
            onClick={() => onContact(freelancer)}
            className="tx-btn tx-btn-primary tx-btn-sm"
          >
            Contact
          </button>
        )}
      </div>
    </article>
  );
}
