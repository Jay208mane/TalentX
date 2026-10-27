const LoginActivity = require("../models/LoginActivity");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const passwordResetEmail = require("../services/passwordResetEmail");

const passwordResetTokenLifetimeMs = 20 * 60 * 1000;
const passwordResetGenericMessage =
  "If an account exists for that email address, password reset instructions will be sent if email delivery is available.";

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const publicUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  title: user.title || (user.role === "freelancer" ? "Full-Stack Specialist & Developer" : "Project Client"),
  bio: user.bio || "",
  hourlyRate: user.hourlyRate ?? 35,
  skills: Array.isArray(user.skills) ? user.skills : [],
  experienceLevel: user.experienceLevel || "intermediate",
  profileScore: user.profileScore ?? 75,
  aiEnhanced: Boolean(user.aiEnhanced),
  valuePropositions: Array.isArray(user.valuePropositions) ? user.valuePropositions : [],
  suggestedServices: Array.isArray(user.suggestedServices) ? user.suggestedServices : [],
  location: user.location || "Remote",
  portfolioLinks: Array.isArray(user.portfolioLinks) ? user.portfolioLinks : [],
  createdAt: user.createdAt,
});

const recordLoginActivity = async ({
  userId = null,
  email,
  event,
  reason,
  req,
}) => {
  try {
    await LoginActivity.create({
      user: userId,
      email,
      event,
      reason,
      ipAddress: req.ip || "unknown",
    });
  } catch (error) {
    // Logging failures should not expose internal details to users.
    console.error("Unable to record login activity:", error.message);
  }
};
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!["freelancer", "client"].includes(role)) {
      return res.status(400).json({
        message: "Choose freelancer or client as your account type.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      message: "Registration successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please check your registration details.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to register right now. Please try again.",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await recordLoginActivity({
        email: normalizedEmail,
        event: "login_failed",
        reason: "invalid_credentials",
        req,
      });

      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.status === "suspended") {
      await recordLoginActivity({
        userId: user._id,
        email: normalizedEmail,
        event: "login_failed",
        reason: "account_suspended",
        req,
      });

      return res.status(403).json({
        message: "This account is suspended. Please contact support.",
      });
    }

    await recordLoginActivity({
      userId: user._id,
      email: normalizedEmail,
      event: "login_success",
      reason: "success",
      req,
    });

    return res.status(200).json({
      message: "Login successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in right now. Please try again.",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  const missingConfiguration = passwordResetEmail.getMissingConfiguration();
  if (missingConfiguration.length) {
    return res.status(503).json({
      message: `Password reset email is not configured. Add ${missingConfiguration.join(", ")} to server/.env.`,
    });
  }
  if (
    process.env.NODE_ENV === "production" &&
    passwordResetEmail.isTestEmailAddress(email)
  ) {
    return res.status(200).json({ message: passwordResetGenericMessage });
  }

  try {
    if (process.env.NODE_ENV === "development") {
      try {
        await passwordResetEmail.verifyEmailTransport();
      } catch {
        return res.status(503).json({
          message: "Local password-reset email is unavailable. Start Mailpit and confirm SMTP_HOST=127.0.0.1 and SMTP_PORT=1025 in server/.env.",
        });
      }
    }

    const user = await User.findOne({ email }).select("_id");
    if (user) {
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + passwordResetTokenLifetimeMs);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        }
      );

      try {
        await passwordResetEmail.sendPasswordResetEmail(email, token);
      } catch {
        await User.updateOne(
          { _id: user._id, passwordResetTokenHash: tokenHash },
          { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } }
        );
        console.error("Password reset email delivery failed.");
      }
    }

    return res.status(200).json({ message: passwordResetGenericMessage });
  } catch (error) {
    console.error("Forgot password request failed:", error.name || "Error");
    return res.status(500).json({ message: "Unable to process this request right now. Please try again." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (
    typeof token !== "string" ||
    !/^[A-Za-z0-9_-]{40,60}$/.test(token) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Provide a valid reset link and a password of 8–128 characters (maximum 72 UTF-8 bytes).",
    });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await User.updateOne(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: passwordHash },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Request a new password reset link.",
      });
    }

    return res.status(200).json({
      message: "Your password has been reset. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset failed:", error.name || "Error");
    return res.status(500).json({ message: "Unable to reset your password right now. Please try again." });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      message: "Unable to load your profile.",
    });
  }
};

exports.getFreelancers = async (req, res) => {
  try {
    const freelancers = await User.find({ role: "freelancer", status: "active" })
      .select("name email role status title bio hourlyRate skills experienceLevel profileScore aiEnhanced valuePropositions suggestedServices location createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      count: freelancers.length,
      freelancers,
    });
  } catch (error) {
    console.error("Fetch freelancers failed:", error.message);

    return res.status(500).json({
      message: "Unable to load freelancers right now.",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const {
      name,
      title,
      bio,
      hourlyRate,
      skills,
      experienceLevel,
      profileScore,
      aiEnhanced,
      valuePropositions,
      suggestedServices,
      location,
      portfolioLinks,
    } = req.body;

    if (name && typeof name === "string" && name.trim().length >= 2) {
      user.name = name.trim();
    }
    if (typeof title === "string") user.title = title.trim();
    if (typeof bio === "string") user.bio = bio.trim();
    if (hourlyRate !== undefined && !Number.isNaN(Number(hourlyRate))) {
      user.hourlyRate = Math.max(0, Math.min(1000, Number(hourlyRate)));
    }
    if (Array.isArray(skills)) {
      user.skills = skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
    }
    if (["entry", "intermediate", "expert"].includes(experienceLevel)) {
      user.experienceLevel = experienceLevel;
    }
    if (profileScore !== undefined && !Number.isNaN(Number(profileScore))) {
      user.profileScore = Math.max(0, Math.min(100, Number(profileScore)));
    }
    if (typeof aiEnhanced === "boolean") {
      user.aiEnhanced = aiEnhanced;
    }
    if (Array.isArray(valuePropositions)) {
      user.valuePropositions = valuePropositions.map((s) => String(s).trim()).filter(Boolean).slice(0, 10);
    }
    if (Array.isArray(suggestedServices)) {
      user.suggestedServices = suggestedServices.map((s) => String(s).trim()).filter(Boolean).slice(0, 10);
    }
    if (typeof location === "string") {
      user.location = location.trim();
    }
    if (Array.isArray(portfolioLinks)) {
      user.portfolioLinks = portfolioLinks.map((s) => String(s).trim()).filter(Boolean).slice(0, 10);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({
      message: "Unable to update profile right now. Please try again.",
    });
  }
};