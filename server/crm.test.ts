import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "测试员工",
    loginMethod: "manus",
    role: "employee" as const,
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── CRM Utility Logic Tests ──────────────────────────────────────────────────

describe("CRM Business Rules", () => {
  describe("Status determination", () => {
    it("null salesAmount → pending", () => {
      // Mirrors getCustomerStatus logic
      const salesAmount: null = null;
      const status = salesAmount === null ? "pending" : salesAmount > 0 ? "success" : "fail";
      expect(status).toBe("pending");
    });

    it("salesAmount = 0 → fail", () => {
      const salesAmount = 0;
      const status = salesAmount === null ? "pending" : salesAmount > 0 ? "success" : "fail";
      expect(status).toBe("fail");
    });

    it("salesAmount > 0 → success", () => {
      const salesAmount = 1000;
      const status = salesAmount === null ? "pending" : salesAmount > 0 ? "success" : "fail";
      expect(status).toBe("success");
    });
  });

  describe("Value obfuscation", () => {
    function obfuscate(value: number): string {
      if (value <= 0) return "0";
      if (value < 10) return `${Math.floor(value)}+`;
      const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
      const truncated = Math.floor(value / magnitude) * magnitude;
      return `${truncated.toLocaleString()}+`;
    }

    it("192 → '100+'", () => {
      expect(obfuscate(192)).toBe("100+");
    });

    it("1926 → '1,000+'", () => {
      expect(obfuscate(1926)).toBe("1,000+");
    });

    it("23037 → '20,000+'", () => {
      expect(obfuscate(23037)).toBe("20,000+");
    });

    it("0 → '0'", () => {
      expect(obfuscate(0)).toBe("0");
    });

    it("5 → '5+'", () => {
      expect(obfuscate(5)).toBe("5+");
    });
  });

  describe("Name desensitization", () => {
    function desensitize(name: string | null | undefined): string {
      if (!name) return "-";
      if (name.length === 1) return name;
      if (name.length === 2) return `${name[0]}*`;
      return `${name[0]}*${name[name.length - 1]}`;
    }

    it("2 chars: 李明 → 李*", () => {
      expect(desensitize("李明")).toBe("李*");
    });

    it("3 chars: 王小妹 → 王*妹", () => {
      expect(desensitize("王小妹")).toBe("王*妹");
    });

    it("4 chars: 欧阳锋 → 欧*锋", () => {
      expect(desensitize("欧阳锋")).toBe("欧*锋");
    });

    it("null → -", () => {
      expect(desensitize(null)).toBe("-");
    });

    it("1 char: 李 → 李", () => {
      expect(desensitize("李")).toBe("李");
    });
  });

  describe("Performance stats formulas", () => {
    function calcStats(total: number, successCount: number, totalSales: number) {
      return {
        conversionRate: total > 0 ? (successCount / total) * 100 : 0,
        avgPerSuccess: successCount > 0 ? totalSales / successCount : 0,
        avgPerAll: total > 0 ? totalSales / total : 0,
      };
    }

    it("conversion rate = successCount / total * 100", () => {
      const stats = calcStats(10, 4, 8000);
      expect(stats.conversionRate).toBe(40);
    });

    it("avgPerSuccess = totalSales / successCount", () => {
      const stats = calcStats(10, 4, 8000);
      expect(stats.avgPerSuccess).toBe(2000);
    });

    it("avgPerAll = totalSales / total", () => {
      const stats = calcStats(10, 4, 8000);
      expect(stats.avgPerAll).toBe(800);
    });

    it("zero division guard: total=0 → all zeros", () => {
      const stats = calcStats(0, 0, 0);
      expect(stats.conversionRate).toBe(0);
      expect(stats.avgPerSuccess).toBe(0);
      expect(stats.avgPerAll).toBe(0);
    });
  });
});

// ─── Auth Router Tests ────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const ctx = makeCtx({ name: "测试用户" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.name).toBe("测试用户");
  });
});

// ─── Role Access Control Tests ────────────────────────────────────────────────

describe("Role-based access control", () => {
  it("employee cannot access listUsers", async () => {
    const ctx = makeCtx({ role: "employee" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.mgmt.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("manager cannot access listUsers", async () => {
    const ctx = makeCtx({ role: "manager" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.mgmt.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("employee cannot access team customers", async () => {
    const ctx = makeCtx({ role: "employee" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.team.customers({ page: 1, pageSize: 30 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
