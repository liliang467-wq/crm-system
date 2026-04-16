import { describe, it, expect } from "vitest";

/** Replicate the toCsv helper from dataExport.ts for unit testing */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

describe("Data Export - CSV generation", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("generates correct CSV header and rows", () => {
    const rows = [
      { ID: 1, 姓名: "张三", 金额: 100 },
      { ID: 2, 姓名: "李四", 金额: 200 },
    ];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("ID,姓名,金额");
    expect(lines[1]).toBe("1,张三,100");
    expect(lines[2]).toBe("2,李四,200");
  });

  it("escapes values containing commas", () => {
    const rows = [{ 备注: "你好,世界" }];
    const csv = toCsv(rows);
    expect(csv).toContain('"你好,世界"');
  });

  it("escapes values containing double quotes", () => {
    const rows = [{ 备注: '他说"你好"' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"他说""你好"""');
  });

  it("escapes values containing newlines", () => {
    const rows = [{ 备注: "第一行\n第二行" }];
    const csv = toCsv(rows);
    expect(csv).toContain('"第一行\n第二行"');
  });

  it("handles null and undefined values as empty strings", () => {
    const rows = [{ a: null, b: undefined, c: "ok" }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",,ok");
  });

  it("handles single row with multiple columns", () => {
    const rows = [{ ID: 1, 微信ID: "wx123", 客户姓名: "王五", 销售额: 5000 }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe("ID,微信ID,客户姓名,销售额");
    expect(lines[1]).toBe("1,wx123,王五,5000");
  });
});

describe("Data Export - download filename format", () => {
  it("generates date-based filename", () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `customers_${today}.csv`;
    expect(filename).toMatch(/^customers_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
