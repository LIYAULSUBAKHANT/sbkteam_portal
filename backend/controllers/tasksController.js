const db = require("../db");
const { logActivity } = require("./activityLogController");
const { emitDataChanged } = require("../socket");
const { ensureDiscussionThread } = require("../services/discussionsService");

async function createTask(req, res) {
  try {
    const { project_id, assigned_to_user_id, member_ids, title, description, status, priority, due_date } = req.body;
    const normalizedMemberIds = Array.isArray(member_ids)
      ? [...new Set(member_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
      : [];
    const fallbackAssigneeId = Number(assigned_to_user_id);
    const assigneeIds = normalizedMemberIds.length > 0
      ? normalizedMemberIds
      : (Number.isInteger(fallbackAssigneeId) && fallbackAssigneeId > 0 ? [fallbackAssigneeId] : []);

    if (!project_id || assigneeIds.length === 0 || !title) {
      return res.status(400).json({ message: "project_id, title, and at least one assignee are required." });
    }

    const connection = await db.getConnection();
    const createdTaskIds = [];

    try {
      await connection.beginTransaction();

      for (const assigneeId of assigneeIds) {
        const [result] = await connection.execute(
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
            assigneeId,
            req.user.id,
            title,
            description || null,
            status || "Pending",
            priority || "Medium",
            due_date || null
          ]
        );

        createdTaskIds.push(result.insertId);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await logActivity({
      userId: req.user.id,
      action: "created task",
      targetType: "task",
      targetId: createdTaskIds[0],
      targetLabel: title
    });

    for (const taskId of createdTaskIds) {
      await ensureDiscussionThread({
        sourceType: "task",
        sourceId: taskId,
        title: `Task: ${title}`,
        createdByUserId: req.user.id,
        contextPreview: description || null,
      });

      emitDataChanged({ type: "task", action: "create", data: { id: taskId } });
    }

    return res.status(201).json({
      message: createdTaskIds.length > 1 ? "Tasks created successfully." : "Task created successfully.",
      taskId: createdTaskIds[0],
      taskIds: createdTaskIds
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
        t.completed_at,
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
      `UPDATE tasks
       SET status = ?,
           completed_at = CASE
             WHEN ? = 'Done' THEN COALESCE(completed_at, NOW())
             WHEN ? <> 'Done' THEN NULL
             ELSE completed_at
           END
       WHERE id = ?`,
      [status, status, status, id]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated task status",
      targetType: "task",
      targetId: Number(id),
      targetLabel: task.title
    });

    emitDataChanged({ type: "task", action: "update", data: { id: Number(id) } });

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
           due_date = COALESCE(?, due_date),
           completed_at = CASE
             WHEN COALESCE(?, status) = 'Done' THEN COALESCE(completed_at, NOW())
             WHEN ? IS NOT NULL AND ? <> 'Done' THEN NULL
             ELSE completed_at
           END
       WHERE id = ?`,
      [
        project_id || null,
        assigned_to_user_id || null,
        title || null,
        description || null,
        status || null,
        priority || null,
        due_date || null,
        status || null,
        status || null,
        status || null,
        id
      ]
    );

    await ensureDiscussionThread({
      sourceType: "task",
      sourceId: Number(id),
      title: `Task: ${title || rows[0].title}`,
      createdByUserId: req.user.id,
      contextPreview: description || null,
    });

    await logActivity({
      userId: req.user.id,
      action: "updated task",
      targetType: "task",
      targetId: Number(id),
      targetLabel: title || rows[0].title
    });

    emitDataChanged({ type: "task", action: "update", data: { id: Number(id) } });

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

    emitDataChanged({ type: "task", action: "delete", data: { id: Number(id) } });

    return res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete task.", error: error.message });
  }
}

module.exports = { createTask, getTasks, updateTaskStatus, updateTask, deleteTask };
