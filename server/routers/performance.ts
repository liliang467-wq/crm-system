import { z } from "zod";
import { getPerformanceDailyList, getPerformanceStats } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const dateRangeInput = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(30),
});

export const performanceRouter = router({
  myStats: protectedProcedure
    .input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return getPerformanceStats({
        createdById: ctx.user.id,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      });
    }),

  myDailyList: protectedProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      return getPerformanceDailyList({
        createdById: ctx.user.id,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),
});
