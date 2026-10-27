
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import "../App.css";

export default function FreelancerLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const name = user?.name || "Freelancer";

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const menu = [
        { label: "Dashboard Overview", path: "/freelancer/dashboard", icon: "▦" },
        { label: "My Proposals", path: "/freelancer/proposals", icon: "▤" },
        { label: "My Projects", path: "/freelancer/projects", icon: "📁" },
        { label: "Chat / Messages", path: "/messages", icon: "💬" },
        { label: "Payment Settings", path: "/freelancer/payment-settings", icon: "💳" },
        { label: "My Profile", path: "/freelancer/profile", icon: "♟" },
    ];

    return (
        <div className="tx-dashboard-layout">
            <aside className="tx-dashboard-sidebar">
                <Link to="/" className="tx-sidebar-brand">
                    <span className="tx-brand-icon">
                        <span>T</span>X
                    </span>
                    <span style={{ fontWeight: 800, fontSize: "1.3rem" }}>
                        Talent<span className="tx-brand-accent">X</span>
                    </span>
                </Link>

                <div className="tx-sidebar-role-badge">Freelancer Workspace</div>

                <nav className="tx-sidebar-nav">
                    {menu.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/freelancer/dashboard"}
                            className={({ isActive }) =>
                                `tx-sidebar-btn ${isActive ? "active" : ""}`
                            }
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="tx-sidebar-footer">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="tx-btn tx-btn-subtle tx-btn-block"
                    >
                        Log Out
                    </button>
                </div>
            </aside>

            <div className="tx-dashboard-main">
                <header className="tx-dashboard-topbar">
                    <div className="tx-dashboard-breadcrumbs">
                        Workspace / <strong>Freelancer Workspace</strong>
                    </div>

                    <div className="tx-dashboard-user-profile">
                        <div className="tx-user-info-text" style={{ textAlign: "right" }}>
                            <strong>{name}</strong>
                            <span>Freelancer Account</span>
                        </div>
                        <div className="tx-avatar-badge">
                            {name[0]?.toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="tx-dashboard-body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
