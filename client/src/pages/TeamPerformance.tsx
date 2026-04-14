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
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useState } from "react";

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-r last:border-r-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-base font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export default function TeamPerformance() {
  const today = getTodayRange();
  const [dateFrom, setDateFrom] = useState(today.dateFrom);
  const [dateTo, setDateTo] = useState(today.dateTo);
  const [orgId, setOrgId] = useState("_all");
  const [page, setPage] = useState(1);

  const orgsQuery = trpc.mgmt.listOrganizations.useQuery();
  const statsQuery = trpc.team.performanceStats.useQuery({
    dateFrom, dateTo,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
  });
  const listQuery = trpc.team.performanceDailyList.useQuery({
    dateFrom, dateTo,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
    page, pageSize: 30,
  });

  const stats = statsQuery.data;
  const { items = [], total = 0 } = listQuery.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / 30));

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
            <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="全部团队" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部团队</SelectItem>
              {orgsQuery.data?.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />重置
          </Button>
        </div>

        {/* Stats Panel — compact single horizontal row */}
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

        {/* Daily List */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">团队业绩明细（按日 × 团队汇总）</h2>
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
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">暂无数据</TableCell></TableRow>
                ) : items.filter(row => row.total > 0).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{row.date}</TableCell>
                    <TableCell className="text-sm">{row.orgName}</TableCell>
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
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {total} 条记录</span>
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
