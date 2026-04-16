import { z } from "zod";
import { getPerformanceDailyList, getPerformanceStats } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { parseDateLocal, parseDateLocalEnd } from "./_utils";

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
        dateFrom: parseDateLocal(input.dateFrom),
        dateTo: parseDateLocalEnd(input.dateTo),
      });
    }),

  myDailyList: protectedProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      return getPerformanceDailyList({
        createdById: ctx.user.id,
        dateFrom: parseDateLocal(input.dateFrom),
        dateTo: parseDateLocalEnd(input.dateTo),
        page: input.page,
        pageSize: input.pageSize,
      });
    }),
});
