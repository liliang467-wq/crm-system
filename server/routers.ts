import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter as coreSystemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { customersRouter } from "./routers/customers";
import { leaderboardRouter } from "./routers/leaderboard";
import { performanceRouter } from "./routers/performance";
import { systemRouter } from "./routers/system";
import { teamRouter } from "./routers/team";
import { channelAnalyticsRouter } from "./routers/channelAnalytics";
import { dataExportRouter } from "./routers/dataExport";
import { getUserByOpenId } from "./db";

export const appRouter = router({
  system: coreSystemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /** Internal account/password login — bypasses OAuth */
    loginInternal: publicProcedure
      .input(z.object({ account: z.string().min(1), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByOpenId(input.account);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账户或密码错误" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账户或密码错误" });
        }
        // Issue session cookie using the same mechanism as OAuth
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),
  }),
  customers: customersRouter,
  performance: performanceRouter,
  leaderboard: leaderboardRouter,
  team: teamRouter,
  mgmt: systemRouter,
  channelAnalytics: channelAnalyticsRouter,
  dataExport: dataExportRouter,
});

export type AppRouter = typeof appRouter;
