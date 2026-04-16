import { and, asc, desc, eq, gte, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Customer,
  InsertCustomer,
  InsertOrganization,
  InsertSourceChannel,
  InsertUser,
  Organization,
  customers,
  organizations,
  sourceChannels,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Drizzle's mysql2 driver accepts PoolOptions via the `connection` field.
      // When a string is passed it creates a pool with defaults (connectionLimit=10).
      // We pass an object to tune pool parameters explicitly.
      const url = new URL(process.env.DATABASE_URL);
      _db = drizzle({
        connection: {
          host: url.hostname,
          port: Number(url.port) || 4000,
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.replace("/", ""),
          ssl: url.searchParams.get("ssl") ? { rejectUnauthorized: false } : undefined,
          // mysql2 PoolOptions
          connectionLimit: 10,
          maxIdle: 5,
          idleTimeout: 30_000,
          waitForConnections: true,
          queueLimit: 0,
        },
      });
      console.log("[Database] Connection pool initialized (limit:10, maxIdle:5, idleTimeout:30s)");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "sysadmin"; updateSet.role = "sysadmin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(organizations.createdAt);
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(organizations).values(data);
  return result[0].insertId;
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(organizations).where(eq(organizations.id, id));
}

/**
 * Build a display label for an org.
 * For a level-3 org (leaf): "业务一组（事业一部）" — leaf name + parent in brackets
 * For a level-2 org: "事业一部"
 * For a level-1 org: "开发部"
 */
export async function buildOrgPath(orgId: number | null | undefined): Promise<string> {
  if (!orgId) return "未分配";
  const db = await getDb();
  if (!db) return "未分配";
  const org = await getOrganizationById(orgId);
  if (!org) return "未分配";

  // Collect hierarchy: self, parent, grandparent
  let parentOrg: Organization | undefined;
  if (org.parentId) {
    parentOrg = await getOrganizationById(org.parentId);
  }

  // Level-3 (has parent): show "leafName（parentName）"
  if (parentOrg) {
    return `${org.name}（${parentOrg.name}）`;
  }
  // Level-2 or Level-1: just the name
  return org.name;
}

/** Get IDs of leaf-level orgs (orgs that are NOT a parent of any other org) */
export async function getLeafOrgIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const allOrgs = await db.select().from(organizations);
  const parentIds = new Set(allOrgs.map(o => o.parentId).filter(Boolean) as number[]);
  return allOrgs.filter(o => !parentIds.has(o.id)).map(o => o.id);
}

/** Get all org IDs that are visible to a given org (self + all descendants) */
export async function getVisibleOrgIds(orgId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [orgId];
  const allOrgs = await db.select().from(organizations);
  const result = new Set<number>();
  const queue = [orgId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.add(current);
    const children = allOrgs.filter(o => o.parentId === current || o.grandParentId === current);
    for (const child of children) {
      if (!result.has(child.id)) queue.push(child.id);
    }
  }
  return Array.from(result);
}

// ─── Source Channels ──────────────────────────────────────────────────────────

export async function getAllSourceChannels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceChannels).orderBy(sourceChannels.createdAt);
}

export async function createSourceChannel(data: InsertSourceChannel) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sourceChannels).values(data);
  return result[0].insertId;
}

export async function updateSourceChannel(id: number, data: Partial<InsertSourceChannel>) {
  const db = await getDb();
  if (!db) return;
  await db.update(sourceChannels).set(data).where(eq(sourceChannels.id, id));
}

