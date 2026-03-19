const express = require("express");
const { createTask, getTasks, updateTaskStatus, updateTask, deleteTask } = require("../controllers/tasksController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager"), createTask);
router.get("/", getTasks);
router.patch("/:id", allowRoles("captain"), updateTask);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", allowRoles("captain"), deleteTask);

module.exports = router;
