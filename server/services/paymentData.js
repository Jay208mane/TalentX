const crypto = require("crypto");

function getEncryptionKey() {
  const value = process.env.PAYMENT_DATA_ENCRYPTION_KEY;
  if (!value) {
    const error = new Error("Payment data encryption is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    const error = new Error("Payment data encryption key must be a base64-encoded 32-byte key.");
    error.statusCode = 503;
    throw error;
  }

  return key;
}

exports.encryptPaymentDetails = (details) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(details), "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedDetails: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
};

exports.decryptPaymentDetails = (preference) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(preference.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(preference.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(preference.encryptedDetails, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
};
