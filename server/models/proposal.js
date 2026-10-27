const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Freelancer ID is required"],
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client ID is required"],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    bidAmount: {
      type: Number,
      required: [true, "Bid amount is required"],
      min: [1, "Bid amount must be at least 1"],
    },
    duration: {
      type: String,
      required: [true, "Estimated project duration is required"],
      trim: true,
      maxlength: 100,
    },
    coverLetter: {
      type: String,
      required: [true, "Cover letter is required"],
      trim: true,
      minlength: [20, "Cover letter must contain at least 20 characters"],
      maxlength: [3000, "Cover letter cannot exceed 3000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Enforce one proposal per freelancer per job
proposalSchema.index({ job: 1, freelancer: 1 }, { unique: true });
proposalSchema.index({ freelancer: 1, createdAt: -1 });

module.exports = mongoose.model("Proposal", proposalSchema);
