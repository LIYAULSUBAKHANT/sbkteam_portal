const db = require("../db");
const { logActivity } = require("./activityLogController");

async function createProject(req, res) {
  try {
    const { team_id, name, description, status, progress, deadline } = req.body;

    if (!team_id || !name) {
      return res.status(400).json({ message: "team_id and name are required." });
    }

    const [result] = await db.execute(
      `INSERT INTO projects (team_id, created_by_user_id, name, description, status, progress, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        team_id,
        req.user.id,
        name,
        description || null,
        status || "Planning",
        0,
        deadline || null
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "created project",
      targetType: "project",
      targetId: result.insertId,
      targetLabel: name
    });

    return res.status(201).json({
      message: "Project created successfully.",
      projectId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create project.", error: error.message });
  }
}

async function getAllProjects(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        COALESCE(ROUND(SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0) * 100), 0) AS progress,
        COUNT(t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) AS completed_tasks,
        p.deadline,
        p.created_at,
        p.updated_at,
        p.team_id,
        tm.name AS team_name,
        p.created_by_user_id,
        u.full_name AS created_by_name
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      INNER JOIN teams tm ON tm.id = p.team_id
      LEFT JOIN users u ON u.id = p.created_by_user_id
      GROUP BY p.id, p.name, p.description, p.status, p.deadline, p.created_at, p.updated_at, p.team_id, tm.name, p.created_by_user_id, u.full_name
      ORDER BY p.id ASC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch projects.", error: error.message });
  }
}

async function getProjectsByTeam(req, res) {
  try {
    const { teamId } = req.params;

    const [rows] = await db.execute(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        COALESCE(ROUND(SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0) * 100), 0) AS progress,
        COUNT(t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) AS completed_tasks,
        p.deadline,
        p.created_at,
        p.updated_at,
        p.team_id,
        tm.name AS team_name
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      INNER JOIN teams tm ON tm.id = p.team_id
      WHERE p.team_id = ?
      GROUP BY p.id, p.name, p.description, p.status, p.deadline, p.created_at, p.updated_at, p.team_id, tm.name
      ORDER BY p.id ASC`,
      [teamId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch team projects.", error: error.message });
  }
}

async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { team_id, name, description, status, progress, deadline } = req.body;

    const [projectRows] = await db.execute(
      "SELECT id, name FROM projects WHERE id = ?",
      [id]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    const [result] = await db.execute(
      `UPDATE projects
       SET team_id = COALESCE(?, team_id),
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           progress = COALESCE(?, progress),
           deadline = COALESCE(?, deadline),
           updated_at = NOW()
       WHERE id = ?`,
      [
        team_id || null,
        name || null,
        description || null,
        status || null,
        typeof progress === "number" ? progress : null,
        deadline || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    await logActivity({
      userId: req.user.id,
      action: "updated project",
      targetType: "project",
      targetId: Number(id),
      targetLabel: name || projectRows[0].name
    });

    return res.status(200).json({ message: "Project updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update project.", error: error.message });
  }
}

async function deleteProject(req, res) {
  let connection;

  try {
    const { id } = req.params;
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [projectRows] = await connection.execute("SELECT id, name FROM projects WHERE id = ?", [id]);

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Project not found." });
    }

    await connection.execute("DELETE FROM tasks WHERE project_id = ?", [id]);
    await connection.execute("DELETE FROM projects WHERE id = ?", [id]);
    await connection.commit();

    await logActivity({
      userId: req.user.id,
      action: "deleted project",
      targetType: "project",
      targetId: Number(id),
      targetLabel: projectRows[0].name
    });

    return res.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Failed to delete project.", error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { createProject, getAllProjects, getProjectsByTeam, updateProject, deleteProject };
