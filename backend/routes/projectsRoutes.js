const express = require("express");
const {
  createProject,
  getAllProjects,
  getProjectsByTeam,
  updateProject,
  deleteProject
} = require("../controllers/projectsController");
const { allowLeadersOnly, allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowLeadersOnly, createProject);
router.get("/", getAllProjects);
router.get("/team/:teamId", getProjectsByTeam);
router.patch("/:id", allowLeadersOnly, updateProject);
router.delete("/:id", allowRoles("captain"), deleteProject);

module.exports = router;
