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
import { RotateCcw } from "lucide-react";
import { useState } from "react";

export default function ChannelAnalytics() {
  const today = getTodayRange();
  const [dateFrom, setDateFrom] = useState(today.dateFrom);
  const [dateTo, setDateTo] = useState(today.dateTo);
  const [channel, setChannel] = useState("_all");

  const channelsQuery = trpc.mgmt.listChannels.useQuery();
  const orgsFormattedQuery = trpc.mgmt.listOrganizationsFormatted.useQuery();
  const [orgId, setOrgId] = useState("_all");

  const analyticsQuery = trpc.channelAnalytics.list.useQuery({
    dateFrom,
    dateTo,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
    channel: channel === "_all" ? undefined : channel,
  });

  const { items = [], total = 0 } = analyticsQuery.data ?? {};

  function handleReset() {
    setDateFrom(today.dateFrom);
    setDateTo(today.dateTo);
    setChannel("_all");
    setOrgId("_all");
  }

  // Summary row
  const summary = items.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      successCount: acc.successCount + row.successCount,
      totalSales: acc.totalSales + row.totalSales,
    }),
    { total: 0, successCount: 0, totalSales: 0 }
  );
  const summaryConversion = summary.total > 0 ? (summary.successCount / summary.total) * 100 : 0;
  const summaryAvgSuccess = summary.successCount > 0 ? summary.totalSales / summary.successCount : 0;
  const summaryAvgAll = summary.total > 0 ? summary.totalSales / summary.total : 0;

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold">渠道管理</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 text-sm w-36"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 text-sm w-36"
          />
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger className="h-8 text-sm w-48">
              <SelectValue placeholder="全部团队" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部团队</SelectItem>
              {(orgsFormattedQuery.data ?? []).map(o => (
                <SelectItem key={o.id} value={String(o.id)}>
                  <TeamNameDisplay name={o.displayName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="全部渠道" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部渠道</SelectItem>
              {channelsQuery.data?.map(ch => (
                <SelectItem key={ch.id} value={ch.name}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            重置
          </Button>
        </div>

        {/* Summary Bar */}
        {items.length > 0 && (
          <div className="bg-card border rounded-lg flex flex-wrap divide-y md:divide-y-0">
            {[
              { label: "渠道数量", value: String(total) },
              { label: "客户总数", value: String(summary.total) },
              { label: "开发成功数", value: String(summary.successCount) },
              { label: "综合转化率", value: formatPercent(summaryConversion) },
              { label: "销售额合计", value: formatCurrency(summary.totalSales) },
              { label: "成功客均", value: formatCurrency(summaryAvgSuccess) },
              { label: "全部客均", value: formatCurrency(summaryAvgAll) },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-0.5 px-4 py-2.5 border-r last:border-r-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}</span>
                <span className="text-base font-bold text-foreground tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Channel Table */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">渠道来源分析</h2>
            <span className="text-xs text-muted-foreground">共 {total} 个渠道</span>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">来源渠道</TableHead>
                  <TableHead className="text-xs text-right">客户总数</TableHead>
                  <TableHead className="text-xs text-right">开发成功数</TableHead>
                  <TableHead className="text-xs text-right">转化率</TableHead>
                  <TableHead className="text-xs text-right">销售额</TableHead>
                  <TableHead className="text-xs text-right">成功客均</TableHead>
                  <TableHead className="text-xs text-right">全部客均</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      暂无渠道数据，请先录入客户并选择来源渠道
                    </TableCell>
                  </TableRow>
                ) : items.map((row, i) => (
                  <TableRow key={row.channel} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {row.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right">{row.total}</TableCell>
                    <TableCell className="text-sm text-right">{row.successCount}</TableCell>
                    <TableCell className="text-sm text-right">
                      <span className={`font-medium ${row.conversionRate >= 50 ? "text-green-600" : row.conversionRate >= 20 ? "text-amber-600" : "text-slate-500"}`}>
                        {formatPercent(row.conversionRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(row.totalSales)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(row.avgPerSuccess)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(row.avgPerAll)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
