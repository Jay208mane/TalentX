import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../context/useAuth";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "#64748b", fontWeight: 500 }}>Verifying session...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destinations = {
      freelancer: "/freelancer/dashboard",
      client: "/client/dashboard",
      admin: "/admin/dashboard",
    };

    return <Navigate to={destinations[user.role] || "/"} replace />;
  }

  return <Outlet />;
}