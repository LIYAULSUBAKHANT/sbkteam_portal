const db = require("../db");
const { logActivity } = require("./activityLogController");

async function createTeam(req, res) {
  try {
    const { name, description, lead_user_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Team name is required." });
    }

    const [result] = await db.execute(
      `INSERT INTO teams (name, description, lead_user_id)
       VALUES (?, ?, ?)`,
      [name, description || null, lead_user_id || null]
    );

    await logActivity({
      userId: req.user.id,
      action: "created team",
      targetType: "team",
      targetId: result.insertId,
      targetLabel: name
    });

    return res.status(201).json({
      message: "Team created successfully.",
      teamId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create team.", error: error.message });
  }
}

async function assignLead(req, res) {
  try {
    const { id } = req.params;
    const { lead_user_id } = req.body;

    if (!lead_user_id) {
      return res.status(400).json({ message: "lead_user_id is required." });
    }

    const [result] = await db.execute(
      "UPDATE teams SET lead_user_id = ? WHERE id = ?",
      [lead_user_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    await logActivity({
      userId: req.user.id,
      action: "assigned team lead",
      targetType: "team",
      targetId: Number(id),
      targetLabel: `Team ${id}`
    });

    return res.status(200).json({ message: "Team lead assigned successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign team lead.", error: error.message });
  }
}

async function updateTeam(req, res) {
  try {
    const { id } = req.params;
    const { name, description, lead_user_id } = req.body;

    const [rows] = await db.execute("SELECT id, name FROM teams WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    await db.execute(
      `UPDATE teams
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           lead_user_id = ?
       WHERE id = ?`,
      [
        name || null,
        description ?? null,
        lead_user_id || null,
        id
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated team",
      targetType: "team",
      targetId: Number(id),
      targetLabel: name || rows[0].name
    });

    return res.status(200).json({ message: "Team updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update team.", error: error.message });
  }
}

async function getAllTeams(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT 
        t.id,
        t.name,
        t.description,
        t.lead_user_id,
        u.full_name AS lead_name,
        COUNT(m.id) AS member_count
      FROM teams t
      LEFT JOIN users u ON u.id = t.lead_user_id
      LEFT JOIN users m ON m.team_id = t.id
      GROUP BY t.id, t.name, t.description, t.lead_user_id, u.full_name
      ORDER BY t.id ASC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch teams.", error: error.message });
  }
}

async function deleteTeam(req, res) {
  let connection;

  try {
    const { id } = req.params;
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [teamRows] = await connection.execute("SELECT id, name FROM teams WHERE id = ?", [id]);

    if (teamRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Team not found." });
    }

    const [projectRows] = await connection.execute("SELECT id FROM projects WHERE team_id = ?", [id]);

    if (projectRows.length > 0) {
      const projectIds = projectRows.map((project) => project.id);
      const placeholders = projectIds.map(() => "?").join(", ");
      await connection.execute(`DELETE FROM tasks WHERE project_id IN (${placeholders})`, projectIds);
      await connection.execute(`DELETE FROM projects WHERE id IN (${placeholders})`, projectIds);
    }

    await connection.execute("DELETE FROM announcements WHERE target_team_id = ?", [id]);
    await connection.execute("DELETE FROM reminders WHERE target_team_id = ?", [id]);
    await connection.execute("UPDATE users SET team_id = NULL WHERE team_id = ?", [id]);
    await connection.execute("DELETE FROM teams WHERE id = ?", [id]);
    await connection.commit();

    await logActivity({
      userId: req.user.id,
      action: "deleted team",
      targetType: "team",
      targetId: Number(id),
      targetLabel: teamRows[0].name
    });

    return res.status(200).json({ message: "Team deleted successfully." });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Failed to delete team.", error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { createTeam, assignLead, updateTeam, getAllTeams, deleteTeam };
