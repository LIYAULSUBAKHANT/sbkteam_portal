const webpush = require("web-push");
const db = require("../db");

function hasPushConfig() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function configurePush() {
  if (!hasPushConfig()) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  return true;
}

async function getSubscriptionsForUsers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const [rows] = await db.query(
    `SELECT id, user_id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id IN (?)`,
    [userIds]
  );

  return rows;
}

async function removeSubscription(id) {
  await db.execute("DELETE FROM push_subscriptions WHERE id = ?", [id]);
}

async function sendPushNotifications(userIds, payload) {
  if (!configurePush()) {
    return [];
  }

  const subscriptions = await getSubscriptionsForUsers(userIds);
  const deliveredUserIds = new Set();

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload)
      );

      deliveredUserIds.add(Number(subscription.user_id));
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await removeSubscription(subscription.id);
        continue;
      }

      console.error("[Push] Failed to send notification:", error.message);
    }
  }

  return Array.from(deliveredUserIds);
}

module.exports = {
  hasPushConfig,
  sendPushNotifications,
};
