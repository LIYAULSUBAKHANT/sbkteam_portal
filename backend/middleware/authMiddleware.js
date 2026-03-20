const jwt = require("jsonwebtoken");
const db = require("../db");

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Access token is required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.execute(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.team_id,
        u.role_id,
        r.role_key,
        r.display_name AS role_name
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.is_active = 1`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found or inactive." });
    }

    const user = rows[0];

    console.log("ROLE:", user.role_name);

    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      teamId: user.team_id,
      roleId: user.role_id,
      roleKey: user.role_key,
      roleName: user.role_name
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = { authenticateToken };
