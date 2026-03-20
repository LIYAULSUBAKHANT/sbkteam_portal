const db = require("../db");
const { logActivity } = require("./activityLogController");
const { logInsertedTime, serializeRows } = require("../utils/datetime");

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

async function createNotificationsForAnnouncement(title, targetType, targetTeamId, targetUserId) {
  const recipients = await getNotificationRecipients(targetType, targetTeamId, targetUserId);

  if (recipients.length === 0) {
    return;
  }

  const message = `New announcement: ${title}`;

  await Promise.all(
    recipients.map((userId) =>
      db.execute(
        `INSERT INTO notifications (user_id, type, message, created_at)
         VALUES (?, 'announcement', ?, NOW())`,
        [userId, message]
      )
    )
  );
}

async function createAnnouncement(req, res) {
  try {
    const { title, message, target_type, target_team_id, target_user_id } = req.body;
    const resolvedTargetType = target_type || "all";

    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required." });
    }

    const [result] = await db.execute(
      `INSERT INTO announcements (
        author_user_id,
        title,
        message,
        target_type,
        target_team_id,
        target_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        title,
        message,
        resolvedTargetType,
        target_team_id || null,
        target_user_id || null
      ]
    );

    logInsertedTime("Announcement inserted");

    await createNotificationsForAnnouncement(
      title,
      resolvedTargetType,
      target_team_id || null,
      target_user_id || null
    );

    await logActivity({
      userId: req.user.id,
      action: "created announcement",
      targetType: "announcement",
      targetId: result.insertId,
      targetLabel: title
    });

    return res.status(201).json({
      message: "Announcement created successfully.",
      announcementId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create announcement.", error: error.message });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { title, message, target_type, target_team_id, target_user_id } = req.body;

    const [rows] = await db.execute(
      "SELECT id, title FROM announcements WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    await db.execute(
      `UPDATE announcements
       SET title = COALESCE(?, title),
           message = COALESCE(?, message),
           target_type = COALESCE(?, target_type),
           target_team_id = ?,
           target_user_id = ?
       WHERE id = ?`,
      [
        title || null,
        message || null,
        target_type || null,
        target_team_id || null,
        target_user_id || null,
        id
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: "updated announcement",
      targetType: "announcement",
      targetId: Number(id),
      targetLabel: title || rows[0].title
    });

    return res.status(200).json({ message: "Announcement updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update announcement.", error: error.message });
  }
}

async function getAnnouncements(req, res) {
  try {
    const isLeader = req.user.roleKey !== "member";
    const query = isLeader
      ? `SELECT
          a.id,
          a.title,
          a.message,
          a.target_type,
          a.target_team_id,
          t.name AS target_team_name,
          a.target_user_id,
          tu.full_name AS target_user_name,
          a.author_user_id,
          au.full_name AS author_name,
          a.created_at
        FROM announcements a
        INNER JOIN users au ON au.id = a.author_user_id
        LEFT JOIN teams t ON t.id = a.target_team_id
        LEFT JOIN users tu ON tu.id = a.target_user_id
        ORDER BY a.created_at DESC`
      : `SELECT
          a.id,
          a.title,
          a.message,
          a.target_type,
          a.target_team_id,
          t.name AS target_team_name,
          a.target_user_id,
          tu.full_name AS target_user_name,
          a.author_user_id,
          au.full_name AS author_name,
          a.created_at
        FROM announcements a
        INNER JOIN users au ON au.id = a.author_user_id
        LEFT JOIN teams t ON t.id = a.target_team_id
        LEFT JOIN users tu ON tu.id = a.target_user_id
        WHERE a.target_type = 'all'
           OR (a.target_type = 'team' AND a.target_team_id = ?)
           OR (a.target_type = 'user' AND a.target_user_id = ?)
        ORDER BY a.created_at DESC`;

    const [rows] = await db.execute(
      query,
      isLeader ? [] : [req.user.teamId || 0, req.user.id]
    );

    return res.status(200).json(serializeRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch announcements.", error: error.message });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT id, title FROM announcements WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    await db.execute("DELETE FROM announcements WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: "deleted announcement",
      targetType: "announcement",
      targetId: Number(id),
      targetLabel: rows[0].title
    });

    return res.status(200).json({ message: "Announcement deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete announcement.", error: error.message });
  }
}

module.exports = { createAnnouncement, updateAnnouncement, getAnnouncements, deleteAnnouncement };
