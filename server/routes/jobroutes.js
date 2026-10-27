const express = require("express");
const router = express.Router();

const {
  createJob,
  getOpenJobs,
  getJobById,
  getMyJobs,
  updateMyJob,
  closeMyJob,
  getJobReferenceFile,
} = require("../controllers/jobcontroller");
const projectRequirementController = require("../controllers/projectRequirementController");

const {
  protect,
  allowRoles,
  optionalAuth,
} = require("../middleware/authmiddleware");

// Public & authenticated open jobs discovery
router.get("/", optionalAuth, getOpenJobs);

// Client-owned project requirement drafts and publication
router.get(
  "/drafts",
  protect,
  allowRoles("client"),
  projectRequirementController.listDrafts
);
router.post(
  "/drafts",
  protect,
  allowRoles("client"),
  projectRequirementController.saveDraft
);
router.post(
  "/drafts/:draftId/publish",
  protect,
  allowRoles("client"),
  projectRequirementController.publishDraft
);

// Client-owned jobs (must be declared before :id param)
router.get(
  "/mine",
  protect,
  allowRoles("client"),
  getMyJobs
);

// Job details by ID
router.get("/:id", optionalAuth, getJobById);
router.get("/:id/references/:index", optionalAuth, getJobReferenceFile);

// Create new job posting (Client only)
router.post(
  "/",
  protect,
  allowRoles("client"),
  createJob
);

// Update client job
router.patch(
  "/:id",
  protect,
  allowRoles("client"),
  updateMyJob
);

// Close client job
router.patch(
  "/:id/close",
  protect,
  allowRoles("client"),
  closeMyJob
);

module.exports = router;
