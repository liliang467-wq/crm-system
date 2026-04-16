import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, users, organizations, sourceChannels } from "../../drizzle/schema";

function requireSysAdmin(role: string) {
  if (role !== "sysadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅系统管理员可导出数据" });
  }
}

/** Convert an array of objects to CSV string */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    // Wrap in quotes if contains comma, newline, or quote
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export const dataExportRouter = router({
  /** Export all customers as CSV */
  exportCustomers: protectedProcedure
    .query(async ({ ctx }) => {
      requireSysAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const allCustomers = await db.select().from(customers);
      const csv = toCsv(allCustomers.map(c => ({
        ID: c.id,
        微信ID: c.wxId,
        客户姓名: c.customerName ?? "",
        来源渠道: c.sourceChannel ?? "",
        销售额: c.salesAmount ?? "",
        客户生日: c.customerBirthday ?? "",
        对象姓名: c.contactName ?? "",
        对象生日: c.contactBirthday ?? "",
        跟进备注: c.notes ?? "",
        客户画像: c.customerPortrait ?? "",
        备案登记: c.caseNote ?? "",
        录入员工ID: c.createdById,
        所属团队ID: c.organizationId ?? "",
        录入时间: c.createdAt?.toISOString() ?? "",
        更新时间: c.updatedAt?.toISOString() ?? "",
      })));
      return { csv, filename: `customers_${new Date().toISOString().slice(0, 10)}.csv`, count: allCustomers.length };
    }),

  /** Export all users as CSV */
  exportUsers: protectedProcedure
    .query(async ({ ctx }) => {
      requireSysAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const allUsers = await db.select().from(users);
      const csv = toCsv(allUsers.map(u => ({
        ID: u.id,
        账号: u.openId,
        姓名: u.name ?? "",
        邮箱: u.email ?? "",
        角色: u.role,
        所属团队ID: u.organizationId ?? "",
        登录方式: u.loginMethod ?? "",
        创建时间: u.createdAt?.toISOString() ?? "",
        最后登录: u.lastSignedIn?.toISOString() ?? "",
      })));
      return { csv, filename: `users_${new Date().toISOString().slice(0, 10)}.csv`, count: allUsers.length };
    }),

  /** Export all organizations as CSV */
  exportOrganizations: protectedProcedure
    .query(async ({ ctx }) => {
      requireSysAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const allOrgs = await db.select().from(organizations);
      const csv = toCsv(allOrgs.map(o => ({
        ID: o.id,
        名称: o.name,
        负责人ID: o.leaderId ?? "",
        上级组织ID: o.parentId ?? "",
        上上级组织ID: o.grandParentId ?? "",
        创建时间: o.createdAt?.toISOString() ?? "",
      })));
      return { csv, filename: `organizations_${new Date().toISOString().slice(0, 10)}.csv`, count: allOrgs.length };
    }),

  /** Export all source channels as CSV */
  exportChannels: protectedProcedure
    .query(async ({ ctx }) => {
      requireSysAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const allChannels = await db.select().from(sourceChannels);
      const csv = toCsv(allChannels.map(c => ({
        ID: c.id,
        渠道名称: c.name,
        创建人ID: c.createdById ?? "",
        创建时间: c.createdAt?.toISOString() ?? "",
      })));
      return { csv, filename: `channels_${new Date().toISOString().slice(0, 10)}.csv`, count: allChannels.length };
    }),
});
