const express = require("express");
const { createUser, getAllUsers, getUserById, updateUser, updateUserPerformance, deleteUser, getLeaderboard } = require("../controllers/usersController");
const { allowLeadersOnly, allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowLeadersOnly, createUser);
router.get("/", allowLeadersOnly, getAllUsers);
router.get("/leaderboard", getLeaderboard);
router.get("/:id", getUserById);
router.put("/:id/performance", updateUserPerformance);
router.put("/:id", updateUser);
router.delete("/:id", allowRoles("captain"), deleteUser);

module.exports = router;
