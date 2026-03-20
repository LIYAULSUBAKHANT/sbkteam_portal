const express = require("express");
const { assignSkill, updateSkillStatus, getSkillsByUser } = require("../controllers/skillsController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager", "strategist"), assignSkill);
router.patch("/:id/status", allowRoles("captain", "vice_captain", "manager", "strategist"), updateSkillStatus);
router.get("/user/:userId", getSkillsByUser);

module.exports = router;
