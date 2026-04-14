import { z } from "zod";
import {
  getIndividualLeaderboard,
  getMySelfRank,
  getMyTeamRank,
  getTeamLeaderboard,
  getVisibleOrgIds,
  LeaderboardPeriod,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const periodSchema = z.enum(["day", "week", "month"]);

export const leaderboardRouter = router({
  individual: protectedProcedure
    .input(z.object({ period: periodSchema, page: z.number().default(1), pageSize: z.number().default(30) }))
    .query(async ({ input }) => {
      return getIndividualLeaderboard(input.period as LeaderboardPeriod, input.page, input.pageSize);
    }),

  /** Always returns the current user's own rank entry regardless of pagination */
  mySelfRank: protectedProcedure
    .input(z.object({ period: periodSchema }))
    .query(async ({ ctx, input }) => {
      return getMySelfRank(ctx.user.id, input.period as LeaderboardPeriod);
    }),

  team: protectedProcedure
    .input(z.object({ period: periodSchema, page: z.number().default(1), pageSize: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      let visibleOrgIds: number[] = [];
      if (user.organizationId) {
        visibleOrgIds = await getVisibleOrgIds(user.organizationId);
      }
      return getTeamLeaderboard(input.period as LeaderboardPeriod, visibleOrgIds, input.page, input.pageSize);
    }),

  /** Always returns the current user's team rank entry regardless of pagination */
  myTeamRank: protectedProcedure
    .input(z.object({ period: periodSchema }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user.organizationId) return null;
      return getMyTeamRank(ctx.user.organizationId, input.period as LeaderboardPeriod);
    }),
});
