const db = require("../db");
const { logActivity } = require("./activityLogController");
const { emitDataChanged } = require("../socket");
const { ensureDiscussionThread } = require("../services/discussionsService");

let taskColumnSetCache = null;

async function getTaskColumnSet() {
  if (taskColumnSetCache) {
    return taskColumnSetCache;
  }

  const [rows] = await db.execute("SHOW COLUMNS FROM tasks");
  taskColumnSetCache = new Set(rows.map((row) => row.Field));
  return taskColumnSetCache;
}

async function hasCompletedAtColumn() {
  const columns = await getTaskColumnSet();
  return columns.has("completed_at");
}

async function hasProofWorkflowColumns() {
  const columns = await getTaskColumnSet();

  return [
    "proof_type",
    "proof_link",
    "proof_note",
    "proof_submitted_at",
    "proof_review_feedback",
    "proof_reviewed_by_user_id",
    "proof_reviewed_at",
  ].every((column) => columns.has(column));
}

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
    const supportsCompletionHistory = await hasCompletedAtColumn();
    const supportsProofWorkflow = await hasProofWorkflowColumns();
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
        ${supportsCompletionHistory ? "t.completed_at" : "NULL AS completed_at"},
        ${supportsProofWorkflow ? "t.proof_type" : "NULL AS proof_type"},
        ${supportsProofWorkflow ? "t.proof_link" : "NULL AS proof_link"},
        ${supportsProofWorkflow ? "t.proof_note" : "NULL AS proof_note"},
        ${supportsProofWorkflow ? "t.proof_submitted_at" : "NULL AS proof_submitted_at"},
        ${supportsProofWorkflow ? "t.proof_review_feedback" : "NULL AS proof_review_feedback"},
        ${supportsProofWorkflow ? "t.proof_reviewed_by_user_id" : "NULL AS proof_reviewed_by_user_id"},
        ${supportsProofWorkflow ? "ru.full_name AS proof_reviewed_by_name" : "NULL AS proof_reviewed_by_name"},
        ${supportsProofWorkflow ? "t.proof_reviewed_at" : "NULL AS proof_reviewed_at"},
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
      ${supportsProofWorkflow ? "LEFT JOIN users ru ON ru.id = t.proof_reviewed_by_user_id" : ""}
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
    const supportsCompletionHistory = await hasCompletedAtColumn();
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

    if (req.user.roleKey === "member" && status === "Done") {
      return res.status(403).json({ message: "Submit proof before marking a task as completed." });
    }

    if (supportsCompletionHistory) {
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
    } else {
      await db.execute(
        "UPDATE tasks SET status = ? WHERE id = ?",
        [status, id]
      );
    }

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
    const supportsCompletionHistory = await hasCompletedAtColumn();
    const { id } = req.params;
    const { project_id, assigned_to_user_id, title, description, status, priority, due_date } = req.body;

    const [rows] = await db.execute(
      "SELECT id, title FROM tasks WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (supportsCompletionHistory) {
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
    } else {
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
    }

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

async function submitTaskProof(req, res) {
  try {
    const supportsProofWorkflow = await hasProofWorkflowColumns();
    const { id } = req.params;
    const { proof_type, proof_link, proof_note } = req.body;

    if (!supportsProofWorkflow) {
      return res.status(503).json({ message: "Task proof workflow is not ready. Run the latest SQL migration first." });
    }

    if (!proof_type || !proof_link) {
      return res.status(400).json({ message: "proof_type and proof_link are required." });
    }

    const [taskRows] = await db.execute(
      "SELECT id, assigned_to_user_id, title, status FROM tasks WHERE id = ?",
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const task = taskRows[0];

    if (req.user.roleKey === "member" && task.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ message: "Members can only submit proof for their own tasks." });
    }

    if (task.status === "Done") {
      return res.status(400).json({ message: "Task is already completed." });
    }

    await db.execute(
      `UPDATE tasks
       SET status = 'Proof Submitted',
           proof_type = ?,
           proof_link = ?,
           proof_note = ?,
           proof_submitted_at = NOW(),
           proof_review_feedback = NULL,
           proof_reviewed_by_user_id = NULL,
           proof_reviewed_at = NULL
       WHERE id = ?`,
      [proof_type, proof_link, proof_note || null, id]
    );

    await logActivity({
      userId: req.user.id,
      action: "submitted task proof",
      targetType: "task",
      targetId: Number(id),
      targetLabel: task.title
    });

    emitDataChanged({ type: "task", action: "update", data: { id: Number(id) } });

    return res.status(200).json({ message: "Proof submitted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit task proof.", error: error.message });
  }
}

async function reviewTaskProof(req, res) {
  try {
    const supportsProofWorkflow = await hasProofWorkflowColumns();
    const supportsCompletionHistory = await hasCompletedAtColumn();
    const { id } = req.params;
    const { decision, feedback } = req.body;

    if (!supportsProofWorkflow) {
      return res.status(503).json({ message: "Task proof workflow is not ready. Run the latest SQL migration first." });
    }

    if (!["approve", "reject"].includes(String(decision || "").toLowerCase())) {
      return res.status(400).json({ message: "decision must be approve or reject." });
    }

    const [taskRows] = await db.execute(
      "SELECT id, title, status FROM tasks WHERE id = ?",
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const task = taskRows[0];

    if (task.status !== "Proof Submitted") {
      return res.status(400).json({ message: "Only proof-submitted tasks can be reviewed." });
    }

    const isApproved = String(decision).toLowerCase() === "approve";

    if (supportsCompletionHistory) {
      await db.execute(
        `UPDATE tasks
         SET status = ?,
             completed_at = CASE WHEN ? THEN NOW() ELSE NULL END,
             proof_review_feedback = ?,
             proof_reviewed_by_user_id = ?,
             proof_reviewed_at = NOW()
         WHERE id = ?`,
        [isApproved ? "Done" : "In Progress", isApproved, feedback || null, req.user.id, id]
      );
    } else {
      await db.execute(
        `UPDATE tasks
         SET status = ?,
             proof_review_feedback = ?,
             proof_reviewed_by_user_id = ?,
             proof_reviewed_at = NOW()
         WHERE id = ?`,
        [isApproved ? "Done" : "In Progress", feedback || null, req.user.id, id]
      );
    }

    await logActivity({
      userId: req.user.id,
      action: isApproved ? "approved task proof" : "rejected task proof",
      targetType: "task",
      targetId: Number(id),
      targetLabel: task.title
    });

    emitDataChanged({ type: "task", action: "update", data: { id: Number(id) } });

    return res.status(200).json({ message: isApproved ? "Task approved successfully." : "Task proof sent back for rework." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to review task proof.", error: error.message });
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

module.exports = {
  createTask,
  getTasks,
  updateTaskStatus,
  updateTask,
  submitTaskProof,
  reviewTaskProof,
  deleteTask,
};
