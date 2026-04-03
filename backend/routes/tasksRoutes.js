const express = require("express");
const { createTask, getTasks, updateTaskStatus, updateTask, submitTaskProof, reviewTaskProof, deleteTask } = require("../controllers/tasksController");
const { allowRoles, allowLeadersOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager", "strategist"), createTask);
router.get("/", getTasks);
router.patch("/:id", allowLeadersOnly, updateTask);
router.patch("/:id/proof", submitTaskProof);
router.patch("/:id/proof/review", allowLeadersOnly, reviewTaskProof);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", allowLeadersOnly, deleteTask);

module.exports = router;
