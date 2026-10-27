const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const User = require("./models/User");
const Project = require("./models/Project");
const Message = require("./models/Message");
const { setRealtimeServer } = require("./services/realtime");

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed."));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setRealtimeServer(io);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "12mb" }));

app.get("/", (req, res) => {
  res.send("TalentX Server is running");
});

app.use("/api/auth", require("./routes/authroutes"));
app.use("/api/jobs", require("./routes/jobroutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/payment-preferences", require("./routes/paymentPreferenceRoutes"));
app.use("/api/admin", require("./routes/adminroutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.use((req, res) => {
  res.status(404).json({
    message: "The requested endpoint was not found.",
  });
});

const PORT = process.env.PORT || 5000;

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) {
      return next(new Error("Authentication required."));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name role status");
    if (!user || user.status === "suspended") {
      return next(new Error("This account cannot access project chat."));
    }
    socket.data.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
    };
    return next();
  } catch {
    return next(new Error("Invalid or expired session."));
  }
});

io.on("connection", (socket) => {
  const { id: userId } = socket.data.user;
  socket.join(`user:${userId}`);

  socket.on("project:join", async (payload = {}, acknowledge = () => {}) => {
    try {
      const projectId = payload.projectId;
      if (!/^[a-f\d]{24}$/i.test(projectId || "")) {
        return acknowledge({ error: "Invalid project ID." });
      }
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ client: userId }, { freelancer: userId }],
      }).select("_id");
      if (!project) return acknowledge({ error: "Project access denied." });

      socket.join(`project:${projectId}`);
      return acknowledge({ ok: true });
    } catch (error) {
      console.error("Project chat room authorization failed:", error.message);
      return acknowledge({ error: "Unable to join this project chat." });
    }
  });

  socket.on("chat:send", async (payload = {}, acknowledge = () => {}) => {
    try {
      const projectId = payload.projectId;
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (!/^[a-f\d]{24}$/i.test(projectId || "") || !text || text.length > 5000) {
        return acknowledge({ error: "Provide a valid project and message (maximum 5000 characters)." });
      }
      const room = `project:${projectId}`;
      if (!socket.rooms.has(room)) {
        return acknowledge({ error: "Join the authorized project chat before sending messages." });
      }
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ client: userId }, { freelancer: userId }],
      }).select("_id");
      if (!project) return acknowledge({ error: "Project access denied." });

      const message = await Message.create({
        project: project._id,
        sender: userId,
        text,
      });
      const savedMessage = {
        _id: message._id,
        project: message.project,
        sender: { _id: userId, name: socket.data.user.name },
        text: message.text,
        createdAt: message.createdAt,
      };
      io.to(room).emit("chat:message", savedMessage);
      return acknowledge({ ok: true, message: savedMessage });
    } catch (error) {
      console.error("Project chat message failed:", error.message);
      return acknowledge({ error: "Unable to send this message." });
    }
  });
});

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`TalentX Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start TalentX server.");
    process.exit(1);
  }
}

startServer();