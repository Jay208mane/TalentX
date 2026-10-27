
const express = require("express");
const router = express.Router();

const {
    createProposal,
    getMyProposals,
    getJobProposals,
    getReceivedProposals,
    reviewProposal,
    withdrawMyProposal,
} = require("../controllers/proposalController");

const {
    protect,
    allowRoles,
} = require("../middleware/authmiddleware");

// Freelancer submits a proposal
router.post(
    "/",
    protect,
    allowRoles("freelancer"),
    createProposal
);

// Freelancer views their own proposals
router.get(
    "/mine",
    protect,
    allowRoles("freelancer"),
    getMyProposals
);

// Client views all proposals for jobs they own
router.get(
    "/received",
    protect,
    allowRoles("client"),
    getReceivedProposals
);

router.patch(
    "/:proposalId/withdraw",
    protect,
    allowRoles("freelancer"),
    withdrawMyProposal
);

// Job owners accept or reject a pending proposal
router.patch(
    "/:proposalId/decision",
    protect,
    allowRoles("client"),
    reviewProposal
);

// Client views proposals for a specific job
router.get(
    "/job/:jobId",
    protect,
    allowRoles("client"),
    getJobProposals
);

module.exports = router;
