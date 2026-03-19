const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

function maskSecret(value) {
  if (!value) {
    return "[empty]";
  }

  if (value.length <= 2) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 2)}***${value.slice(-1)}`;
}

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log("[DB] dotenv loaded from:", path.join(__dirname, ".env"));
console.log("[DB] Connection config:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  password: maskSecret(dbConfig.password)
});

const pool = mysql.createPool(dbConfig);

(async () => {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log("[DB] MySQL connection established successfully.");
  } catch (error) {
    console.error("[DB] MySQL connection failed:", {
      code: error.code,
      errno: error.errno,
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
})();

module.exports = pool;
