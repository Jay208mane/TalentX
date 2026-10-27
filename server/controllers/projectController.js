const mongoose = require("mongoose");
const Project = require("../models/Project");
const Message = require("../models/Message");
const Payment = require("../models/Payment");
const PaymentPreference = require("../models/PaymentPreference");
const User = require("../models/User");
const { decryptPaymentDetails } = require("../services/paymentData");
const { notifyProject } = require("../services/realtime");
const { workspaceTypeForCategory } = require("../services/projectWorkspace");

const idString = (value) => {
  const id = value && typeof value === "object"
    ? value._id ?? value.id ?? value
    : value;
  return id == null ? "" : String(id);
};

const isMember = (project, userId) => {
  const currentUserId = idString(userId);
  return Boolean(
    currentUserId &&
    (idString(project?.client) === currentUserId ||
      idString(project?.freelancer) === currentUserId)
  );
};

const validSecureUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

const validDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const allowedFileExtensions = new Set([
  ".csv", ".xls", ".xlsx", ".pdf", ".zip", ".png", ".jpg", ".jpeg",
  ".txt", ".md", ".doc", ".docx", ".ipynb", ".sql", ".py",
]);
const maximumProjectFileBytes = 5 * 1024 * 1024;

const addActivity = (project, actor, type, message) => {
  project.activity.push({ actor, type, message });
};

const updateProgressFromWorkspace = (project) => {
  if (project.tasks.length) {
    const completed = project.tasks.filter((task) => task.status === "completed").length;
    project.completionPercentage = Math.round((completed / project.tasks.length) * 100);
    if (!["In Review", "Revision Required", "Completed", "Cancelled"].includes(project.status)) {
      project.status = completed ? "In Progress" : "Not Started";
    }
    return;
  }
  if (project.milestones.length) {
    project.completionPercentage = Math.round(
      project.milestones.reduce((sum, item) => sum + item.completionPercentage, 0) /
        project.milestones.length
    );
  }
};

const parseCsvPreview = (buffer) => {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let totalRows = 0;
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) {
        totalRows += 1;
        if (rows.length < 11) rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (row.length || cell) {
    row.push(cell);
    if (row.some((value) => value.trim())) {
      totalRows += 1;
      if (rows.length < 11) rows.push(row);
    }
  }

  const headers = (rows.shift() || []).slice(0, 100).map((value, index) => value.trim() || `Column ${index + 1}`);
  const sampleRows = rows.slice(0, 10).map((values) => headers.map((_, index) => values[index] || ""));
  const columns = headers.map((name, index) => {
    const values = sampleRows.map((values) => values[index]).filter(Boolean);
    const type = values.length && values.every((value) => Number.isFinite(Number(value)))
      ? "number"
      : values.length && values.every((value) => /^(true|false)$/i.test(value))
        ? "boolean"
        : "text";
    return { name, type };
  });
  return { columns, rows: sampleRows, rowCount: Math.max(0, totalRows - 1) };
};

const invalidId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.projectId)) {
    res.status(400).json({ message: "Invalid project ID." });
    return true;
  }
  return false;
};

exports.createTask = async (req, res) => {
  if (invalidId(req, res)) return;
  const { title, description = "", assignee = null, priority = "medium", dueDate = null, subtasks = [] } = req.body;
  if (
    typeof title !== "string" || title.trim().length < 2 || title.trim().length > 160 ||
    typeof description !== "string" || description.length > 3000 ||
    !["low", "medium", "high", "urgent"].includes(priority) ||
    (dueDate && !validDateOnly(dueDate)) ||
    !Array.isArray(subtasks) || subtasks.length > 20 ||
    !subtasks.every((item) => typeof item?.title === "string" && item.title.trim().length > 0 && item.title.length <= 200)
  ) {
    return res.status(400).json({ message: "Provide a valid task title, description, priority, due date, and checklist." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id)) return res.status(403).json({ message: "You are not a member of this project." });
    if (["Completed", "Cancelled"].includes(project.status)) {
      return res.status(409).json({ message: "Tasks cannot be changed for a closed project." });
    }
    if (assignee && ![idString(project.client), idString(project.freelancer)].includes(idString(assignee))) {
      return res.status(400).json({ message: "Tasks can only be assigned to project participants." });
    }
    project.tasks.push({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee || null,
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
      subtasks: subtasks.map((item) => ({ title: item.title.trim(), completed: Boolean(item.completed) })),
      createdBy: req.user._id,
    });
    updateProgressFromWorkspace(project);
    addActivity(project, req.user._id, "task_created", `Added task: ${title.trim()}`);
    await project.save();
    const task = project.tasks[project.tasks.length - 1];
    notifyProject(project, "project:updated", { projectId: project._id, taskId: task._id });
    return res.status(201).json({
      message: "Task created.",
      task,
      completionPercentage: project.completionPercentage,
      progressRule: "Completed tasks divided by total tasks; milestones are used when the project has no tasks.",
    });
  } catch (error) {
    console.error("Create project task failed:", error.message);
    return res.status(500).json({ message: "Unable to create this task." });
  }
};

