const db = require("../db");
const { sendPushNotifications, hasPushConfig } = require("./pushService");

async function createNotificationsForUsers({
  userIds = [],
  type,
  message,
  url = "/admin/dashboard",
}) {
  const normalizedUserIds = [...new Set(
    userIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

  if (normalizedUserIds.length === 0 || !type || !message) {
    return { created: 0, pushedUserIds: [] };
  }

  await Promise.all(
    normalizedUserIds.map((userId) =>
      db.execute(
        `INSERT INTO notifications (user_id, type, message, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, type, message]
      )
    )
  );

  const pushedUserIds = await sendPushNotifications(normalizedUserIds, {
    title: "SBK Portal",
    body: message,
    url,
    type,
  });

  return {
    created: normalizedUserIds.length,
    pushedUserIds,
  };
}

module.exports = {
  createNotificationsForUsers,
  hasPushConfig,
};
