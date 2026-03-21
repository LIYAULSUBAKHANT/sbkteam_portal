const express = require("express");
const { createUser, getAllUsers, getUserById, updateUser, updateUserPerformance, deleteUser, getLeaderboard } = require("../controllers/usersController");
const { allowLeadersOnly, allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", allowRoles("captain"), createUser);
router.get("/", getAllUsers);
router.get("/leaderboard", getLeaderboard);
router.get("/:id", getUserById);
router.put("/:id/performance", allowRoles("captain", "vice_captain", "manager", "strategist", "member"), updateUserPerformance);
router.put("/:id", allowRoles("captain"), updateUser);
router.delete("/:id", allowRoles("captain"), deleteUser);

module.exports = router;