exports.updateTask = async (req, res) => {
  if (invalidId(req, res)) return;
  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }
  const updates = req.body;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return res.status(400).json({ message: "Provide task updates." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id)) return res.status(403).json({ message: "You are not a member of this project." });
    if (["Completed", "Cancelled"].includes(project.status)) {
      return res.status(409).json({ message: "Tasks cannot be changed for a closed project." });
    }
    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    const allowedKeys = ["title", "description", "assignee", "priority", "status", "dueDate", "subtasks"];
    if (Object.keys(updates).some((key) => !allowedKeys.includes(key))) {
      return res.status(400).json({ message: "One or more task fields cannot be updated." });
    }
    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || updates.title.trim().length < 2 || updates.title.length > 160) {
        return res.status(400).json({ message: "Task title must contain between 2 and 160 characters." });
      }
      task.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      if (typeof updates.description !== "string" || updates.description.length > 3000) {
        return res.status(400).json({ message: "Task description cannot exceed 3000 characters." });
      }
      task.description = updates.description.trim();
    }
    if (updates.assignee !== undefined) {
      if (updates.assignee && ![idString(project.client), idString(project.freelancer)].includes(idString(updates.assignee))) {
        return res.status(400).json({ message: "Tasks can only be assigned to project participants." });
      }
      task.assignee = updates.assignee || null;
    }
    if (updates.priority !== undefined) {
      if (!["low", "medium", "high", "urgent"].includes(updates.priority)) {
        return res.status(400).json({ message: "Choose a supported task priority." });
      }
      task.priority = updates.priority;
    }
    if (updates.status !== undefined) {
      if (!["todo", "in_progress", "in_review", "completed"].includes(updates.status)) {
        return res.status(400).json({ message: "Choose a supported task status." });
      }
      task.status = updates.status;
    }
    if (updates.dueDate !== undefined) {
      if (updates.dueDate && !validDateOnly(updates.dueDate)) {
        return res.status(400).json({ message: "Task due date must use YYYY-MM-DD." });
      }
      task.dueDate = updates.dueDate ? new Date(`${updates.dueDate}T00:00:00.000Z`) : null;
    }
    if (updates.subtasks !== undefined) {
      if (!Array.isArray(updates.subtasks) || updates.subtasks.length > 20 ||
        !updates.subtasks.every((item) => typeof item?.title === "string" && item.title.trim().length > 0 && item.title.length <= 200)) {
        return res.status(400).json({ message: "A task checklist can contain up to 20 valid items." });
      }
      task.subtasks = updates.subtasks.map((item) => ({ title: item.title.trim(), completed: Boolean(item.completed) }));
    }
    updateProgressFromWorkspace(project);
    addActivity(project, req.user._id, "task_updated", `Updated task: ${task.title}`);
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, taskId: task._id });
    return res.status(200).json({
      message: "Task updated.",
      task,
      completionPercentage: project.completionPercentage,
      progressRule: "Completed tasks divided by total tasks; milestones are used when the project has no tasks.",
    });
  } catch (error) {
    console.error("Update project task failed:", error.message);
    return res.status(500).json({ message: "Unable to update this task." });
  }
};

