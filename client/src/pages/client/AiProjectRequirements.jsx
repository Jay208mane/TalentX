import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import api from "../../services/api";
import {
  asText,
  projectCategories,
  requirementSections,
} from "./projectCategories";
import "../../App.css";

const emptyForm = {
  title: "",
  category: "Web & Mobile Development",
  subcategory: "Website development",
  concept: "",
  expectedOutcome: "",
  scope: "",
  skills: "",
  tools: "",
  projectType: "Mini Project",
  experiencePreference: "Beginner-Friendly",
  complexity: "Basic",
  budgetMin: "",
  budgetMax: "",
  currency: "USD",
  paymentPreference: "Negotiable",
  duration: "",
  deadline: "",
  deliverables: "",
  acceptanceCriteria: "",
  referenceLinks: "",
  referenceFiles: [],
  categoryDetails: {},
  instructions: "",
};

const sectionText = (requirements, key) =>
  asText(requirements?.[key]);

const fieldStyle = { display: "grid", gap: "6px", marginBottom: "16px" };
const labelStyle = { fontWeight: 650, color: "var(--tx-slate-800)", fontSize: "0.9rem" };

function splitList(value) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function pdfSafeFilename(value) {
  return (value || "project-requirements")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "project-requirements";
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: reader.result,
    });
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function AiProjectRequirements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [requirements, setRequirements] = useState(null);
  const [draftId, setDraftId] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const category = projectCategories[form.category] || projectCategories["Other / Custom Project"];
  const referenceLinks = useMemo(() => splitList(form.referenceLinks), [form.referenceLinks]);

  useEffect(() => {
    let active = true;
    api.get("/jobs/drafts")
      .then(({ data }) => {
        if (!active) return;
        const draft = data?.drafts?.[0];
        if (draft) {
          setDraftId(draft._id);
          const savedForm = draft.form || {};
          setForm({
            ...emptyForm,
            ...savedForm,
            skills: asText(savedForm.skills),
            tools: asText(savedForm.tools),
            deliverables: asText(savedForm.deliverables),
            referenceLinks: asText(savedForm.referenceLinks),
            referenceFiles: savedForm.referenceFiles || [],
          });
          setRequirements(draft.generatedRequirements || null);
          if (draft.status === "published" && draft.publishedJob) {
            setNotice("Your latest saved project has already been published.");
          }
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load your saved project draft.");
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => { active = false; };
  }, []);

  const updateForm = (key, value) => {
    if (key.startsWith("categoryDetails.")) {
      const detailKey = key.slice("categoryDetails.".length);
      setForm((current) => ({
        ...current,
        categoryDetails: { ...current.categoryDetails, [detailKey]: value },
      }));
    } else {
      setForm((current) => ({
        ...current,
        [key]: value,
        ...(key === "category"
          ? {
            subcategory: projectCategories[value]?.subcategories[0] || "Custom project",
            categoryDetails: {},
          }
          : {}),
      }));
    }
    setError("");
    setNotice("");
  };

  const payload = () => ({
    form: {
      ...form,
      skills: splitList(form.skills),
      tools: splitList(form.tools),
      deliverables: splitList(form.deliverables),
      referenceLinks,
    },
    generatedRequirements: requirements,
    draftId: draftId || undefined,
  });

  const saveDraft = async (showNotice = true) => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/jobs/drafts", payload());
      setDraftId(data.draft._id);
      if (showNotice) {
        setNotice("Draft saved securely to your TalentX account.");
        window.setTimeout(() => setNotice(""), 3500);
      }
      return data.draft;
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to save your draft. Please try again.";
      setError(message);
      throw new Error(message, { cause: requestError });
    } finally {
      setSaving(false);
    }
  };

  const validateForGeneration = () => {
    if (form.title.trim().length < 3) {
      setError("Add a project title of at least 3 characters.");
      return false;
    }
    if (form.concept.trim().length < 10) {
      setError("Describe the project idea or business problem in at least 10 characters.");
      return false;
    }
    return true;
  };

  const generateRequirements = async (event) => {
    event?.preventDefault();
    if (!validateForGeneration()) return;
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const generationForm = Object.fromEntries(
        Object.entries(form).filter(([key]) => key !== "referenceFiles")
      );
      const { data } = await api.post("/ai/generate-project-requirements", {
        ...generationForm,
        skills: splitList(form.skills),
        tools: splitList(form.tools),
        deliverables: splitList(form.deliverables),
        referenceLinks,
      });
      setRequirements(data.data);
      setNotice("Requirements generated. Review and edit every section before publishing.");
    } catch (requestError) {
      const body = requestError.response?.data;
      setError(body?.message || "Unable to generate requirements. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const editRequirement = (key, value) => {
    const listKeys = new Set([
      "objectives", "tasksAndMilestones", "requiredSkills", "optionalSkills",
      "recommendedTools", "deliverables", "functionalRequirements",
      "nonFunctionalRequirements", "testingAcceptanceCriteria", "assumptions",
      "dependencies", "openQuestions",
    ]);
    setRequirements((current) => ({
      ...current,
      [key]: listKeys.has(key) ? splitList(value) : value,
    }));
  };

  const downloadPdf = async () => {
    if (!requirements) return;
    try {
      const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const left = 18;
    const right = pageWidth - 18;
    const bodyWidth = right - left;
    let y = 20;

    const ensureSpace = (height) => {
      if (y + height > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }
    };
    const writeParagraph = (text, options = {}) => {
      const fontSize = options.fontSize || 10;
      pdf.setFont("helvetica", options.bold ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      pdf.setTextColor(...(options.color || [51, 65, 85]));
      const lines = pdf.splitTextToSize(String(text || "Not specified"), bodyWidth);
      const lineHeight = options.lineHeight || 5;
      const maxLinesPerPage = Math.floor((pageHeight - 22 - 20) / lineHeight);
      for (let start = 0; start < lines.length; start += maxLinesPerPage) {
        const pageLines = lines.slice(start, start + maxLinesPerPage);
        ensureSpace(pageLines.length * lineHeight + (options.gap || 0));
        pdf.text(pageLines, left, y);
        y += pageLines.length * lineHeight;
        if (start + maxLinesPerPage < lines.length) {
          pdf.addPage();
          y = 20;
        }
      }
      y += options.gap || 0;
    };

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 48, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("TalentX", left, 19);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("PROJECT REQUIREMENTS", left, 27);
    pdf.setFontSize(15);
    pdf.setFont("helvetica", "bold");
    const titleLines = pdf.splitTextToSize(form.title || "Untitled project", bodyWidth);
    pdf.text(titleLines.slice(0, 2), left, 36);
    y = 56;

    const metaRows = [
      ["Category", `${form.category} / ${form.subcategory}`],
      ["Project type", form.projectType],
      ["Experience preference", form.experiencePreference],
      ["Complexity", form.complexity],
      ["Budget", form.budgetMin || form.budgetMax
        ? `${form.currency} ${form.budgetMin || "—"} – ${form.budgetMax || "—"}`
        : "To be discussed"],
      ["Payment preference", form.paymentPreference],
      ["Duration / deadline", [form.duration, form.deadline].filter(Boolean).join(" / ") || "To be discussed"],
    ];
    pdf.setFontSize(9);
    metaRows.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = left + col * (bodyWidth / 2);
      const rowY = y + row * 13;
      if (index % 2 === 0) ensureSpace(18);
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(x, rowY - 4, bodyWidth / 2 - 3, 11, 2, 2, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.text(label.toUpperCase(), x + 3, rowY);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "normal");
      pdf.text(pdf.splitTextToSize(String(value), bodyWidth / 2 - 8).slice(0, 1), x + 3, rowY + 4);
    });
    y += Math.ceil(metaRows.length / 2) * 15 + 5;

    const sections = [
      ["Project overview", requirements.overview],
      ["Problem statement", requirements.problemStatement],
      ["Objectives", requirements.objectives],
      ["Concept and expected outcome", [form.concept, form.expectedOutcome].filter(Boolean).join("\n\n")],
      ["Scope and detailed requirements", [form.scope, requirements.scopeOfWork].filter(Boolean).join("\n\n")],
      ["Tasks and milestones", requirements.tasksAndMilestones],
      ["Required and optional skills", [
        `Required: ${asText(requirements.requiredSkills)}`,
        `Optional: ${asText(requirements.optionalSkills)}`,
      ]],
      ["Tools and technologies", [form.tools, asText(requirements.recommendedTools)].filter(Boolean).join("\n")],
      ["Deliverables and acceptance criteria", [
        `Deliverables: ${form.deliverables || asText(requirements.deliverables)}`,
        `Acceptance: ${form.acceptanceCriteria || asText(requirements.testingAcceptanceCriteria)}`,
      ]],
      ["Functional requirements", requirements.functionalRequirements],
      ["Non-functional requirements", requirements.nonFunctionalRequirements],
      ["Testing and acceptance", requirements.testingAcceptanceCriteria],
      ["Timeline, budget and payment", [
        requirements.estimatedTimeline,
        form.duration && `Expected duration: ${form.duration}`,
        form.paymentPreference,
      ].filter(Boolean).join("\n")],
      ["Milestones and dependencies", requirements.dependencies],
      ["Assumptions", requirements.assumptions],
      ["Open questions", requirements.openQuestions],
      ["Reference links and files", [...referenceLinks, ...form.referenceFiles.map((file) => file.name)].join("\n")],
      ["Category-specific details", category.fields.map((field) => {
        const value = form.categoryDetails?.[field.key];
        return value ? `${field.label}: ${value}` : "";
      }).filter(Boolean).join("\n")],
      ["Additional instructions", form.instructions],
    ];
    sections.forEach(([heading, content]) => {
      const value = Array.isArray(content) ? content.filter(Boolean).map((item) => `• ${item}`).join("\n") : content;
      if (!value) return;
      ensureSpace(14);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(22, 101, 52);
      pdf.text(heading, left, y);
      y += 7;
      writeParagraph(value, { gap: 4 });
    });

    const reference = draftId || "Unsaved draft";
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(left, pageHeight - 14, right, pageHeight - 14);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated ${new Date().toLocaleDateString()}  •  Reference ${reference}`, left, pageHeight - 9);
      pdf.text(`Page ${page} of ${pageCount}`, right, pageHeight - 9, { align: "right" });
    }
      pdf.save(`${pdfSafeFilename(form.title)}-requirements.pdf`);
    } catch (pdfError) {
      console.error("Project requirements PDF export failed:", pdfError);
      setError("Unable to create the PDF. Please try again.");
    }
  };

  const copyRequirements = async () => {
    const text = [
      `TalentX — ${form.title}`,
      `Category: ${form.category} / ${form.subcategory}`,
      ...category.fields.flatMap((field) => form.categoryDetails?.[field.key] ? [`${field.label}\n${form.categoryDetails[field.key]}`] : []),
      ...requirementSections.map(([key, label]) => `${label}\n${asText(requirements?.[key])}`),
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setError("Unable to copy to clipboard. Please select and copy the requirements manually.");
    }
  };

  const publishProject = async () => {
    if (!requirements) {
      setError("Generate or write the project requirements before publishing.");
      return;
    }
    if (!form.title.trim() || form.concept.trim().length < 10) {
      setError("A project title and project concept of at least 10 characters are required to publish.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const draft = await saveDraft(false);
      const { data } = await api.post(`/jobs/drafts/${draft._id}/publish`);
      setNotice("Project published. Freelancers can now review the requirements and submit proposals.");
      navigate(`/jobs/${data.job._id}`, { replace: true });
    } catch (requestError) {
      if (!requestError.message) {
        setError(requestError.response?.data?.message || "Unable to publish the project. Please try again.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.some((file) => file.size > 1024 * 1024)) {
      setError("Each reference file must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (form.referenceFiles.length + files.length > 5) {
      setError("You can attach up to five reference files.");
      event.target.value = "";
      return;
    }
    try {
      const additions = await Promise.all(files.map(readFile));
      updateForm("referenceFiles", [...form.referenceFiles, ...additions]);
    } catch (fileError) {
      setError(fileError.message);
    }
    event.target.value = "";
  };

  const input = (key, label, options = {}) => (
    <div key={key} style={fieldStyle}>
      <label htmlFor={`project-${key}`} style={labelStyle}>{label}{options.required && " *"}</label>
      {options.select ? (
        <select id={`project-${key}`} className="tx-input" value={key.startsWith("categoryDetails.") ? form.categoryDetails?.[key.slice("categoryDetails.".length)] || "" : form[key]} onChange={(event) => updateForm(key, event.target.value)} required={options.required}>
          {options.select.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : options.textarea ? (
        <textarea id={`project-${key}`} className="tx-input" rows={options.rows || 3} value={key.startsWith("categoryDetails.") ? form.categoryDetails?.[key.slice("categoryDetails.".length)] || "" : form[key]} placeholder={options.placeholder || ""} maxLength={options.maxLength || 4000} onChange={(event) => updateForm(key, event.target.value)} required={options.required} />
      ) : (
        <input id={`project-${key}`} className="tx-input" type={options.type || "text"} value={key.startsWith("categoryDetails.") ? form.categoryDetails?.[key.slice("categoryDetails.".length)] || "" : form[key]} placeholder={options.placeholder || ""} maxLength={options.maxLength} min={options.min} onChange={(event) => updateForm(key, event.target.value)} required={options.required} />
      )}
      {options.help && <small style={{ color: "var(--tx-slate-500)" }}>{options.help}</small>}
    </div>
  );

  return (
    <div className="tx-dashboard-layout">
      <aside className="tx-dashboard-sidebar">
        <Link to="/" className="tx-sidebar-brand">
          <span className="tx-brand-icon"><span>T</span>X</span>
          <span style={{ fontWeight: 800, fontSize: "1.3rem" }}>Talent<span className="tx-brand-accent">X</span></span>
        </Link>
        <div className="tx-sidebar-role-badge">Client Workspace</div>
        <nav className="tx-sidebar-nav">
          <Link to="/client/dashboard" className="tx-sidebar-btn"><span>▦</span><span>Dashboard Overview</span></Link>
          <Link to="/client/project-requirements" className="tx-sidebar-btn active"><span>✨</span><span>AI Project Requirements</span></Link>
          <Link to="/freelancers" className="tx-sidebar-btn"><span>⌕</span><span>Find Freelancers</span></Link>
          <Link to="/profile" className="tx-sidebar-btn"><span>👤</span><span>Company Profile</span></Link>
        </nav>
        <div className="tx-sidebar-footer"><Link to="/client/dashboard" className="tx-btn tx-btn-subtle tx-btn-block">← Back to Dashboard</Link></div>
      </aside>

      <main className="tx-dashboard-main">
        <header className="tx-dashboard-topbar">
          <div className="tx-dashboard-breadcrumbs">Workspace / Client / <strong>AI Project Requirement Generator</strong></div>
          <div className="tx-dashboard-user-profile">
            <div className="tx-user-info-text" style={{ textAlign: "right" }}><strong>{user?.name || "Client Account"}</strong><span>Client Account</span></div>
            <div className="tx-avatar-badge">{user?.name?.[0]?.toUpperCase() || "C"}</div>
          </div>
        </header>
        <div className="tx-dashboard-body" style={{ maxWidth: 1500, width: "100%", margin: "0 auto" }}>
          <section className="tx-welcome-banner" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff", marginBottom: 24, gap: 16 }}>
            <div>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>✨ AI PROJECT ASSISTANT</span>
              <h1 style={{ color: "#fff", margin: "8px 0" }}>AI Project Requirement Generator</h1>
              <p style={{ color: "#cbd5e1", maxWidth: 760, margin: 0 }}>Describe a task, business problem, or deliverable. Create clear, editable requirements for projects of any size—without requiring a fixed budget or traditional work history.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="tx-btn tx-btn-outline" onClick={() => saveDraft().catch(() => {})} disabled={saving}>{saving ? "Saving…" : "Save Draft"}</button>
              <button type="button" className="tx-btn tx-btn-subtle" onClick={downloadPdf} disabled={!requirements}>Download Requirements as PDF</button>
            </div>
          </section>

          {error && <div className="tx-alert tx-alert-danger" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
          {notice && <div className="tx-alert" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
          {loadingDraft ? <p role="status">Loading your saved draft…</p> : (
            <div className="tx-project-requirements-grid">
              <section className="tx-project-requirements-panel">
                <h2>Project details</h2>
                <p className="tx-section-subtitle">Required fields are marked *. Other details can be added later or discussed with freelancers.</p>
                <form onSubmit={generateRequirements}>
                  {input("title", "Project title", { required: true, placeholder: "e.g. Clean and analyze monthly sales data", maxLength: 120 })}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                    {input("category", "Project category", { select: Object.keys(projectCategories) })}
                    {input("subcategory", "Subcategory", { select: category.subcategories })}
                  </div>
                  <div style={{ background: "var(--tx-slate-50)", borderRadius: 10, padding: 14, marginBottom: 18 }}>
                    <strong>Ideas for this category</strong>
                    <p style={{ margin: "6px 0" }}>{category.examples}</p>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>{category.suggestions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <fieldset style={{ border: "1px solid var(--tx-slate-200)", borderRadius: 10, padding: 16, margin: "0 0 18px" }}>
                    <legend style={{ fontWeight: 700, padding: "0 6px" }}>{form.category}-specific details</legend>
                    <p style={{ marginTop: 0, color: "var(--tx-slate-500)", fontSize: "0.88rem" }}>Add relevant context to help generate a more useful specification. These details are optional.</p>
                    {category.fields.map((field) => input(
                      `categoryDetails.${field.key}`,
                      field.label,
                      { textarea: true, rows: 2, placeholder: field.placeholder, maxLength: 1200 }
                    ))}
                  </fieldset>
                  {input("concept", "Project concept or business problem", { textarea: true, rows: 4, required: true, placeholder: "What do you need done, what problem should it solve, and what materials are available?", help: "At least 10 characters. A clear, small task is welcome." })}
                  {input("expectedOutcome", "Expected outcome", { textarea: true, placeholder: "What should be different or usable when the work is complete?" })}
                  {input("scope", "Detailed tasks and scope", { textarea: true, rows: 4, placeholder: "List known tasks, included work, and anything that is out of scope." })}
                  {input("skills", "Required technical skills", { textarea: true, placeholder: "Optional; e.g. Excel, SQL, data visualization" })}
                  {input("tools", "Preferred tools, technologies, or software", { textarea: true, placeholder: "Optional; e.g. Power BI, Python, Figma" })}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
                    {input("projectType", "Project type", { select: ["Small Task", "Mini Project", "Full Project", "Ongoing Assistance"] })}
                    {input("experiencePreference", "Experience preference", { select: ["Beginner-Friendly", "Student/Fresher", "Intermediate", "Experienced"] })}
                    {input("complexity", "Project complexity", { select: ["Basic", "Intermediate", "Advanced"] })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
                    {input("budgetMin", "Budget minimum (optional)", { type: "number", min: 0, placeholder: "Not set" })}
                    {input("budgetMax", "Budget maximum (optional)", { type: "number", min: 0, placeholder: "Not set" })}
                    {input("currency", "Currency", { select: ["USD", "INR", "EUR", "GBP", "CAD", "AUD"] })}
                  </div>
                  {input("paymentPreference", "Payment preference", { select: ["Fixed Project Price", "Milestone-Based", "Hourly", "Negotiable"] })}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                    {input("duration", "Expected duration", { placeholder: "e.g. 2 weeks; flexible" })}
                    {input("deadline", "Target deadline (optional)", { type: "date" })}
                  </div>
                  {input("deliverables", "Deliverables", { textarea: true, placeholder: "One per line; e.g. cleaned workbook, dashboard, source files" })}
                  {input("acceptanceCriteria", "Deliverables and acceptance criteria", { textarea: true, placeholder: "How will you review and accept the work?" })}
                  {input("referenceLinks", "Reference files, sample datasets, screenshots, or links", { textarea: true, placeholder: "Paste one HTTPS link per line. You can also attach up to five files (1 MB each)." })}
                  <div style={fieldStyle}>
                    <label htmlFor="project-reference-files" style={labelStyle}>Attach reference files (optional)</label>
                    <input id="project-reference-files" type="file" multiple onChange={handleFiles} accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.doc,.docx,.json" />
                    <small style={{ color: "var(--tx-slate-500)" }}>Up to five files, 1 MB each. Keep private or sensitive data out of uploaded samples.</small>
                    {form.referenceFiles.map((file, index) => <div key={`${file.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{file.name}</span><button type="button" className="tx-btn tx-btn-subtle tx-btn-sm" onClick={() => updateForm("referenceFiles", form.referenceFiles.filter((_, fileIndex) => fileIndex !== index))}>Remove</button></div>)}
                  </div>
                  {input("instructions", "Additional instructions", { textarea: true, placeholder: "Constraints, communication preferences, access notes, or other context." })}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button type="submit" className="tx-btn tx-btn-primary" disabled={generating}>{generating ? "Generating requirements…" : requirements ? "Regenerate Requirements" : "Generate Project Requirements"}</button>
                    <button type="button" className="tx-btn tx-btn-outline" onClick={() => saveDraft().catch(() => {})} disabled={saving}>{saving ? "Saving…" : "Save Draft"}</button>
                  </div>
                </form>
              </section>

              <section className="tx-project-requirements-panel">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div><h2 style={{ marginBottom: 4 }}>Review project requirements</h2><p className="tx-section-subtitle">Generated sections are editable. Assumptions are labeled and are not confirmed facts.</p></div>
                  {requirements && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="tx-btn tx-btn-outline tx-btn-sm" onClick={copyRequirements}>{copySuccess ? "Copied!" : "Copy"}</button>
                    <button type="button" className="tx-btn tx-btn-subtle tx-btn-sm" onClick={downloadPdf}>Download Requirements as PDF</button>
                  </div>}
                </div>
                {!requirements ? (
                  <div className="tx-project-requirements-empty"><span style={{ fontSize: "2rem" }}>📝</span><h3>Requirements preview</h3><p>Choose a category and describe your project idea to generate an editable project specification.</p></div>
                ) : (
                  <>
                    <div style={{ padding: "14px", background: "var(--tx-slate-50)", borderRadius: 10, margin: "14px 0" }}>
                      <strong>{form.title || "Untitled project"}</strong>
                      <p style={{ margin: "6px 0 0", color: "var(--tx-slate-600)" }}>{form.category} · {form.projectType} · {form.experiencePreference} · {form.paymentPreference}</p>
                    </div>
                    {requirementSections.map(([key, label]) => (
                      <div key={key} style={fieldStyle}>
                        <label htmlFor={`requirements-${key}`} style={labelStyle}>{label}</label>
                        <textarea id={`requirements-${key}`} className="tx-input" rows={Array.isArray(requirements[key]) ? Math.min(8, Math.max(3, requirements[key].length)) : 4} value={sectionText(requirements, key)} onChange={(event) => editRequirement(key, event.target.value)} />
                      </div>
                    ))}
                    {category === projectCategories["Cybersecurity & Cloud"] && (
                      <p role="note"><strong>Authorization boundary:</strong> Cybersecurity work must be limited to assets you own or are explicitly authorized to test. Keep written scope and exclusions in the project instructions.</p>
                    )}
                    {form.category === "Academic & Research Support" && (
                      <p role="note"><strong>Academic integrity:</strong> Use client-provided data and permitted support only. Do not request plagiarism, fabricated research, or impersonation.</p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, borderTop: "1px solid var(--tx-slate-200)", paddingTop: 16 }}>
                      <button type="button" className="tx-btn tx-btn-outline" onClick={() => saveDraft().catch(() => {})} disabled={saving}>{saving ? "Saving…" : "Save Draft"}</button>
                      <button type="button" className="tx-btn tx-btn-subtle" onClick={downloadPdf}>Download Requirements as PDF</button>
                      <button type="button" className="tx-btn tx-btn-primary" onClick={publishProject} disabled={publishing}>{publishing ? "Publishing…" : "Publish Project"}</button>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .tx-project-requirements-grid { display:grid; grid-template-columns:minmax(0, 0.95fr) minmax(0, 1.05fr); gap:20px; align-items:start; }
        .tx-project-requirements-panel { background:var(--tx-white); border:1px solid var(--tx-slate-200); border-radius:var(--tx-radius-xl); padding:24px; box-shadow:var(--tx-shadow-xs); min-width:0; }
        .tx-project-requirements-empty { min-height:300px; display:grid; place-content:center; justify-items:center; text-align:center; padding:24px; color:var(--tx-slate-500); }
        .tx-project-requirements-empty h3 { color:var(--tx-slate-800); margin:10px 0 4px; }
        @media (max-width: 900px) { .tx-project-requirements-grid { grid-template-columns:1fr; } }
        @media (max-width: 560px) { .tx-project-requirements-panel { padding:16px; } }
      `}</style>
    </div>
  );
}
