const express = require("express");
const { createReminder, updateReminder, getReminders, deleteReminder } = require("../controllers/remindersController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager"), createReminder);
router.patch("/:id", allowRoles("captain"), updateReminder);
router.get("/", getReminders);
router.delete("/:id", allowRoles("captain"), deleteReminder);

module.exports = router;