exports.uploadProjectFile = async (req, res) => {
  if (invalidId(req, res)) return;
  const { name, mimeType, purpose = "deliverable", description = "", data } = req.body;
  const matches = typeof data === "string" && data.match(/^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z\d+/]+={0,2})$/);
  const extension = typeof name === "string" ? require("path").extname(name).toLowerCase() : "";
  if (
    typeof name !== "string" || !name.trim() || name.length > 180 ||
    typeof mimeType !== "string" || mimeType.length > 120 ||
    !allowedFileExtensions.has(extension) ||
    !["dataset", "reference", "deliverable"].includes(purpose) ||
    typeof description !== "string" || description.length > 2000 ||
    !matches || matches[1] !== mimeType
  ) {
    return res.status(400).json({ message: "Provide a supported file, purpose, description, and valid base64 content." });
  }
  const fileBuffer = Buffer.from(matches[2], "base64");
  if (!fileBuffer.length || fileBuffer.length > maximumProjectFileBytes) {
    return res.status(400).json({ message: "Project files must be no larger than 5 MB." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id)) return res.status(403).json({ message: "You are not a member of this project." });
    if ((purpose === "deliverable" && req.user.role !== "freelancer") ||
        (purpose !== "deliverable" && req.user.role !== "client")) {
      return res.status(403).json({
        message: purpose === "deliverable"
          ? "Only the assigned freelancer can submit project deliverables."
          : "Only the project client can add reference files and datasets.",
      });
    }
    const priorVersions = project.files.filter((file) =>
      file.name.toLowerCase() === name.trim().toLowerCase() && file.purpose === purpose
    );
    const file = project.files.create({
      name: name.trim(),
      mimeType,
      purpose,
      description: description.trim(),
      version: priorVersions.length + 1,
      data: fileBuffer,
      uploadedBy: req.user._id,
    });
    project.files.push(file);
    addActivity(project, req.user._id, "file_uploaded", `Uploaded ${purpose}: ${name.trim()} (v${file.version}).`);
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, fileId: file._id });
    return res.status(201).json({
      message: "Project file uploaded.",
      file: {
        _id: file._id,
        name: file.name,
        mimeType: file.mimeType,
        purpose: file.purpose,
        description: file.description,
        version: file.version,
        size: fileBuffer.length,
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
        reviewStatus: file.reviewStatus,
      },
    });
  } catch (error) {
    console.error("Upload project file failed:", error.message);
    return res.status(500).json({ message: "Unable to upload this project file." });
  }
};

exports.downloadProjectFile = async (req, res) => {
  if (invalidId(req, res)) return;
  if (!mongoose.isValidObjectId(req.params.fileId)) {
    return res.status(400).json({ message: "Invalid project file ID." });
  }
  try {
    const project = await Project.findById(req.params.projectId).select("+files.data");
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not a member of this project." });
    }
    const file = project.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: "Project file not found." });
    if (req.query.preview === "true" && require("path").extname(file.name).toLowerCase() === ".csv") {
      return res.status(200).json(parseCsvPreview(file.data));
    }
    res.type(file.mimeType);
    res.attachment(file.name);
    return res.status(200).send(file.data);
  } catch (error) {
    console.error("Download project file failed:", error.message);
    return res.status(500).json({ message: "Unable to download this project file." });
  }
};

exports.reviewProjectFile = async (req, res) => {
  if (invalidId(req, res)) return;
  if (!mongoose.isValidObjectId(req.params.fileId)) {
    return res.status(400).json({ message: "Invalid project file ID." });
  }
  const { action, feedback } = req.body;
  if (!["approve", "revision"].includes(action) ||
      typeof feedback !== "string" || feedback.length > 2000 ||
      (action === "revision" && feedback.trim().length < 3)) {
    return res.status(400).json({ message: "Choose approval or a revision request with a feedback comment." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!idString(project.client) || idString(project.client) !== idString(req.user._id)) {
      return res.status(403).json({ message: "Only the project client can review deliverables." });
    }
    const file = project.files.id(req.params.fileId);
    if (!file || file.purpose !== "deliverable") return res.status(404).json({ message: "Deliverable not found." });
    file.reviewStatus = action === "approve" ? "approved" : "revision_requested";
    file.feedback = feedback.trim();
    file.reviewedBy = req.user._id;
    file.reviewedAt = new Date();
    addActivity(project, req.user._id, action === "approve" ? "deliverable_approved" : "revision_requested",
      action === "approve" ? `Approved deliverable: ${file.name} (v${file.version}).` : `Requested revisions for ${file.name} (v${file.version}): ${feedback.trim()}`);
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, fileId: file._id });
    return res.status(200).json({ message: action === "approve" ? "Deliverable approved." : "Revision requested.", file });
  } catch (error) {
    console.error("Review project deliverable failed:", error.message);
    return res.status(500).json({ message: "Unable to review this deliverable." });
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const filter = req.user.role === "client"
      ? { client: req.user._id }
      : { freelancer: req.user._id };
    const projects = await Project.find(filter)
      .populate("client freelancer", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const projectsWithWorkspace = projects.map((project) => ({
      ...project,
      workspaceType: project.workspaceType || workspaceTypeForCategory(project.category),
    }));
    return res.status(200).json({ count: projectsWithWorkspace.length, projects: projectsWithWorkspace });
  } catch (error) {
    console.error("Fetch projects failed:", error.message);
    return res.status(500).json({ message: "Unable to load your projects." });
  }
};

