import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  desensitizeName,
  formatCurrency,
  formatPercent,
  obfuscateValue,
} from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Medal } from "lucide-react";
import { useState } from "react";

type Period = "day" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = { day: "日榜", week: "周榜", month: "月榜" };

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500 font-bold text-base">🥇</span>;
  if (rank === 2) return <span className="text-gray-400 font-bold text-base">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-base">🥉</span>;
  return <span className="text-muted-foreground text-sm font-medium">{rank}</span>;
}

export default function MyRanking() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("day");
  const [page, setPage] = useState(1);

  const rankQuery = trpc.leaderboard.individual.useQuery({ period, page, pageSize: 30 });
  // Always fetch own rank regardless of pagination
  const selfRankQuery = trpc.leaderboard.mySelfRank.useQuery({ period });

  const { items = [], total = 0 } = rankQuery.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / 30));
  const myEntry = selfRankQuery.data;

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">我的排行</h1>
        <Tabs value={period} onValueChange={v => { setPeriod(v as Period); setPage(1); }}>
          <TabsList className="h-8">
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <TabsTrigger key={k} value={k} className="text-xs px-3">{v}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto p-6 pb-20">
        <div className="bg-card rounded-lg border">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs w-16">排名</TableHead>
                  <TableHead className="text-xs">员工姓名</TableHead>
                  <TableHead className="text-xs">客户数</TableHead>
                  <TableHead className="text-xs">开发成功数</TableHead>
                  <TableHead className="text-xs">转化率</TableHead>
                  <TableHead className="text-xs">销售额</TableHead>
                  <TableHead className="text-xs">成功客均</TableHead>
                  <TableHead className="text-xs">全部客均</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankQuery.isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">暂无排行数据</TableCell></TableRow>
                ) : items.map(item => {
                  const isMe = item.userId === user?.id;
                  return (
                    <TableRow key={item.userId} className={isMe ? "bg-primary/5 font-medium" : ""}>
                      <TableCell><RankBadge rank={item.rank} /></TableCell>
                      <TableCell className="text-sm">
                        {isMe ? (
                          <span className="text-primary font-semibold">{item.userName} (我)</span>
                        ) : desensitizeName(item.userName)}
                      </TableCell>
                      <TableCell className="text-sm">{item.total}</TableCell>
                      <TableCell className="text-sm">{item.successCount}</TableCell>
                      <TableCell className="text-sm">{formatPercent(item.conversionRate)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {isMe ? formatCurrency(item.totalSales) : `¥${obfuscateValue(item.totalSales)}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isMe ? formatCurrency(item.avgPerSuccess) : `¥${obfuscateValue(item.avgPerSuccess)}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isMe ? formatCurrency(item.avgPerAll) : `¥${obfuscateValue(item.avgPerAll)}`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {total} 人</span>
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

      {/* Floating own row — always shows real data, independent of pagination */}
      {user && myEntry && (
        <div className="fixed bottom-0 left-[var(--sidebar-width,220px)] right-0 bg-primary text-primary-foreground border-t border-primary/20 shadow-lg z-20">
          <div className="px-6 py-3 flex items-center gap-5 text-sm overflow-x-auto">
            <div className="flex items-center gap-2 font-semibold shrink-0">
              <Medal className="h-4 w-4" />
              <span>我的排名: #{myEntry.rank}</span>
            </div>
            <div className="h-4 w-px bg-primary-foreground/30 shrink-0" />
            <span className="shrink-0">客户数: {myEntry.total}</span>
            <span className="shrink-0">成功: {myEntry.successCount}</span>
            <span className="shrink-0">转化率: {formatPercent(myEntry.conversionRate)}</span>
            <span className="shrink-0">销售额: {formatCurrency(myEntry.totalSales)}</span>
            <span className="shrink-0">成功客均: {formatCurrency(myEntry.avgPerSuccess)}</span>
            <span className="shrink-0">全部客均: {formatCurrency(myEntry.avgPerAll)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
