
const mongoose = require("mongoose");
const Proposal = require("../models/proposal");
const Job = require("../models/job");
const Project = require("../models/Project");
const { notifyUser } = require("../services/realtime");
const { workspaceTypeForCategory } = require("../services/projectWorkspace");

// Freelancer submits a proposal
exports.createProposal = async (req, res) => {
    try {
        const { jobId, bidAmount, duration, coverLetter } = req.body;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ message: "Invalid job ID." });
        }

        const amount = Number(bidAmount);

        if (!Number.isFinite(amount) || amount < 1 || amount > 100000000) {
            return res.status(400).json({
                message: "Bid amount must be between 1 and 100,000,000.",
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
            .populate("project", "title status completionPercentage")
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

exports.getReceivedProposals = async (req, res) => {
    try {
        const proposals = await Proposal.find({ client: req.user._id })
            .populate("job", "title budget budgetType status deadline")
            .populate("freelancer", "name email")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({ proposals });
    } catch (error) {
        console.error("Get received proposals failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch proposals for your jobs.",
        });
    }
};

exports.withdrawMyProposal = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.proposalId)) {
        return res.status(400).json({ message: "Invalid proposal ID." });
    }
    try {
        const proposal = await Proposal.findOneAndUpdate(
            { _id: req.params.proposalId, freelancer: req.user._id, status: "pending" },
            { $set: { status: "withdrawn" } },
            { new: true }
        );
        if (!proposal) {
            const existing = await Proposal.findOne({
                _id: req.params.proposalId,
                freelancer: req.user._id,
            }).select("status");
            if (!existing) return res.status(404).json({ message: "Proposal not found." });
            return res.status(409).json({ message: "Only pending proposals can be withdrawn." });
        }
        notifyUser(proposal.client, "proposal:updated", {
            proposalId: proposal._id,
            status: "withdrawn",
            message: "The freelancer withdrew their proposal.",
        });
        return res.status(200).json({ message: "Proposal withdrawn.", proposal });
    } catch (error) {
        console.error("Withdraw proposal failed:", error.message);
        return res.status(500).json({ message: "Unable to withdraw this proposal." });
    }
};

exports.reviewProposal = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.proposalId)) {
        return res.status(400).json({ message: "Invalid proposal ID." });
    }

    const { decision } = req.body;
    if (!["accept", "reject"].includes(decision)) {
        return res.status(400).json({ message: "Choose accept or reject." });
    }

    let lockedJobId;
    let createdProjectId;
    let acceptanceCommitted = false;
    try {
        const proposal = await Proposal.findById(req.params.proposalId);
        if (!proposal) return res.status(404).json({ message: "Proposal not found." });
        if (proposal.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the job owner can review this proposal." });
        }

        if (proposal.status === "accepted" && proposal.project) {
            const existingProject = await Project.findById(proposal.project);
            if (existingProject && decision === "accept") {
                await Proposal.updateMany(
                    { job: proposal.job, _id: { $ne: proposal._id }, status: "pending" },
                    { $set: { status: "rejected" } }
                );
                const acceptedNotification = {
                    proposalId: proposal._id,
                    projectId: existingProject._id,
                    status: "accepted",
                    message: "Your proposal was accepted. Your project workspace is ready.",
                };
                notifyUser(proposal.freelancer, "proposal:updated", acceptedNotification);
                return res.status(200).json({
                    message: "This proposal has already been accepted.",
                    proposal,
                    project: existingProject,
                });
            }
        }
        if (proposal.status !== "pending") {
            return res.status(409).json({ message: "Only pending proposals can be reviewed." });
        }

        if (decision === "reject") {
            const rejected = await Proposal.findOneAndUpdate(
                { _id: proposal._id, client: req.user._id, status: "pending" },
                { $set: { status: "rejected" } },
                { new: true }
            );
            if (!rejected) {
                return res.status(409).json({ message: "This proposal has already been reviewed." });
            }
            notifyUser(proposal.freelancer, "proposal:updated", {
                proposalId: proposal._id,
                status: "rejected",
                message: "The client declined your proposal.",
            });
            return res.status(200).json({ message: "Proposal rejected.", proposal: rejected });
        }

        const job = await Job.findOneAndUpdate(
            { _id: proposal.job, client: req.user._id, status: "open" },
            { $set: { status: "in_progress" } },
            { new: true }
        );
        if (!job) {
            const existingProject = await Project.findOne({ job: proposal.job });
            return res.status(409).json({
                message: existingProject
                    ? "Another proposal has already been accepted for this job."
                    : "This job is no longer available for acceptance.",
            });
        }
        lockedJobId = job._id;

        const project = await Project.create({
            job: job._id,
            proposal: proposal._id,
            client: req.user._id,
            freelancer: proposal.freelancer,
            title: job.title,
            description: job.description,
            category: job.category,
            subcategory: job.requirements?.subcategory || "",
            projectType: job.requirements?.projectType || "",
            workspaceType: job.requirements?.workspaceType || workspaceTypeForCategory(job.category),
            requiredSkills: job.skills,
            requirements: job.requirements,
            agreedAmount: proposal.bidAmount,
            expectedDeadline: job.deadline || null,
            milestones: (job.requirements?.generated?.tasksAndMilestones || [])
                .slice(0, 20)
                .map((task) => ({
                    title: task.trim().slice(0, 120) || "Project task",
                    createdBy: req.user._id,
                })),
            activity: [{
                actor: req.user._id,
                type: "project_created",
                message: "Proposal accepted; project workspace created.",
            }],
        });
        createdProjectId = project._id;
        const acceptedProposal = await Proposal.findOneAndUpdate(
            { _id: proposal._id, client: req.user._id, status: "pending" },
            { $set: { status: "accepted", project: project._id } },
            { new: true, runValidators: true }
        );
        if (!acceptedProposal) {
            await Project.deleteOne({ _id: project._id });
            await Job.updateOne(
                { _id: job._id, client: req.user._id, status: "in_progress" },
                { $set: { status: "open" } }
            );
            lockedJobId = null;
            return res.status(409).json({ message: "This proposal has already been reviewed." });
        }
        acceptanceCommitted = true;
        await Proposal.updateMany(
            { job: job._id, _id: { $ne: proposal._id }, status: "pending" },
            { $set: { status: "rejected" } }
        );

        const notification = {
            proposalId: proposal._id,
            projectId: project._id,
            status: "accepted",
            message: "Your proposal was accepted. Your project workspace is ready.",
        };
        notifyUser(proposal.freelancer, "proposal:updated", notification);
        notifyUser(req.user._id, "proposal:updated", notification);
        return res.status(201).json({
            message: "Proposal accepted and project workspace created.",
            proposal: acceptedProposal,
            project,
        });
    } catch (error) {
        if (createdProjectId && !acceptanceCommitted) {
            await Project.deleteOne({ _id: createdProjectId }).catch((rollbackError) => {
                console.error("Project creation rollback failed:", rollbackError.message);
            });
        }
        if (lockedJobId && !acceptanceCommitted) {
            await Job.updateOne(
                { _id: lockedJobId, client: req.user._id, status: "in_progress" },
                { $set: { status: "open" } }
            ).catch((rollbackError) => {
                console.error("Proposal acceptance rollback failed:", rollbackError.message);
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "A project has already been created for this job." });
        }
        console.error("Review proposal failed:", error.message);
        return res.status(500).json({ message: "Unable to review the proposal." });
    }
};