exports.cancelProject = async (req, res) => {
  if (invalidId(req, res)) return;
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this project." });
    }
    if (project.status === "Completed" || project.status === "Cancelled") {
      return res.status(409).json({ message: "This project is already closed." });
    }
    const payment = await Payment.findOne({ project: project._id });
    if (payment && !["awaiting_payment", "cancelled"].includes(payment.status)) {
      return res.status(409).json({ message: "Resolve the existing payment before cancelling this project." });
    }

    project.status = "Cancelled";
    addActivity(project, req.user._id, "project_cancelled", "Project cancelled by a project member.");
    if (payment?.status === "awaiting_payment") {
      payment.status = "cancelled";
      payment.history.push({
        actor: req.user._id,
        status: "cancelled",
        note: "Project cancelled before payment was recorded.",
      });
      await payment.save();
    }
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, status: project.status });
    if (payment) notifyProject(project, "payment:updated", { projectId: project._id, status: payment.status });
    return res.status(200).json({ message: "Project cancelled.", project, payment });
  } catch (error) {
    console.error("Cancel project failed:", error.message);
    return res.status(500).json({ message: "Unable to cancel the project." });
  }
};

exports.getProject = async (req, res) => {
  if (invalidId(req, res)) return;
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("client freelancer", "name")
      .populate("activity.actor", "name")
      .populate("progressUpdates.actor", "name")
      .populate("milestones.createdBy", "name")
      .lean();

    if (!project) return res.status(404).json({ message: "Project not found." });
    project.workspaceType = project.workspaceType || workspaceTypeForCategory(project.category);
    if (!isMember(project, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not a member of this project." });
    }

    const payment = project.approvalStatus === "approved"
      ? await Payment.findOne({ project: project._id })
      .select("amount currency method status transactionReference recordedAt verifiedAt history createdAt updatedAt")
      .lean()
      : null;
    return res.status(200).json({ project, payment });
  } catch (error) {
    console.error("Fetch project failed:", error.message);
    return res.status(500).json({ message: "Unable to load the project." });
  }
};

exports.postProgressUpdate = async (req, res) => {
  if (invalidId(req, res)) return;
  const { completed, workingOn = "", remaining = "", completionPercentage, deliverableLinks = [] } = req.body;
  if (
    typeof completed !== "string" || completed.trim().length < 3 ||
    completed.trim().length > 2000 ||
    typeof workingOn !== "string" || workingOn.length > 2000 ||
    typeof remaining !== "string" || remaining.length > 2000 ||
    !Number.isInteger(Number(completionPercentage)) ||
    Number(completionPercentage) < 0 || Number(completionPercentage) > 100 ||
    !Array.isArray(deliverableLinks) || deliverableLinks.length > 5 ||
    !deliverableLinks.every((url) => typeof url === "string" && validSecureUrl(url))
  ) {
    return res.status(400).json({ message: "Provide a valid progress report, percentage, and up to five HTTPS links." });
  }

  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can update project progress." });
    }
    if (!["Not Started", "In Progress", "Revision Required"].includes(project.status)) {
      return res.status(409).json({ message: "Progress cannot be changed in the current project status." });
    }

    const percentage = Number(completionPercentage);
    project.progressUpdates.push({
      actor: req.user._id,
      completed: completed.trim(),
      workingOn: workingOn.trim(),
      remaining: remaining.trim(),
      completionPercentage: percentage,
      deliverableLinks,
    });
    if (project.tasks.length) updateProgressFromWorkspace(project);
    else project.completionPercentage = percentage;
    project.status = "In Progress";
    addActivity(project, req.user._id, "progress", `Project progress updated to ${percentage}%.`);
    await project.save();

    const update = project.progressUpdates[project.progressUpdates.length - 1];
    notifyProject(project, "project:progress", {
      projectId: project._id,
      update: { ...update.toObject(), actor: { _id: req.user._id, name: req.user.name } },
    });
    return res.status(201).json({ message: "Progress report saved.", project });
  } catch (error) {
    console.error("Save project progress failed:", error.message);
    return res.status(500).json({ message: "Unable to save project progress." });
  }
};

