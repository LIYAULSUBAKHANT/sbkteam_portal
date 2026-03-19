const db = require("../db");
const { logActivity } = require("./activityLogController");

async function createTask(req, res) {
  try {
    const { project_id, assigned_to_user_id, title, description, status, priority, due_date } = req.body;

    if (!project_id || !assigned_to_user_id || !title) {
      return res.status(400).json({ message: "project_id, assigned_to_user_id, and title are required." });
    }

    const [result] = await db.execute(
      `INSERT INTO tasks (
        project_id,
        assigned_to_user_id,
        created_by_user_id,
        title,
        description,
        status,
        priority,
        due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        assigned_to_user_id,
        req.user.id,
        title,
        description || null,
        status || "Pending",
        priority || "Medium",
        due_date || null
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "created task",
      targetType: "task",
      targetId: result.insertId,
      targetLabel: title
    });

    return res.status(201).json({
      message: "Task created successfully.",
      taskId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create task.", error: error.message });
  }
}

async function getTasks(req, res) {
  try {
    const isMember = req.user.roleKey === "member";
    const values = [];
    let whereClause = "";

    if (isMember) {
      whereClause = "WHERE t.assigned_to_user_id = ?";
      values.push(req.user.id);
    }

    const [rows] = await db.execute(
      `SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.project_id,
        p.name AS project_name,
        t.assigned_to_user_id,
        au.full_name AS assigned_to_name,
        t.created_by_user_id,
        cu.full_name AS created_by_name,
        t.created_at,
        t.updated_at
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      INNER JOIN users au ON au.id = t.assigned_to_user_id
      LEFT JOIN users cu ON cu.id = t.created_by_user_id
      ${whereClause}
      ORDER BY t.id ASC`,
      values
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch tasks.", error: error.message });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required." });
    }

    const [taskRows] = await db.execute(
      "SELECT id, assigned_to_user_id, title FROM tasks WHERE id = ?",
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const task = taskRows[0];

    if (req.user.roleKey === "member" && task.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ message: "Members can only update their own tasks." });
    }

    await db.execute(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [status, id]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated task status",
      targetType: "task",
      targetId: Number(id),
      targetLabel: task.title
    });

    return res.status(200).json({ message: "Task status updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update task status.", error: error.message });
  }
}

async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { project_id, assigned_to_user_id, title, description, status, priority, due_date } = req.body;

    const [rows] = await db.execute(
      "SELECT id, title FROM tasks WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    await db.execute(
      `UPDATE tasks
       SET project_id = COALESCE(?, project_id),
           assigned_to_user_id = COALESCE(?, assigned_to_user_id),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           due_date = COALESCE(?, due_date)
       WHERE id = ?`,
      [
        project_id || null,
        assigned_to_user_id || null,
        title || null,
        description || null,
        status || null,
        priority || null,
        due_date || null,
        id
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated task",
      targetType: "task",
      targetId: Number(id),
      targetLabel: title || rows[0].title
    });

    return res.status(200).json({ message: "Task updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update task.", error: error.message });
  }
}

async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT id, title FROM tasks WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    await db.execute("DELETE FROM tasks WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: "deleted task",
      targetType: "task",
      targetId: Number(id),
      targetLabel: rows[0].title
    });

    return res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete task.", error: error.message });
  }
}

module.exports = { createTask, getTasks, updateTaskStatus, updateTask, deleteTask };
