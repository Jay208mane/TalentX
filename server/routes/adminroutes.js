const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Job = require("../models/job");
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
