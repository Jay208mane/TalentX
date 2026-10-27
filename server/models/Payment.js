const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
      required: false,
      default: null,
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
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "USD", enum: ["USD"] },
    method: {
      type: String,
      enum: ["upi", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "awaiting_payment",
        "processing",
        "pending_verification",
        "paid",
        "failed",
        "refunded",
        "cancelled",
      ],
      default: "awaiting_payment",
      index: true,
    },
    transactionReference: { type: String, trim: true, maxlength: 120, default: "" },
    recordedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    history: [
      {
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, required: true },
        note: { type: String, maxlength: 1000, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

paymentSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
