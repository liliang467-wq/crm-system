import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createOrganization,
  createSourceChannel,
  deleteOrganization,
  deleteSourceChannel,
  deleteUser,
  getAllOrganizations,
  getAllSourceChannels,
  getAllUsers,
  updateOrganization,
  updateSourceChannel,
  updateUser,
  upsertUser,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function requireSysAdmin(role: string) {
  if (role !== "sysadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅系统管理员可访问" });
  }
}

function requireManagerOrAbove(role: string) {
  if (role === "employee") {
    throw new TRPCError({ code: "FORBIDDEN", message: "权限不足" });
  }
}

export const systemRouter = router({
  // ── Users ──────────────────────────────────────────────────────────────────
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    requireSysAdmin(ctx.user.role);
    return getAllUsers();
  }),

  createUser: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional().nullable(),
      role: z.enum(["employee", "manager", "sysadmin"]),
      organizationId: z.number().optional().nullable(),
      openId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      await upsertUser({
        openId: input.openId,
        name: input.name,
        email: input.email ?? null,
        role: input.role,
        organizationId: input.organizationId ?? null,
        loginMethod: "internal",
        lastSignedIn: new Date(),
      });
      return { success: true };
    }),

  updateUser: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      role: z.enum(["employee", "manager", "sysadmin"]).optional(),
      organizationId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      const { id, ...data } = input;
      await updateUser(id, data);
      return { success: true };
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能删除自己的账户" });
      await deleteUser(input.id);
      return { success: true };
    }),

  // ── Organizations ──────────────────────────────────────────────────────────
  listOrganizations: protectedProcedure.query(async ({ ctx }) => {
    requireManagerOrAbove(ctx.user.role);
    return getAllOrganizations();
  }),

  createOrganization: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      leaderId: z.number().optional().nullable(),
      parentId: z.number().optional().nullable(),
      grandParentId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      const id = await createOrganization({
        name: input.name,
        leaderId: input.leaderId ?? null,
        parentId: input.parentId ?? null,
        grandParentId: input.grandParentId ?? null,
      });
      return { id };
    }),

  updateOrganization: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      leaderId: z.number().optional().nullable(),
      parentId: z.number().optional().nullable(),
      grandParentId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      const { id, ...data } = input;
      await updateOrganization(id, data);
      return { success: true };
    }),

  deleteOrganization: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      await deleteOrganization(input.id);
      return { success: true };
    }),

  // ── Source Channels ────────────────────────────────────────────────────────
  listChannels: protectedProcedure.query(async ({ ctx }) => {
    return getAllSourceChannels();
  }),

  createChannel: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      const id = await createSourceChannel({ name: input.name, createdById: ctx.user.id });
      return { id };
    }),

  updateChannel: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      await updateSourceChannel(input.id, { name: input.name });
      return { success: true };
    }),

  deleteChannel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireSysAdmin(ctx.user.role);
      await deleteSourceChannel(input.id);
      return { success: true };
    }),
});