export async function deleteSourceChannel(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sourceChannels).where(eq(sourceChannels.id, id));
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface CustomerFilter {
  createdById?: number;
  orgIds?: number[];
  search?: string;
  channel?: string;
  status?: "success" | "fail" | "pending";
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

function buildCustomerWhere(filter: CustomerFilter) {
  const conditions = [];
  if (filter.createdById) conditions.push(eq(customers.createdById, filter.createdById));
  if (filter.orgIds && filter.orgIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filter.orgIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.search) {
    conditions.push(or(
      like(customers.wxId, `%${filter.search}%`),
      like(customers.customerName, `%${filter.search}%`)
    ));
  }
  if (filter.channel) conditions.push(eq(customers.sourceChannel, filter.channel));
  if (filter.status === "success") conditions.push(sql`${customers.salesAmount} > 0`);
  else if (filter.status === "fail") conditions.push(eq(customers.salesAmount, "0"));
  else if (filter.status === "pending") conditions.push(isNull(customers.salesAmount));
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listCustomers(filter: CustomerFilter) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 30;
  const offset = (page - 1) * pageSize;
  const where = buildCustomerWhere(filter);

  const [items, countResult] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customers).where(eq(customers.id, id));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Performance Stats ────────────────────────────────────────────────────────

export interface PerfFilter {
  createdById?: number;
  orgIds?: number[];
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getPerformanceStats(filter: PerfFilter) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [];
  if (filter.createdById) conditions.push(eq(customers.createdById, filter.createdById));
  if (filter.orgIds && filter.orgIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filter.orgIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const result = await db.select({
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
  }).from(customers).where(where);
  const row = result[0];
  const total = Number(row?.total ?? 0);
  const successCount = Number(row?.successCount ?? 0);
  const totalSales = Number(row?.totalSales ?? 0);
  return {
    total,
    successCount,
    totalSales,
    conversionRate: total > 0 ? (successCount / total) * 100 : 0,
    avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
    avgPerAll: total > 0 ? totalSales / total : 0,
  };
}

export async function getPerformanceDailyList(filter: PerfFilter & { page?: number; pageSize?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (filter.createdById) conditions.push(eq(customers.createdById, filter.createdById));
  if (filter.orgIds && filter.orgIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filter.orgIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 30;
  const offset = (page - 1) * pageSize;
  const items = await db.select({
    date: sql<string>`DATE(${customers.createdAt})`,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
  }).from(customers).where(where)
    .groupBy(sql`DATE(${customers.createdAt})`)
    .orderBy(desc(sql`DATE(${customers.createdAt})`))
    .limit(pageSize).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(distinct DATE(${customers.createdAt}))` }).from(customers).where(where);
  return {
    items: items.map(row => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      const totalSales = Number(row.totalSales);
      return {
        date: row.date,
        total,
        successCount,
        totalSales,
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
      };
    }),
    total: Number(countResult[0]?.count ?? 0),
  };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardPeriod = "day" | "week" | "month";

function getPeriodRange(period: LeaderboardPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (period === "day") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = from.getDay();
    from.setDate(from.getDate() - (day === 0 ? 6 : day - 1));
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

export async function getIndividualLeaderboard(period: LeaderboardPeriod, page = 1, pageSize = 30) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { from, to } = getPeriodRange(period);
  const items = await db.select({
    userId: customers.createdById,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
  }).from(customers)
    .where(and(gte(customers.createdAt, from), lte(customers.createdAt, to)))
    .groupBy(customers.createdById)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`))
    .limit(pageSize).offset((page - 1) * pageSize);

  const userIds = items.map(i => i.userId);
  const userList = userIds.length > 0
    ? await db.select().from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    : [];
  const userMap = new Map(userList.map(u => [u.id, u]));

  const countResult = await db.select({ count: sql<number>`count(distinct ${customers.createdById})` })
    .from(customers).where(and(gte(customers.createdAt, from), lte(customers.createdAt, to)));

  return {
    items: items.map((row, idx) => {
      const u = userMap.get(row.userId);
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      const totalSales = Number(row.totalSales);
      return {
        rank: (page - 1) * pageSize + idx + 1,
        userId: row.userId,
        userName: u?.name ?? "未知",
        organizationId: u?.organizationId ?? null,
        total,
        successCount,
        totalSales,
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
      };
    }),
    total: Number(countResult[0]?.count ?? 0),
  };
}

export async function getTeamLeaderboard(period: LeaderboardPeriod, visibleOrgIds: number[], page = 1, pageSize = 30) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { from, to } = getPeriodRange(period);
  // Only include leaf-level orgs (三级团队) for team ranking
  const leafIds = await getLeafOrgIds();
  const effectiveOrgIds = visibleOrgIds.length > 0
    ? visibleOrgIds.filter(id => leafIds.includes(id))
    : leafIds;
  if (effectiveOrgIds.length === 0) return { items: [], total: 0 };
  const orgCondition = sql`${customers.organizationId} IN (${sql.join(effectiveOrgIds.map(id => sql`${id}`), sql`, `)})`;

  const items = await db.select({
    orgId: customers.organizationId,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
    employeeCount: sql<number>`count(distinct ${customers.createdById})`,
  }).from(customers)
    .where(and(gte(customers.createdAt, from), lte(customers.createdAt, to), orgCondition))
    .groupBy(customers.organizationId)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`))
    .limit(pageSize).offset((page - 1) * pageSize);

  const countResult = await db.select({ count: sql<number>`count(distinct ${customers.organizationId})` })
    .from(customers).where(and(gte(customers.createdAt, from), lte(customers.createdAt, to), orgCondition));

  const orgNames = new Map<number, string>();
  for (const item of items) {
    if (item.orgId) {
      const name = await buildOrgPath(item.orgId);
      orgNames.set(item.orgId, name);
    }
  }

  return {
    items: items.map((row, idx) => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      const totalSales = Number(row.totalSales);
      const employeeCount = Number(row.employeeCount);
      return {
        rank: (page - 1) * pageSize + idx + 1,
        orgId: row.orgId,
        orgName: row.orgId ? (orgNames.get(row.orgId) ?? "未知团队") : "未分配",
        total,
        successCount,
        totalSales,
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
        employeeCount,
        avgPerEmployee: employeeCount > 0 ? totalSales / employeeCount : 0,
      };
    }),
    total: Number(countResult[0]?.count ?? 0),
  };
}

// ─── Team Performance Daily ───────────────────────────────────────────────────

export async function getTeamPerformanceDailyList(filter: PerfFilter & { orgId?: number; page?: number; pageSize?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  // Only include leaf-level orgs (三级团队) for team daily performance
  const leafIds = await getLeafOrgIds();
  // orgIds=undefined means sysadmin with no org → query all leaf orgs; orgIds=[] means no visible orgs → return empty
  if (filter.orgIds !== undefined) {
    if (filter.orgIds.length === 0) return { items: [], total: 0 };
    const filteredOrgIds = filter.orgIds.filter(id => leafIds.includes(id));
    if (filteredOrgIds.length === 0) return { items: [], total: 0 };
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filteredOrgIds.map(id => sql`${id}`), sql`, `)})`);
  } else if (leafIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(leafIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.orgId) conditions.push(eq(customers.organizationId, filter.orgId));
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 30;
  const offset = (page - 1) * pageSize;
  const items = await db.select({
    date: sql<string>`DATE(${customers.createdAt})`,
    orgId: customers.organizationId,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
    employeeCount: sql<number>`count(distinct ${customers.createdById})`,
  }).from(customers).where(where)
    .groupBy(sql`DATE(${customers.createdAt})`, customers.organizationId)
    .orderBy(desc(sql`DATE(${customers.createdAt})`), asc(customers.organizationId))
    .limit(pageSize).offset(offset);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(
    db.select({ g: sql`1` }).from(customers).where(where)
      .groupBy(sql`DATE(${customers.createdAt})`, customers.organizationId).as("sub")
  );

  const orgNames = new Map<number, string>();
  for (const item of items) {
    if (item.orgId && !orgNames.has(item.orgId)) {
      orgNames.set(item.orgId, await buildOrgPath(item.orgId));
    }
  }

  return {
    items: items.map(row => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      const totalSales = Number(row.totalSales);
      const employeeCount = Number(row.employeeCount);
      return {
        date: row.date,
        orgId: row.orgId,
        orgName: row.orgId ? (orgNames.get(row.orgId) ?? "未知团队") : "未分配",
        total,
        successCount,
        totalSales,
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
        employeeCount,
        avgPerEmployee: employeeCount > 0 ? totalSales / employeeCount : 0,
      };
    }),
    total: Number(countResult[0]?.count ?? 0),
  };
}

