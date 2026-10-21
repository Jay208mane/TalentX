import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import FreelancerLayout from "./components/FreelancerLayout";
import FindWork from "./pages/freelancers/FindWork";
import Proposals from "./pages/freelancers/Proposals";
import { AuthProvider } from "./context/AuthContext";
import useAuth from "./context/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/register";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Freelancers from "./pages/Freelancers";
import Profile from "./pages/Profile";

import FreelancerDashboard from "./pages/freelancers/Dashboard";
import ClientDashboard from "./pages/client/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

function DashboardRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const paths = {
    freelancer: "/freelancer/dashboard",
    client: "/client/dashboard",
    admin: "/admin/dashboard",
  };

  return <Navigate to={paths[user.role] || "/login"} replace />;
}

function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "4rem", fontWeight: 800, color: "var(--tx-green)", marginBottom: "8px" }}>
        404
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "12px", color: "var(--tx-slate-900)" }}>
        Page Not Found
      </h1>
      <p style={{ color: "var(--tx-slate-500)", maxWidth: "460px", marginBottom: "28px" }}>
        The page you are looking for doesn't exist or may have been moved. Return to the marketplace to continue.
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <Link to="/" className="tx-btn tx-btn-primary">
          Back to Homepage
        </Link>
        <Link to="/jobs" className="tx-btn tx-btn-outline">
          Find Work
        </Link>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/freelancers" element={<Freelancers />} />
      <Route path="/freelancers/:id" element={<Freelancers />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />


      {/* Role-Protected Freelancer Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["freelancer"]} />}>
        <Route path="/freelancer" element={<FreelancerLayout />}>
          <Route path="dashboard" element={<FreelancerDashboard />} />
          <Route path="jobs" element={<FindWork />} />
          <Route path="proposals" element={<Proposals />} />
        </Route>
      </Route>


      {/* Role-Protected Client Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
      </Route>

      {/* Role-Protected Admin Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      {/* Authenticated User Profile */}
      <Route element={<ProtectedRoute allowedRoles={["freelancer", "client", "admin"]} />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Universal Dashboard Bridge */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;