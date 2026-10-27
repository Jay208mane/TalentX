const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const authController = require("./controllers/authcontrollers");
const passwordResetEmail = require("./services/passwordResetEmail");

const originalEnvironment = Object.fromEntries(
  ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "PASSWORD_RESET_EMAIL_MODE", "CLIENT_URL", "NODE_ENV"]
    .map((key) => [key, process.env[key]])
);

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function mockMethod(t, object, method, replacement) {
  const original = object[method];
  object[method] = replacement;
  t.after(() => {
    object[method] = original;
  });
}

function configureEmail() {
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1025",
    PASSWORD_RESET_EMAIL_MODE: "mailpit",
    CLIENT_URL: "http://localhost:5173",
    NODE_ENV: "development",
  });
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
}

test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("forgot password response does not reveal whether an account exists", async (t) => {
  configureEmail();
  const savedUpdates = [];
  const sentEmails = [];

  mockMethod(t, User, "findOne", (filter) => ({
    select: async () => filter.email === "known@example.test" ? { _id: "user-1" } : null,
  }));
  mockMethod(t, User, "updateOne", async (filter, update) => {
    savedUpdates.push({ filter, update });
    return { modifiedCount: 1 };
  });
  mockMethod(t, passwordResetEmail, "sendPasswordResetEmail", async (email, token) => {
    sentEmails.push({ email, token });
  });
  mockMethod(t, passwordResetEmail, "verifyEmailTransport", async () => {});

  const knownResponse = response();
  await authController.forgotPassword({ body: { email: " Known@Example.Test " } }, knownResponse);
  const unknownResponse = response();
  await authController.forgotPassword({ body: { email: "unknown@example.test" } }, unknownResponse);

  assert.equal(knownResponse.statusCode, 200);
  assert.deepEqual(knownResponse.body, unknownResponse.body);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].email, "known@example.test");
  assert.notEqual(savedUpdates[0].update.$set.passwordResetTokenHash, sentEmails[0].token);
  assert.equal(
    savedUpdates[0].update.$set.passwordResetTokenHash,
    crypto.createHash("sha256").update(sentEmails[0].token).digest("hex")
  );
  const remainingLifetime = savedUpdates[0].update.$set.passwordResetExpiresAt.getTime() - Date.now();
  assert.ok(remainingLifetime > 15 * 60 * 1000);
  assert.ok(remainingLifetime <= 20 * 60 * 1000);
});

test("reset password atomically consumes a valid token and stores only a bcrypt hash", async (t) => {
  const token = "a".repeat(43);
  const captured = {};
  mockMethod(t, User, "updateOne", async (filter, update) => {
    captured.filter = filter;
    captured.update = update;
    return { modifiedCount: 1 };
  });

  const res = response();
  await authController.resetPassword(
    { body: { token, password: "NewSecurePassword123!" } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    captured.filter.passwordResetTokenHash,
    crypto.createHash("sha256").update(token).digest("hex")
  );
  assert.ok(captured.filter.passwordResetExpiresAt.$gt instanceof Date);
  assert.equal(await bcrypt.compare("NewSecurePassword123!", captured.update.$set.password), true);
  assert.equal(await bcrypt.compare("OldSecurePassword123!", captured.update.$set.password), false);
  assert.deepEqual(captured.update.$unset, {
    passwordResetTokenHash: 1,
    passwordResetExpiresAt: 1,
  });
});

test("invalid and expired reset tokens are rejected without changing a password", async (t) => {
  let updateCount = 0;
  mockMethod(t, User, "updateOne", async () => {
    updateCount += 1;
    return { modifiedCount: 0 };
  });

  const expiredResponse = response();
  await authController.resetPassword(
    { body: { token: "b".repeat(43), password: "NewSecurePassword123!" } },
    expiredResponse
  );
  const malformedResponse = response();
  await authController.resetPassword(
    { body: { token: "not-a-valid-token", password: "NewSecurePassword123!" } },
    malformedResponse
  );

  assert.equal(expiredResponse.statusCode, 400);
  assert.match(expiredResponse.body.message, /expired/);
  assert.equal(malformedResponse.statusCode, 400);
  assert.equal(updateCount, 1);
});

test("forgot password reports the exact missing email configuration", async () => {
  for (const key of ["SMTP_HOST", "SMTP_PORT", "PASSWORD_RESET_EMAIL_MODE", "CLIENT_URL"]) {
    delete process.env[key];
  }
  process.env.NODE_ENV = "production";

  const res = response();
  await authController.forgotPassword({ body: { email: "user@example.test" } }, res);

  assert.equal(res.statusCode, 503);
  for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CLIENT_URL", "PASSWORD_RESET_EMAIL_MODE"]) {
    assert.ok(res.body.message.includes(key));
  }
});

