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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/register";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Freelancers from "./pages/Freelancers";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";

import FreelancerDashboard from "./pages/freelancers/Dashboard";
import FreelancerProfile from "./pages/freelancers/Profile";
import ClientDashboard from "./pages/client/Dashboard";
import AiProjectRequirements from "./pages/client/AiProjectRequirements";
import AdminDashboard from "./pages/admin/Dashboard";
import MarketplaceReports from "./pages/admin/MarketplaceReports";
import ProjectsList from "./pages/ProjectsList";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import PaymentSettings from "./pages/PaymentSettings";
import ReceivedProposals from "./pages/client/ReceivedProposals";
import ClientWorkspaceShell from "./components/ClientWorkspaceShell";
import RealtimeNotifications from "./components/RealtimeNotifications";

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
          Explore Projects
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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />

      {/* Role-Protected Freelancer Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["freelancer"]} />}>
        <Route path="/freelancer" element={<FreelancerLayout />}>
          <Route path="dashboard" element={<FreelancerDashboard />} />
          <Route path="jobs" element={<FindWork />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="projects" element={<ProjectsList embedded />} />
          <Route path="payment-settings" element={<PaymentSettings />} />
          <Route path="profile" element={<FreelancerProfile />} />
        </Route>
      </Route>

      {/* Role-Protected Client Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/project-requirements" element={<AiProjectRequirements />} />
        <Route path="/client/ai-job-generator" element={<AiProjectRequirements />} />
        <Route path="/client/jobs" element={<ClientDashboard />} />
        <Route path="/client/jobs/new" element={<ClientDashboard />} />
        <Route path="/client/proposals" element={<ReceivedProposals />} />
        <Route path="/client/projects" element={<ClientWorkspaceShell title="Active Projects"><ProjectsList embedded /></ClientWorkspaceShell>} />
        <Route path="/client/contracts" element={<ClientWorkspaceShell title="Active Projects"><ProjectsList embedded /></ClientWorkspaceShell>} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["freelancer", "client", "admin"]} />}>
        <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
      </Route>

      {/* Role-Protected Admin Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminDashboard />} />
        <Route path="/admin/activity" element={<AdminDashboard />} />
        <Route path="/admin/login-activity" element={<AdminDashboard />} />
        <Route path="/admin/reports" element={<AdminDashboard />} />
        <Route path="/admin/marketplace" element={<MarketplaceReports />} />
        <Route path="/admin/audit-logs" element={<AdminDashboard />} />
      </Route>

      {/* Authenticated User Profile */}
      <Route element={<ProtectedRoute allowedRoles={["freelancer", "client", "admin"]} />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Project communications */}
      <Route element={<ProtectedRoute allowedRoles={["freelancer", "client"]} />}>
        <Route path="/messages" element={<Messages />} />
      </Route>

      {/* Universal Dashboard Bridge */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <RealtimeNotifications />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;