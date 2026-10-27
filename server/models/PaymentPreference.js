const mongoose = require("mongoose");

const paymentPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    method: {
      type: String,
      enum: ["upi", "bank_transfer"],
      required: true,
    },
    encryptedDetails: { type: String, required: true, select: false },
    iv: { type: String, required: true, select: false },
    authTag: { type: String, required: true, select: false },
    displayLabel: { type: String, required: true, maxlength: 120 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentPreference", paymentPreferenceSchema);
