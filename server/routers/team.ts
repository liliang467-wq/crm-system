import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buildOrgPath,
  deleteCustomer,
  getAllOrganizations,
  getAllUsers,
  getCustomerById,
  getTeamPerformanceDailyList,
  getTeamPerformanceStats,
  getVisibleOrgIds,
  listCustomers,
  updateCustomer,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { parseDateLocal, parseDateLocalEnd } from "./_utils";

function requireManager(role: string) {
  if (role === "employee") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可访问团队工作台" });
  }
}

const customerInput = z.object({
  wxId: z.string().min(1),
  customerName: z.string().optional().nullable(),
  sourceChannel: z.string().optional().nullable(),
  salesAmount: z.number().optional().nullable(),
  customerBirthday: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactBirthday: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const teamRouter = router({
  customers: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      channel: z.string().optional(),
      status: z.enum(["success", "fail", "pending"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      orgId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const user = ctx.user;
      let orgIds: number[] = [];
      if (user.organizationId) {
        orgIds = await getVisibleOrgIds(user.organizationId);
      }
      if (input.orgId) orgIds = orgIds.filter(id => id === input.orgId);

      const result = await listCustomers({
        orgIds,
        search: input.search,
        channel: input.channel,
        status: input.status,
        dateFrom: parseDateLocal(input.dateFrom),
        dateTo: parseDateLocalEnd(input.dateTo),
        page: input.page,
        pageSize: input.pageSize,
      });

      // Enrich with employee name and org name
      const [allUsers, allOrgs] = await Promise.all([getAllUsers(), getAllOrganizations()]);
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const orgNameCache = new Map<number, string>();

      const enriched = await Promise.all(result.items.map(async c => {
        const creator = userMap.get(c.createdById);
        let orgName = "-";
        if (c.organizationId) {
          if (!orgNameCache.has(c.organizationId)) {
            orgNameCache.set(c.organizationId, await buildOrgPath(c.organizationId));
          }
          orgName = orgNameCache.get(c.organizationId) ?? "-";
        }
        return {
          ...c,
          employeeName: creator?.name ?? "-",
          orgName,
        };
      }));

      return { items: enriched, total: result.total };
    }),

  updateCustomer: protectedProcedure
    .input(z.object({ id: z.number() }).merge(customerInput.partial()))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const { id, salesAmount, ...rest } = input;
      const existing = await getCustomerById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateCustomer(id, {
        ...rest,
        salesAmount: salesAmount != null ? String(salesAmount) : salesAmount === null ? null : undefined,
      });
      return { success: true };
    }),

  deleteCustomer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const existing = await getCustomerById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteCustomer(input.id);
      return { success: true };
    }),

  performanceStats: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      orgId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const user = ctx.user;
      // sysadmin with no org sees ALL data; manager sees their subtree
      let orgIds: number[] | undefined = undefined;
      if (user.organizationId) {
        orgIds = await getVisibleOrgIds(user.organizationId);
        // If filtering by a specific org, narrow down
        if (input.orgId) orgIds = orgIds.filter(id => id === input.orgId);
      } else if (input.orgId) {
        // sysadmin filtering by specific org
        orgIds = [input.orgId];
      }
      return getTeamPerformanceStats({
        orgIds,
        dateFrom: parseDateLocal(input.dateFrom),
        dateTo: parseDateLocalEnd(input.dateTo),
      });
    }),

  performanceDailyList: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      orgId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const user = ctx.user;
      // sysadmin with no org sees ALL data; manager sees their subtree
      let orgIds: number[] | undefined = undefined;
      if (user.organizationId) {
        orgIds = await getVisibleOrgIds(user.organizationId);
      }
      return getTeamPerformanceDailyList({
        orgIds,
        orgId: input.orgId,
        dateFrom: parseDateLocal(input.dateFrom),
        dateTo: parseDateLocalEnd(input.dateTo),
        page: input.page,
        pageSize: input.pageSize,
      });
    }),
});
