const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    }

    if (password.length < 8) {
      throw new Error("Admin password must be at least 8 characters");
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(
        "An account with this email already exists. No changes made."
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    await User.create({
      name: "TalentX Admin",
      email,
      password: hashedPassword,
      role: "admin",
      status: "active",
    });

    console.log("Admin account created successfully.");
    console.log("Email:", email);
    console.log("Use the password configured in your .env file.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();
