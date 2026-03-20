const db = require("../db");
const bcrypt = require("bcrypt");
const { logActivity } = require("./activityLogController");

const userSelectClause = `SELECT
  u.id,
  u.full_name,
  u.email,
  u.avatar_initials,
  u.points,
  u.activity_points,
  u.reward_points,
  u.cgpa,
  u.joined_at,
  u.is_active,
  u.team_id,
  u.roll_number,
  u.department,
  u.position,
  u.special_lab,
  u.primary_skill,
  u.secondary_skill,
  u.special_skill,
  u.linkedin,
  u.github,
  u.leetcode,
  t.name AS team_name,
  u.role_id,
  r.role_key,
  r.display_name AS role_name
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
INNER JOIN roles r ON r.id = u.role_id`;

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeNullableNumber(value, fieldName) {
  if (value === undefined) {
    return { value: undefined };
  }

  if (value === null || value === "") {
    return { value: null };
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return { error: `${fieldName} must be a valid number.` };
  }

  return { value: normalized };
}

async function createUser(req, res) {
  try {
    const {
      full_name,
      email,
      role_id,
      team_id,
      password,
      avatar_initials,
      joined_at,
      roll_number,
      department,
      position,
      special_lab,
      primary_skill_1,
      primary_skill_2,
      secondary_skill_1,
      secondary_skill_2,
      special_skill_1,
      special_skill_2,
      linkedin,
      github,
      leetcode,
      activity_points,
      reward_points
    } = req.body;

    if (!full_name || !email || !role_id) {
      return res.status(400).json({ message: "full_name, email, and role_id are required." });
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const [roles] = await db.execute(
      "SELECT id FROM roles WHERE id = ?",
      [role_id]
    );

    if (roles.length === 0) {
      return res.status(400).json({ message: "Invalid role_id." });
    }

    if (team_id) {
      const [teams] = await db.execute(
        "SELECT id FROM teams WHERE id = ?",
        [team_id]
      );

      if (teams.length === 0) {
        return res.status(400).json({ message: "Invalid team_id." });
      }
    }

    console.log("REQ BODY:", req.body);

    const password_hash = password || "1234";
    const safeRoleId = role_id || 3;
    const safeTeamId = team_id || null;
    const safeActivityPoints = activity_points ?? 0;
    const safeRewardPoints = reward_points ?? 0;

    const nextActivityPoints = normalizeNullableNumber(safeActivityPoints, "activity_points");
    const nextRewardPoints = normalizeNullableNumber(safeRewardPoints, "reward_points");

    if (nextActivityPoints.error || nextRewardPoints.error) {
      return res.status(400).json({
        message: nextActivityPoints.error || nextRewardPoints.error
      });
    }

    const [result] = await db.execute(
      `INSERT INTO users (
        full_name,
        email,
        password_hash,
        role_id,
        team_id,
        roll_number,
        department,
        position,
        special_lab,
        primary_skill_1,
        primary_skill_2,
        secondary_skill_1,
        secondary_skill_2,
        special_skill_1,
        special_skill_2,
        linkedin,
        github,
        leetcode,
        activity_points,
        reward_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        password_hash,
        safeRoleId,
        safeTeamId,
        normalizeNullableString(roll_number),
        normalizeNullableString(department),
        normalizeNullableString(position),
        normalizeNullableString(special_lab),
        normalizeNullableString(primary_skill_1),
        normalizeNullableString(primary_skill_2),
        normalizeNullableString(secondary_skill_1),
        normalizeNullableString(secondary_skill_2),
        normalizeNullableString(special_skill_1),
        normalizeNullableString(special_skill_2),
        normalizeNullableString(linkedin),
        normalizeNullableString(github),
        normalizeNullableString(leetcode),
        nextActivityPoints.value ?? 0,
        nextRewardPoints.value ?? 0
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "created user",
      targetType: "user",
      targetId: result.insertId,
      targetLabel: full_name
    });

    return res.json({ message: "User created successfully" });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return res.status(500).json({ message: "Failed to create user.", error: error.message });
  }
}

async function getAllUsers(req, res) {
  try {
    let query = `${userSelectClause} WHERE u.is_active = 1`;
    const params = [];

    if (req.user.roleKey !== "captain") {
      query += " AND u.team_id = ?";
      params.push(req.user.teamId || 0);
    }

    query += " ORDER BY u.id ASC";

    const [rows] = await db.execute(query, params);

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const isLeader = req.user.roleKey !== "member";

    if (!isLeader && Number(id) !== req.user.id) {
      return res.status(403).json({ message: "Members can only view their own profile." });
    }

    const [rows] = await db.execute(`${userSelectClause} WHERE u.id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (
      req.user.roleKey !== "captain" &&
      isLeader &&
      rows[0].team_id !== req.user.teamId
    ) {
      return res.status(403).json({ message: "Leaders can only view members from their own team." });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user.", error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const {
      email,
      team_id,
      role_id,
      activity_points,
      reward_points,
      points,
      is_active
    } = req.body;

    const [existingUsers] = await db.execute("SELECT id FROM users WHERE id = ?", [id]);

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (email) {
      const [emailRows] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ?",
        [email, id]
      );

      if (emailRows.length > 0) {
        return res.status(409).json({ message: "Email is already in use by another user." });
      }
    }

    if (role_id !== undefined && role_id !== null) {
      const [roleRows] = await db.execute("SELECT id FROM roles WHERE id = ?", [role_id]);

      if (roleRows.length === 0) {
        return res.status(400).json({ message: "Invalid role_id." });
      }
    }

    if (team_id) {
      const [teams] = await db.execute("SELECT id FROM teams WHERE id = ?", [team_id]);

      if (teams.length === 0) {
        return res.status(400).json({ message: "Invalid team_id." });
      }
    }

    const numericFields = {
      role_id,
      team_id,
      points,
      activity_points,
      reward_points,
      is_active:
        typeof is_active === "boolean" ? Number(is_active) :
        is_active
    };
    const normalizedPayload = {};
    const stringFields = [
      "full_name",
      "email",
      "avatar_initials",
      "joined_at",
      "roll_number",
      "department",
      "position",
      "special_lab",
      "primary_skill",
      "secondary_skill",
      "special_skill",
      "linkedin",
      "github",
      "leetcode"
    ];

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        normalizedPayload[field] = normalizeNullableString(req.body[field]);
      }
    }

    for (const [field, value] of Object.entries(numericFields)) {
      if (value === undefined) {
        continue;
      }

      if (value === null || value === "") {
        normalizedPayload[field] = null;
        continue;
      }

      const normalized = Number(value);

      if (!Number.isFinite(normalized)) {
        return res.status(400).json({ message: `${field} must be a valid number.` });
      }

      normalizedPayload[field] = normalized;
    }

    if (Object.keys(normalizedPayload).length === 0) {
      return res.status(400).json({ message: "No valid fields were provided for update." });
    }

    await db.query("UPDATE users SET ? WHERE id = ?", [normalizedPayload, id]);

    await logActivity({
      userId: req.user.id,
      action: "updated user",
      targetType: "user",
      targetId: Number(id),
      targetLabel: normalizedPayload.full_name || `User ${id}`
    });

    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user.", error: error.message });
  }
}

