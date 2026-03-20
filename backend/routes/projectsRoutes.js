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
router.delete("/:id", allowLeadersOnly, deleteProject);

module.exports = router;
