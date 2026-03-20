const express = require("express");
const { createReminder, updateReminder, getReminders, deleteReminder } = require("../controllers/remindersController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager", "strategist"), createReminder);
router.patch("/:id", allowRoles("captain", "vice_captain", "manager", "strategist"), updateReminder);
router.get("/", getReminders);
router.delete("/:id", allowRoles("captain", "vice_captain", "manager", "strategist"), deleteReminder);

module.exports = router;
