const db = require("../db");

async function logActivity({ userId, action, targetType = null, targetId = null, targetLabel = null }) {
  try {
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, target_label)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, targetType, targetId, targetLabel]
    );
  } catch (error) {
    console.error("Failed to write activity log:", error.message);
  }
}

module.exports = { logActivity };
