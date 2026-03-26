const db = require("../db");
const { logActivity } = require("./activityLogController");
const { emitDataChanged } = require("../socket");

function canEditSkillAssignment(roleKey) {
  return roleKey === "captain" || roleKey === "strategist";
}

function canDeleteSkillAssignment(roleKey) {
  return roleKey === "captain" || roleKey === "strategist";
}

async function assignSkill(req, res) {
  try {
    const { user_id, user_ids, skill_id, skill_name, level, description, assigned_at } = req.body;
    const normalizedUserIds = Array.isArray(user_ids)
      ? [...new Set(user_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
      : (Number.isInteger(Number(user_id)) && Number(user_id) > 0 ? [Number(user_id)] : []);

    if (normalizedUserIds.length === 0 || !skill_name || !assigned_at) {
      return res.status(400).json({ message: "At least one user_id, skill_name, and assigned_at are required." });
    }

    const [users] = await db.query("SELECT id FROM users WHERE id IN (?)", [normalizedUserIds]);

    if (users.length !== normalizedUserIds.length) {
      return res.status(400).json({ message: "One or more user_ids are invalid." });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const assignmentIds = [];

      for (const targetUserId of normalizedUserIds) {
        const [result] = await connection.execute(
          `INSERT INTO weekly_skill_assignments (
            user_id,
            skill_id,
            assigned_by_user_id,
            skill_name,
            level,
            description,
            status,
            assigned_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetUserId,
            skill_id || null,
            req.user.id,
            skill_name,
            level || "Beginner",
            description || null,
            "Pending",
            assigned_at
          ]
        );

        assignmentIds.push(result.insertId);
      }

      await connection.commit();

      for (const assignmentId of assignmentIds) {
        await logActivity({
          userId: req.user.id,
          action: "assigned weekly skill",
          targetType: "weekly_skill_assignment",
          targetId: assignmentId,
          targetLabel: skill_name
        });
      }

      for (const targetUserId of normalizedUserIds) {
        emitDataChanged({ type: "skill", action: "create", data: { userId: targetUserId } });
      }

      return res.status(201).json({
        message: "Skill assigned successfully.",
        assignmentIds
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign skill.", error: error.message });
  }
}

async function updateSkill(req, res) {
  try {
    const { id } = req.params;
    const { user_id, skill_id, skill_name, level, description, assigned_at, status } = req.body;

    if (!canEditSkillAssignment(req.user.roleKey)) {
      return res.status(403).json({ message: "You do not have permission to edit skill assignments." });
    }

    const [rows] = await db.execute(
      "SELECT id, skill_name FROM weekly_skill_assignments WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Skill assignment not found." });
    }

    const normalizedPayload = {};

    if (user_id !== undefined) normalizedPayload.user_id = Number(user_id);
    if (skill_id !== undefined) normalizedPayload.skill_id = skill_id ? Number(skill_id) : null;
    if (skill_name !== undefined) normalizedPayload.skill_name = String(skill_name || "").trim() || null;
    if (level !== undefined) normalizedPayload.level = String(level || "").trim() || "Beginner";
    if (description !== undefined) normalizedPayload.description = String(description || "").trim() || null;
    if (assigned_at !== undefined) normalizedPayload.assigned_at = assigned_at || null;
    if (status !== undefined) normalizedPayload.status = String(status || "").trim() || "Pending";

    if (Object.keys(normalizedPayload).length === 0) {
      return res.status(400).json({ message: "No valid fields were provided for update." });
    }

    if (normalizedPayload.user_id !== undefined) {
      const [users] = await db.execute("SELECT id FROM users WHERE id = ?", [normalizedPayload.user_id]);
      if (users.length === 0) {
        return res.status(400).json({ message: "Invalid user_id." });
      }
    }

    if (normalizedPayload.skill_name === null) {
      return res.status(400).json({ message: "skill_name is required." });
    }

    await db.query("UPDATE weekly_skill_assignments SET ? WHERE id = ?", [normalizedPayload, id]);

    await logActivity({
      userId: req.user.id,
      action: "updated weekly skill",
      targetType: "weekly_skill_assignment",
      targetId: Number(id),
      targetLabel: normalizedPayload.skill_name || rows[0].skill_name
    });

    emitDataChanged({ type: "skill", action: "update", data: { id: Number(id) } });

    return res.status(200).json({ message: "Skill updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update skill.", error: error.message });
  }
}

async function updateSkillStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required." });
    }

    const [rows] = await db.execute(
      "SELECT id, user_id, skill_name FROM weekly_skill_assignments WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Skill assignment not found." });
    }

    const assignment = rows[0];

    if (req.user.roleKey === "member" && assignment.user_id !== req.user.id) {
      return res.status(403).json({ message: "Members can only update their own skill assignments." });
    }

    await db.execute(
      `UPDATE weekly_skill_assignments
       SET status = ?,
           completed_at = CASE WHEN ? = 'Completed' THEN NOW() ELSE completed_at END
       WHERE id = ?`,
      [status, status, id]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated weekly skill status",
      targetType: "weekly_skill_assignment",
      targetId: Number(id),
      targetLabel: assignment.skill_name
    });

    emitDataChanged({ type: "skill", action: "update", data: { id: Number(id) } });

    return res.status(200).json({ message: "Skill status updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update skill status.", error: error.message });
  }
}

async function deleteSkill(req, res) {
  try {
    const { id } = req.params;

    if (!canDeleteSkillAssignment(req.user.roleKey)) {
      return res.status(403).json({ message: "You do not have permission to delete skill assignments." });
    }

    const [rows] = await db.execute(
      "SELECT id, skill_name FROM weekly_skill_assignments WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Skill assignment not found." });
    }

    await db.execute("DELETE FROM weekly_skill_assignments WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: "deleted weekly skill",
      targetType: "weekly_skill_assignment",
      targetId: Number(id),
      targetLabel: rows[0].skill_name
    });

    emitDataChanged({ type: "skill", action: "delete", data: { id: Number(id) } });

    return res.status(200).json({ message: "Skill deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete skill.", error: error.message });
  }
}

async function getSkillsByUser(req, res) {
  try {
    const requestedUserId = Number(req.params.userId);
    const effectiveUserId = req.user.roleKey === "member" ? req.user.id : requestedUserId;

    const [rows] = await db.execute(
      `SELECT
        wsa.id,
        wsa.user_id,
        u.full_name AS user_name,
        wsa.skill_id,
        s.name AS catalog_skill_name,
        wsa.skill_name,
        wsa.level,
        wsa.description,
        wsa.status,
        wsa.assigned_at,
        wsa.completed_at,
        wsa.assigned_by_user_id,
        au.full_name AS assigned_by_name
      FROM weekly_skill_assignments wsa
      INNER JOIN users u ON u.id = wsa.user_id
      LEFT JOIN skills s ON s.id = wsa.skill_id
      LEFT JOIN users au ON au.id = wsa.assigned_by_user_id
      WHERE wsa.user_id = ?
      ORDER BY wsa.id ASC`,
      [effectiveUserId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch skills.", error: error.message });
  }
}

module.exports = { assignSkill, updateSkill, updateSkillStatus, deleteSkill, getSkillsByUser };
