import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatPercent,
  getLast7DaysRange,
  getTodayRange,
} from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Medal, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 7;

/** Generate all dates between from and to (inclusive), descending order */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const current = new Date(end);
  while (current >= start) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() - 1);
  }
  return dates;
}

const ZERO_ROW = { total: 0, successCount: 0, totalSales: 0, conversionRate: 0, avgPerSuccess: 0, avgPerAll: 0 };

export default function MyPerformance() {
  const { user } = useAuth();
  const today = getTodayRange();
  const last7 = getLast7DaysRange();

  const [dateFrom, setDateFrom] = useState(last7.dateFrom);
  const [dateTo, setDateTo] = useState(last7.dateTo);
  const [page, setPage] = useState(1);

  const todayStatsQuery = trpc.performance.myStats.useQuery({ dateFrom: today.dateFrom, dateTo: today.dateTo });
  const statsQuery = trpc.performance.myStats.useQuery({ dateFrom, dateTo });
  // Fetch ALL daily data for the range (large pageSize to get everything, then paginate client-side)
  const listQuery = trpc.performance.myDailyList.useQuery({ dateFrom, dateTo, page: 1, pageSize: 9999 });

  const todayStats = todayStatsQuery.data;
  const stats = statsQuery.data;
  const { items: rawItems = [] } = listQuery.data ?? {};

  // Build a map of date -> data, then generate full date range with zero-fill
  const filledRows = useMemo(() => {
    const dataMap = new Map(rawItems.map(r => [r.date, r]));
    const allDates = generateDateRange(dateFrom, dateTo);
    return allDates.map(date => ({
      date,
      ...(dataMap.get(date) ?? ZERO_ROW),
    }));
  }, [rawItems, dateFrom, dateTo]);

  const totalDays = filledRows.length;
  const totalPages = Math.max(1, Math.ceil(totalDays / PAGE_SIZE));
  const pageItems = filledRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleReset() {
    setDateFrom(last7.dateFrom);
    setDateTo(last7.dateTo);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold">我的业绩</h1>
      </div>

      {user && todayStats !== undefined && (
        <div className="bg-primary text-primary-foreground border-b border-primary/20 shadow-sm shrink-0">
          <div className="px-6 py-2.5 flex items-center gap-5 text-sm overflow-x-auto">
            <div className="flex items-center gap-2 font-semibold shrink-0">
              <Medal className="h-4 w-4" />
              <span>今日业绩</span>
            </div>
            <div className="h-4 w-px bg-primary-foreground/30 shrink-0" />
            <span className="shrink-0">客户数: <strong>{todayStats?.total ?? 0}</strong></span>
            <span className="shrink-0">成功: <strong>{todayStats?.successCount ?? 0}</strong></span>
            <span className="shrink-0">转化率: <strong>{formatPercent(todayStats?.conversionRate)}</strong></span>
            <span className="shrink-0">销售额: <strong>{formatCurrency(todayStats?.totalSales)}</strong></span>
            <span className="shrink-0">成功客均: <strong>{formatCurrency(todayStats?.avgPerSuccess)}</strong></span>
            <span className="shrink-0">全部客均: <strong>{formatCurrency(todayStats?.avgPerAll)}</strong></span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters — date range always visible */}
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            重置
          </Button>
        </div>

        {/* Stats Panel */}
        <div className="bg-card border rounded-lg flex flex-wrap">
          {[
            { label: "客户总数", value: String(stats?.total ?? 0) },
            { label: "开发成功数", value: String(stats?.successCount ?? 0) },
            { label: "转化率", value: formatPercent(stats?.conversionRate) },
            { label: "销售额", value: formatCurrency(stats?.totalSales) },
            { label: "成功客均", value: formatCurrency(stats?.avgPerSuccess) },
            { label: "全部客均", value: formatCurrency(stats?.avgPerAll) },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5 px-4 py-2.5 border-r last:border-r-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}</span>
              <span className="text-base font-bold text-foreground tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Daily List — zero-filled, 7 rows per page, newest date on top */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">业绩明细（按日汇总）</h2>
            <span className="text-xs text-muted-foreground">
              {dateFrom} 至 {dateTo}，共 {totalDays} 天
            </span>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">日期</TableHead>
                  <TableHead className="text-xs">客户总数</TableHead>
                  <TableHead className="text-xs">开发成功数</TableHead>
                  <TableHead className="text-xs">转化率</TableHead>
                  <TableHead className="text-xs">销售额</TableHead>
                  <TableHead className="text-xs">成功客均</TableHead>
                  <TableHead className="text-xs">全部客均</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : pageItems.map((row) => (
                  <TableRow key={row.date} className={row.total === 0 ? "text-muted-foreground" : ""}>
                    <TableCell className="text-sm font-medium">{row.date}</TableCell>
                    <TableCell className="text-sm">{row.total}</TableCell>
                    <TableCell className="text-sm">{row.successCount}</TableCell>
                    <TableCell className="text-sm">{formatPercent(row.conversionRate)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(row.totalSales)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.avgPerSuccess)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.avgPerAll)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {totalDays} 天，第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
