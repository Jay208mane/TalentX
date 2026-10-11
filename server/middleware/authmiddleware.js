
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check current database state instead of trusting only
    // the role and status captured when the token was issued.
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "Your account could not be found. Please log in again.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "This account is suspended.",
      });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Unable to verify your session.",
    });
  }
};

exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};

exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user && user.status !== "suspended") {
      req.user = {
        _id: user._id,
        id: user._id.toString(),
        userId: user._id.toString(),
        role: user.role,
        name: user.name,
        email: user.email,
        status: user.status,
      };
    }
  } catch {
    // If token invalid, proceed as guest
  }

  next();
};