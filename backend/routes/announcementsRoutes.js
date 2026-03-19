const express = require("express");
const { createAnnouncement, updateAnnouncement, getAnnouncements, deleteAnnouncement } = require("../controllers/announcementsController");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain", "vice_captain"), createAnnouncement);
router.patch("/:id", allowRoles("captain"), updateAnnouncement);
router.get("/", getAnnouncements);
router.delete("/:id", allowRoles("captain"), deleteAnnouncement);

module.exports = router;
