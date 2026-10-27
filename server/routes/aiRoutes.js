const express = require("express");
const router = express.Router();
const {
  generateJobDescriptionController,
  generateProjectRequirementsController,
  enhanceProfileController,
} = require("../controllers/aiController");
const { protect, allowRoles } = require("../middleware/authmiddleware");

// POST /api/ai/generate-job-description (Client only)
router.post(
  "/generate-job-description",
  protect,
  allowRoles("client"),
  generateJobDescriptionController
);

router.post(
  "/generate-project-requirements",
  protect,
  allowRoles("client"),
  generateProjectRequirementsController
);

// POST /api/ai/enhance-profile (Authenticated users)
router.post(
  "/enhance-profile",
  protect,
  enhanceProfileController
);

module.exports = router;