export async function getTeamPerformanceStats(filter: PerfFilter) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [];
  // Only include leaf-level orgs (三级团队) for team stats
  const leafIds = await getLeafOrgIds();
  // orgIds=undefined means query all leaf orgs; orgIds=[] means no visible orgs
  if (filter.orgIds !== undefined) {
    if (filter.orgIds.length === 0) return null;
    const filteredOrgIds = filter.orgIds.filter(id => leafIds.includes(id));
    if (filteredOrgIds.length === 0) return null;
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filteredOrgIds.map(id => sql`${id}`), sql`, `)})`);
  } else if (leafIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(leafIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const result = await db.select({
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
    employeeCount: sql<number>`count(distinct ${customers.createdById})`,
    orgCount: sql<number>`count(distinct ${customers.organizationId})`,
  }).from(customers).where(where);
  const row = result[0];
  const total = Number(row?.total ?? 0);
  const successCount = Number(row?.successCount ?? 0);
  const totalSales = Number(row?.totalSales ?? 0);
  const employeeCount = Number(row?.employeeCount ?? 0);
  const orgCount = Number(row?.orgCount ?? 0);
  return {
    total,
    successCount,
    totalSales,
    conversionRate: total > 0 ? (successCount / total) * 100 : 0,
    avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
    avgPerAll: total > 0 ? totalSales / total : 0,
    employeeCount,
    avgPerEmployee: employeeCount > 0 ? totalSales / employeeCount : 0,
    orgCount,
    avgPerOrg: orgCount > 0 ? totalSales / orgCount : 0,
  };
}

// ─── Self-Rank Lookups ────────────────────────────────────────────────────────

/** Returns the current user's own leaderboard entry with their real rank */
export async function getMySelfRank(userId: number, period: LeaderboardPeriod) {
  const db = await getDb();
  if (!db) return null;
  const { from, to } = getPeriodRange(period);

  // Get all users ranked by sales, find user's position
  const allRanked = await db.select({
    userId: customers.createdById,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
  }).from(customers)
    .where(and(gte(customers.createdAt, from), lte(customers.createdAt, to)))
    .groupBy(customers.createdById)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`));

  const idx = allRanked.findIndex(r => r.userId === userId);
  if (idx === -1) {
    // User has no entries in this period
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = userResult[0];
    return {
      rank: allRanked.length + 1,
      userId,
      userName: u?.name ?? "未知",
      organizationId: u?.organizationId ?? null,
      total: 0,
      successCount: 0,
      totalSales: 0,
      conversionRate: 0,
      avgPerSuccess: 0,
      avgPerAll: 0,
    };
  }

  const row = allRanked[idx];
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = userResult[0];
  const total = Number(row.total);
  const successCount = Number(row.successCount);
  const totalSales = Number(row.totalSales);
  return {
    rank: idx + 1,
    userId,
    userName: u?.name ?? "未知",
    organizationId: u?.organizationId ?? null,
    total,
    successCount,
    totalSales,
    conversionRate: total > 0 ? (successCount / total) * 100 : 0,
    avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
    avgPerAll: total > 0 ? totalSales / total : 0,
  };
}

