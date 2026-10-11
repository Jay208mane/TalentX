
const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    event: {
      type: String,
      enum: ["login_success", "login_failed"],
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "invalid_credentials",
        "account_suspended",
        "success",
      ],
      required: true,
    },

    ipAddress: {
      type: String,
      default: "unknown",
    },
  },
  { timestamps: true }
);

loginActivitySchema.index({ createdAt: -1 });
loginActivitySchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model(
  "LoginActivity",
  loginActivitySchema
);