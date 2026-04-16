import { z } from "zod";
import {
  getIndividualLeaderboard,
  getMySelfRank,
  getMyTeamRank,
  getTeamLeaderboard,
  getVisibleOrgIds,
  getEmployeeRanking,
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

  /** Employee ranking for team managers - with name search and custom date range */
  employeeRanking: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      nameSearch: z.string().optional(),
      filterOrgId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      let orgIds: number[] | undefined = undefined;
      if (user.organizationId) {
        orgIds = await getVisibleOrgIds(user.organizationId);
      }
      // If a specific org filter is provided, use only that org
      const finalOrgIds = input.filterOrgId ? [input.filterOrgId] : orgIds;
      return getEmployeeRanking({
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        nameSearch: input.nameSearch,
        orgIds: finalOrgIds,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),
});
