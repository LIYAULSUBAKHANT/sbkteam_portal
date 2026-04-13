const db = require("../db");
const { logActivity } = require("./activityLogController");
const { logInsertedTime, serializeRows } = require("../utils/datetime");
const { emitDataChanged } = require("../socket");
const { createNotificationsForUsers, hasPushConfig } = require("../services/notificationService");

async function createNotification(req, res) {
  try {
    const { user_id, user_ids, type, message } = req.body;
    const normalizedUserIds = Array.isArray(user_ids)
      ? [...new Set(user_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
      : (Number.isInteger(Number(user_id)) && Number(user_id) > 0 ? [Number(user_id)] : []);

    if (normalizedUserIds.length === 0 || !type || !message) {
      return res.status(400).json({ message: "At least one user_id, type, and message are required." });
    }

    const result = await createNotificationsForUsers({
      userIds: normalizedUserIds,
      type,
      message,
      url: "/admin/dashboard",
    });

    logInsertedTime("Notification inserted");

    await logActivity({
      userId: req.user.id,
      action: "created notification",
      targetType: "notification",
      targetId: normalizedUserIds[0],
      targetLabel: message
    });

    emitDataChanged({ type: "notification", action: "create", data: { userIds: normalizedUserIds } });

    return res.status(201).json({
      message: "Notification created successfully.",
      recipientCount: result.created,
      pushConfigured: hasPushConfig(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create notification.", error: error.message });
  }
}

async function getNotifications(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, user_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json(serializeRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await logActivity({
      userId: req.user.id,
      action: "marked notification as read",
      targetType: "notification",
      targetId: Number(id),
      targetLabel: `Notification ${id}`
    });

    emitDataChanged({ type: "notification", action: "update", data: { id: Number(id), userId: req.user.id } });

    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notification.", error: error.message });
  }
}

module.exports = { createNotification, getNotifications, markNotificationAsRead };
