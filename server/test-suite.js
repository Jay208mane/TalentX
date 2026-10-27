/**
 * TalentX End-to-End API Integration Verification Script
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Job = require("./models/job");
const Proposal = require("./models/proposal");
const jwt = require("jsonwebtoken");

const { validateJobDescriptionInput } = require("./validators/aiValidator");
const { generateJobDescription } = require("./services/ai/jobDescriptionService");

async function runTestSuite() {
  console.log("=================================================");
  console.log("TALENTX COMPREHENSIVE INTEGRATION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Database Connection
    console.log("1. Testing MongoDB Connection...");
    await connectDB();
    assert(mongoose.connection.readyState === 1, "Connected to MongoDB Atlas");

    // Test 2: Mongoose Models Verification
    console.log("\n2. Verifying Mongoose Models...");
    assert(typeof User.create === "function", "User model compiled and functional");
    assert(typeof Job.create === "function", "Job model compiled and functional");
    assert(typeof Proposal.create === "function", "Proposal model compiled and functional");

    // Test 3: JWT Verification Logic
    console.log("\n3. Testing JWT Token Issuance & Verification...");
    const samplePayload = { userId: "6ac11c499b49d4cb70250c96", role: "freelancer" };
    const token = jwt.sign(samplePayload, process.env.JWT_SECRET, { expiresIn: "1h" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert(decoded.userId === samplePayload.userId, "JWT payload decoded correctly");
    assert(decoded.role === "freelancer", "JWT role verified correctly");

    // Test 4: AI Input Validation and Sanitization
    console.log("\n4. Testing AI Input Validator...");
    const validAiPayload = {
      jobTitle: "Senior Full-Stack MERN Developer",
      category: "Development",
      projectIdea: "We need an engineer to build a high-converting marketplace with real-time notifications.",
      skills: ["React 19", "Node.js", "Express", "MongoDB"],
      experienceLevel: "expert",
      budget: 1200,
      budgetType: "fixed",
      duration: "1 to 3 months",
    };
    const validResult = validateJobDescriptionInput(validAiPayload);
    assert(validResult.isValid === true, "Valid AI input passes validation");
    assert(validResult.sanitized.skills.length === 4, "Skills array sanitized properly");

    const invalidAiPayload = { jobTitle: "X", projectIdea: "Too short" };
    const invalidResult = validateJobDescriptionInput(invalidAiPayload);
    assert(invalidResult.isValid === false, "Invalid AI input rejected with proper errors");
    assert(invalidResult.errors.length >= 2, "Detailed validation error messages generated");

    // Test 5: Missing AI API Key Graceful Degradation
    console.log("\n5. Testing Missing AI API Key Error Handling...");
    const originalApiKey = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;

    let caughtAiError = null;
    try {
      await generateJobDescription(validResult.sanitized);
    } catch (err) {
      caughtAiError = err;
    }

    assert(caughtAiError !== null, "AI service throws when API key is missing");
    assert(caughtAiError.code === "AI_CONFIG_REQUIRED", "Error code is AI_CONFIG_REQUIRED");
    assert(caughtAiError.statusCode === 503, "HTTP status code is 503 Service Unavailable");

    // Restore key if it was set
    if (originalApiKey) process.env.AI_API_KEY = originalApiKey;

    // Test 6: Database Read Operations
    console.log("\n6. Verifying Marketplace Read Queries...");
    const existingUsersCount = await User.countDocuments();
    assert(existingUsersCount > 0, `Database has active users (count: ${existingUsersCount})`);

    const openJobs = await Job.find({ status: "open" });
    assert(Array.isArray(openJobs), `Open jobs query succeeded (count: ${openJobs.length})`);

    const proposals = await Proposal.find({});
    assert(Array.isArray(proposals), `Proposals collection query succeeded (count: ${proposals.length})`);

  } catch (err) {
    console.error("Test Suite encountered an unexpected exception:", err);
    failed++;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
