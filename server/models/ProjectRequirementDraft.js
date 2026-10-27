const mongoose = require("mongoose");

const projectRequirementDraftSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    form: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generatedRequirements: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
  },
  { timestamps: true }
);

projectRequirementDraftSchema.index({ client: 1, updatedAt: -1 });

module.exports = mongoose.model("ProjectRequirementDraft", projectRequirementDraftSchema);
