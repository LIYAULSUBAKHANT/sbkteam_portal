const express = require("express");
const {
  createNotification,
  getNotifications,
  markNotificationAsRead
} = require("../controllers/notificationsController");
const { allowLeadersOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowLeadersOnly, createNotification);
router.get("/", getNotifications);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;
