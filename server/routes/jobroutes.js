const express = require("express");
const router = express.Router();

const {
  createJob,
  getOpenJobs,
  getJobById,
  getMyJobs,
  updateMyJob,
  closeMyJob,
} = require("../controllers/jobcontroller");

const {
  protect,
  allowRoles,
  optionalAuth,
} = require("../middleware/authmiddleware");

// Public & authenticated open jobs discovery
router.get("/", optionalAuth, getOpenJobs);

// Client-owned jobs (must be declared before :id param)
router.get(
  "/mine",
  protect,
  allowRoles("client"),
  getMyJobs
);

// Job details by ID
router.get("/:id", optionalAuth, getJobById);

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
