const express = require("express");
const { protect, allowRoles } = require("../middleware/authmiddleware");
const projectController = require("../controllers/projectController");
const projectIntegrationController = require("../controllers/projectIntegrationController");

const router = express.Router();
const participants = [allowRoles("client", "freelancer")];

router.use(protect);

// Direct project creation & discovery
router.post("/", ...participants, allowRoles("client"), projectController.createProject);
router.get("/open", ...participants, projectController.getOpenProjects);
router.post("/:projectId/claim", ...participants, allowRoles("freelancer"), projectController.claimProject);

// Mine & workspace
router.get("/mine", ...participants, projectController.getMyProjects);
router.get("/:projectId", allowRoles("client", "freelancer", "admin"), projectController.getProject);

router.use(...participants);

router.put("/:projectId/repository", allowRoles("freelancer"), projectIntegrationController.linkRepository);
router.get("/:projectId/repository", projectIntegrationController.getRepositoryActivity);
router.delete("/:projectId/repository", allowRoles("freelancer"), projectIntegrationController.unlinkRepository);
router.post("/:projectId/tasks/:taskId/github-reference", allowRoles("freelancer"), projectIntegrationController.linkTaskReference);
router.put("/:projectId/preview", allowRoles("freelancer"), projectIntegrationController.updatePreviewUrl);
router.post("/:projectId/cancel", projectController.cancelProject);

// Progress & Milestones
router.post("/:projectId/tasks", projectController.createTask);
router.patch("/:projectId/tasks/:taskId", projectController.updateTask);
router.post("/:projectId/files", projectController.uploadProjectFile);
router.get("/:projectId/files/:fileId", projectController.downloadProjectFile);
router.patch("/:projectId/files/:fileId/review", allowRoles("client"), projectController.reviewProjectFile);
router.post("/:projectId/progress", allowRoles("freelancer"), projectController.postProgressUpdate);
router.post("/:projectId/milestones", allowRoles("freelancer"), projectController.addMilestone);
router.patch("/:projectId/milestones/:milestoneId", allowRoles("freelancer"), projectController.updateMilestone);

// Completion & Post-Completion Payment Demand
router.post("/:projectId/final-work", allowRoles("freelancer"), projectController.submitFinalWork);
router.post("/:projectId/demand-payment", allowRoles("freelancer"), projectController.demandPayment);
router.post("/:projectId/review", allowRoles("client"), projectController.reviewFinalWork);

// Chat & Manual Payment Processing
router.get("/:projectId/chat", projectController.getChatHistory);
router.get("/:projectId/payment-instructions", allowRoles("client"), projectController.getPaymentInstructions);
router.post("/:projectId/payment/record", allowRoles("client"), projectController.recordManualPayment);
router.post("/:projectId/payment/verify", allowRoles("freelancer"), projectController.verifyManualPayment);

module.exports = router;
