const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { logActivity } = require("./activityLogController");

async function register(req, res) {
  try {
    const { full_name, email, password, role_id } = req.body;

    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({ message: "full_name, email, password, and role_id are required." });
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const [roles] = await db.execute(
      "SELECT id, role_key FROM roles WHERE id = ?",
      [role_id]
    );

    if (roles.length === 0) {
      return res.status(400).json({ message: "Invalid role_id." });
    }

    if (roles[0].role_key !== "member") {
      return res.status(403).json({
        message: "Public registration is limited to the member role."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarInitials = full_name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase())
      .slice(0, 2)
      .join("");

    const [result] = await db.execute(
      `INSERT INTO users (role_id, full_name, email, password_hash, avatar_initials)
       VALUES (?, ?, ?, ?, ?)`,
      [role_id, full_name, email, passwordHash, avatarInitials]
    );

    await logActivity({
      userId: result.insertId,
      action: "registered account",
      targetType: "user",
      targetId: result.insertId,
      targetLabel: full_name
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: result.insertId,
        full_name,
        email,
        role_id
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user.", error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    console.log("[AUTH] Login attempt:", email);

    const [rows] = await db.query(
      "SELECT id, full_name, email, password_hash, role_id, is_active FROM users WHERE email = ?",
      [email]
    );

    console.log("[AUTH] Login query rows:", rows);

    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = rows[0];

    if (user.is_active === 0) {
      return res.status(401).json({ message: "User is inactive" });
    }

    // Temporary plain-text comparison for environments where password_hash stores plain text.
    if ((user.password_hash || "") !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[AUTH] JWT_SECRET is missing.");
      return res.status(500).json({ message: "JWT secret is not configured." });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        roleId: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("[AUTH] Login successful:", { userId: user.id, email: user.email, roleId: user.role_id });

    await logActivity({
      userId: user.id,
      action: "logged in",
      targetType: "auth",
      targetId: user.id,
      targetLabel: user.email
    });

    return res.status(200).json({
      message: "Login successful",
      id: user.id,
      email: user.email,
      role_id: user.role_id,
      full_name: user.full_name,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error("[AUTH] Login error:", error);
    return res.status(500).json({
      message: "Failed to execute login query",
      error: error.message
    });
  }
}

module.exports = { register, login };
