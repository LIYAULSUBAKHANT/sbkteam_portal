const express = require("express");
const { createAnnouncement, updateAnnouncement, getAnnouncements, deleteAnnouncement } = require("../controllers/announcementsController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain", "manager", "strategist"), createAnnouncement);
router.patch("/:id", allowRoles("captain", "vice_captain", "manager", "strategist"), updateAnnouncement);
router.get("/", getAnnouncements);
router.delete("/:id", allowRoles("captain", "vice_captain", "manager", "strategist"), deleteAnnouncement);

module.exports = router;
