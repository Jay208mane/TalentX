import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import useAuth from "../context/useAuth";
import api from "../services/api";
import { projectCategories } from "./client/projectCategories";
import { workspaceForProject, workspaceTypeForProject } from "./projectWorkspaceModules";
import "../App.css";

const socketUrl = (api.defaults.baseURL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const fileAccept = ".csv,.xls,.xlsx,.pdf,.zip,.png,.jpg,.jpeg,.txt,.md,.doc,.docx,.ipynb,.sql,.py";

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function idOf(value) {
  return value?._id || value?.id || value || "";
}

function Field({ label, children }) {
  return (
    <label className="tx-form-group" style={{ display: "block" }}>
      <span style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }) {
  return (
    <section className="tx-stat-box" style={{ marginBottom: "20px" }}>
      {title && <h2 style={{ fontSize: "1.2rem", marginBottom: "14px" }}>{title}</h2>}
      {children}
    </section>
  );
}

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [project, setProject] = useState(null);
  const [payment, setPayment] = useState(null);
  const [paymentInstructions, setPaymentInstructions] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [chatError, setChatError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transactionReference, setTransactionReference] = useState("");
  const [revisionComment, setRevisionComment] = useState("");
  const [progressForm, setProgressForm] = useState({
    completed: "",
    workingOn: "",
    remaining: "",
    completionPercentage: "0",
    deliverableLinks: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", dueDate: "" });
  const [finalForm, setFinalForm] = useState({ message: "", deliverableUrl: "" });
  const [demandAmount, setDemandAmount] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignee: "", priority: "medium", dueDate: "" });
  const [fileForm, setFileForm] = useState({ purpose: "dataset", description: "" });
  const [fileBusy, setFileBusy] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [repository, setRepository] = useState(null);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState("");
  const [repositoryForm, setRepositoryForm] = useState({ owner: "", repository: "", token: "" });
  const [codeReferenceForm, setCodeReferenceForm] = useState({ taskId: "", kind: "commit", reference: "" });
  const [previewUrl, setPreviewUrl] = useState("");

  const loadProject = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.project);
      setPreviewUrl(data.project?.previewUrl || "");
      setPayment(data.payment);
      setError("");
      if (
        user?.role === "client" &&
        data.project.approvalStatus === "approved" &&
        data.payment?.status === "awaiting_payment"
      ) {
        try {
          const instructions = await api.get(`/projects/${projectId}/payment-instructions`);
          setPaymentInstructions(instructions.data);
          setPaymentError("");
        } catch (err) {
          setPaymentInstructions(null);
          setPaymentError(err.response?.data?.message || "Unable to load payment instructions.");
        }
      } else {
        setPaymentInstructions(null);
      }
    } catch (err) {
      console.error("Load project workspace failed:", err);
      setError(err.response?.data?.message || "Unable to load the project workspace.");
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  const loadRepository = useCallback(async () => {
    setRepositoryLoading(true);
    setRepositoryError("");
    try {
      const { data } = await api.get(`/projects/${projectId}/repository`);
      setRepository(data.connected ? data.repository : null);
    } catch (repositoryRequestError) {
      setRepositoryError(repositoryRequestError.response?.data?.message || "Unable to load GitHub repository activity.");
    } finally {
      setRepositoryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    if (user?.role === "admin") return () => { active = false; };
    api.get(`/projects/${projectId}/chat`)
      .then(({ data }) => {
        if (active) setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch((err) => {
        if (active) {
          console.error("Load project chat history failed:", err);
          setChatError(err.response?.data?.message || "Unable to load project messages.");
        }
      });
    Promise.resolve().then(loadProject);
    return () => {
      active = false;
    };
  }, [projectId, loadProject, user?.role]);

  useEffect(() => {
    if (workspaceTypeForProject(project) !== "web_development" || !project) return;
    void Promise.resolve().then(() => loadRepository());
  }, [project, loadRepository]);

  useEffect(() => {
    if (user?.role === "admin") {
      return undefined;
    }
    const token = localStorage.getItem("talentx_token");
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("project:join", { projectId }, (result) => {
        if (result?.error) {
          setConnection("error");
          setChatError(result.error);
        } else {
          setConnection("connected");
          setChatError("");
          api.get(`/projects/${projectId}/chat`)
            .then(({ data }) => {
              if (Array.isArray(data.messages)) {
                setMessages((current) => {
                  const byId = new Map(
                    [...data.messages, ...current].map((message) => [message._id, message])
                  );
                  return [...byId.values()].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                  );
                });
              }
            })
            .catch((err) => {
              console.error("Reload project chat history failed:", err);
              setChatError(err.response?.data?.message || "Unable to refresh project chat history.");
            });
        }
      });
    });
    socket.on("connect_error", (err) => {
      setConnection("error");
      setChatError(err.message || "Could not connect to project chat.");
    });
    socket.on("disconnect", () => setConnection("disconnected"));
    socket.on("chat:message", (message) => {
      setMessages((current) =>
        current.some((item) => item._id === message._id) ? current : [...current, message]
      );
    });
    [
      "project:progress",
      "project:updated",
      "project:final-submission",
      "project:approved",
      "project:revision",
      "payment:updated",
    ].forEach((event) => socket.on(event, () => loadProject()));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, loadProject, user?.role]);

  const submit = async (path, body, successMessage) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(path, body);
      setNotice(data.message || successMessage);
      await loadProject();
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save this project update.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveProgress = (event) => {
    event.preventDefault();
    const deliverableLinks = progressForm.deliverableLinks
      .split(/\r?\n/)
      .map((link) => link.trim())
      .filter(Boolean);
    submit(`/projects/${projectId}/progress`, {
      ...progressForm,
      completionPercentage: Number(progressForm.completionPercentage),
      deliverableLinks,
    }, "Progress report saved.");
  };

  const addMilestone = async (event) => {
    event.preventDefault();
    const data = await submit(`/projects/${projectId}/milestones`, milestoneForm, "Milestone added.");
    if (data) setMilestoneForm({ title: "", description: "", dueDate: "" });
  };

  const updateMilestone = async (milestone, event) => {
    const formData = new FormData(event.currentTarget);
    const status = formData.get("status");
    const completionPercentage = Number(formData.get("completionPercentage"));
    await submit(
      `/projects/${projectId}/milestones/${milestone._id}`,
      { status, completionPercentage },
      "Milestone updated."
    );
  };

  const createTask = async (event) => {
    event.preventDefault();
    const result = await submit(`/projects/${projectId}/tasks`, {
      ...taskForm,
      assignee: taskForm.assignee || null,
      dueDate: taskForm.dueDate || null,
    }, "Task created.");
    if (result) setTaskForm({ title: "", description: "", assignee: "", priority: "medium", dueDate: "" });
  };

  const updateTask = async (task, updates) => {
    await submit(`/projects/${projectId}/tasks/${task._id}`, updates, "Task updated.");
  };

  const uploadProjectFile = async (event) => {
    event.preventDefault();
    const file = event.currentTarget.elements.namedItem("project-file")?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Project files must be 5 MB or smaller.");
      return;
    }
    setFileBusy(true);
    setError("");
    try {
      const data = await readFile(file);
      const { data: response } = await api.post(`/projects/${projectId}/files`, {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        purpose: fileForm.purpose,
        description: fileForm.description,
        data,
      });
      setNotice(response.message);
      setFileForm((current) => ({ ...current, description: "" }));
      event.currentTarget.reset();
      await loadProject();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || "Unable to upload this project file.");
    } finally {
      setFileBusy(false);
    }
  };

  const downloadProjectFile = async (file, preview = false) => {
    try {
      if (preview && file.name.toLowerCase().endsWith(".csv")) {
        const { data } = await api.get(`/projects/${projectId}/files/${file._id}?preview=true`);
        setCsvPreview({ ...data, fileName: file.name, fileId: file._id });
        return;
      }
      const { data } = await api.get(`/projects/${projectId}/files/${file._id}`, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || "Unable to retrieve this private project file.");
    }
  };

  const reviewDeliverable = async (file, action) => {
    const feedback = action === "revision"
      ? window.prompt("What should be revised?")
      : window.prompt("Optional feedback for this approved deliverable.") || "";
    if (feedback === null) return;
    if (action === "revision" && feedback.trim().length < 3) {
      setError("Add a short revision comment before submitting the request.");
      return;
    }
    await submit(`/projects/${projectId}/files/${file._id}/review`, { action, feedback }, action === "approve" ? "Deliverable approved." : "Revision requested.");
  };

  const connectRepository = async (event) => {
    event.preventDefault();
    setRepositoryError("");
    try {
      await api.put(`/projects/${projectId}/repository`, repositoryForm);
      setRepositoryForm((current) => ({ ...current, token: "" }));
      await loadRepository();
      setNotice("GitHub repository connected.");
    } catch (requestError) {
      setRepositoryError(requestError.response?.data?.message || "Unable to connect this GitHub repository.");
    }
  };

  const disconnectRepository = async () => {
    if (!window.confirm("Disconnect the GitHub repository from this project?")) return;
    try {
      await api.delete(`/projects/${projectId}/repository`);
      setRepository(null);
      setNotice("GitHub repository disconnected.");
    } catch (requestError) {
      setRepositoryError(requestError.response?.data?.message || "Unable to disconnect this repository.");
    }
  };

  const linkCodeReference = async (event) => {
    event.preventDefault();
    try {
      await submit(`/projects/${projectId}/tasks/${codeReferenceForm.taskId}/github-reference`, {
        kind: codeReferenceForm.kind,
        reference: codeReferenceForm.reference,
      }, "Verified GitHub activity linked to this task.");
      await loadRepository();
      await loadProject();
      setCodeReferenceForm({ taskId: "", kind: "commit", reference: "" });
    } catch (requestError) {
      setRepositoryError(requestError.response?.data?.message || "Unable to link this GitHub reference.");
    }
  };

  const savePreviewUrl = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put(`/projects/${projectId}/preview`, { previewUrl });
      setNotice(data.message);
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save the preview URL.");
    }
  };

  const submitDemandPayment = async (event) => {
    event.preventDefault();
    const payload = {
      message: finalForm.message,
      deliverableUrl: finalForm.deliverableUrl,
      amount: demandAmount ? Number(demandAmount) : project.agreedAmount,
    };
    const data = await submit(
      `/projects/${projectId}/demand-payment`,
      payload,
      "Final work submitted and payment demanded from client."
    );
    if (data) setFinalForm({ message: "", deliverableUrl: "" });
  };

  const reviewFinalWork = async (action) => {
    if (action === "revision" && !revisionComment.trim()) {
      setError("Add a revision comment before requesting changes.");
      return;
    }
    const data = await submit(`/projects/${projectId}/review`, {
      action,
      comment: revisionComment,
    }, action === "approve" ? "Work approved." : "Revision request sent.");
    if (data) setRevisionComment("");
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    await submit(`/projects/${projectId}/payment/record`, { transactionReference }, "Payment recorded.");
  };

  const verifyPayment = async () => {
    if (!window.confirm("Confirm that you have received the payment? This will mark it verified and complete the project.")) return;
    await submit(`/projects/${projectId}/payment/verify`, { received: true }, "Payment verified.");
  };

  const cancelProject = async () => {
    if (!window.confirm("Cancel this project? This action cannot be undone.")) return;
    await submit(`/projects/${projectId}/cancel`, {}, "Project cancelled.");
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !socketRef.current || connection !== "connected") return;
    setSendingMessage(true);
    setChatError("");
    socketRef.current.emit("chat:send", { projectId, text }, (result) => {
      setSendingMessage(false);
      if (result?.error) setChatError(result.error);
      else setMessageText("");
    });
  };

  const backPath = user?.role === "admin"
    ? "/admin/dashboard"
    : user?.role === "client" ? "/client/projects" : "/freelancer/projects";

  if (loading) {
    return <main className="tx-dashboard-body"><p role="status">Loading project workspace…</p></main>;
  }
  if (error && !project) {
    return (
      <main className="tx-dashboard-body">
        <div className="tx-alert tx-alert-danger" role="alert">{error}</div>
        <Link className="tx-btn tx-btn-outline" to={backPath}>Back to Projects</Link>
      </main>
    );
  }
  if (!project) return null;

  const isAdmin = user?.role === "admin";
  const isClient = user?.role === "client";
  const isFreelancer = user?.role === "freelancer";
  const dashboardPath = isAdmin ? "/admin/dashboard" : isClient ? "/client/dashboard" : "/freelancer/dashboard";
  const projectsPath = isAdmin ? "/admin/dashboard" : isClient ? "/client/projects" : "/freelancer/projects";
  const canUpdateWork = isFreelancer && !["Completed", "Cancelled", "In Review"].includes(project.status);
  const workspaceModule = workspaceForProject(project);
  const projectCategoryFields = projectCategories[project.category]?.fields || [];
  const participantOptions = [
    { id: idOf(project.client), label: project.client?.name || "Client" },
    { id: idOf(project.freelancer), label: project.freelancer?.name || "Freelancer" },
  ].filter((participant) => participant.id);
  const upcomingTasks = (project.tasks || [])
    .filter((task) => task.status !== "completed" && task.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);
  const sortedActivity = [...(project.activity || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="tx-dashboard-layout">
      <aside className="tx-dashboard-sidebar">
        <Link to="/" className="tx-sidebar-brand"><span className="tx-brand-icon"><span>T</span>X</span><span style={{ fontWeight: 800, fontSize: "1.3rem" }}>Talent<span className="tx-brand-accent">X</span></span></Link>
        <div className="tx-sidebar-role-badge">{isAdmin ? "Administrator — read only" : isClient ? "Client Workspace" : "Freelancer Workspace"}</div>
        <nav className="tx-sidebar-nav">
          <Link to={dashboardPath} className="tx-sidebar-btn"><span>▦</span><span>Dashboard</span></Link>
          <Link to={projectsPath} className="tx-sidebar-btn active"><span>📁</span><span>My Projects</span></Link>
          {!isAdmin && <Link to="/messages" className="tx-sidebar-btn"><span>💬</span><span>Chat / Messages</span></Link>}
          {isFreelancer && <Link to="/freelancer/payment-settings" className="tx-sidebar-btn"><span>💳</span><span>Payment Settings</span></Link>}
        </nav>
      </aside>
      <div className="tx-dashboard-main">
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs"><Link to={backPath}>Projects</Link> / <strong>Project Workspace</strong></div>
          <div className="tx-dashboard-user-profile"><div className="tx-user-info-text" style={{ textAlign: "right" }}><strong>{user?.name}</strong><span>{user?.role}</span></div><div className="tx-avatar-badge">{user?.name?.[0]?.toUpperCase()}</div></div>
        </header>
        <main className="tx-dashboard-body">
          {error && <div role="alert" className="tx-alert tx-alert-danger" style={{ marginBottom: "16px" }}>{error}</div>}
          {notice && <div role="status" className="tx-alert tx-alert-success" style={{ marginBottom: "16px" }}>{notice}</div>}

          <div className="tx-welcome-banner">
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="tx-role-pill">{project.status}</span>
                {project.paymentTerms && <span className="tx-role-pill">{project.paymentTerms}</span>}
                {!isAdmin && <span
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  ✓ Zero Pre-Money • Pay-on-Completion
                </span>}
                {project.demandPayment?.demanded && (
                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                      padding: "3px 10px",
                      borderRadius: "99px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    ⚡ Payment Demanded: ${project.demandPayment?.amount}
                  </span>
                )}
              </div>
              <h1 style={{ marginTop: "10px" }}>{project.title}</h1>
              <p style={{ marginTop: "8px" }}>{project.client?.name} · {project.freelancer?.name} · Agreed payout: {project.agreedAmount > 0 ? `$${Number(project.agreedAmount).toLocaleString()} ${project.currency}` : "Demanded upon completion"}</p>
            </div>
            <div style={{ minWidth: "180px" }}>
              <strong>{project.completionPercentage}% complete</strong>
              <div style={{ height: "9px", background: "var(--tx-slate-200)", borderRadius: "99px", marginTop: "8px" }}>
                <div style={{ width: `${project.completionPercentage}%`, height: "100%", background: "var(--tx-green)", borderRadius: "99px" }} />
              </div>
            </div>
            {!["Completed", "Cancelled"].includes(project.status) &&
              !["pending_verification", "paid"].includes(payment?.status) && (
                <button type="button" className="tx-btn tx-btn-outline" disabled={saving} onClick={cancelProject}>
                  Cancel Project
                </button>
              )}
          </div>

          <Card title="Project Overview">
            <p style={{ color: "var(--tx-slate-500)" }}>{workspaceModule.title} · {project.subcategory || project.projectType || "Flexible project workflow"}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{project.description}</p>
            {workspaceModule.warning && <div className="tx-alert tx-alert-warning" role="note">{workspaceModule.warning}</div>}
            <section style={{ background: "var(--tx-slate-50)", borderRadius: 10, padding: 16, marginTop: 16 }}>
              <h3 style={{ fontSize: "1rem", marginTop: 0 }}>{workspaceModule.title}</h3>
              <p>{workspaceModule.description}</p>
              {workspaceModule.stages && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
                  {workspaceModule.stages.map((stage, index) => (
                    <span key={stage} className="tx-role-pill" style={{ opacity: index < (project.files || []).filter((file) => file.purpose === "dataset").length + (project.tasks || []).filter((task) => task.status === "completed").length ? 1 : 0.6 }}>{stage}</span>
                  ))}
                </div>
              )}
              {projectCategoryFields
                .filter((field) => project.requirements?.categoryDetails?.[field.key])
                .map((field) => (
                  <p key={field.key}><strong>{field.label}:</strong> {project.requirements.categoryDetails[field.key]}</p>
                ))}
            </section>
            {project.requirements?.generated && (
              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                {[
                  ["objectives", "Objectives"],
                  ["tasksAndMilestones", "Planned tasks and milestones"],
                  ["deliverables", "Deliverables"],
                  ["testingAcceptanceCriteria", "Acceptance criteria"],
                  ["openQuestions", "Open questions"],
                ].map(([key, label]) => {
                  const values = project.requirements.generated[key];
                  if (!values || values.length === 0) return null;
                  return (
                    <div key={key}>
                      <strong>{label}</strong>
                      {Array.isArray(values)
                        ? <ul style={{ margin: "5px 0", paddingLeft: 22 }}>{values.map((value, index) => <li key={`${key}-${index}`}>{value}</li>)}</ul>
                        : <p style={{ whiteSpace: "pre-wrap", margin: "5px 0" }}>{values}</p>}
                    </div>
                  );
                })}
                {Object.values(project.requirements.categoryDetails || {}).some(Boolean) && (
                  <div>
                    <strong>Category-specific details</strong>
                    {(projectCategories[project.requirements.generated.category]?.fields || []).map((field) => {
                      const value = project.requirements.categoryDetails[field.key];
                      return value ? (
                        <p key={field.key} style={{ whiteSpace: "pre-wrap", margin: "5px 0" }}>
                          <strong>{field.label}:</strong> {value}
                        </p>
                      ) : null;
                    })}
                  </div>
                )}
                {project.requirements.referenceFiles?.map((file, index) => (
                  <a key={`${file.name}-${index}`} href={`${api.defaults.baseURL || "http://localhost:5000/api"}/jobs/${project.job}/references/${index}`}>
                    Download reference: {file.name}
                  </a>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "16px", fontSize: "0.9rem" }}>
              <span><strong>Started:</strong> {project.startedAt ? new Date(project.startedAt).toLocaleDateString() : "—"}</span>
              <span><strong>Expected deadline:</strong> {project.expectedDeadline ? new Date(project.expectedDeadline).toLocaleDateString() : "Not set"}</span>
              <span><strong>Client:</strong> {project.client?.name}</span>
              <span><strong>Freelancer:</strong> {project.freelancer?.name}</span>
              <span><strong>Agreed budget:</strong> {project.agreedAmount > 0 ? `${project.currency} ${Number(project.agreedAmount).toLocaleString()}` : "Negotiating"}</span>
              <span><strong>Payment status:</strong> {payment?.status ? payment.status.replaceAll("_", " ") : project.approvalStatus === "approved" ? "Awaiting payment record" : "No payment recorded"}</span>
            </div>
            {upcomingTasks.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <strong>Upcoming tasks</strong>
                <ul>{upcomingTasks.map((task) => <li key={task._id}>{task.title} · due {new Date(task.dueDate).toLocaleDateString()}</li>)}</ul>
              </div>
            )}
          </Card>

          {workspaceModule.showGitHub && (
            <Card title="GitHub repository activity">
              <p>Repository details, commits, pull requests, and releases come directly from GitHub. TalentX does not track unpushed local VS Code changes.</p>
              {repositoryError && <div role="alert" className="tx-alert tx-alert-danger">{repositoryError}</div>}
              {repositoryLoading ? <p role="status">Loading GitHub activity…</p> : repository ? (
                <>
                  <p><a href={repository.url} target="_blank" rel="noreferrer"><strong>{repository.fullName}</strong></a>{repository.private ? " · Private repository" : " · Public repository"} · Default branch: {repository.defaultBranch}</p>
                  {repository.latestCommit && <div style={{ background: "var(--tx-slate-50)", padding: 12, borderRadius: 8, margin: "12px 0" }}>
                    <strong>Latest commit:</strong> {repository.latestCommit.message}
                    <p>{repository.latestCommit.author} · {repository.latestCommit.date ? new Date(repository.latestCommit.date).toLocaleString() : ""} · <a href={repository.latestCommit.url} target="_blank" rel="noreferrer">{repository.latestCommit.sha.slice(0, 8)}</a></p>
                  </div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
                    <section><h3>Recent commits</h3>{repository.commits.length ? repository.commits.map((commit) => <p key={commit.sha}><a href={commit.url} target="_blank" rel="noreferrer">{commit.sha.slice(0, 8)}</a> · {commit.message} · {commit.author}</p>) : <p>No commits were returned by GitHub.</p>}</section>
                    <section><h3>Pull requests</h3>{repository.pullRequests.length ? repository.pullRequests.map((pull) => <p key={pull.number}><a href={pull.url} target="_blank" rel="noreferrer">#{pull.number} {pull.title}</a> · {pull.state}</p>) : <p>No pull requests were returned by GitHub.</p>}</section>
                    <section><h3>Releases</h3>{repository.releases.length ? repository.releases.map((release) => <p key={release.tag}><a href={release.url} target="_blank" rel="noreferrer">{release.name}</a> · {release.publishedAt ? new Date(release.publishedAt).toLocaleDateString() : "Draft"}</p>) : <p>No releases were returned by GitHub.</p>}</section>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={loadRepository}>Refresh GitHub activity</button>
                    {isFreelancer && <button type="button" className="tx-btn tx-btn-subtle tx-btn-sm" onClick={disconnectRepository}>Disconnect repository</button>}
                  </div>
                </>
              ) : (
                <>
                  <p>No repository is linked. A freelancer can link an existing GitHub repository; TalentX does not create repositories.</p>
                  {isFreelancer && <form className="tx-auth-form" onSubmit={connectRepository}>
                    <p>Create a fine-grained GitHub token restricted to this repository with read-only Contents and Pull requests permissions (Metadata is required by GitHub). The token is encrypted on the server and is never returned to the browser after linking.</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                      <Field label="Repository owner"><input className="tx-input" value={repositoryForm.owner} onChange={(event) => setRepositoryForm({ ...repositoryForm, owner: event.target.value })} required /></Field>
                      <Field label="Repository name"><input className="tx-input" value={repositoryForm.repository} onChange={(event) => setRepositoryForm({ ...repositoryForm, repository: event.target.value })} required /></Field>
                    </div>
                    <Field label="Fine-grained GitHub token (not your GitHub password)"><input className="tx-input" type="password" autoComplete="off" value={repositoryForm.token} onChange={(event) => setRepositoryForm({ ...repositoryForm, token: event.target.value })} required /></Field>
                    <button type="submit" className="tx-btn tx-btn-outline" disabled={repositoryLoading}>Verify and link repository</button>
                  </form>}
                </>
              )}
              {isFreelancer && repository && (project.tasks || []).length > 0 && (
                <form onSubmit={linkCodeReference} className="tx-auth-form" style={{ borderTop: "1px solid var(--tx-slate-100)", marginTop: 16, paddingTop: 16 }}>
                  <h3>Link verified code activity to a task</h3>
                  <Field label="Task"><select className="tx-input" value={codeReferenceForm.taskId} onChange={(event) => setCodeReferenceForm({ ...codeReferenceForm, taskId: event.target.value })} required><option value="">Choose a task</option>{project.tasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select></Field>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <Field label="Reference type"><select className="tx-input" value={codeReferenceForm.kind} onChange={(event) => setCodeReferenceForm({ ...codeReferenceForm, kind: event.target.value, reference: "" })}><option value="commit">Commit SHA</option><option value="pull_request">Pull request number</option></select></Field>
                    <Field label={codeReferenceForm.kind === "commit" ? "Commit SHA" : "Pull request number"}><input className="tx-input" value={codeReferenceForm.reference} onChange={(event) => setCodeReferenceForm({ ...codeReferenceForm, reference: event.target.value })} required /></Field>
                  </div>
                  <button type="submit" className="tx-btn tx-btn-outline" disabled={saving}>Verify and link</button>
                </form>
              )}
              {(project.tasks || []).filter((task) => task.codeReferences?.length).map((task) => (
                <div key={`code-${task._id}`}><strong>{task.title}</strong>{task.codeReferences.map((reference) => <p key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.kind === "commit" ? "Commit" : "Pull request"}: {reference.title || reference.reference}</a></p>)}</div>
              ))}
            </Card>
          )}

          {workspaceModule.showWebsitePreview && (
            <Card title="Website preview">
              <p>Share an HTTPS preview URL for the client. TalentX does not claim or verify a deployment without a hosting-provider integration.</p>
              {project.previewUrl && <p><a href={project.previewUrl} target="_blank" rel="noreferrer">Open website preview</a> · Shared {project.previewSubmittedAt ? new Date(project.previewSubmittedAt).toLocaleString() : ""} · Deployment not independently verified</p>}
              {isFreelancer && <form onSubmit={savePreviewUrl} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input aria-label="Website preview URL" className="tx-input" type="url" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} placeholder="https://your-preview.example" required />
                <button type="submit" className="tx-btn tx-btn-outline" disabled={saving}>Share preview URL</button>
              </form>}
            </Card>
          )}

          <Card title="Tasks and milestones">
            {(project.tasks || []).length === 0 ? (
              <p style={{ color: "var(--tx-slate-500)" }}>No tasks yet. Add a task or use the project milestones to agree on the next steps.</p>
            ) : project.tasks.map((task) => (
              <article key={task._id} style={{ borderTop: "1px solid var(--tx-slate-100)", padding: "14px 0" }}>
                <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div><strong>{task.title}</strong><p>{task.description}</p></div>
                  <div>{task.priority} priority{task.dueDate ? ` · due ${new Date(task.dueDate).toLocaleDateString()}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{task.assignee?.name || participantOptions.find((participant) => participant.id === idOf(task.assignee))?.label || "Unassigned"}</span>
                  {!isAdmin && <select className="tx-input" aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => updateTask(task, { status: event.target.value })}>
                    <option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option>
                  </select>}
                  <span className="tx-role-pill">{task.status.replaceAll("_", " ")}</span>
                </div>
                {task.subtasks?.length > 0 && <ul>{task.subtasks.map((subtask, index) => <li key={`${task._id}-${index}`}>{subtask.completed ? "✓ " : "○ "}{subtask.title}</li>)}</ul>}
              </article>
            ))}
            <p style={{ color: "var(--tx-slate-500)", fontSize: "0.85rem" }}>Progress rule: completed tasks / total tasks. Milestones determine progress when no tasks are present.</p>
            {!isAdmin && !["Completed", "Cancelled"].includes(project.status) && (
              <form className="tx-auth-form" onSubmit={createTask} style={{ borderTop: "1px solid var(--tx-slate-100)", paddingTop: 16 }}>
                <Field label="Task title"><input className="tx-input" maxLength="160" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required /></Field>
                <Field label="Task description"><textarea className="tx-input" rows="2" maxLength="3000" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                  <Field label="Assignee"><select className="tx-input" value={taskForm.assignee} onChange={(event) => setTaskForm({ ...taskForm, assignee: event.target.value })}><option value="">Unassigned</option>{participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.label}</option>)}</select></Field>
                  <Field label="Priority"><select className="tx-input" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>{["low", "medium", "high", "urgent"].map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
                  <Field label="Due date"><input type="date" className="tx-input" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></Field>
                </div>
                <button className="tx-btn tx-btn-outline" type="submit" disabled={saving}>Add task</button>
              </form>
            )}
          </Card>

          <Card title={project.workspaceType === "data_analytics" ? "Datasets and deliverables" : "Project files and deliverables"}>
            <p>Files are private to this project. Uploads are limited to 5 MB per file; CSV files include a secure in-browser preview.</p>
            {(project.files || []).length === 0 ? <p>No private project files have been shared yet.</p> : (
              <div style={{ display: "grid", gap: 12 }}>
                {project.files.map((file) => (
                  <article key={file._id} style={{ border: "1px solid var(--tx-slate-200)", borderRadius: 8, padding: 12 }}>
                    <strong>{file.name}</strong>
                    <p>{file.purpose} · v{file.version} · {file.uploadedBy?.name || participantOptions.find((participant) => participant.id === idOf(file.uploadedBy))?.label || "Project participant"} · {new Date(file.createdAt).toLocaleString()}</p>
                    {file.description && <p>{file.description}</p>}
                    <p>Status: {file.reviewStatus?.replaceAll("_", " ") || "pending"}{file.feedback ? ` · ${file.feedback}` : ""}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {file.name.toLowerCase().endsWith(".csv") && <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={() => downloadProjectFile(file, true)}>Preview CSV</button>}
                      <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={() => downloadProjectFile(file)}>Download</button>
                      {isClient && file.purpose === "deliverable" && file.reviewStatus !== "approved" && <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={() => reviewDeliverable(file, "approve")} disabled={saving}>Approve</button>}
                      {isClient && file.purpose === "deliverable" && <button type="button" className="tx-btn tx-btn-subtle tx-btn-sm" onClick={() => reviewDeliverable(file, "revision")} disabled={saving}>Request revision</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {csvPreview && (
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <h3>{csvPreview.fileName} preview · {csvPreview.rowCount} data rows</h3>
                <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                  <thead><tr>{csvPreview.columns.map((column) => <th key={column.name} style={{ borderBottom: "1px solid var(--tx-slate-300)", padding: 8, textAlign: "left" }}>{column.name} <small>({column.type})</small></th>)}</tr></thead>
                  <tbody>{csvPreview.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => <td key={columnIndex} style={{ borderBottom: "1px solid var(--tx-slate-100)", padding: 8 }}>{value}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {!isAdmin && !(isClient && ["Completed", "Cancelled"].includes(project.status)) && !(isFreelancer && ["Completed", "Cancelled"].includes(project.status)) && (
              <form onSubmit={uploadProjectFile} style={{ borderTop: "1px solid var(--tx-slate-100)", marginTop: 16, paddingTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {isClient && <Field label="File purpose"><select className="tx-input" value={fileForm.purpose} onChange={(event) => setFileForm({ ...fileForm, purpose: event.target.value })}><option value="dataset">Dataset</option><option value="reference">Reference</option></select></Field>}
                  <Field label="File description"><input className="tx-input" maxLength="2000" value={fileForm.description} onChange={(event) => setFileForm({ ...fileForm, description: event.target.value })} placeholder="What is this file for?" /></Field>
                </div>
                <Field label={isClient ? "Upload a private dataset or reference file" : "Submit a deliverable version"}>
                  <input name="project-file" type="file" accept={fileAccept} required />
                </Field>
                <button className="tx-btn tx-btn-primary" type="submit" disabled={fileBusy}>{fileBusy ? "Uploading…" : "Upload file"}</button>
              </form>
            )}
          </Card>
          {canUpdateWork && (
            <>
              <Card title="Post a Progress Report">
                <form className="tx-auth-form" onSubmit={saveProgress}>
                  <Field label="What has been completed?"><textarea className="tx-input" rows="3" minLength="3" maxLength="2000" value={progressForm.completed} onChange={(event) => setProgressForm({ ...progressForm, completed: event.target.value })} required /></Field>
                  <Field label="What are you working on now?"><textarea className="tx-input" rows="2" maxLength="2000" value={progressForm.workingOn} onChange={(event) => setProgressForm({ ...progressForm, workingOn: event.target.value })} /></Field>
                  <Field label="What remains?"><textarea className="tx-input" rows="2" maxLength="2000" value={progressForm.remaining} onChange={(event) => setProgressForm({ ...progressForm, remaining: event.target.value })} /></Field>
                  <Field label="Overall completion (%)"><input className="tx-input" type="number" min="0" max="100" value={progressForm.completionPercentage} onChange={(event) => setProgressForm({ ...progressForm, completionPercentage: event.target.value })} required /></Field>
                  <Field label="Work sample or deliverable links (one HTTPS link per line)"><textarea className="tx-input" rows="2" value={progressForm.deliverableLinks} onChange={(event) => setProgressForm({ ...progressForm, deliverableLinks: event.target.value })} placeholder="https://…" /></Field>
                  <button className="tx-btn tx-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Post Progress"}</button>
                </form>
              </Card>

              <Card title="Milestones">
                {(project.milestones || []).map((milestone) => (
                  <div key={milestone._id} style={{ borderTop: "1px solid var(--tx-slate-100)", padding: "14px 0" }}>
                    <strong>{milestone.title}</strong>
                    {milestone.description && <p>{milestone.description}</p>}
                    <p style={{ fontSize: "0.86rem", margin: "5px 0 10px" }}>
                      {milestone.status.replaceAll("_", " ")} · {milestone.completionPercentage}%
                      {milestone.dueDate ? ` · Due ${new Date(milestone.dueDate).toLocaleDateString()}` : ""}
                    </p>
                    <form onSubmit={(event) => { event.preventDefault(); updateMilestone(milestone, event); }} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <select name="status" className="tx-input" defaultValue={milestone.status} aria-label={`${milestone.title} status`}>
                        <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                      </select>
                      <input name="completionPercentage" className="tx-input" type="number" min="0" max="100" defaultValue={milestone.completionPercentage} aria-label={`${milestone.title} completion percentage`} />
                      <button type="submit" className="tx-btn tx-btn-outline tx-btn-sm" disabled={saving}>Update milestone</button>
                    </form>
                  </div>
                ))}
                <form className="tx-auth-form" onSubmit={addMilestone} style={{ borderTop: "1px solid var(--tx-slate-100)", paddingTop: "16px", marginTop: "8px" }}>
                  <Field label="Milestone title"><input className="tx-input" minLength="2" maxLength="120" value={milestoneForm.title} onChange={(event) => setMilestoneForm({ ...milestoneForm, title: event.target.value })} required /></Field>
                  <Field label="Description"><textarea className="tx-input" rows="2" maxLength="1000" value={milestoneForm.description} onChange={(event) => setMilestoneForm({ ...milestoneForm, description: event.target.value })} /></Field>
                  <Field label="Due date"><input className="tx-input" type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, dueDate: event.target.value })} /></Field>
                  <button className="tx-btn tx-btn-outline" type="submit" disabled={saving}>Add Milestone</button>
                </form>
              </Card>

              <Card title="Submit Work & Demand Payment">
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "var(--tx-radius-md)",
                    padding: "14px 18px",
                    marginBottom: "16px",
                  }}
                >
                  <strong style={{ color: "#065f46", display: "block", marginBottom: "4px" }}>
                    ⚡ Zero Pre-Money Workflow
                  </strong>
                  <p style={{ color: "#047857", fontSize: "0.86rem", margin: 0 }}>
                    Since there are zero upfront charges on TalentX, submitting your completed deliverables will send a formal <strong>Payment Demand</strong> to the client. The client will review your work and approve the payout.
                  </p>
                </div>

                {project.status === "In Review" ? (
                  <div className="tx-alert tx-alert-success">
                    ✓ Final deliverables submitted and payment of ${project.demandPayment?.amount || project.agreedAmount} {project.currency} demanded. Awaiting client review and approval.
                  </div>
                ) : (
                  <form className="tx-auth-form" onSubmit={submitDemandPayment}>
                    <Field label="Demanded Payout Amount ($ USD)">
                      <input
                        className="tx-input"
                        type="number"
                        min="1"
                        defaultValue={demandAmount || (project.agreedAmount > 0 ? project.agreedAmount : "")}
                        onChange={(event) => setDemandAmount(event.target.value)}
                        placeholder={project.agreedAmount > 0 ? String(project.agreedAmount) : "e.g. 500"}
                        required
                      />
                    </Field>
                    <Field label="Completion Summary & Deliverables Breakdown">
                      <textarea
                        className="tx-input"
                        rows={3}
                        minLength={10}
                        maxLength={3000}
                        value={finalForm.message}
                        onChange={(event) => setFinalForm({ ...finalForm, message: event.target.value })}
                        placeholder="Detail the completed features, components, and instructions..."
                        required
                      />
                    </Field>
                    <Field label="Final Deliverable HTTPS Link (GitHub Repo, Live Demo, Figma, etc.)">
                      <input
                        className="tx-input"
                        type="url"
                        pattern="https://.+"
                        value={finalForm.deliverableUrl}
                        onChange={(event) => setFinalForm({ ...finalForm, deliverableUrl: event.target.value })}
                        placeholder="https://..."
                        required
                      />
                    </Field>
                    <button
                      className="tx-btn tx-btn-primary"
                      type="submit"
                      disabled={saving}
                      style={{ background: "linear-gradient(135deg, #108a00, #059669)", minWidth: "240px" }}
                    >
                      {saving ? "Submitting..." : `Submit Work & Demand Payment (${demandAmount ? `$${demandAmount}` : project.agreedAmount > 0 ? `$${project.agreedAmount}` : "Set Demanded Payout"})`}
                    </button>
                  </form>
                )}
              </Card>
            </>
          )}

          {isClient && (project.finalSubmission?.submittedAt || project.demandPayment?.demanded) && (
            <Card title="Final Work Submission & Payment Demand">
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "var(--tx-radius-md)",
                  padding: "16px 20px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block" }}>
                    ⚡ Payment Demanded by Freelancer
                  </span>
                  <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#78350f" }}>
                    ${Number(project.demandPayment?.amount || project.agreedAmount).toLocaleString()} {project.currency}
                  </span>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#92400e" }}>
                  Submitted on completion • No advance fees were charged
                </span>
              </div>

              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{project.finalSubmission.message || project.demandPayment?.notes}</p>
              <p style={{ margin: "12px 0", fontSize: "0.88rem", color: "var(--tx-slate-500)" }}>
                Submitted {project.finalSubmission?.submittedAt ? new Date(project.finalSubmission.submittedAt).toLocaleString() : project.demandPayment?.demandedAt ? new Date(project.demandPayment.demandedAt).toLocaleString() : "Recently"}
              </p>
              <a
                className="tx-btn tx-btn-outline tx-btn-sm"
                href={project.finalSubmission.deliverableUrl || project.demandPayment?.deliverableUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                Inspect Deliverable Link ↗
              </a>

              {project.finalSubmission.reviewComment && (
                <p style={{ marginTop: "12px" }}><strong>Review comment:</strong> {project.finalSubmission.reviewComment}</p>
              )}

              {project.approvalStatus === "pending" && (
                <div style={{ marginTop: "22px", borderTop: "1px solid var(--tx-slate-100)", paddingTop: "18px" }}>
                  <button
                    type="button"
                    className="tx-btn tx-btn-primary tx-btn-lg"
                    disabled={saving}
                    onClick={() => reviewFinalWork("approve")}
                    style={{ background: "linear-gradient(135deg, #108a00, #059669)", marginRight: "12px" }}
                  >
                    ✓ Approve Work & Proceed to Payout (${project.demandPayment?.amount || project.agreedAmount || "Agreed Payout"})
                  </button>

                  <form onSubmit={(event) => { event.preventDefault(); reviewFinalWork("revision"); }} style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                    <textarea
                      className="tx-input"
                      rows={2}
                      maxLength={2000}
                      placeholder="Explain the required revisions or deliverable issues..."
                      value={revisionComment}
                      onChange={(event) => setRevisionComment(event.target.value)}
                    />
                    <button type="submit" className="tx-btn tx-btn-outline" disabled={saving}>
                      Request Revisions
                    </button>
                  </form>
                </div>
              )}
            </Card>
          )}

          {project.approvalStatus === "approved" && payment && (
            <Card title="Project Payment">
              <p>Agreed amount: <strong>${Number(payment.amount).toLocaleString()} {payment.currency}</strong> · Status: <strong style={{ textTransform: "capitalize" }}>{payment.status.replaceAll("_", " ")}</strong></p>
              <p style={{ marginTop: "6px" }}>Total due equals the agreed amount; no additional fees or deductions are configured for this project.</p>
              <p style={{ marginTop: "6px" }}>Payment method: {payment.method === "upi" ? "UPI" : "Bank transfer (NEFT/IMPS)"} · Manual payment; TalentX has no configured payment gateway.</p>
              {paymentError && <div role="alert" className="tx-alert tx-alert-danger" style={{ marginTop: "12px" }}>{paymentError}</div>}
              {isClient && payment.status === "awaiting_payment" && paymentInstructions && (
                <div style={{ background: "var(--tx-slate-50)", padding: "16px", borderRadius: "var(--tx-radius-md)", marginTop: "14px" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>Freelancer payment instructions</h3>
                  {paymentInstructions.method === "upi" ? (
                    <p>UPI ID: <strong>{paymentInstructions.details.upiId}</strong></p>
                  ) : (
                    <>
                      <p>Beneficiary: <strong>{paymentInstructions.details.accountName}</strong></p>
                      <p>Account: <strong>{paymentInstructions.details.accountNumber}</strong></p>
                      <p>IFSC: <strong>{paymentInstructions.details.ifsc}</strong></p>
                    </>
                  )}
                  <form onSubmit={recordPayment} style={{ marginTop: "14px" }}>
                    <Field label="Transaction reference (optional)"><input className="tx-input" maxLength="120" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} /></Field>
                    <button className="tx-btn tx-btn-primary" type="submit" disabled={saving}>{saving ? "Recording…" : "I Made the Payment"}</button>
                  </form>
                </div>
              )}
              {isClient && payment.status === "pending_verification" && <p style={{ marginTop: "10px" }}>Payment is pending freelancer verification. Reference: {payment.transactionReference || "Not provided"}</p>}
              {isFreelancer && payment.status === "pending_verification" && (
                <div style={{ marginTop: "14px" }}>
                  <p>The client reported making this manual payment. Reference: {payment.transactionReference || "Not provided"}</p>
                  <button type="button" className="tx-btn tx-btn-primary" disabled={saving} onClick={verifyPayment}>Verify I Received Payment</button>
                </div>
              )}
              {isFreelancer && payment.status === "awaiting_payment" && <p style={{ marginTop: "10px" }}>Waiting for client payment. <Link to="/freelancer/payment-settings">Manage payment settings</Link></p>}
              {payment.status === "paid" && <p style={{ color: "var(--tx-green-dark)", fontWeight: 700, marginTop: "10px" }}>Payment verified {payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : ""}. Project completed.</p>}
              {(payment.history || []).length > 0 && (
                <div style={{ marginTop: "14px" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>Payment history</h3>
                  {payment.history.map((item, index) => <p key={`${item.status}-${index}`} style={{ fontSize: "0.88rem" }}>{item.status.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString()} {item.note}</p>)}
                </div>
              )}
            </Card>
          )}

          {project.progressUpdates?.length > 0 && (
            <Card title="Progress Reports">
              {[...project.progressUpdates].reverse().map((update) => (
                <article key={update._id} style={{ padding: "14px 0", borderTop: "1px solid var(--tx-slate-100)" }}>
                  <p><strong>{update.actor?.name || project.freelancer?.name}</strong> · {new Date(update.createdAt).toLocaleString()} · {update.completionPercentage}%</p>
                  <p style={{ marginTop: "8px" }}><strong>Completed:</strong> {update.completed}</p>
                  {update.workingOn && <p><strong>Working on:</strong> {update.workingOn}</p>}
                  {update.remaining && <p><strong>Remaining:</strong> {update.remaining}</p>}
                  {(update.deliverableLinks || []).map((url) => <p key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}
                </article>
              ))}
            </Card>
          )}

          <Card title="Project Activity Timeline">
            {sortedActivity.length === 0 ? <p>No project activity recorded yet.</p> : sortedActivity.map((item) => (
              <div key={item._id} style={{ display: "flex", gap: "12px", padding: "10px 0", borderTop: "1px solid var(--tx-slate-100)" }}>
                <span style={{ color: "var(--tx-green)" }}>●</span>
                <div><p>{item.message}</p><small style={{ color: "var(--tx-slate-500)" }}>{item.actor?.name || "Project member"} · {new Date(item.createdAt).toLocaleString()}</small></div>
              </div>
            ))}
          </Card>

          {!isAdmin && <Card title="Project Chat">
            <p style={{ marginBottom: "12px" }}>
              Chat connection: <strong>{isAdmin ? "Read-only" : connection === "connected" ? "Connected" : connection === "error" ? "Unavailable" : connection}</strong>
            </p>
            {chatError && <div className="tx-alert tx-alert-danger" role="alert" style={{ marginBottom: "12px" }}>{chatError}</div>}
            <div aria-live="polite" style={{ height: "260px", overflowY: "auto", border: "1px solid var(--tx-slate-200)", borderRadius: "var(--tx-radius-md)", padding: "12px", marginBottom: "12px" }}>
              {messages.length === 0 ? <p style={{ color: "var(--tx-slate-500)" }}>No messages yet. Start the project conversation.</p> : messages.map((message) => (
                <div key={message._id} style={{ marginBottom: "12px", textAlign: message.sender?._id === user?.id || message.sender?._id === user?._id ? "right" : "left" }}>
                  <span style={{ display: "inline-block", maxWidth: "85%", padding: "10px 12px", borderRadius: "var(--tx-radius-md)", background: "var(--tx-slate-50)", textAlign: "left" }}>
                    <strong style={{ display: "block", fontSize: "0.82rem" }}>{message.sender?.name || "Project member"}</strong>
                    <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</span>
                    <small style={{ display: "block", color: "var(--tx-slate-500)", marginTop: "4px" }}>{new Date(message.createdAt).toLocaleString()}</small>
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px" }}>
              <input className="tx-input" maxLength="5000" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" aria-label="Message" />
              <button type="submit" className="tx-btn tx-btn-primary" disabled={sendingMessage || connection !== "connected" || !messageText.trim()}>
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </form>
          </Card>}
        </main>
      </div>
    </div>
  );
}
