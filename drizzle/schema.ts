import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** employee = 员工, manager = 管理, sysadmin = 系统管理 */
  role: mysqlEnum("role", ["employee", "manager", "sysadmin"]).default("employee").notNull(),
  organizationId: int("organizationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Bcrypt hash for internal account/password login. NULL = OAuth-only user */
  passwordHash: varchar("passwordHash", { length: 256 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Organizations ────────────────────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  /** The user id of the responsible person */
  leaderId: int("leaderId"),
  /** Direct parent org */
  parentId: int("parentId"),
  /** Grandparent org (level-2 parent) */
  grandParentId: int("grandParentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Source Channels ──────────────────────────────────────────────────────────
export const sourceChannels = mysqlTable("source_channels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SourceChannel = typeof sourceChannels.$inferSelect;
export type InsertSourceChannel = typeof sourceChannels.$inferInsert;

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  /** 微信ID — unique per sales rep */
  wxId: varchar("wxId", { length: 128 }).notNull(),
  /** 客户姓名 */
  customerName: varchar("customerName", { length: 64 }),
  /** 来源渠道 — free text (mirrors channel name at time of entry) */
  sourceChannel: varchar("sourceChannel", { length: 64 }),
  /**
   * 销售额 (元) — stored as decimal(12,2)
   * NULL  → 待跟进
   * 0     → 开发失败
   * > 0   → 开发成功
   */
  salesAmount: decimal("salesAmount", { precision: 12, scale: 2 }),
  /** 客户生日/时辰 */
  customerBirthday: varchar("customerBirthday", { length: 64 }),
  /** 对象姓名 */
  contactName: varchar("contactName", { length: 64 }),
  /** 对象生日/生辰 */
  contactBirthday: varchar("contactBirthday", { length: 64 }),
  /** 跟进备注 */
  notes: text("notes"),
  /** 客户画像 — 选填/选题形式的补充信息 JSON */
  customerPortrait: text("customerPortrait"),
  /** 录入员工 */
  createdById: int("createdById").notNull(),
  /** 所属团队 (snapshot at creation time) */
  organizationId: int("organizationId"),
  /** Server-enforced timestamp — client cannot set this */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
