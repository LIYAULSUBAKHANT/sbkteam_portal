const db = require("../db");
const { logActivity } = require("./activityLogController");
const { serializeRows } = require("../utils/datetime");
const { emitDataChanged } = require("../socket");
const {
  ensureDiscussionThread,
  createMentionNotifications,
  createThreadParticipantsNotifications,
} = require("../services/discussionsService");

function canModerateAnyComment(user) {
  return user.roleKey === "captain";
}

function canModifyComment(comment, user) {
  return Number(comment.author_user_id) === Number(user.id) || canModerateAnyComment(user);
}

async function getCommentRecord(commentId) {
  const [rows] = await db.execute(
    `SELECT
      dc.id,
      dc.thread_id,
      dc.parent_comment_id,
      dc.author_user_id,
      dc.body,
      dt.title AS thread_title,
      dt.source_type,
      dt.source_id
     FROM discussion_comments dc
     INNER JOIN discussion_threads dt ON dt.id = dc.thread_id
     WHERE dc.id = ?`,
    [commentId]
  );

  return rows[0] || null;
}

async function resolveThreadAccessBySource(sourceType, sourceId, user) {
  if (sourceType === "task") {
    const [rows] = await db.execute(
      `SELECT
        t.id,
        t.title,
        t.description,
        t.assigned_to_user_id,
        p.team_id
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?`,
      [sourceId]
    );

    if (rows.length === 0) {
      return null;
    }

    const task = rows[0];
    if (user.roleKey === "member" && Number(task.assigned_to_user_id) !== Number(user.id)) {
      return null;
    }

    return {
      sourceType,
      sourceId: Number(task.id),
      title: `Task: ${task.title}`,
      teamId: task.team_id || null,
      contextPreview: task.description || null,
    };
  }

  if (sourceType === "announcement") {
    const [rows] = await db.execute(
      `SELECT
        a.id,
        a.title,
        a.message,
        a.target_type,
        a.target_team_id,
        a.target_user_id
      FROM announcements a
      WHERE a.id = ?`,
      [sourceId]
    );

    if (rows.length === 0) {
      return null;
    }

    const announcement = rows[0];
    const canAccess = user.roleKey !== "member"
      || announcement.target_type === "all"
      || (announcement.target_type === "team" && Number(announcement.target_team_id) === Number(user.teamId || 0))
      || (announcement.target_type === "user" && Number(announcement.target_user_id) === Number(user.id));

    if (!canAccess) {
      return null;
    }

    return {
      sourceType,
      sourceId: Number(announcement.id),
      title: `Announcement: ${announcement.title}`,
      teamId: announcement.target_type === "team" ? announcement.target_team_id : user.teamId || null,
      contextPreview: announcement.message,
    };
  }

  return null;
}

