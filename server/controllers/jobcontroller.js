const Job = require("../models/job");

const createJob = async (req, res) => {
  try {
    if (req.user.status !== "active") {
      return res.status(403).json({
        message: "Your account cannot perform this action.",
      });
    }

    const {
      title,
      description,
      category,
      skills,
      budgetType,
      budget,
      deadline,
    } = req.body;

    const cleanSkills = Array.isArray(skills)
      ? skills.map((skill) =>
          typeof skill === "string" ? skill.trim() : skill
        )
      : skills;

    const job = await Job.create({
      title,
      description,
      category,
      skills: cleanSkills,
      budgetType,
      budget,
      deadline: deadline || null,
      client: req.user._id,
    });

    return res.status(201).json({
      message: "Job posted successfully.",
      job,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Please check the job details and try again.",
      });
    }

    console.error("Create job failed:", error.message);

    return res.status(500).json({
      message: "Unable to post the job right now.",
    });
  }
};

const getOpenJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "open" })
      .populate("client", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Fetch jobs failed:", error.message);

    return res.status(500).json({
      message: "Unable to load jobs right now.",
    });
  }
};

const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ client: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Fetch client jobs failed:", error.message);

    return res.status(500).json({
      message: "Unable to load your jobs right now.",
    });
  }
};

const updateMyJob = async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "category",
      "skills",
      "budgetType",
      "budget",
      "deadline",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    if (Array.isArray(updates.skills)) {
      updates.skills = updates.skills.map((skill) =>
        typeof skill === "string" ? skill.trim() : skill
      );
    }

    if (updates.deadline === "") {
      updates.deadline = null;
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found.",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        message: "Only open jobs can be edited.",
      });
    }

    for (const [field, value] of Object.entries(updates)) {
      job.set(field, value);
    }

    await job.save();

    return res.status(200).json({
      message: "Job updated successfully.",
      job,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Please check the updated job details.",
      });
    }

    console.error("Update job failed:", error.message);

    return res.status(500).json({
      message: "Unable to update the job right now.",
    });
  }
};

const closeMyJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      client: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found.",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        message: "Only open jobs can be closed.",
      });
    }

    job.status = "closed";
    await job.save();

    return res.status(200).json({
      message: "Job closed successfully.",
      job,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid job ID.",
      });
    }

    console.error("Close job failed:", error.message);

    return res.status(500).json({
      message: "Unable to close the job right now.",
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("client", "name email")
      .lean();

    if (!job) {
      return res.status(404).json({
        message: "Job not found.",
      });
    }

    return res.status(200).json({ job });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid job ID.",
      });
    }

    console.error("Fetch job by id failed:", error.message);

    return res.status(500).json({
      message: "Unable to load the job right now.",
    });
  }
};

module.exports = {
  createJob,
  getOpenJobs,
  getJobById,
  getMyJobs,
  updateMyJob,
  closeMyJob,
};