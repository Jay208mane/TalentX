const { rateLimit } = require("express-rate-limit");

const createPasswordResetLimiter = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: max,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message },
});

exports.forgotPasswordLimiter = createPasswordResetLimiter(
  5,
  "Too many password reset requests. Please try again in 15 minutes."
);

exports.resetPasswordLimiter = createPasswordResetLimiter(
  10,
  "Too many password reset attempts. Please try again in 15 minutes."
);
