import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getVisibleOrgIds,
  listCustomers,
  updateCustomer,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const customerInput = z.object({
  wxId: z.string().min(1, "微信ID不能为空"),
  customerName: z.string().optional().nullable(),
  sourceChannel: z.string().optional().nullable(),
  salesAmount: z.number().optional().nullable(),
  customerBirthday: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactBirthday: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerPortrait: z.string().optional().nullable(),
  caseNote: z.string().optional().nullable(),
});

export const customersRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      channel: z.string().optional(),
      status: z.enum(["success", "fail", "pending"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      return listCustomers({
        createdById: user.id,
        search: input.search,
        channel: input.channel,
        status: input.status,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),

  create: protectedProcedure
    .input(customerInput)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      const id = await createCustomer({
        wxId: input.wxId,
        customerName: input.customerName ?? null,
        sourceChannel: input.sourceChannel ?? null,
        salesAmount: input.salesAmount != null ? String(input.salesAmount) : null,
        customerBirthday: input.customerBirthday ?? null,
        contactName: input.contactName ?? null,
        contactBirthday: input.contactBirthday ?? null,
        notes: input.notes ?? null,
        customerPortrait: input.customerPortrait ?? null,
        caseNote: input.caseNote ?? null,
        createdById: user.id,
        organizationId: user.organizationId ?? null,
        // createdAt is server-enforced via DB default
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(customerInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, salesAmount, ...rest } = input;
      const existing = await getCustomerById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      // Only owner or manager/sysadmin can edit
      if (existing.createdById !== ctx.user.id && ctx.user.role === "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateCustomer(id, {
        ...rest,
        salesAmount: salesAmount != null ? String(salesAmount) : salesAmount === null ? null : undefined,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getCustomerById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.createdById !== ctx.user.id && ctx.user.role === "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteCustomer(input.id);
      return { success: true };
    }),
});
