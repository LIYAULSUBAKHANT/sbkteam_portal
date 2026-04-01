const express = require("express");
const { getThreadBySource, createThreadComment } = require("../controllers/discussionsController");

const router = express.Router();

router.get("/thread", getThreadBySource);
router.post("/threads/:id/comments", createThreadComment);

module.exports = router;
