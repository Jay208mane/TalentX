import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import useAuth from "../context/useAuth";
import api from "../services/api";

const socketUrl = (api.defaults.baseURL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export default function RealtimeNotifications() {
  const { user, token } = useAuth();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!token || !["client", "freelancer"].includes(user?.role)) return undefined;
    const socket = io(socketUrl, { auth: { token }, reconnectionAttempts: 5 });
    const show = (message, projectId) => {
      setNotification({ message, projectId, id: Date.now() });
    };

    socket.on("proposal:updated", (payload) => {
      show(payload.message || `Proposal status updated to ${payload.status}.`, payload.projectId);
    });
    socket.on("project:progress", (payload) => {
      show("A project progress report was posted.", payload.projectId);
    });
    socket.on("project:final-submission", (payload) => {
      show(payload.message || "Final work is ready for review.", payload.projectId);
    });
    socket.on("project:approved", (payload) => {
      show(payload.message || "Final work was approved.", payload.projectId);
    });
    socket.on("project:revision", (payload) => {
      show(payload.message || "A project revision was requested.", payload.projectId);
    });
    socket.on("payment:updated", (payload) => {
      show(`Project payment status: ${payload.status?.replaceAll("_", " ") || "updated"}.`, payload.projectId);
    });

    return () => socket.disconnect();
  }, [token, user?.role]);

  useEffect(() => {
    if (!notification) return undefined;
    const timeout = window.setTimeout(() => setNotification(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: "20px",
        top: "20px",
        zIndex: 3000,
        maxWidth: "min(420px, calc(100vw - 40px))",
        padding: "14px 18px",
        background: "var(--tx-white)",
        border: "1px solid var(--tx-green-border)",
        borderLeft: "4px solid var(--tx-green)",
        borderRadius: "var(--tx-radius-md)",
        boxShadow: "var(--tx-shadow-lg)",
        color: "var(--tx-slate-800)",
      }}
    >
      <div>{notification.message}</div>
      {notification.projectId && (
        <Link
          to={`/projects/${notification.projectId}`}
          onClick={() => setNotification(null)}
          style={{ display: "inline-block", marginTop: "6px", color: "var(--tx-green-dark)", fontWeight: 700 }}
        >
          Open project →
        </Link>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setNotification(null)}
        style={{ position: "absolute", top: "6px", right: "8px", color: "var(--tx-slate-500)", fontSize: "1.1rem" }}
      >
        ×
      </button>
    </div>
  );
}
