const db = require("../db");

function normalizeMentionToken(token) {
  return String(token || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function parseMentionTokens(body) {
  const matches = String(body || "").match(/@([a-zA-Z0-9._-]+)/g) || [];
  return [...new Set(matches.map((token) => normalizeMentionToken(token)).filter(Boolean))];
}

async function resolveMentionedUsers(body) {
  const tokens = parseMentionTokens(body);

  if (tokens.length === 0) {
    return [];
  }

  const [rows] = await db.execute(
    `SELECT id, full_name, email
     FROM users
     WHERE is_active = 1`
  );

  return rows.filter((user) => {
    const fullNameToken = String(user.full_name || "").replace(/\s+/g, "").toLowerCase();
    const emailLocalPart = String(user.email || "").split("@")[0].toLowerCase();
    const firstName = String(user.full_name || "").split(/\s+/)[0]?.toLowerCase() || "";

    return tokens.some((token) =>
      token === fullNameToken || token === emailLocalPart || token === firstName
    );
  });
}

async function ensureDiscussionThread({
  sourceType = "general",
  sourceId = null,
  title,
  createdByUserId = null,
  teamId = null,
  contextPreview = null,
}) {
  if (!title) {
    throw new Error("Discussion thread title is required.");
  }

  if (sourceId) {
    const [existingRows] = await db.execute(
      `SELECT id
       FROM discussion_threads
       WHERE source_type = ? AND source_id = ?
       LIMIT 1`,
      [sourceType, sourceId]
    );

    if (existingRows.length > 0) {
      await db.execute(
        `UPDATE discussion_threads
         SET title = ?,
             team_id = ?,
             context_preview = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [title, teamId, contextPreview, existingRows[0].id]
      );

      return existingRows[0].id;
    }
  }

  const [result] = await db.execute(
    `INSERT INTO discussion_threads (
      source_type,
      source_id,
      title,
      created_by_user_id,
      team_id,
      context_preview,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [sourceType, sourceId, title, createdByUserId, teamId, contextPreview]
  );

  return result.insertId;
}

async function createThreadParticipantsNotifications({ threadId, authorUserId, message }) {
  if (!threadId || !authorUserId || !message) {
    return;
  }

  const [rows] = await db.query(
    `SELECT DISTINCT user_id
     FROM (
       SELECT created_by_user_id AS user_id
       FROM discussion_threads
       WHERE id = ?

       UNION

       SELECT author_user_id AS user_id
       FROM discussion_comments
       WHERE thread_id = ?
     ) participants
     WHERE user_id IS NOT NULL AND user_id <> ?`,
    [threadId, threadId, authorUserId]
  );

  if (rows.length === 0) {
    return;
  }

  await Promise.all(
    rows.map((row) =>
      db.execute(
        `INSERT INTO notifications (user_id, type, message, created_at)
         VALUES (?, 'discussion_reply', ?, NOW())`,
        [row.user_id, message]
      )
    )
  );
}

async function createMentionNotifications({
  body,
  authorUserId,
  authorName,
  threadTitle,
}) {
  const mentionedUsers = await resolveMentionedUsers(body);
  const recipients = mentionedUsers.filter((user) => Number(user.id) !== Number(authorUserId));

  if (recipients.length === 0) {
    return [];
  }

  const message = `${authorName} mentioned you in ${threadTitle}`;

  await Promise.all(
    recipients.map((user) =>
      db.execute(
        `INSERT INTO notifications (user_id, type, message, created_at)
         VALUES (?, 'discussion_mention', ?, NOW())`,
        [user.id, message]
      )
    )
  );

  return recipients;
}

module.exports = {
  ensureDiscussionThread,
  createThreadParticipantsNotifications,
  createMentionNotifications,
};
