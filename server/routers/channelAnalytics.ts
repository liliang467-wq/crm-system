import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getChannelAnalytics, getVisibleOrgIds } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function requireManager(role: string) {
  if (role === "employee") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可访问渠道管理" });
  }
}

export const channelAnalyticsRouter = router({
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      orgId: z.number().optional(),
      channel: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      const user = ctx.user;
      let orgIds: number[] = [];
      if (user.organizationId) {
        orgIds = await getVisibleOrgIds(user.organizationId);
      }
      if (input.orgId) orgIds = [input.orgId];

      return getChannelAnalytics({
        orgIds: orgIds.length > 0 ? orgIds : undefined,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        channel: input.channel,
      });
    }),
});
