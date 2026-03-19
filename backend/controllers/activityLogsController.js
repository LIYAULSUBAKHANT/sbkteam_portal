const db = require("../db");

async function getActivityLogs(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT
        al.id,
        al.user_id,
        u.full_name AS user_name,
        al.action,
        al.target_type,
        al.target_id,
        al.target_label,
        al.created_at
      FROM activity_logs al
      INNER JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC, al.id DESC`
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch activity logs.", error: error.message });
  }
}

module.exports = { getActivityLogs };
