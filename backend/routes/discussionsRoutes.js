const express = require("express");
const { getThreadBySource, createThreadComment, updateThreadComment, deleteThreadComment } = require("../controllers/discussionsController");

const router = express.Router();

router.get("/thread", getThreadBySource);
router.post("/threads/:id/comments", createThreadComment);
router.patch("/comments/:commentId", updateThreadComment);
router.delete("/comments/:commentId", deleteThreadComment);

module.exports = router;
