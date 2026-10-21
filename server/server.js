
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
  })
);

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.send("TalentX Server is running");
});

app.use("/api/auth", require("./routes/authroutes"));
app.use("/api/jobs", require("./routes/jobroutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/admin", require("./routes/adminroutes"));

app.use((req, res) => {
  res.status(404).json({
    message: "The requested endpoint was not found.",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`TalentX Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start TalentX server.");
    process.exit(1);
  }
}

startServer();