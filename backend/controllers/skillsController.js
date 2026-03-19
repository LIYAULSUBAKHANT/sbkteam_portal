const db = require("../db");
const { logActivity } = require("./activityLogController");

async function assignSkill(req, res) {
  try {
    const { user_id, skill_id, skill_name, level, description, assigned_at } = req.body;

    if (!user_id || !skill_name || !assigned_at) {
      return res.status(400).json({ message: "user_id, skill_name, and assigned_at are required." });
    }

    const [result] = await db.execute(
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
        user_id,
        skill_id || null,
        req.user.id,
        skill_name,
        level || "Beginner",
        description || null,
        "Pending",
        assigned_at
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "assigned weekly skill",
      targetType: "weekly_skill_assignment",
      targetId: result.insertId,
      targetLabel: skill_name
    });

    return res.status(201).json({
      message: "Skill assigned successfully.",
      assignmentId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign skill.", error: error.message });
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

    return res.status(200).json({ message: "Skill status updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update skill status.", error: error.message });
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

module.exports = { assignSkill, updateSkillStatus, getSkillsByUser };