exports.addMilestone = async (req, res) => {
  if (invalidId(req, res)) return;
  const { title, description = "", dueDate = null } = req.body;
  if (
    typeof title !== "string" || title.trim().length < 2 || title.trim().length > 120 ||
    typeof description !== "string" || description.length > 1000 ||
    (dueDate && !validDateOnly(dueDate))
  ) {
    return res.status(400).json({ message: "Provide a valid milestone title, description, and due date." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can add milestones." });
    }
    if (["Completed", "Cancelled"].includes(project.status)) {
      return res.status(409).json({ message: "Milestones cannot be changed for a closed project." });
    }

    project.milestones.push({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
      createdBy: req.user._id,
    });
    addActivity(project, req.user._id, "milestone", `Added milestone: ${title.trim()}`);
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id });
    return res.status(201).json({ message: "Milestone added.", project });
  } catch (error) {
    console.error("Add project milestone failed:", error.message);
    return res.status(500).json({ message: "Unable to add the milestone." });
  }
};

exports.updateMilestone = async (req, res) => {
  if (invalidId(req, res)) return;
  if (!mongoose.isValidObjectId(req.params.milestoneId)) {
    return res.status(400).json({ message: "Invalid milestone ID." });
  }
  const { status, completionPercentage } = req.body;
  if (
    !["not_started", "in_progress", "completed"].includes(status) ||
    !Number.isInteger(Number(completionPercentage)) ||
    Number(completionPercentage) < 0 || Number(completionPercentage) > 100 ||
    (status === "completed" && Number(completionPercentage) !== 100)
  ) {
    return res.status(400).json({ message: "Provide a valid milestone status and completion percentage." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can update milestones." });
    }
    if (["Completed", "Cancelled", "In Review"].includes(project.status)) {
      return res.status(409).json({ message: "Milestones cannot be changed in the current project status." });
    }
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });

    milestone.status = status;
    milestone.completionPercentage = Number(completionPercentage);
    updateProgressFromWorkspace(project);
    project.status = project.completionPercentage > 0 ? "In Progress" : "Not Started";
    addActivity(project, req.user._id, "milestone", `Updated milestone: ${milestone.title}`);
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id });
    return res.status(200).json({ message: "Milestone updated.", project });
  } catch (error) {
    console.error("Update project milestone failed:", error.message);
    return res.status(500).json({ message: "Unable to update the milestone." });
  }
};

