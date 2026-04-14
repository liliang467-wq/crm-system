import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter as coreSystemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { customersRouter } from "./routers/customers";
import { leaderboardRouter } from "./routers/leaderboard";
import { performanceRouter } from "./routers/performance";
import { systemRouter } from "./routers/system";
import { teamRouter } from "./routers/team";

export const appRouter = router({
  system: coreSystemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  customers: customersRouter,
  performance: performanceRouter,
  leaderboard: leaderboardRouter,
  team: teamRouter,
  mgmt: systemRouter,
});

export type AppRouter = typeof appRouter;
