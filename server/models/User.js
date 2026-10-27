
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    passwordResetTokenHash: {
      type: String,
      select: false,
    },

    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },

    role: {
      type: String,
      enum: ["freelancer", "client", "admin"],
      required: true,
      default: "freelancer",
      immutable: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },

    hourlyRate: {
      type: Number,
      min: 0,
      max: 1000,
      default: 35,
    },

    skills: {
      type: [String],
      default: [],
    },

    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate",
    },

    profileScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75,
    },

    aiEnhanced: {
      type: Boolean,
      default: false,
    },

    valuePropositions: {
      type: [String],
      default: [],
    },

    suggestedServices: {
      type: [String],
      default: [],
    },

    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Remote",
    },

    portfolioLinks: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);