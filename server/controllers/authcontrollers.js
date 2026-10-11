const LoginActivity = require("../models/LoginActivity");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
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
      .select("name email role status createdAt")
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