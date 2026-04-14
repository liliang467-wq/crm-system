/**
 * One-time script to create the default sysadmin account.
 * Run: node seed-admin.mjs
 *
 * Default credentials:
 *   Account: admin
 *   Password: admin123
 *
 * Change the password after first login via 系统管理 > 账户管理 > 编辑 > 重置密码
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const ACCOUNT = "admin";
const PASSWORD = "admin123";
const NAME = "系统管理员";

const hash = await bcrypt.hash(PASSWORD, 10);

// Check if already exists
const [rows] = await conn.execute("SELECT id FROM users WHERE openId = ?", [ACCOUNT]);
if (rows.length > 0) {
  // Update password and role
  await conn.execute(
    "UPDATE users SET passwordHash = ?, role = 'sysadmin', name = ?, loginMethod = 'internal' WHERE openId = ?",
    [hash, NAME, ACCOUNT]
  );
  console.log(`✅ Admin account updated: ${ACCOUNT} / ${PASSWORD}`);
} else {
  await conn.execute(
    "INSERT INTO users (openId, name, role, passwordHash, loginMethod, lastSignedIn, createdAt, updatedAt) VALUES (?, ?, 'sysadmin', ?, 'internal', NOW(), NOW(), NOW())",
    [ACCOUNT, NAME, hash]
  );
  console.log(`✅ Admin account created: ${ACCOUNT} / ${PASSWORD}`);
}

await conn.end();
console.log("🔑 Login at the CRM system with the above credentials.");
console.log("⚠️  Please change the password after first login!");
