import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent, getTodayRange } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import TeamNameDisplay from "@/components/TeamNameDisplay";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 7;

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-r last:border-r-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-base font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

/** Format a Date to YYYY-MM-DD using LOCAL timezone */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Generate all dates between from and to (inclusive), descending order */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const current = new Date(end);
  while (current >= start) {
    dates.push(toLocalDateStr(current));
    current.setDate(current.getDate() - 1);
  }
  return dates;
}

const ZERO_ROW = { total: 0, successCount: 0, totalSales: 0, conversionRate: 0, avgPerSuccess: 0, avgPerAll: 0, employeeCount: 0, avgPerEmployee: 0 };

export default function TeamPerformance() {
  const today = getTodayRange();
  const [dateFrom, setDateFrom] = useState(today.dateFrom);
  const [dateTo, setDateTo] = useState(today.dateTo);
  const [orgId, setOrgId] = useState("_all");
  const [page, setPage] = useState(1);

  // Formatted org names for display
  const orgsFormattedQuery = trpc.mgmt.listOrganizationsFormatted.useQuery();
  const statsQuery = trpc.team.performanceStats.useQuery({
    dateFrom, dateTo,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
  });
  // Fetch ALL daily data for the range, then zero-fill and paginate client-side
  const listQuery = trpc.team.performanceDailyList.useQuery({
    dateFrom, dateTo,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
    page: 1, pageSize: 9999,
  });

  const stats = statsQuery.data;
  const { items: rawItems = [] } = listQuery.data ?? {};

  // Determine leaf-level orgs (三级团队): orgs that are NOT a parent of any other org
  const leafOrgs = useMemo(() => {
    const allOrgs = orgsFormattedQuery.data ?? [];
    const parentIds = new Set(allOrgs.map(o => o.parentId).filter(Boolean));
    return allOrgs.filter(o => !parentIds.has(o.id));
  }, [orgsFormattedQuery.data]);

  // Build zero-filled rows: for each date, show all leaf teams + 未分配
  const filledRows = useMemo(() => {
    const allDates = generateDateRange(dateFrom, dateTo);

    // Build lookup: "date|orgId" -> row data
    const dataMap = new Map<string, typeof rawItems[0]>();
    for (const row of rawItems) {
      const key = `${row.date}|${row.orgId ?? "null"}`;
      dataMap.set(key, row);
    }

    // Build team list: all leaf orgs + always include 未分配
    type TeamEntry = { orgId: number | null; displayName: string };
    const teams: TeamEntry[] = [];

    if (orgId !== "_all") {
      // Filtering by specific org
      const selectedOrgId = parseInt(orgId);
      const org = leafOrgs.find(o => o.id === selectedOrgId);
      teams.push({ orgId: selectedOrgId, displayName: org?.displayName ?? "未分配" });
    } else {
      // All teams mode
      for (const org of leafOrgs) {
        teams.push({ orgId: org.id, displayName: org.displayName });
      }
      // Always include 未分配
      teams.push({ orgId: null, displayName: "未分配" });
    }

    const rows: Array<{
      date: string;
      orgId: number | null;
      orgName: string;
      total: number;
      successCount: number;
      totalSales: number;
      conversionRate: number;
      avgPerSuccess: number;
      avgPerAll: number;
      employeeCount: number;
      avgPerEmployee: number;
    }> = [];

    for (const date of allDates) {
      for (const team of teams) {
        const key = `${date}|${team.orgId ?? "null"}`;
        const existing = dataMap.get(key);
        rows.push({
          date,
          orgId: team.orgId,
          orgName: team.displayName,
          ...(existing ? {
            total: existing.total,
            successCount: existing.successCount,
            totalSales: existing.totalSales,
            conversionRate: existing.conversionRate,
            avgPerSuccess: existing.avgPerSuccess,
            avgPerAll: existing.avgPerAll,
            employeeCount: existing.employeeCount,
            avgPerEmployee: existing.avgPerEmployee,
          } : ZERO_ROW),
        });
      }
    }

    return rows;
  }, [rawItems, dateFrom, dateTo, orgId, leafOrgs]);

  const totalRows = filledRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const pageItems = filledRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleReset() {
    setDateFrom(today.dateFrom); setDateTo(today.dateTo);
    setOrgId("_all"); setPage(1);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold">团队业绩</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
          <Select value={orgId} onValueChange={v => { setOrgId(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-sm w-48"><SelectValue placeholder="全部团队" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部团队</SelectItem>
              {(orgsFormattedQuery.data ?? []).map(o => (
                <SelectItem key={o.id} value={String(o.id)}>
                  <TeamNameDisplay name={o.displayName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />重置
          </Button>
        </div>

        {/* Stats Panel */}
        <div className="bg-card border rounded-lg overflow-x-auto">
          <div className="flex min-w-max divide-x">
            <StatItem label="客户总数" value={String(stats?.total ?? 0)} />
            <StatItem label="开发成功" value={String(stats?.successCount ?? 0)} />
            <StatItem label="转化率" value={formatPercent(stats?.conversionRate)} />
            <StatItem label="销售额" value={formatCurrency(stats?.totalSales)} />
            <StatItem label="成功客均" value={formatCurrency(stats?.avgPerSuccess)} />
            <StatItem label="全部客均" value={formatCurrency(stats?.avgPerAll)} />
            <StatItem label="员工总数" value={String(stats?.employeeCount ?? 0)} />
            <StatItem label="人均产出" value={formatCurrency(stats?.avgPerEmployee)} />
            <StatItem label="团队数量" value={String(stats?.orgCount ?? 0)} />
            <StatItem label="团队均产" value={formatCurrency(stats?.avgPerOrg)} />
          </div>
        </div>

        {/* Daily List — zero-filled, 7 rows per page */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">团队业绩明细（按日 × 团队汇总）</h2>
            <span className="text-xs text-muted-foreground">
              {dateFrom} 至 {dateTo}，同一天多团队分行展示
            </span>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">日期</TableHead>
                  <TableHead className="text-xs">团队名称</TableHead>
                  <TableHead className="text-xs">客户总数</TableHead>
                  <TableHead className="text-xs">开发成功数</TableHead>
                  <TableHead className="text-xs">转化率</TableHead>
                  <TableHead className="text-xs">销售额</TableHead>
                  <TableHead className="text-xs">成功客均</TableHead>
                  <TableHead className="text-xs">全部客均</TableHead>
                  <TableHead className="text-xs">员工数</TableHead>
                  <TableHead className="text-xs">人均产出</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">暂无数据</TableCell></TableRow>
                ) : pageItems.map((row, i) => (
                  <TableRow key={`${row.date}-${row.orgId}-${i}`} className={row.total === 0 ? "text-muted-foreground" : ""}>
                    <TableCell className="text-sm font-medium">{row.date}</TableCell>
                    <TableCell className="text-sm"><TeamNameDisplay name={row.orgName} /></TableCell>
                    <TableCell className="text-sm">{row.total}</TableCell>
                    <TableCell className="text-sm">{row.successCount}</TableCell>
                    <TableCell className="text-sm">{formatPercent(row.conversionRate)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(row.totalSales)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.avgPerSuccess)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.avgPerAll)}</TableCell>
                    <TableCell className="text-sm">{row.employeeCount}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.avgPerEmployee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {totalRows} 条记录，第 {page} / {totalPages} 页
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
