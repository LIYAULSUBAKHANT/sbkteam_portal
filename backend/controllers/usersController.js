const db = require("../db");
const bcrypt = require("bcryptjs");
const { logActivity } = require("./activityLogController");

async function createUser(req, res) {
  try {
    const {
      full_name,
      email,
      role_id,
      team_id,
      password,
      avatar_initials,
      joined_at
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

    const resolvedPassword = password || "1234";
    const passwordHash = await bcrypt.hash(resolvedPassword, 10);
    const resolvedAvatarInitials =
      avatar_initials ||
      full_name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 3);

    const [result] = await db.execute(
      `INSERT INTO users (
        role_id,
        team_id,
        full_name,
        email,
        password_hash,
        avatar_initials,
        joined_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        role_id,
        team_id || null,
        full_name,
        email,
        passwordHash,
        resolvedAvatarInitials || null,
        joined_at || null
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "created user",
      targetType: "user",
      targetId: result.insertId,
      targetLabel: full_name
    });

    return res.status(201).json({
      message: "User created successfully.",
      userId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create user.", error: error.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT 
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
        t.name AS team_name,
        u.role_id,
        r.role_key,
        r.display_name AS role_name
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      INNER JOIN roles r ON r.id = u.role_id
      ORDER BY u.id ASC`
    );

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

    const [rows] = await db.execute(
      `SELECT 
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
        t.name AS team_name,
        u.role_id,
        r.role_key,
        r.display_name AS role_name
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user.", error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, team_id, role_id, avatar_initials, points, activity_points, joined_at, is_active } = req.body;
    const isLeader = req.user.roleKey !== "member";
    const normalizedIsActive =
      typeof is_active === "boolean" ? Number(is_active) :
      typeof is_active === "number" ? is_active :
      null;

    if (!isLeader && Number(id) !== req.user.id) {
      return res.status(403).json({ message: "Members can only update their own profile." });
    }

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

    const nextRoleId = isLeader && role_id ? role_id : null;

    if (nextRoleId) {
      const [roleRows] = await db.execute("SELECT id FROM roles WHERE id = ?", [nextRoleId]);

      if (roleRows.length === 0) {
        return res.status(400).json({ message: "Invalid role_id." });
      }
    }

    await db.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           team_id = COALESCE(?, team_id),
           role_id = COALESCE(?, role_id),
           avatar_initials = COALESCE(?, avatar_initials),
           points = COALESCE(?, points),
           activity_points = COALESCE(?, activity_points),
           joined_at = COALESCE(?, joined_at),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        full_name || null,
        email || null,
        team_id || null,
        nextRoleId,
        avatar_initials || null,
        typeof points === "number" ? points : null,
        typeof activity_points === "number" ? activity_points : null,
        joined_at || null,
        normalizedIsActive,
        id
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated user",
      targetType: "user",
      targetId: Number(id),
      targetLabel: full_name || `User ${id}`
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

    const [updatedRows] = await db.execute(
      `SELECT 
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
        t.name AS team_name,
        u.role_id,
        r.role_key,
        r.display_name AS role_name
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?`,
      [id]
    );

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
