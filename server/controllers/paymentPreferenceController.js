const PaymentPreference = require("../models/PaymentPreference");
const Payment = require("../models/Payment");
const {
  encryptPaymentDetails,
  decryptPaymentDetails,
} = require("../services/paymentData");

exports.getMyPaymentPreference = async (req, res) => {
  try {
    const preference = await PaymentPreference.findOne({ user: req.user._id })
      .select("+encryptedDetails +iv +authTag");
    if (!preference) return res.status(200).json({ preference: null });

    return res.status(200).json({
      preference: {
        method: preference.method,
        displayLabel: preference.displayLabel,
        details: decryptPaymentDetails(preference),
      },
    });
  } catch (error) {
    console.error("Load payment preference failed:", error.message);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to load payment settings.",
    });
  }
};

exports.saveMyPaymentPreference = async (req, res) => {
  const { method, details } = req.body;
  if (!["upi", "bank_transfer"].includes(method) || !details || typeof details !== "object") {
    return res.status(400).json({ message: "Choose UPI or bank transfer and provide the required details." });
  }

  let safeDetails;
  let displayLabel;
  if (method === "upi") {
    const upiId = typeof details.upiId === "string" ? details.upiId.trim() : "";
    if (!/^[\w.-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(upiId)) {
      return res.status(400).json({ message: "Enter a valid UPI ID." });
    }
    safeDetails = { upiId };
    displayLabel = `UPI ••••${upiId.slice(-4)}`;
  } else {
    const accountName = typeof details.accountName === "string" ? details.accountName.trim() : "";
    const accountNumber = typeof details.accountNumber === "string"
      ? details.accountNumber.replace(/\s/g, "")
      : "";
    const ifsc = typeof details.ifsc === "string" ? details.ifsc.trim().toUpperCase() : "";
    if (
      accountName.length < 2 || accountName.length > 100 ||
      !/^\d{8,20}$/.test(accountNumber) ||
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    ) {
      return res.status(400).json({ message: "Enter a valid beneficiary name, account number, and IFSC code." });
    }
    safeDetails = { accountName, accountNumber, ifsc };
    displayLabel = `Bank transfer ••••${accountNumber.slice(-4)}`;
  }

  try {
    const unresolvedPayment = await Payment.exists({
      freelancer: req.user._id,
      status: { $in: ["awaiting_payment", "pending_verification"] },
    });
    if (unresolvedPayment) {
      return res.status(409).json({
        message: "Payment details cannot be changed while a project payment is unresolved.",
      });
    }
    const encrypted = encryptPaymentDetails(safeDetails);
    const preference = await PaymentPreference.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          method,
          displayLabel,
          ...encrypted,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Payment preference saved securely.",
      preference: { method: preference.method, displayLabel: preference.displayLabel },
    });
  } catch (error) {
    console.error("Save payment preference failed:", error.message);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to save payment settings.",
    });
  }
};
