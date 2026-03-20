const express = require("express");
const { createTeam, assignLead, updateTeam, getAllTeams, deleteTeam, addMembersToTeam } = require("../controllers/teamsController");
const { allowLeadersOnly, allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowLeadersOnly, createTeam);
router.put("/:teamId/add-members", allowLeadersOnly, addMembersToTeam);
router.patch("/:id/lead", allowLeadersOnly, assignLead);
router.patch("/:id", allowRoles("captain"), updateTeam);
router.get("/", getAllTeams);
router.delete("/:id", allowRoles("captain"), deleteTeam);

module.exports = router;