exports.submitFinalWork = async (req, res) => {
  if (invalidId(req, res)) return;
  const { message, deliverableUrl } = req.body;
  if (
    typeof message !== "string" || message.trim().length < 10 || message.trim().length > 3000 ||
    typeof deliverableUrl !== "string" || !validSecureUrl(deliverableUrl)
  ) {
    return res.status(400).json({ message: "Provide a completion message and a valid HTTPS deliverable link." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can submit final work." });
    }
    if (["Completed", "Cancelled"].includes(project.status)) {
      return res.status(409).json({ message: "This project no longer accepts final submissions." });
    }
    if (project.status === "In Review" && project.approvalStatus !== "revision_requested") {
      return res.status(409).json({ message: "The current submission is already awaiting client review." });
    }

    project.finalSubmission = {
      message: message.trim(),
      deliverableUrl,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewComment: "",
    };
    project.status = "In Review";
    project.approvalStatus = "pending";
    addActivity(project, req.user._id, "final_submission", "Final work submitted for client review.");
    await project.save();
    notifyProject(project, "project:final-submission", {
      projectId: project._id,
      message: "Final work is ready for review.",
    });
    return res.status(200).json({ message: "Final work submitted for review.", project });
  } catch (error) {
    console.error("Final work submission failed:", error.message);
    return res.status(500).json({ message: "Unable to submit final work." });
  }
};

exports.reviewFinalWork = async (req, res) => {
  if (invalidId(req, res)) return;
  const { action, comment = "" } = req.body;
  if (
    !["approve", "revision"].includes(action) ||
    typeof comment !== "string" || comment.length > 2000 ||
    (action === "revision" && comment.trim().length < 3)
  ) {
    return res.status(400).json({ message: "Choose approve or revision; revision requests require a comment." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project owner can review final work." });
    }
    if (project.status !== "In Review" || project.approvalStatus !== "pending") {
      return res.status(409).json({ message: "There is no final submission awaiting review." });
    }

    let preference = null;
    if (action === "revision") {
      project.status = "Revision Required";
      project.approvalStatus = "revision_requested";
      addActivity(project, req.user._id, "revision_requested", `Revision requested: ${comment.trim()}`);
    } else {
      preference = await PaymentPreference.findOne({ user: project.freelancer })
        .select("method");
      if (!preference) {
        return res.status(409).json({
          message: "The freelancer must save a payment method before final work can be approved.",
        });
      }
      project.approvalStatus = "approved";
      addActivity(project, req.user._id, "work_approved", "Final work approved; payment is now due.");
    }
    project.finalSubmission.reviewedAt = new Date();
    project.finalSubmission.reviewComment = comment.trim();

    let payment = null;
    if (action === "approve") {
      try {
        payment = await Payment.findOneAndUpdate(
          { project: project._id },
          {
            $setOnInsert: {
              project: project._id,
              proposal: project.proposal,
              client: project.client,
              freelancer: project.freelancer,
              amount: project.agreedAmount,
              currency: project.currency,
              method: preference.method,
              status: "awaiting_payment",
              history: [{ actor: req.user._id, status: "awaiting_payment", note: "Client approved final work." }],
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        ).select("amount currency method status transactionReference recordedAt verifiedAt history createdAt updatedAt");
      } catch (error) {
        if (error.code !== 11000) throw error;
        payment = await Payment.findOne({ project: project._id })
          .select("amount currency method status transactionReference recordedAt verifiedAt history createdAt updatedAt");
        if (!payment) throw error;
      }
      if (payment.status !== "awaiting_payment") {
        return res.status(409).json({ message: "The project payment is no longer awaiting payment." });
      }
    }
    await project.save();

    notifyProject(project, action === "approve" ? "project:approved" : "project:revision", {
      projectId: project._id,
      message: action === "approve" ? "Final work approved. Payment is awaiting." : comment.trim(),
    });
    return res.status(200).json({
      message: action === "approve" ? "Work approved. Payment is awaiting." : "Revision request sent.",
      project,
      payment,
    });
  } catch (error) {
    console.error("Review final work failed:", error.message);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to review final work.",
    });
  }
};

exports.getChatHistory = async (req, res) => {
  if (invalidId(req, res)) return;
  try {
    const project = await Project.findById(req.params.projectId).select("client freelancer");
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!isMember(project, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not a member of this project." });
    }
    const messages = await Message.find({ project: project._id })
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    messages.reverse();
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Fetch project chat failed:", error.message);
    return res.status(500).json({ message: "Unable to load project messages." });
  }
};

exports.isProjectMember = isMember;
exports.idString = idString;

exports.getPaymentInstructions = async (req, res) => {
  if (invalidId(req, res)) return;
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project client can view payment instructions." });
    }
    if (project.approvalStatus !== "approved") {
      return res.status(409).json({ message: "Payment instructions are available after work is approved." });
    }
    const payment = await Payment.findOne({ project: project._id }).select("status method");
    if (!payment || payment.status !== "awaiting_payment") {
      return res.status(409).json({ message: "Payment instructions are only available while payment is due." });
    }
    const preference = await PaymentPreference.findOne({ user: project.freelancer })
      .select("+encryptedDetails +iv +authTag");
    if (!preference) return res.status(404).json({ message: "No freelancer payment method is configured." });
    if (preference.method !== payment.method) {
      return res.status(409).json({ message: "The freelancer payment method no longer matches this payment record." });
    }
    return res.status(200).json({
      method: preference.method,
      displayLabel: preference.displayLabel,
      details: decryptPaymentDetails(preference),
    });
  } catch (error) {
    console.error("Fetch payment instructions failed:", error.message);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to load payment instructions.",
    });
  }
};

