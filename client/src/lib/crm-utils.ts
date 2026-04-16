/**
 * CRM Utility Functions
 * Implements PRD-specified business rules for display formatting
 */

/**
 * Value obfuscation per PRD v1.5 rules:
 * Truncate to the leading digit only (1 significant figure), append "+"
 * Examples: 179 → 100+, 899.5 → 800+, 1234 → 1000+, 23037 → 20000+
 */
export function obfuscateValue(value: number): string {
  if (value <= 0) return "0";
  if (value < 10) return `${Math.floor(value)}+`;
  const d = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, d);
  const truncated = Math.floor(value / magnitude) * magnitude;
  return `${truncated.toLocaleString()}+`;
}

/**
 * Name desensitization:
 * - 2 chars: hide 2nd char → "李*"
 * - 3+ chars: hide middle char → "王*妹", "欧*锋"
 */
export function desensitizeName(name: string | null | undefined): string {
  if (!name) return "-";
  if (name.length === 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  // 3+ chars: keep first and last, hide middle
  return `${name[0]}*${name[name.length - 1]}`;
}

/**
 * Determine customer status from salesAmount
 * null/undefined → 待跟进
 * 0 → 开发失败
 * > 0 → 开发成功
 */
export function getCustomerStatus(salesAmount: string | number | null | undefined): "success" | "fail" | "pending" {
  if (salesAmount === null || salesAmount === undefined || salesAmount === "") return "pending";
  const num = typeof salesAmount === "string" ? parseFloat(salesAmount) : salesAmount;
  if (isNaN(num)) return "pending";
  if (num > 0) return "success";
  return "fail";
}

export const STATUS_LABELS: Record<string, string> = {
  success: "开发成功",
  fail: "开发失败",
  pending: "待跟进",
};

export const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ROLE_LABELS: Record<string, string> = {
  employee: "员工",
  manager: "管理",
  sysadmin: "系统管理",
};

/** Today's date range as ISO strings */
export function getTodayRange(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = today.toISOString().split("T")[0];
  return { dateFrom, dateTo };
}

/** Last 7 days range (today inclusive) as ISO strings */
export function getLast7DaysRange(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const dateTo = today.toISOString().split("T")[0];
  const from = new Date(today);
  from.setDate(from.getDate() - 6); // 6 days back + today = 7 days
  const dateFrom = from.toISOString().split("T")[0];
  return { dateFrom, dateTo };
}
