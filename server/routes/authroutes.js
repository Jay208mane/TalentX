const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  getFreelancers,
  updateProfile,
} = require("../controllers/authcontrollers");
const { protect } = require("../middleware/authmiddleware");
const { forgotPasswordLimiter, resetPasswordLimiter } = require("../middleware/passwordResetRateLimit");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);
router.get("/freelancers", getFreelancers);

module.exports = router;