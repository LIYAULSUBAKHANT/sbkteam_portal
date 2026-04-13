const db = require("../db");
const { hasPushConfig } = require("../services/pushService");

async function getPublicKey(req, res) {
  return res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    pushConfigured: hasPushConfig(),
  });
}

async function subscribe(req, res) {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid push subscription payload." });
    }

    const [existingRows] = await db.execute(
      "SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      [req.user.id, endpoint]
    );

    if (existingRows.length > 0) {
      await db.execute(
        `UPDATE push_subscriptions
         SET p256dh = ?, auth = ?, user_agent = ?, updated_at = NOW()
         WHERE id = ?`,
        [keys.p256dh, keys.auth, req.headers["user-agent"] || null, existingRows[0].id]
      );
    } else {
      await db.execute(
        `INSERT INTO push_subscriptions (
          user_id,
          endpoint,
          p256dh,
          auth,
          user_agent,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [req.user.id, endpoint, keys.p256dh, keys.auth, req.headers["user-agent"] || null]
      );
    }

    return res.status(201).json({ message: "Browser push subscription saved." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save push subscription.", error: error.message });
  }
}

async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: "endpoint is required." });
    }

    await db.execute(
      "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      [req.user.id, endpoint]
    );

    return res.status(200).json({ message: "Browser push subscription removed." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove push subscription.", error: error.message });
  }
}

module.exports = {
  getPublicKey,
  subscribe,
  unsubscribe,
};
