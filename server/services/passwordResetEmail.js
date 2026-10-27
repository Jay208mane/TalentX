const nodemailer = require("nodemailer");

const isLocalSmtpHost = (host) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

const isTestEmailAddress = (email) => {
  const domain = email.split("@").pop()?.toLowerCase() || "";
  return (
    domain.endsWith(".test") ||
    domain.endsWith(".example") ||
    domain.endsWith(".invalid") ||
    ["example.com", "example.net", "example.org"].includes(domain)
  );
};

const getMissingConfiguration = () => {
  const missing = [];
  const mode = process.env.PASSWORD_RESET_EMAIL_MODE;
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const validPort = Number.isInteger(port) && port > 0 && port <= 65535;
  const configuredClientUrl = process.env.CLIENT_URL?.trim();
  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  if (!isDevelopment && !isProduction) {
    missing.push("NODE_ENV (set to development or production)");
  }
  if (isDevelopment && mode !== "mailpit") {
    missing.push("PASSWORD_RESET_EMAIL_MODE=mailpit");
  }
  if (isProduction && mode !== "smtp") {
    missing.push("PASSWORD_RESET_EMAIL_MODE=smtp");
  }

  if (!host) {
    missing.push("SMTP_HOST");
  } else if (isDevelopment && !isLocalSmtpHost(host)) {
    missing.push("SMTP_HOST (development must use localhost, 127.0.0.1, or ::1; external SMTP is blocked)");
  }
  if (!process.env.SMTP_PORT) {
    missing.push("SMTP_PORT");
  } else if (!validPort) {
    missing.push("SMTP_PORT (must be a valid port number)");
  } else if (isDevelopment && port !== 1025) {
    missing.push("SMTP_PORT=1025 (the local Mailpit SMTP port)");
  }
  if (isProduction) {
    if (!process.env.SMTP_USER?.trim()) missing.push("SMTP_USER");
    if (!process.env.SMTP_PASS?.trim()) missing.push("SMTP_PASS");
  }

  if (!configuredClientUrl) {
    missing.push("CLIENT_URL");
  } else {
    try {
      const url = new URL(configuredClientUrl);
      const isLocalUrl = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        (isProduction && url.protocol !== "https:") ||
        (isDevelopment && (!isLocalUrl || url.protocol !== "http:"))
      ) {
        missing.push(
          `CLIENT_URL (${isProduction
            ? "must use HTTPS in production"
            : "development must use an http://localhost frontend URL"})`
        );
      }
    } catch {
      missing.push("CLIENT_URL (must be a valid URL)");
    }
  }

  return [...new Set(missing)];
};

const getClientUrl = () => process.env.CLIENT_URL.trim().replace(/\/+$/, "");

const createTransporter = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const port = Number(process.env.SMTP_PORT);
  const smtpOptions = {
    host: process.env.SMTP_HOST.trim(),
    port,
    secure: !isDevelopment && port === 465,
    requireTLS: !isDevelopment && port !== 465,
    tls: isDevelopment ? undefined : { minVersion: "TLSv1.2" },
  };
  if (!isDevelopment) {
    smtpOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }
  return nodemailer.createTransport(smtpOptions);
};

exports.getMissingConfiguration = getMissingConfiguration;
exports.isTestEmailAddress = isTestEmailAddress;

exports.verifyEmailTransport = async () => {
  const missing = getMissingConfiguration();
  if (missing.length) {
    throw new Error("Password reset email configuration is incomplete.");
  }
  await createTransporter().verify();
};

exports.sendPasswordResetEmail = async (email, token) => {
  const missing = getMissingConfiguration();
  if (missing.length) {
    throw new Error("Password reset email configuration is incomplete.");
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  const transporter = createTransporter();
  const resetUrl = new URL("/reset-password", `${getClientUrl()}/`);
  resetUrl.searchParams.set("token", token);

  await transporter.sendMail({
    from: isDevelopment ? "TalentX <no-reply@localhost.test>" : `TalentX <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your TalentX password",
    text: `Use this link to reset your TalentX password. It expires in 20 minutes and can only be used once:\n\n${resetUrl.href}\n\nIf you did not request a password reset, you can ignore this email.`,
    html: `<p>Use the link below to reset your TalentX password. It expires in 20 minutes and can only be used once.</p><p><a href="${resetUrl.href}">Reset your password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
  });
};
