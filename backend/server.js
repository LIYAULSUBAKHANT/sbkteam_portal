const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const db = require("./db");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const teamsRoutes = require("./routes/teamsRoutes");
const projectsRoutes = require("./routes/projectsRoutes");
const tasksRoutes = require("./routes/tasksRoutes");
const skillsRoutes = require("./routes/skillsRoutes");
const announcementsRoutes = require("./routes/announcementsRoutes");
const remindersRoutes = require("./routes/remindersRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const activityLogsRoutes = require("./routes/activityLogsRoutes");
const { authenticateToken } = require("./middleware/authMiddleware");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "SBK Team Management backend is running." });
});

app.get("/api/health", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.status(200).json({ message: "Server and database are healthy." });
  } catch (error) {
    res.status(500).json({ message: "Database connection failed.", error: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authenticateToken, usersRoutes);
app.use("/api/teams", authenticateToken, teamsRoutes);
app.use("/api/projects", authenticateToken, projectsRoutes);
app.use("/api/tasks", authenticateToken, tasksRoutes);
app.use("/api/skills", authenticateToken, skillsRoutes);
app.use("/api/weekly-skills", authenticateToken, skillsRoutes);
app.use("/api/announcements", authenticateToken, announcementsRoutes);
app.use("/api/reminders", authenticateToken, remindersRoutes);
app.use("/api/notifications", authenticateToken, notificationsRoutes);
app.use("/api/activity-logs", authenticateToken, activityLogsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "Something went wrong.",
    error: error.message
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await db.execute("SELECT 1");
    console.log("[DB] Startup connection test passed.");
  } catch (error) {
    console.error("[DB] Startup connection test failed:", {
      code: error.code,
      errno: error.errno,
      message: error.message
    });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Server failed to start:", error.message);
  }

  process.exit(1);
});
