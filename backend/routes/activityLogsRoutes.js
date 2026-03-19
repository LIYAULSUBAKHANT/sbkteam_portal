const express = require("express");
const { getActivityLogs } = require("../controllers/activityLogsController");
const { allowLeadersOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", allowLeadersOnly, getActivityLogs);

module.exports = router;
