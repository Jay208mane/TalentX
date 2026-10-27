const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, maxlength: 50 },
    message: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const progressUpdateSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completed: { type: String, required: true, trim: true, maxlength: 2000 },
    workingOn: { type: String, trim: true, maxlength: 2000, default: "" },
    remaining: { type: String, trim: true, maxlength: 2000, default: "" },
    completionPercentage: { type: Number, min: 0, max: 100, required: true },
    deliverableLinks: [{ type: String, maxlength: 2048 }],
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 3000, default: "" },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "in_review", "completed"], default: "todo" },
    dueDate: { type: Date, default: null },
    subtasks: [{
      title: { type: String, required: true, trim: true, maxlength: 200 },
      completed: { type: Boolean, default: false },
    }],
    codeReferences: [{
      kind: { type: String, enum: ["commit", "pull_request"], required: true },
      reference: { type: String, required: true, maxlength: 64 },
      title: { type: String, trim: true, maxlength: 300, default: "" },
      url: { type: String, required: true, maxlength: 2048 },
      linkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const deliverableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    mimeType: { type: String, required: true, maxlength: 120 },
    purpose: { type: String, enum: ["dataset", "reference", "deliverable"], default: "deliverable" },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    version: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewStatus: { type: String, enum: ["pending", "approved", "revision_requested"], default: "pending" },
    feedback: { type: String, trim: true, maxlength: 2000, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: false,
      default: null,
      index: { unique: true, sparse: true },
    },
    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
      required: false,
      default: null,
      index: { unique: true, sparse: true },
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 10000 },
    category: { type: String, trim: true, maxlength: 80, default: "Development" },
    subcategory: { type: String, trim: true, maxlength: 100, default: "" },
    projectType: { type: String, trim: true, maxlength: 40, default: "" },
    workspaceType: {
      type: String,
      enum: [
        "web_development", "data_analytics", "ai_development", "cybersecurity",
        "design", "content_writing", "marketing", "research", "general_task",
      ],
    },
    requiredSkills: [{ type: String, trim: true, maxlength: 60 }],
    requirements: { type: mongoose.Schema.Types.Mixed, default: null },
    tasks: { type: [taskSchema], default: [] },
    files: { type: [deliverableSchema], default: [] },
    previewUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    previewStatus: { type: String, enum: ["not_submitted", "submitted"], default: "not_submitted" },
    previewSubmittedAt: { type: Date, default: null },
    agreedAmount: { type: Number, required: false, min: 0, default: 0 },
    currency: { type: String, default: "USD", enum: ["USD"] },
    upfrontFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "Open",
        "Not Started",
        "In Progress",
        "In Review",
        "Revision Required",
        "Completed",
        "Cancelled",
      ],
      default: "Not Started",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["not_submitted", "pending", "revision_requested", "approved"],
      default: "not_submitted",
    },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    startedAt: { type: Date, default: Date.now },
    expectedDeadline: { type: Date, default: null },
    milestones: [milestoneSchema],
    progressUpdates: [progressUpdateSchema],
    finalSubmission: {
      message: { type: String, maxlength: 3000, default: "" },
      deliverableUrl: { type: String, maxlength: 2048, default: "" },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewComment: { type: String, maxlength: 2000, default: "" },
    },
    demandPayment: {
      demanded: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      demandedAt: { type: Date, default: null },
      notes: { type: String, maxlength: 2000, default: "" },
      deliverableUrl: { type: String, maxlength: 2048, default: "" },
    },
    activity: [activitySchema],
  },
  { timestamps: true }
);

projectSchema.index({ client: 1, status: 1, updatedAt: -1 });
projectSchema.index({ freelancer: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