exports.recordManualPayment = async (req, res) => {
  if (invalidId(req, res)) return;
  const transactionReference = typeof req.body.transactionReference === "string"
    ? req.body.transactionReference.trim()
    : "";
  if (transactionReference.length > 120) {
    return res.status(400).json({ message: "Transaction reference cannot exceed 120 characters." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project client can record a payment." });
    }
    if (project.approvalStatus !== "approved") {
      return res.status(409).json({ message: "Client approval is required before payment." });
    }
    const payment = await Payment.findOneAndUpdate(
      { project: project._id, status: "awaiting_payment" },
      {
        $set: {
          status: "pending_verification",
          transactionReference,
          recordedAt: new Date(),
        },
        $push: {
          history: {
            actor: req.user._id,
            status: "pending_verification",
            note: "Client reported manual payment; awaiting freelancer verification.",
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!payment) {
      const existingPayment = await Payment.findOne({ project: project._id }).select("_id");
      if (!existingPayment) return res.status(404).json({ message: "Payment record not found." });
      return res.status(409).json({ message: "This payment has already been recorded or resolved." });
    }
    addActivity(project, req.user._id, "payment_recorded", "Client recorded a manual payment; awaiting freelancer verification.");
    await project.save();
    notifyProject(project, "payment:updated", { projectId: project._id, status: payment.status });
    return res.status(200).json({
      message: "Payment recorded and is pending freelancer verification.",
      payment,
    });
  } catch (error) {
    console.error("Record manual payment failed:", error.message);
    return res.status(500).json({ message: "Unable to record the payment." });
  }
};

exports.verifyManualPayment = async (req, res) => {
  if (invalidId(req, res)) return;
  const { received } = req.body;
  if (received !== true) {
    return res.status(400).json({ message: "Confirm receipt to verify this payment." });
  }
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can verify receipt." });
    }
    const payment = await Payment.findOneAndUpdate(
      { project: project._id, status: "pending_verification" },
      {
        $set: {
          status: "paid",
          verifiedAt: new Date(),
          verifiedBy: req.user._id,
        },
        $push: {
          history: {
            actor: req.user._id,
            status: "paid",
            note: "Freelancer verified receipt of manual payment.",
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!payment) {
      const existingPayment = await Payment.findOne({ project: project._id }).select("_id");
      if (!existingPayment) return res.status(404).json({ message: "Payment record not found." });
      return res.status(409).json({ message: "There is no payment awaiting verification." });
    }
    project.status = "Completed";
    project.completionPercentage = 100;
    addActivity(project, req.user._id, "payment_verified", "Freelancer verified payment receipt; project completed.");
    await project.save();
    notifyProject(project, "payment:updated", { projectId: project._id, status: payment.status });
    return res.status(200).json({ message: "Payment verified and project completed.", payment, project });
  } catch (error) {
    console.error("Verify manual payment failed:", error.message);
    return res.status(500).json({ message: "Unable to verify the payment." });
  }
};

/**
 * Direct Client Project Creation: "I want to make something"
 * Zero pre-money or charges; payment demanded only upon completion.
 */
exports.createProject = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can post projects." });
    }

    const {
      title,
      description,
      category = "Development",
      requiredSkills = [],
      agreedAmount,
      expectedDeadline = null,
      freelancerId = null,
      initialMilestones = [],
      subcategory = "",
      projectType = "",
    } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 5 || title.trim().length > 120) {
      return res.status(400).json({ message: "Project title must be between 5 and 120 characters." });
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return res.status(400).json({ message: "Describe what you want to build (minimum 10 characters)." });
    }

    let amount = 0;
    if (agreedAmount !== undefined && agreedAmount !== null && agreedAmount !== "") {
      const parsed = Number(agreedAmount);
      if (Number.isFinite(parsed) && parsed >= 0) {
        amount = parsed;
      }
    }

    const skills = Array.isArray(requiredSkills)
      ? requiredSkills.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : [];

    let assignedFreelancer = null;
    let initialStatus = "Open";

    if (freelancerId) {
      if (!mongoose.isValidObjectId(freelancerId)) {
        return res.status(400).json({ message: "Invalid freelancer ID." });
      }
      const freelancer = await User.findById(freelancerId).select("name role status");
      if (!freelancer || freelancer.role !== "freelancer") {
        return res.status(400).json({ message: "Selected user is not an active freelancer." });
      }
      assignedFreelancer = freelancer._id;
      initialStatus = "Not Started";
    }

    const milestones = Array.isArray(initialMilestones)
      ? initialMilestones
          .filter((m) => m && typeof m.title === "string" && m.title.trim().length >= 2)
          .map((m) => ({
            title: m.title.trim(),
            description: typeof m.description === "string" ? m.description.trim() : "",
            dueDate: m.dueDate && validDateOnly(m.dueDate) ? new Date(`${m.dueDate}T00:00:00.000Z`) : null,
            status: "not_started",
            completionPercentage: 0,
            createdBy: req.user._id,
          }))
      : [];

    const project = new Project({
      client: req.user._id,
      freelancer: assignedFreelancer,
      title: title.trim(),
      description: description.trim(),
      category: typeof category === "string" ? category.trim() : "Development",
      subcategory: typeof subcategory === "string" ? subcategory.trim().slice(0, 100) : "",
      projectType: typeof projectType === "string" ? projectType.trim().slice(0, 40) : "",
      workspaceType: workspaceTypeForCategory(typeof category === "string" ? category.trim() : "Development"),
      requiredSkills: skills,
      agreedAmount: amount,
      currency: "USD",
      upfrontFee: 0,
      status: initialStatus,
      expectedDeadline: expectedDeadline && typeof expectedDeadline === "string" ? new Date(expectedDeadline) : null,
      milestones,
      activity: [
        {
          actor: req.user._id,
          type: "project_created",
          message: assignedFreelancer
            ? "Client created project directly assigned to freelancer. Zero upfront charges • Payment will be demanded after completion."
            : `Client posted open project: "${title.trim()}". Zero upfront charges • Payment will be demanded after completion.`,
        },
      ],
    });

    await project.save();

    if (assignedFreelancer) {
      notifyProject(project, "project:assigned", {
        projectId: project._id,
        title: project.title,
        message: "You have been assigned to a new project! Work begins with zero upfront fees.",
      });
    }

    return res.status(201).json({
      message: "Project posted successfully. Zero upfront charges apply.",
      project,
    });
  } catch (error) {
    console.error("Create project failed:", error.message);
    return res.status(500).json({ message: "Unable to post project. Please try again." });
  }
};

/**
 * Public/Freelancer directory of open client-posted projects
 */
exports.getOpenProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: "Open", freelancer: null })
      .populate("client", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ count: projects.length, projects });
  } catch (error) {
    console.error("Fetch open projects failed:", error.message);
    return res.status(500).json({ message: "Unable to load open projects." });
  }
};

