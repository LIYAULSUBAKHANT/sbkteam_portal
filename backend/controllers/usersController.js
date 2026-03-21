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
  u.primary_skill_1,
  u.primary_skill_2,
  u.secondary_skill,
  u.secondary_skill_1,
  u.secondary_skill_2,
  u.special_skill,
  u.special_skill_1,
  u.special_skill_2,
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

function splitSkills(raw) {
  if (!raw) {
    return [null, null];
  }

  const [first, second] = String(raw)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return [first || null, second || null];
}

function joinSkills(first, second) {
  return [first, second]
    .map((value) => (value === undefined || value === null ? "" : String(value).trim()))
    .filter(Boolean)
    .join(", ");
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
      primary_skill,
      secondary_skill,
      special_skill,
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

    if (!full_name || !email) {
      return res.status(400).json({ message: "full_name and email are required." });
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

    const password_hash = await bcrypt.hash(password || "1234", 10);
    const safeRoleId = role_id || 3;
    const safeTeamId = team_id || null;
    const safeActivityPoints = activity_points ?? 0;
    const safeRewardPoints = reward_points ?? 0;

    const [parsedPrimary1, parsedPrimary2] = splitSkills(primary_skill);
    const [parsedSecondary1, parsedSecondary2] = splitSkills(secondary_skill);
    const [parsedSpecial1, parsedSpecial2] = splitSkills(special_skill);

    const finalPrimary1 = primary_skill_1?.trim() || parsedPrimary1 || null;
    const finalPrimary2 = primary_skill_2?.trim() || parsedPrimary2 || null;
    const finalSecondary1 = secondary_skill_1?.trim() || parsedSecondary1 || null;
    const finalSecondary2 = secondary_skill_2?.trim() || parsedSecondary2 || null;
    const finalSpecial1 = special_skill_1?.trim() || parsedSpecial1 || null;
    const finalSpecial2 = special_skill_2?.trim() || parsedSpecial2 || null;

    const finalPrimary = normalizeNullableString(joinSkills(finalPrimary1, finalPrimary2));
    const finalSecondary = normalizeNullableString(joinSkills(finalSecondary1, finalSecondary2));
    const finalSpecial = normalizeNullableString(joinSkills(finalSpecial1, finalSpecial2));

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
        primary_skill,
        primary_skill_1,
        primary_skill_2,
        secondary_skill,
        secondary_skill_1,
        secondary_skill_2,
        special_skill,
        special_skill_1,
        special_skill_2,
        linkedin,
        github,
        leetcode,
        activity_points,
        reward_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        finalPrimary,
        normalizeNullableString(finalPrimary1),
        normalizeNullableString(finalPrimary2),
        finalSecondary,
        normalizeNullableString(finalSecondary1),
        normalizeNullableString(finalSecondary2),
        finalSpecial,
        normalizeNullableString(finalSpecial1),
        normalizeNullableString(finalSpecial2),
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
    const role = req.user.roleName || "Member";

    const leaderRoles = ["Captain", "Vice Captain", "Manager", "Strategist"];

    if (role === "Member") {
      const [rows] = await db.execute(`${userSelectClause} WHERE u.id = ? AND u.is_active = 1`, [req.user.id]);
      return res.status(200).json(rows);
    }

    if (leaderRoles.includes(role)) {
      const [rows] = await db.execute(`${userSelectClause} WHERE u.is_active = 1 ORDER BY u.id ASC`);
      return res.status(200).json(rows);
    }

    return res.status(403).json({ message: "You do not have permission to view users." });
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const role = req.user.roleName || "Member";

    const leaderRoles = ["Captain", "Vice Captain", "Manager", "Strategist"];

    if (role === "Member" && Number(id) !== req.user.id) {
      return res.status(403).json({ message: "Members can only view their own profile." });
    }

    const [rows] = await db.execute(`${userSelectClause} WHERE u.id = ? AND u.is_active = 1`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (role === "Member" && Number(id) === req.user.id) {
      return res.status(200).json(rows[0]);
    }

    if (leaderRoles.includes(role)) {
      return res.status(200).json(rows[0]);
    }

    return res.status(403).json({ message: "You do not have permission to view this user." });
  } catch (error) {
    console.error("GET USER BY ID ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch user.", error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const {
      email,
      password,
      team_id,
      role_id,
      activity_points,
      reward_points,
      points,
      is_active
    } = req.body;

    const [existingUsers] = await db.execute(
      `SELECT
        id,
        full_name,
        primary_skill_1,
        primary_skill_2,
        secondary_skill_1,
        secondary_skill_2,
        special_skill_1,
        special_skill_2
      FROM users
      WHERE id = ?`,
      [id]
    );

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
      "primary_skill_1",
      "primary_skill_2",
      "secondary_skill_1",
      "secondary_skill_2",
      "special_skill_1",
      "special_skill_2",
      "linkedin",
      "github",
      "leetcode"
    ];

    const currentUser = existingUsers[0];

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        normalizedPayload[field] = normalizeNullableString(req.body[field]);
      }
    }

    const skillGroups = [
      ["primary_skill", "primary_skill_1", "primary_skill_2"],
      ["secondary_skill", "secondary_skill_1", "secondary_skill_2"],
      ["special_skill", "special_skill_1", "special_skill_2"],
    ];

    for (const [combinedField, firstField, secondField] of skillGroups) {
      const hasCombined = Object.prototype.hasOwnProperty.call(req.body, combinedField);
      const hasFirst = Object.prototype.hasOwnProperty.call(req.body, firstField);
      const hasSecond = Object.prototype.hasOwnProperty.call(req.body, secondField);

      if (!hasCombined && !hasFirst && !hasSecond) {
        continue;
      }

      let nextFirst = hasFirst ? normalizeNullableString(req.body[firstField]) : undefined;
      let nextSecond = hasSecond ? normalizeNullableString(req.body[secondField]) : undefined;

      if (hasCombined) {
        const [parsedFirst, parsedSecond] = splitSkills(req.body[combinedField]);
        if (!hasFirst) {
          nextFirst = parsedFirst;
        }
        if (!hasSecond) {
          nextSecond = parsedSecond;
        }
      }

      const finalFirst = nextFirst !== undefined ? nextFirst : currentUser[firstField];
      const finalSecond = nextSecond !== undefined ? nextSecond : currentUser[secondField];

      if (nextFirst !== undefined) {
        normalizedPayload[firstField] = nextFirst;
      }
      if (nextSecond !== undefined) {
        normalizedPayload[secondField] = nextSecond;
      }

      normalizedPayload[combinedField] = normalizeNullableString(joinSkills(finalFirst, finalSecond));
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
      const normalizedPassword = String(password || "").trim();
      if (normalizedPassword) {
        normalizedPayload.password_hash = await bcrypt.hash(normalizedPassword, 10);
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
        u.id,
        u.full_name,
        u.activity_points,
        u.team_id,
        t.name AS team_name
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.is_active = 1
      ORDER BY u.activity_points DESC, u.full_name ASC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch leaderboard.", error: error.message });
  }
}

module.exports = { createUser, getAllUsers, getUserById, updateUser, updateUserPerformance, deleteUser, getLeaderboard };