async function updateUserPerformance(req, res) {
  try {
    const { id } = req.params;
    const { activity_points, reward_points, cgpa } = req.body;
    const isLeader = req.user.roleKey !== "member";

    if (!isLeader && Number(id) !== req.user.id) {
      return res.status(403).json({ message: "Members can only update their own performance." });
    }

    const nextActivityPoints =
      activity_points === undefined ? null : Number(activity_points);
    const nextRewardPoints =
      reward_points === undefined ? null : Number(reward_points);
    const nextCgpa = cgpa === undefined ? null : Number(cgpa);

    if (activity_points !== undefined && !Number.isFinite(nextActivityPoints)) {
      return res.status(400).json({ message: "activity_points must be a valid number." });
    }

    if (reward_points !== undefined && !Number.isFinite(nextRewardPoints)) {
      return res.status(400).json({ message: "reward_points must be a valid number." });
    }

    if (cgpa !== undefined && !Number.isFinite(nextCgpa)) {
      return res.status(400).json({ message: "cgpa must be a valid number." });
    }

    const [existingUsers] = await db.execute("SELECT id, full_name FROM users WHERE id = ?", [id]);

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    await db.execute(
      `UPDATE users
       SET activity_points = COALESCE(?, activity_points),
           reward_points = COALESCE(?, reward_points),
           cgpa = COALESCE(?, cgpa)
       WHERE id = ?`,
      [nextActivityPoints, nextRewardPoints, nextCgpa, id]
    );

    const [updatedRows] = await db.execute(`${userSelectClause} WHERE u.id = ?`, [id]);

    await logActivity({
      userId: req.user.id,
      action: "updated performance",
      targetType: "user",
      targetId: Number(id),
      targetLabel: existingUsers[0].full_name || `User ${id}`
    });

    return res.status(200).json({
      message: "Performance updated successfully.",
      user: updatedRows[0]
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update performance.", error: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: "Captain cannot delete their own account." });
    }

    const [rows] = await db.execute("SELECT id, full_name FROM users WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    await db.execute("UPDATE teams SET lead_user_id = NULL WHERE lead_user_id = ?", [id]);
    await db.execute(
      `UPDATE users
       SET is_active = 0,
           team_id = NULL
       WHERE id = ?`,
      [id]
    );

    await logActivity({
      userId: req.user.id,
      action: "deleted user",
      targetType: "user",
      targetId: Number(id),
      targetLabel: rows[0].full_name
    });

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user.", error: error.message });
  }
}

async function getLeaderboard(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT
        id,
        full_name,
        activity_points
      FROM users
      WHERE is_active = 1
      ORDER BY activity_points DESC, full_name ASC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch leaderboard.", error: error.message });
  }
}

module.exports = { createUser, getAllUsers, getUserById, updateUser, updateUserPerformance, deleteUser, getLeaderboard };
