
import { NavLink, useNavigate } from "react-router-dom";

const menus = {
  freelancer: [
    ["Dashboard", "/freelancer/dashboard"],
    ["My Proposals", "/freelancer/proposals"],
    ["My Projects", "/freelancer/projects"],
    ["Earnings", "/freelancer/earnings"],
    ["My Profile", "/freelancer/profile"],
  ],
  client: [
    ["Dashboard", "/client/dashboard"],
    ["Create Project", "/client/jobs/new"],
    ["Manage Project Listings", "/client/jobs"],
    ["Find Freelancers", "/client/freelancers"],
    ["Contracts", "/client/contracts"],
  ],
  admin: [
    ["Dashboard", "/admin/dashboard"],
    ["Manage Users", "/admin/users"],
    ["Login Activity", "/admin/login-activity"],
    ["Reports", "/admin/reports"],
    ["Audit Logs", "/admin/audit-logs"],
  ],
};

export default function WorkspacePage({
  role,
  title,
  description,
}) {
  const navigate = useNavigate();
  const links = menus[role] || [];

  function logout() {
    localStorage.removeItem("talentx_token");
    localStorage.removeItem("talentx_user");
    navigate("/login");
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>TalentX</h2>
        <p style={styles.role}>{role.toUpperCase()} WORKSPACE</p>

        <nav style={styles.nav}>
          {links.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                ...styles.link,
                background: isActive ? "#e5edff" : "transparent",
                color: isActive ? "#2458d3" : "#475569",
                fontWeight: isActive ? "600" : "400",
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button onClick={logout} style={styles.logout}>
          Log out
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <span style={styles.badge}>{role}</span>
        </header>

        <section style={styles.content}>
          <h2>{title}</h2>
          <p>{description}</p>
          <div style={styles.card}>
            <h3>Welcome to TalentX</h3>
            <p>
              This is your {role} workspace. The page layout is ready.
              Connect the relevant API and database operations to
              enable its features.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: "235px",
    padding: "24px 16px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logo: { color: "#2458d3", margin: "0 0 12px" },
  role: {
    fontSize: "11px",
    letterSpacing: "1px",
    color: "#64748b",
    marginBottom: "24px",
  },
  nav: { display: "flex", flexDirection: "column", gap: "7px" },
  link: {
    display: "block",
    textDecoration: "none",
    padding: "12px",
    borderRadius: "8px",
  },
  logout: {
    marginTop: "auto",
    padding: "12px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
  },
  main: { flex: 1, minWidth: 0 },
  header: {
    background: "#fff",
    padding: "24px 30px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  badge: {
    background: "#e5edff",
    color: "#2458d3",
    padding: "8px 12px",
    borderRadius: "20px",
  },
  content: { padding: "30px" },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
    marginTop: "20px",
  },
};