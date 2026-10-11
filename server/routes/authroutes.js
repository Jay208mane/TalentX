const express = require("express");
const {
  register,
  login,
  me,
  getFreelancers,
} = require("../controllers/authcontrollers");
const { protect } = require("../middleware/authmiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.get("/freelancers", getFreelancers);

module.exports = router;