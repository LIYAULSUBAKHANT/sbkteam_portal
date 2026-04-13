const db = require("../db");
const { logActivity } = require("./activityLogController");
const { logInsertedTime, serializeRows } = require("../utils/datetime");
const { emitDataChanged } = require("../socket");
const { ensureDiscussionThread } = require("../services/discussionsService");
const { createNotificationsForUsers } = require("../services/notificationService");
const REACTION_TYPES = new Set(["like", "acknowledge"]);

function buildAnnouncementVisibilityClause(user) {
  if (user.roleKey !== "member") {
    return {
      where: "",
      params: [],
    };
  }

  return {
    where: `WHERE a.target_type = 'all'
       OR (a.target_type = 'team' AND a.target_team_id = ?)
       OR (a.target_type = 'user' AND a.target_user_id = ?)`,
    params: [user.teamId || 0, user.id],
  };
}

async function getVisibleAnnouncementRecord(announcementId, user) {
  const visibility = buildAnnouncementVisibilityClause(user);
  const visibilityCondition = visibility.where.replace(/^WHERE\s+/i, "");
  const [rows] = await db.execute(
    `SELECT a.id, a.title
     FROM announcements a
     ${visibility.where ? `WHERE (${visibilityCondition}) AND a.id = ?` : "WHERE a.id = ?"}
     LIMIT 1`,
    visibility.where ? [...visibility.params, announcementId] : [announcementId]
  );

  return rows[0] || null;
}

async function markAnnouncementsSeen(announcementIds, userId) {
  if (!announcementIds.length || !userId) {
    return;
  }

  const placeholders = announcementIds.map(() => "(?, ?, 'seen', NOW())").join(", ");
  const values = announcementIds.flatMap((announcementId) => [announcementId, userId]);

  await db.query(
    `INSERT IGNORE INTO announcement_reactions (
      announcement_id,
      user_id,
      reaction_type,
      created_at
    ) VALUES ${placeholders}`,
    values
  );
}

function buildReactionSummary(announcementIds, reactionRows, viewerUserId, includeReactionDetails) {
  const reactionMap = new Map(
    announcementIds.map((announcementId) => [
      String(announcementId),
      {
        like_count: 0,
        acknowledge_count: 0,
        seen_count: 0,
        viewer_has_liked: false,
        viewer_has_acknowledged: false,
        viewer_has_seen: false,
        seen_by: [],
        liked_by: [],
        acknowledged_by: [],
      },
    ])
  );

  for (const row of reactionRows) {
    const bucket = reactionMap.get(String(row.announcement_id));

    if (!bucket) {
      continue;
    }

    if (row.reaction_type === "like") {
      bucket.like_count += 1;
      if (Number(row.user_id) === Number(viewerUserId)) {
        bucket.viewer_has_liked = true;
      }

      if (includeReactionDetails) {
        bucket.liked_by.push({
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          reacted_at: row.created_at,
        });
      }
    }

    if (row.reaction_type === "acknowledge") {
      bucket.acknowledge_count += 1;
      if (Number(row.user_id) === Number(viewerUserId)) {
        bucket.viewer_has_acknowledged = true;
      }

      if (includeReactionDetails) {
        bucket.acknowledged_by.push({
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          reacted_at: row.created_at,
        });
      }
    }

    if (row.reaction_type === "seen") {
      bucket.seen_count += 1;
      if (Number(row.user_id) === Number(viewerUserId)) {
        bucket.viewer_has_seen = true;
      }

      if (includeReactionDetails) {
        bucket.seen_by.push({
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          reacted_at: row.created_at,
        });
      }
    }
  }

  return reactionMap;
}

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

function buildAnnouncementNotificationMessage(title) {
  return `New announcement: ${title}`;
}

async function createNotificationsForAnnouncement(title, targetType, targetTeamId, targetUserId) {
  const recipients = await getNotificationRecipients(targetType, targetTeamId, targetUserId);

  if (recipients.length === 0) {
    return;
  }

  const message = buildAnnouncementNotificationMessage(title);

  await createNotificationsForUsers({
    userIds: recipients,
    type: "announcement",
    message,
    url: "/admin/dashboard",
  });
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

    await ensureDiscussionThread({
      sourceType: "announcement",
      sourceId: result.insertId,
      title: `Announcement: ${title}`,
      createdByUserId: req.user.id,
      teamId: target_team_id || null,
      contextPreview: message,
    });

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

    emitDataChanged({ type: "announcement", action: "create", data: { id: result.insertId } });
    emitDataChanged({ type: "notification", action: "create", data: { source: "announcement", id: result.insertId } });

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

    await ensureDiscussionThread({
      sourceType: "announcement",
      sourceId: Number(id),
      title: `Announcement: ${title || rows[0].title}`,
      createdByUserId: req.user.id,
      teamId: target_team_id || null,
      contextPreview: message || null,
    });

    if (title && title !== rows[0].title) {
      await db.execute(
        `UPDATE notifications
         SET message = ?
         WHERE type = 'announcement' AND message = ?`,
        [buildAnnouncementNotificationMessage(title), buildAnnouncementNotificationMessage(rows[0].title)]
      );
    }

    await logActivity({
      userId: req.user.id,
      action: "updated announcement",
      targetType: "announcement",
      targetId: Number(id),
      targetLabel: title || rows[0].title
    });

    emitDataChanged({ type: "announcement", action: "update", data: { id: Number(id) } });
    emitDataChanged({ type: "notification", action: "update", data: { source: "announcement", id: Number(id) } });

    return res.status(200).json({ message: "Announcement updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update announcement.", error: error.message });
  }
}

