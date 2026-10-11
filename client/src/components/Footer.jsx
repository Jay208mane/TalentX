import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="tx-footer">
      <div className="tx-footer-inner">
        <div className="tx-footer-top">
          {/* Brand Column */}
          <div className="tx-footer-col tx-footer-brand-col">
            <Link to="/" className="tx-footer-brand">
              <span className="tx-brand-icon"><span>T</span>X</span>
              <span className="tx-brand-text">Talent<span className="tx-brand-accent">X</span></span>
            </Link>
            <p className="tx-footer-tagline">
              Empowering independent professionals and businesses to build extraordinary products together.
            </p>
            <div className="tx-footer-pill">
              <span className="tx-pulse-dot"></span>
              Verified MERN Marketplace Architecture
            </div>
          </div>

          {/* Column 1: For Clients */}
          <div className="tx-footer-col">
            <h4>For Clients</h4>
            <ul>
              <li><Link to="/freelancers">Find Freelancers</Link></li>
              <li><Link to="/client/dashboard">Post a Project</Link></li>
              <li><a href="/#how-it-works">How to Hire</a></li>
              <li><a href="/#about">Quality Guarantee</a></li>
              <li><Link to="/register">Client Membership</Link></li>
            </ul>
          </div>

          {/* Column 2: For Freelancers */}
          <div className="tx-footer-col">
            <h4>For Freelancers</h4>
            <ul>
              <li><Link to="/jobs">Find Work</Link></li>
              <li><a href="/#how-it-works">How to Get Hired</a></li>
              <li><Link to="/freelancer/dashboard">Freelancer Workspace</Link></li>
              <li><a href="/#skills">Popular In-Demand Skills</a></li>
              <li><Link to="/register">Apply as Freelancer</Link></li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div className="tx-footer-col">
            <h4>Top Categories</h4>
            <ul>
              <li><Link to="/jobs?category=Development">Web & Mobile Dev</Link></li>
              <li><Link to="/jobs?category=Design">UI/UX & Creative</Link></li>
              <li><Link to="/jobs?category=Data">AI & Data Science</Link></li>
              <li><Link to="/jobs?category=Writing">Content & Copywriting</Link></li>
              <li><Link to="/jobs?category=Marketing">Digital Marketing</Link></li>
            </ul>
          </div>

          {/* Column 4: Platform */}
          <div className="tx-footer-col">
            <h4>About TalentX</h4>
            <ul>
              <li><a href="/#about">Platform Story</a></li>
              <li><a href="/#how-it-works">Trust & Security</a></li>
              <li><Link to="/login">User Portal</Link></li>
              <li><a href="mailto:support@talentx.example">Contact Support</a></li>
              <li><span className="tx-badge-minor">MCA Minor Project</span></li>
            </ul>
          </div>
        </div>

        <div className="tx-footer-divider"></div>

        <div className="tx-footer-bottom">
          <p className="tx-copyright">
            © 2026 TalentX Independent Work Marketplace. All rights reserved.
          </p>
          <div className="tx-legal-links">
            <a href="#privacy">Privacy Policy</a>
            <span>•</span>
            <a href="#terms">Terms of Service</a>
            <span>•</span>
            <a href="#security">Security Center</a>
            <span>•</span>
            <a href="#accessibility">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