/**
 * Freelancer claims/takes on an open project posted by a client
 */
exports.claimProject = async (req, res) => {
  if (invalidId(req, res)) return;
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can accept projects." });
    }
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.status !== "Open" || project.freelancer) {
      return res.status(409).json({ message: "This project is no longer open for assignment." });
    }

    project.freelancer = req.user._id;
    project.status = "In Progress";
    addActivity(
      project,
      req.user._id,
      "project_claimed",
      `${req.user.name} took on the project. Work has begun with zero upfront charges.`
    );
    await project.save();

    notifyProject(project, "project:updated", {
      projectId: project._id,
      status: project.status,
      message: `${req.user.name} accepted your project!`,
    });

    return res.status(200).json({
      message: "You have accepted the project. Work has started with zero upfront charges.",
      project,
    });
  } catch (error) {
    console.error("Claim project failed:", error.message);
    return res.status(500).json({ message: "Unable to accept project." });
  }
};

/**
 * Freelancer completes project and formally demands payment
 */
exports.demandPayment = async (req, res) => {
  if (invalidId(req, res)) return;
  const { amount, deliverableUrl, message } = req.body;
  if (
    typeof message !== "string" || message.trim().length < 5 || message.trim().length > 3000 ||
    typeof deliverableUrl !== "string" || !validSecureUrl(deliverableUrl)
  ) {
    return res.status(400).json({ message: "Provide a completion summary and a valid HTTPS deliverable link." });
  }

  const demandAmount = Number(amount);
  if (!Number.isFinite(demandAmount) || demandAmount <= 0) {
    return res.status(400).json({ message: "Demanded payment amount must be greater than zero." });
  }

  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (!project.freelancer || project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned freelancer can demand payment upon completion." });
    }
    if (["Completed", "Cancelled"].includes(project.status)) {
      return res.status(409).json({ message: "This project is already closed." });
    }

    project.completionPercentage = 100;
    project.status = "In Review";
    project.approvalStatus = "pending";
    project.finalSubmission = {
      message: message.trim(),
      deliverableUrl,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewComment: "",
    };
    project.demandPayment = {
      demanded: true,
      amount: demandAmount,
      currency: project.currency,
      demandedAt: new Date(),
      notes: message.trim(),
      deliverableUrl,
    };
    project.agreedAmount = demandAmount;

    addActivity(
      project,
      req.user._id,
      "payment_demanded",
      `Freelancer completed project and demanded payment of $${demandAmount.toLocaleString()} ${project.currency}.`
    );
    await project.save();

    notifyProject(project, "project:final-submission", {
      projectId: project._id,
      message: `Final work completed. Freelancer demanded payment of $${demandAmount}.`,
    });

    return res.status(200).json({
      message: "Final work submitted and payment demanded. Client will review and approve payment.",
      project,
    });
  } catch (error) {
    console.error("Demand payment failed:", error.message);
    return res.status(500).json({ message: "Unable to submit payment demand." });
  }
};