async function getAnnouncements(req, res) {
  try {
    const canViewReactionDetails = req.user.roleKey === "captain";
    const visibility = buildAnnouncementVisibilityClause(req.user);
    const [rows] = await db.execute(
      `SELECT
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
      ${visibility.where}
      ORDER BY a.created_at DESC, a.id DESC`,
      visibility.params
    );

    const announcementIds = rows.map((row) => Number(row.id));
    await markAnnouncementsSeen(announcementIds, req.user.id);

    let reactionMap = new Map();

    if (announcementIds.length > 0) {
      const placeholders = announcementIds.map(() => "?").join(", ");
      const [reactionRows] = await db.query(
        `SELECT
          ar.announcement_id,
          ar.user_id,
          ar.reaction_type,
          ar.created_at,
          u.full_name,
          u.email
        FROM announcement_reactions ar
        INNER JOIN users u ON u.id = ar.user_id
        WHERE ar.announcement_id IN (${placeholders})
        ORDER BY ar.created_at ASC, ar.id ASC`,
        announcementIds
      );

      reactionMap = buildReactionSummary(
        announcementIds,
        reactionRows,
        req.user.id,
        canViewReactionDetails
      );
    }

    const payload = serializeRows(rows).map((announcement) => ({
      ...announcement,
      ...(reactionMap.get(String(announcement.id)) || {
        like_count: 0,
        acknowledge_count: 0,
        seen_count: 0,
        viewer_has_liked: false,
        viewer_has_acknowledged: false,
        viewer_has_seen: false,
        seen_by: [],
        liked_by: [],
        acknowledged_by: [],
      }),
    }));

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch announcements.", error: error.message });
  }
}

async function toggleAnnouncementReaction(req, res) {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body;
    const reactionType = String(reaction_type || "").trim().toLowerCase();

    if (!REACTION_TYPES.has(reactionType)) {
      return res.status(400).json({ message: "reaction_type must be like or acknowledge." });
    }

    const visibleAnnouncement = await getVisibleAnnouncementRecord(id, req.user);

    if (!visibleAnnouncement) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    await markAnnouncementsSeen([Number(id)], req.user.id);

    const [existingRows] = await db.execute(
      `SELECT id
       FROM announcement_reactions
       WHERE announcement_id = ? AND user_id = ? AND reaction_type = ?`,
      [id, req.user.id, reactionType]
    );

    let active = false;

    if (existingRows.length > 0) {
      await db.execute(
        `DELETE FROM announcement_reactions
         WHERE announcement_id = ? AND user_id = ? AND reaction_type = ?`,
        [id, req.user.id, reactionType]
      );
    } else {
      await db.execute(
        `INSERT INTO announcement_reactions (
          announcement_id,
          user_id,
          reaction_type,
          created_at
        ) VALUES (?, ?, ?, NOW())`,
        [id, req.user.id, reactionType]
      );
      active = true;
    }

    await logActivity({
      userId: req.user.id,
      action: `${active ? "added" : "removed"} ${reactionType} reaction`,
      targetType: "announcement",
      targetId: Number(id),
      targetLabel: visibleAnnouncement.title,
    });

    emitDataChanged({ type: "announcement", action: "reaction", data: { id: Number(id), reactionType } });

    return res.status(200).json({
      message: active ? `${reactionType} added.` : `${reactionType} removed.`,
      active,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update announcement reaction.", error: error.message });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT id, title FROM announcements WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    await db.execute(
      `DELETE FROM notifications
       WHERE type = 'announcement' AND message = ?`,
      [buildAnnouncementNotificationMessage(rows[0].title)]
    );

    await db.execute("DELETE FROM announcements WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: "deleted announcement",
      targetType: "announcement",
      targetId: Number(id),
      targetLabel: rows[0].title
    });

    emitDataChanged({ type: "announcement", action: "delete", data: { id: Number(id) } });
    emitDataChanged({ type: "notification", action: "delete", data: { source: "announcement", id: Number(id) } });

    return res.status(200).json({ message: "Announcement deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete announcement.", error: error.message });
  }
}

module.exports = { createAnnouncement, updateAnnouncement, getAnnouncements, deleteAnnouncement, toggleAnnouncementReaction };

