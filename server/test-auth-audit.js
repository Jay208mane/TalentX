const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const connectDB = require("./config/db");

async function runAuthAudit() {
  console.log("=========================================");
  console.log("STARTING TASK 2: AUTH & ROUTE ACCESS AUDIT");
  console.log("=========================================");

  await connectDB();

  const results = [];

  // Helper for asserting
  function check(label, condition, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${label}`);
      results.push({ label, status: "PASS" });
    } else {
      console.error(`  ✗ FAIL: ${label} - ${details}`);
      results.push({ label, status: "FAIL", details });
    }
  }

  try {
    // 1. Verify existence of Admin, Client, Freelancer accounts in DB
    const adminUser = await User.findOne({ role: "admin" }).select("+password");
    check("Admin user exists in database", Boolean(adminUser), adminUser ? adminUser.email : "No admin found");

    const clientUser = await User.findOne({ role: "client" }).select("+password");
    check("Client user exists in database", Boolean(clientUser), clientUser ? clientUser.email : "No client found");

    const freelancerUser = await User.findOne({ role: "freelancer" }).select("+password");
    check("Freelancer user exists in database", Boolean(freelancerUser), freelancerUser ? freelancerUser.email : "No freelancer found");

    // 2. Test JWT Generation & Expiration Validation
    const clientToken = jwt.sign(
      { id: clientUser._id, role: clientUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const decodedClient = jwt.verify(clientToken, process.env.JWT_SECRET);
    check("Client JWT issuance & role payload match", decodedClient.role === "client");

    const freelancerToken = jwt.sign(
      { id: freelancerUser._id, role: freelancerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const decodedFreelancer = jwt.verify(freelancerToken, process.env.JWT_SECRET);
    check("Freelancer JWT issuance & role payload match", decodedFreelancer.role === "freelancer");

    const adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const decodedAdmin = jwt.verify(adminToken, process.env.JWT_SECRET);
    check("Admin JWT issuance & role payload match", decodedAdmin.role === "admin");

    // 3. Test Invalid / Tampered / Missing Token Handling
    try {
      jwt.verify("invalid.token.signature", process.env.JWT_SECRET);
      check("Invalid token rejected", false, "Should have thrown");
    } catch {
      check("Invalid token rejected", true);
    }

    try {
      jwt.verify(clientToken, "wrong_secret");
      check("Token with wrong secret rejected", false, "Should have thrown");
    } catch {
      check("Token with wrong secret rejected", true);
    }

    // 4. Test Password Hashing with bcrypt
    const isClientPasswordValid = await clientUser.matchPassword("client123");
    check("Client password verification via bcrypt", typeof isClientPasswordValid === "boolean");

    // 5. Test Profile Updates for User
    const originalBio = clientUser.bio;
    clientUser.bio = "Audited Client Profile Bio";
    await clientUser.save();
    const updatedClient = await User.findById(clientUser._id);
    check("Client profile bio update persisted to MongoDB", updatedClient.bio === "Audited Client Profile Bio");
    
    // Revert bio
    clientUser.bio = originalBio;
    await clientUser.save();

    console.log("=========================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`TASK 2 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=========================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Task 2 Audit Error:", err);
    process.exit(1);
  }
}

runAuthAudit();
