
const express = require("express");
const router = express.Router();

const {
    createProposal,
    getMyProposals,
    getJobProposals,
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

// Client views proposals for a specific job
router.get(
    "/job/:jobId",
    protect,
    allowRoles("client"),
    getJobProposals
);

module.exports = router;
