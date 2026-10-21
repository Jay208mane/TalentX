
const mongoose = require("mongoose");
const Proposal = require("../models/Proposal");
const Job = require("../models/job");

// Freelancer submits a proposal
exports.createProposal = async (req, res) => {
    try {
        const { jobId, bidAmount, duration, coverLetter } = req.body;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ message: "Invalid job ID." });
        }

        const amount = Number(bidAmount);

        if (!Number.isFinite(amount) || amount < 1) {
            return res.status(400).json({
                message: "Bid amount must be at least 1.",
            });
        }

        if (
            typeof duration !== "string" ||
            !duration.trim() ||
            duration.trim().length > 100
        ) {
            return res.status(400).json({
                message: "Please provide a valid project duration.",
            });
        }

        if (
            typeof coverLetter !== "string" ||
            coverLetter.trim().length < 20 ||
            coverLetter.trim().length > 3000
        ) {
            return res.status(400).json({
                message: "Cover letter must contain 20–3000 characters.",
            });
        }

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        if (job.status !== "open") {
            return res.status(400).json({
                message: "This job is no longer accepting proposals.",
            });
        }

        if (job.client.toString() === req.user._id.toString()) {
            return res.status(403).json({
                message: "You cannot apply to your own job.",
            });
        }

        const proposal = await Proposal.create({
            job: job._id,
            freelancer: req.user._id,
            client: job.client,
            bidAmount: amount,
            duration: duration.trim(),
            coverLetter: coverLetter.trim(),
        });

        return res.status(201).json({
            message: "Proposal submitted successfully.",
            proposal,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already submitted a proposal for this job.",
            });
        }

        console.error("Create proposal error:", error.message);

        return res.status(500).json({
            message: "Unable to submit proposal.",
        });
    }
};

// Freelancer views their own proposals
exports.getMyProposals = async (req, res) => {
    try {
        const proposals = await Proposal.find({
            freelancer: req.user._id,
        })
            .populate("job", "title budget budgetType status category")
            .populate("client", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({ proposals });
    } catch (error) {
        console.error("Get my proposals error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch your proposals.",
        });
    }
};

// Client views proposals for their own job
exports.getJobProposals = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ message: "Invalid job ID." });
        }

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        if (job.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You can only view proposals for your own jobs.",
            });
        }

        const proposals = await Proposal.find({ job: jobId })
            .populate("freelancer", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({ proposals });
    } catch (error) {
        console.error("Get job proposals error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch job proposals.",
        });
    }
};