/** Returns the current user's team leaderboard entry with their real rank (among leaf-level orgs only) */
export async function getMyTeamRank(orgId: number, period: LeaderboardPeriod) {
  const db = await getDb();
  if (!db) return null;
  const { from, to } = getPeriodRange(period);
  // Only rank among leaf-level orgs (三级团队)
  const leafIds = await getLeafOrgIds();
  const leafCondition = leafIds.length > 0
    ? sql`${customers.organizationId} IN (${sql.join(leafIds.map(id => sql`${id}`), sql`, `)})`
    : sql`1=0`;

  const allRanked = await db.select({
    orgId: customers.organizationId,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    employeeCount: sql<number>`count(distinct ${customers.createdById})`,
  }).from(customers)
    .where(and(gte(customers.createdAt, from), lte(customers.createdAt, to), leafCondition))
    .groupBy(customers.organizationId)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`));

  const idx = allRanked.findIndex(r => r.orgId === orgId);
  const orgName = await buildOrgPath(orgId);

  if (idx === -1) {
    return {
      rank: allRanked.length + 1,
      orgId,
      orgName,
      total: 0,
      successCount: 0,
      totalSales: 0,
      conversionRate: 0,
      avgPerSuccess: 0,
      avgPerAll: 0,
      employeeCount: 0,
      avgPerEmployee: 0,
    };
  }

  const row = allRanked[idx];
  const total = Number(row.total);
  const successCount = Number(row.successCount);
  const totalSales = Number(row.totalSales);
  const employeeCount = Number(row.employeeCount);
  return {
    rank: idx + 1,
    orgId,
    orgName,
    total,
    successCount,
    totalSales,
    conversionRate: total > 0 ? (successCount / total) * 100 : 0,
    avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
    avgPerAll: total > 0 ? totalSales / total : 0,
    employeeCount,
    avgPerEmployee: employeeCount > 0 ? totalSales / employeeCount : 0,
  };
}

// ─── Internal Auth ────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function createInternalUser(data: InsertUser & { passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(users).values(data);
  return result[0].insertId;
}

// ─── Channel Analytics ────────────────────────────────────────────────────────

export interface ChannelAnalyticsFilter {
  orgIds?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  channel?: string;
}

export async function getChannelAnalytics(filter: ChannelAnalyticsFilter) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (filter.orgIds && filter.orgIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(filter.orgIds.map(id => sql`${id}`), sql`, `)})`);
  }
  if (filter.dateFrom) conditions.push(gte(customers.createdAt, filter.dateFrom));
  if (filter.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  if (filter.channel) conditions.push(eq(customers.sourceChannel, filter.channel));
  // Only include rows that have a channel set
  conditions.push(isNotNull(customers.sourceChannel));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db.select({
    channel: customers.sourceChannel,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
  }).from(customers)
    .where(where)
    .groupBy(customers.sourceChannel)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`));

  return {
    items: items.map(row => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      const totalSales = Number(row.totalSales);
      return {
        channel: row.channel ?? "未知渠道",
        total,
        successCount,
        totalSales,
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
      };
    }),
    total: items.length,
  };
}

// ─── Employee Ranking (Team Workspace) ───────────────────────────────────────
export async function getEmployeeRanking(opts: {
  dateFrom?: Date;
  dateTo?: Date;
  nameSearch?: string;
  orgIds?: number[];
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { dateFrom, dateTo, nameSearch, orgIds, page = 1, pageSize = 30 } = opts;

  const conditions = [];
  if (dateFrom) conditions.push(gte(customers.createdAt, dateFrom));
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(customers.createdAt, end));
  }
  if (orgIds && orgIds.length > 0) {
    conditions.push(sql`${customers.organizationId} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get all ranked by sales amount
  const allRanked = await db.select({
    userId: customers.createdById,
    total: sql<number>`count(*)`,
    successCount: sql<number>`sum(case when ${customers.salesAmount} > 0 then 1 else 0 end)`,
    totalSales: sql<number>`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`,
  }).from(customers)
    .where(where)
    .groupBy(customers.createdById)
    .orderBy(desc(sql`sum(case when ${customers.salesAmount} > 0 then ${customers.salesAmount} else 0 end)`));

  // Fetch user info for all
  const userIds = allRanked.map(r => r.userId);
  const userList = userIds.length > 0
    ? await db.select().from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    : [];
  const userMap = new Map(userList.map(u => [u.id, u]));

  // Build org name map for all users' organizations
  const orgIdsForNames = Array.from(new Set(userList.map(u => u.organizationId).filter(Boolean) as number[]));
  const orgNameMap = new Map<number, string>();
  for (const oid of orgIdsForNames) {
    orgNameMap.set(oid, await buildOrgPath(oid));
  }

  // Build ranked items with real rank
  let ranked = allRanked.map((row, idx) => {
    const u = userMap.get(row.userId);
    const total = Number(row.total);
    const successCount = Number(row.successCount);
    const totalSales = Number(row.totalSales);
    const orgId = u?.organizationId ?? null;
    return {
      rank: idx + 1,
      userId: row.userId,
      userName: u?.name ?? "未知",
      organizationId: orgId,
      orgName: orgId ? (orgNameMap.get(orgId) ?? "未分配") : "未分配",
      total,
      successCount,
      totalSales,
      conversionRate: total > 0 ? (successCount / total) * 100 : 0,
      avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
      avgPerAll: total > 0 ? totalSales / total : 0,
    };
  });

  // Apply name search filter (after ranking so rank numbers are correct)
  if (nameSearch && nameSearch.trim()) {
    const keyword = nameSearch.trim().toLowerCase();
    ranked = ranked.filter(r => r.userName.toLowerCase().includes(keyword));
  }

  const total = ranked.length;
  const offset = (page - 1) * pageSize;
  const items = ranked.slice(offset, offset + pageSize);

  return { items, total };
}
