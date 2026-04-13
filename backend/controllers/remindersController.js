const db = require("../db");
const { logActivity } = require("./activityLogController");
const { logInsertedTime, serializeRows } = require("../utils/datetime");
const { emitDataChanged } = require("../socket");
const { createNotificationsForUsers } = require("../services/notificationService");

async function getNotificationRecipients(targetType, targetTeamId, targetUserId) {
  if (targetType === "team" && targetTeamId) {
    const [rows] = await db.execute(
      "SELECT id FROM users WHERE team_id = ? AND is_active = 1",
      [targetTeamId]
    );
    return rows.map((row) => row.id);
  }

  if (targetType === "user" && targetUserId) {
    const [rows] = await db.execute(
      "SELECT id FROM users WHERE id = ? AND is_active = 1",
      [targetUserId]
    );
    return rows.map((row) => row.id);
  }

  const [rows] = await db.execute(
    "SELECT id FROM users WHERE is_active = 1"
  );

  return rows.map((row) => row.id);
}

function buildReminderNotificationMessage(title) {
  return `Reminder: ${title}`;
}

async function createNotificationsForReminder(title, targetType, targetTeamId, targetUserId) {
  const recipients = await getNotificationRecipients(targetType, targetTeamId, targetUserId);

  if (recipients.length === 0) {
    return;
  }

  const message = buildReminderNotificationMessage(title);

  await createNotificationsForUsers({
    userIds: recipients,
    type: "reminder",
    message,
    url: "/admin/dashboard",
  });
}

async function createReminder(req, res) {
  try {
    const { title, description, remind_at, target_type, target_team_id, target_user_id } = req.body;
    const resolvedTargetType = target_type || "all";

    if (!title || !remind_at) {
      return res.status(400).json({ message: "title and remind_at are required." });
    }

    const [result] = await db.execute(
      `INSERT INTO reminders (
        created_by_user_id,
        title,
        description,
        remind_at,
        target_type,
        target_team_id,
        target_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        title,
        description || null,
        remind_at,
        resolvedTargetType,
        target_team_id || null,
        target_user_id || null
      ]
    );

    logInsertedTime("Reminder inserted");

    await createNotificationsForReminder(
      title,
      resolvedTargetType,
      target_team_id || null,
      target_user_id || null
    );

    await logActivity({
      userId: req.user.id,
      action: "created reminder",
      targetType: "reminder",
      targetId: result.insertId,
      targetLabel: title
    });

    emitDataChanged({ type: "reminder", action: "create", data: { id: result.insertId } });
    emitDataChanged({ type: "notification", action: "create", data: { source: "reminder", id: result.insertId } });

    return res.status(201).json({
      message: "Reminder created successfully.",
      reminderId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create reminder.", error: error.message });
  }
}

async function updateReminder(req, res) {
  try {
    const { id } = req.params;
    const { title, description, remind_at, target_type, target_team_id, target_user_id } = req.body;

    const [rows] = await db.execute(
      "SELECT id, title FROM reminders WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    await db.execute(
      `UPDATE reminders
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           remind_at = COALESCE(?, remind_at),
           target_type = COALESCE(?, target_type),
           target_team_id = ?,
           target_user_id = ?
       WHERE id = ?`,
      [
        title || null,
        description || null,
        remind_at || null,
        target_type || null,
        target_team_id || null,
        target_user_id || null,
        id
      ]
    );

    if (title && title !== rows[0].title) {
      await db.execute(
        `UPDATE notifications
         SET message = ?
         WHERE type = 'reminder' AND message = ?`,
        [buildReminderNotificationMessage(title), buildReminderNotificationMessage(rows[0].title)]
      );
    }

    await logActivity({
      userId: req.user.id,
      action: "updated reminder",
      targetType: "reminder",
      targetId: Number(id),
      targetLabel: title || rows[0].title
    });

    emitDataChanged({ type: "reminder", action: "update", data: { id: Number(id) } });
    emitDataChanged({ type: "notification", action: "update", data: { source: "reminder", id: Number(id) } });

    return res.status(200).json({ message: "Reminder updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update reminder.", error: error.message });
  }
}

async function getReminders(req, res) {
  try {
    const isLeader = req.user.roleKey !== "member";
    const query = isLeader
      ? `SELECT
          r.id,
          r.title,
          r.description,
          r.remind_at,
          r.target_type,
          r.target_team_id,
          t.name AS target_team_name,
          r.target_user_id,
          tu.full_name AS target_user_name,
          r.is_completed,
          r.created_by_user_id,
          cu.full_name AS created_by_name
        FROM reminders r
        INNER JOIN users cu ON cu.id = r.created_by_user_id
        LEFT JOIN teams t ON t.id = r.target_team_id
        LEFT JOIN users tu ON tu.id = r.target_user_id
        ORDER BY r.remind_at ASC`
      : `SELECT
          r.id,
          r.title,
          r.description,
          r.remind_at,
          r.target_type,
          r.target_team_id,
          t.name AS target_team_name,
          r.target_user_id,
          tu.full_name AS target_user_name,
          r.is_completed,
          r.created_by_user_id,
          cu.full_name AS created_by_name
        FROM reminders r
        INNER JOIN users cu ON cu.id = r.created_by_user_id
        LEFT JOIN teams t ON t.id = r.target_team_id
        LEFT JOIN users tu ON tu.id = r.target_user_id
        WHERE r.target_type = 'all'
           OR (r.target_type = 'team' AND r.target_team_id = ?)
           OR (r.target_type = 'user' AND r.target_user_id = ?)
        ORDER BY r.remind_at ASC`;

    const [rows] = await db.execute(
      query,
      isLeader ? [] : [req.user.teamId || 0, req.user.id]
    );

    return res.status(200).json(serializeRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reminders.", error: error.message });
  }
}

async function deleteReminder(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT id, title FROM reminders WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    await db.execute(
      `DELETE FROM notifications
       WHERE type = 'reminder' AND message = ?`,
      [buildReminderNotificationMessage(rows[0].title)]
    );

    await db.execute("DELETE FROM reminders WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: "deleted reminder",
      targetType: "reminder",
      targetId: Number(id),
      targetLabel: rows[0].title
    });

    emitDataChanged({ type: "reminder", action: "delete", data: { id: Number(id) } });
    emitDataChanged({ type: "notification", action: "delete", data: { source: "reminder", id: Number(id) } });

    return res.status(200).json({ message: "Reminder deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete reminder.", error: error.message });
  }
}

module.exports = { createReminder, updateReminder, getReminders, deleteReminder };

