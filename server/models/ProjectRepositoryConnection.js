const mongoose = require("mongoose");

const projectRepositoryConnectionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: String, required: true, trim: true, maxlength: 39 },
    repository: { type: String, required: true, trim: true, maxlength: 100 },
    private: { type: Boolean, required: true },
    defaultBranch: { type: String, default: "main", maxlength: 255 },
    encryptedToken: { type: String, required: true, select: false },
    iv: { type: String, required: true, select: false },
    authTag: { type: String, required: true, select: false },
    linkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectRepositoryConnection", projectRepositoryConnectionSchema);
