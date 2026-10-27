
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },

    category: {
      type: String,
      required: [true, "Job category is required"],
      trim: true,
      maxlength: 80,
    },

    skills: {
      type: [String],
      required: true,
      validate: {
        validator: (skills) =>
          Array.isArray(skills) &&
          skills.length <= 20 &&
          skills.every(
            (skill) =>
              typeof skill === "string" &&
              skill.trim().length > 0 &&
              skill.trim().length <= 60
          ),
        message: "Provide up to 20 valid skills",
      },
    },

    budgetType: {
      type: String,
      enum: ["fixed", "hourly", "milestone", "negotiable"],
      required: true,
      default: "fixed",
    },

    budget: {
      type: Number,
      required: false,
      default: null,
      min: [0, "Budget cannot be negative"],
      max: 100000000,
    },

    budgetRange: {
      minimum: { type: Number, default: null, min: 0, max: 100000000 },
      maximum: { type: Number, default: null, min: 0, max: 100000000 },
      currency: { type: String, default: "USD", maxlength: 3 },
    },

    requirements: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    sourceDraft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectRequirementDraft",
    },

    deadline: {
      type: Date,
      default: null,
      validate: {
        validator: (value) =>
          value === null ||
          value === undefined ||
          value > new Date(),
        message: "Deadline must be in the future",
      },
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed"],
      default: "open",
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ sourceDraft: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Job", jobSchema);