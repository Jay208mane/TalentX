
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: 5,
      maxlength: 120,
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: 20,
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
          skills.length >= 1 &&
          skills.length <= 20 &&
          skills.every(
            (skill) =>
              typeof skill === "string" &&
              skill.trim().length > 0 &&
              skill.trim().length <= 50
          ),
        message: "Provide between 1 and 20 valid skills",
      },
    },

    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      required: true,
      default: "fixed",
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [1, "Budget must be greater than zero"],
      max: 100000000,
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

module.exports = mongoose.model("Job", jobSchema);