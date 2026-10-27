const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Job = require("../models/job");
const Proposal = require("../models/proposal");
const LoginActivity = require("../models/LoginActivity");
const { protect, allowRoles } = require("../middleware/authmiddleware");

// All admin routes strictly protected with role 'admin'
router.use(protect, allowRoles("admin"));

// GET /api/admin/stats - Overview metrics
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const freelancers = await User.countDocuments({ role: "freelancer" });
    const clients = await User.countDocuments({ role: "client" });
    const totalJobs = await Job.countDocuments();
    const openJobs = await Job.countDocuments({ status: "open" });
    const closedJobs = await Job.countDocuments({ status: "closed" });
    const totalLogins = await LoginActivity.countDocuments();

    return res.status(200).json({
      totalUsers,
      freelancers,
      clients,
      totalJobs,
      openJobs,
      closedJobs,
      totalLogins,
    });
  } catch (error) {
    console.error("Admin stats failed:", error.message);
    return res.status(500).json({ message: "Unable to retrieve admin statistics." });
  }
});

// GET /api/admin/marketplace-reports - Marketplace metrics and job records
router.get("/marketplace-reports", async (req, res) => {
  try {
    const statuses = ["open", "in_progress", "completed", "closed"];
    const { status, startDate, endDate } = req.query;

    if (status && !statuses.includes(status)) {
      return res.status(400).json({ message: "Invalid job status filter." });
    }

    const parseDate = (value, fieldName) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { error: `${fieldName} must be a valid date in YYYY-MM-DD format.` };
      }

      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return { error: `${fieldName} must be a valid date in YYYY-MM-DD format.` };
      }

      return { date };
    };

    let start;
    let end;
    if (startDate) {
      const parsedStart = parseDate(startDate, "startDate");
      if (parsedStart.error) return res.status(400).json({ message: parsedStart.error });
      start = parsedStart.date;
    }
    if (endDate) {
      const parsedEnd = parseDate(endDate, "endDate");
      if (parsedEnd.error) return res.status(400).json({ message: parsedEnd.error });
      end = parsedEnd.date;
      end.setUTCDate(end.getUTCDate() + 1);
    }
    if (start && end && start >= end) {
      return res.status(400).json({ message: "The end date must be on or after the start date." });
    }

    const createdAt = {};
    if (start) createdAt.$gte = start;
    if (end) createdAt.$lt = end;

    const dateFilter = Object.keys(createdAt).length ? { createdAt } : {};
    const jobFilter = {
      ...dateFilter,
      ...(status ? { status } : {}),
    };
    const requestedPage = Number(req.query.page || 1);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      return res.status(400).json({ message: "Page must be a positive integer." });
    }

    const pageSize = 50;
    const [totalJobs, openJobs, closedJobs, totalProposals, matchingJobs, jobs] =
      await Promise.all([
        Job.countDocuments(dateFilter),
        Job.countDocuments({ ...dateFilter, status: "open" }),
        Job.countDocuments({ ...dateFilter, status: "closed" }),
        Proposal.countDocuments(dateFilter),
        Job.countDocuments(jobFilter),
        Job.find(jobFilter)
          .select("title client budget budgetType status createdAt")
          .populate("client", "name")
          .sort({ createdAt: -1 })
          .skip((requestedPage - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);

    return res.status(200).json({
      stats: { totalJobs, openJobs, closedJobs, totalProposals },
      jobs,
      pagination: {
        page: requestedPage,
        pageSize,
        totalJobs: matchingJobs,
        pages: Math.ceil(matchingJobs / pageSize),
      },
    });
  } catch (error) {
    console.error("Admin marketplace report failed:", error.message);
    return res.status(500).json({ message: "Unable to retrieve marketplace reports." });
  }
});

// GET /api/admin/users - User accounts list
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error("Admin users list failed:", error.message);
    return res.status(500).json({ message: "Unable to retrieve user records." });
  }
});

// GET /api/admin/activity - Recent login activity logs
router.get("/activity", async (req, res) => {
  try {
    const activities = await LoginActivity.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({ count: activities.length, activities });
  } catch (error) {
    console.error("Admin activity list failed:", error.message);
    return res.status(500).json({ message: "Unable to retrieve login activity logs." });
  }
});

// PATCH /api/admin/users/:id/status - Toggle user status
router.patch("/users/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("name email role status");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User status updated.", user });
  } catch (error) {
    console.error("Update user status failed:", error.message);
    return res.status(500).json({ message: "Unable to update user status." });
  }
});

module.exports = router;