async function getThreadBySource(req, res) {
  try {
    const { source_type, source_id } = req.query;
    const sourceId = Number(source_id);

    if (!source_type || !Number.isInteger(sourceId) || sourceId <= 0) {
      return res.status(400).json({ message: "source_type and source_id are required." });
    }

    const sourceContext = await resolveThreadAccessBySource(source_type, sourceId, req.user);

    if (!sourceContext) {
      return res.status(404).json({ message: "Discussion source not found." });
    }

    const threadId = await ensureDiscussionThread({
      sourceType: sourceContext.sourceType,
      sourceId: sourceContext.sourceId,
      title: sourceContext.title,
      createdByUserId: req.user.id,
      teamId: sourceContext.teamId,
      contextPreview: sourceContext.contextPreview,
    });

    const [threadRows] = await db.execute(
      `SELECT
        dt.id,
        dt.source_type,
        dt.source_id,
        dt.title,
        dt.context_preview,
        dt.team_id,
        dt.is_locked,
        dt.created_at,
        dt.updated_at
      FROM discussion_threads dt
      WHERE dt.id = ?
      LIMIT 1`,
      [threadId]
    );

    const [commentRows] = await db.execute(
      `SELECT
        dc.id,
        dc.thread_id,
        dc.parent_comment_id,
        dc.author_user_id,
        u.full_name AS author_name,
        u.email AS author_email,
        dc.body,
        dc.created_at,
        dc.updated_at
      FROM discussion_comments dc
      INNER JOIN users u ON u.id = dc.author_user_id
      WHERE dc.thread_id = ?
      ORDER BY dc.created_at ASC, dc.id ASC`,
      [threadId]
    );

    return res.status(200).json({
      thread: serializeRows(threadRows)[0],
      comments: serializeRows(commentRows).map((comment) => ({
        ...comment,
        can_edit: Number(comment.author_user_id) === Number(req.user.id),
        can_delete: Number(comment.author_user_id) === Number(req.user.id) || canModerateAnyComment(req.user),
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch discussion thread.", error: error.message });
  }
}

async function createThreadComment(req, res) {
  try {
    const { id } = req.params;
    const { body, parent_comment_id } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: "body is required." });
    }

    const [threadRows] = await db.execute(
      `SELECT id, source_type, source_id, title, is_locked
       FROM discussion_threads
       WHERE id = ?`,
      [id]
    );

    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Discussion thread not found." });
    }

    const thread = threadRows[0];

    if (thread.is_locked) {
      return res.status(403).json({ message: "This discussion thread is locked." });
    }

    if (thread.source_type && thread.source_id) {
      const sourceContext = await resolveThreadAccessBySource(thread.source_type, thread.source_id, req.user);

      if (!sourceContext) {
        return res.status(403).json({ message: "You do not have access to this discussion." });
      }
    }

    if (parent_comment_id) {
      const [parentRows] = await db.execute(
        `SELECT id
         FROM discussion_comments
         WHERE id = ? AND thread_id = ?`,
        [parent_comment_id, id]
      );

      if (parentRows.length === 0) {
        return res.status(400).json({ message: "Invalid parent_comment_id." });
      }
    }

    const trimmedBody = String(body).trim();
    const [result] = await db.execute(
      `INSERT INTO discussion_comments (
        thread_id,
        parent_comment_id,
        author_user_id,
        body,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id, parent_comment_id || null, req.user.id, trimmedBody]
    );

    await db.execute(
      `UPDATE discussion_threads
       SET updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    await createThreadParticipantsNotifications({
      threadId: Number(id),
      authorUserId: req.user.id,
      message: `${req.user.fullName} replied in ${thread.title}`,
    });

    const mentionedUsers = await createMentionNotifications({
      body: trimmedBody,
      authorUserId: req.user.id,
      authorName: req.user.fullName,
      threadTitle: thread.title,
    });

    await logActivity({
      userId: req.user.id,
      action: "commented on discussion",
      targetType: "discussion_thread",
      targetId: Number(id),
      targetLabel: thread.title,
    });

    emitDataChanged({ type: "discussion", action: "comment", data: { threadId: Number(id), commentId: result.insertId } });

    return res.status(201).json({
      message: "Comment added successfully.",
      commentId: result.insertId,
      mentionedUserIds: mentionedUsers.map((user) => user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add discussion comment.", error: error.message });
  }
}

async function updateThreadComment(req, res) {
  try {
    const { commentId } = req.params;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: "body is required." });
    }

    const comment = await getCommentRecord(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!canModifyComment(comment, req.user) || Number(comment.author_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own comments." });
    }

    if (comment.source_type && comment.source_id) {
      const sourceContext = await resolveThreadAccessBySource(comment.source_type, comment.source_id, req.user);

      if (!sourceContext) {
        return res.status(403).json({ message: "You do not have access to this discussion." });
      }
    }

    const trimmedBody = String(body).trim();

    await db.execute(
      `UPDATE discussion_comments
       SET body = ?, updated_at = NOW()
       WHERE id = ?`,
      [trimmedBody, commentId]
    );

    const mentionedUsers = await createMentionNotifications({
      body: trimmedBody,
      authorUserId: req.user.id,
      authorName: req.user.fullName,
      threadTitle: comment.thread_title,
    });

    await logActivity({
      userId: req.user.id,
      action: "updated discussion comment",
      targetType: "discussion_comment",
      targetId: Number(commentId),
      targetLabel: comment.thread_title,
    });

    emitDataChanged({ type: "discussion", action: "comment_update", data: { threadId: Number(comment.thread_id), commentId: Number(commentId) } });

    return res.status(200).json({
      message: "Comment updated successfully.",
      mentionedUserIds: mentionedUsers.map((user) => user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update discussion comment.", error: error.message });
  }
}

async function deleteThreadComment(req, res) {
  try {
    const { commentId } = req.params;
    const comment = await getCommentRecord(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!canModifyComment(comment, req.user)) {
      return res.status(403).json({ message: "You do not have permission to delete this comment." });
    }

    if (comment.source_type && comment.source_id) {
      const sourceContext = await resolveThreadAccessBySource(comment.source_type, comment.source_id, req.user);

      if (!sourceContext) {
        return res.status(403).json({ message: "You do not have access to this discussion." });
      }
    }

    await db.execute(
      `DELETE FROM discussion_comments
       WHERE id = ?`,
      [commentId]
    );

    await logActivity({
      userId: req.user.id,
      action: "deleted discussion comment",
      targetType: "discussion_comment",
      targetId: Number(commentId),
      targetLabel: comment.thread_title,
    });

    emitDataChanged({ type: "discussion", action: "comment_delete", data: { threadId: Number(comment.thread_id), commentId: Number(commentId) } });

    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete discussion comment.", error: error.message });
  }
}

module.exports = { getThreadBySource, createThreadComment, updateThreadComment, deleteThreadComment };
