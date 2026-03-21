const express = require("express");
const { assignSkill, updateSkill, updateSkillStatus, deleteSkill, getSkillsByUser } = require("../controllers/skillsController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager", "strategist"), assignSkill);
router.patch("/:id", allowRoles("captain", "strategist"), updateSkill);
router.patch("/:id/status", allowRoles("captain", "vice_captain", "manager", "strategist", "member"), updateSkillStatus);
router.delete("/:id", allowRoles("captain"), deleteSkill);
router.get("/user/:userId", getSkillsByUser);

module.exports = router;