test("development email configuration rejects external SMTP hosts", () => {
  configureEmail();
  process.env.SMTP_HOST = "smtp.example.com";

  assert.ok(
    passwordResetEmail.getMissingConfiguration().some((item) => item.includes("external SMTP is blocked"))
  );
});

test("development reports unavailable Mailpit setup without looking up an account", async (t) => {
  configureEmail();
  let databaseQueried = false;
  mockMethod(t, passwordResetEmail, "verifyEmailTransport", async () => {
    throw new Error("Mailpit is not running.");
  });
  mockMethod(t, User, "findOne", () => {
    databaseQueried = true;
    return { select: async () => ({ _id: "user-1" }) };
  });

  const res = response();
  await authController.forgotPassword({ body: { email: "user@example.test" } }, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /Start Mailpit/);
  assert.equal(databaseQueried, false);
  assert.equal(JSON.stringify(res.body).includes("token"), false);
});

test("development reset emails use only local Mailpit without SMTP credentials", async (t) => {
  configureEmail();
  let transportOptions;
  let sentMessage;
  const nodemailer = require("nodemailer");
  mockMethod(t, nodemailer, "createTransport", (options) => {
    transportOptions = options;
    return {
      verify: async () => true,
      sendMail: async (message) => {
        sentMessage = message;
      },
    };
  });

  await passwordResetEmail.verifyEmailTransport();
  await passwordResetEmail.sendPasswordResetEmail(
    "test-account@example.test",
    "never-return-this-token"
  );

  assert.equal(transportOptions.host, "127.0.0.1");
  assert.equal(transportOptions.port, 1025);
  assert.equal(transportOptions.auth, undefined);
  assert.match(sentMessage.text, /http:\/\/localhost:5173\/reset-password\?token=never-return-this-token/);
  assert.equal(passwordResetEmail.isTestEmailAddress("user@example.test"), true);
  assert.equal(passwordResetEmail.isTestEmailAddress("user@example.com"), true);
  assert.equal(passwordResetEmail.isTestEmailAddress("user@talentx.com"), false);
});

test("production never sends reset emails to reserved test domains", async (t) => {
  process.env.NODE_ENV = "production";
  process.env.PASSWORD_RESET_EMAIL_MODE = "smtp";
  process.env.SMTP_HOST = "smtp.provider.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "sender@talentx.com";
  process.env.SMTP_PASS = "unit-test-password";
  process.env.CLIENT_URL = "https://talentx.example.org";

  let databaseQueried = false;
  let emailSent = false;
  mockMethod(t, User, "findOne", () => {
    databaseQueried = true;
    return { select: async () => ({ _id: "test-user" }) };
  });
  mockMethod(t, passwordResetEmail, "sendPasswordResetEmail", async () => {
    emailSent = true;
  });

  const res = response();
  await authController.forgotPassword({ body: { email: "user@example.test" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(databaseQueried, false);
  assert.equal(emailSent, false);
  assert.equal(JSON.stringify(res.body).includes("token"), false);
});
