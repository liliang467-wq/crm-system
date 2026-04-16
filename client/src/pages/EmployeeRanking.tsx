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
  desensitizeName,
  formatCurrency,
  formatPercent,
  getTodayRange,
  obfuscateValue,
} from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useState } from "react";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500 font-bold text-base">🥇</span>;
  if (rank === 2) return <span className="text-gray-400 font-bold text-base">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-base">🥉</span>;
  return <span className="text-muted-foreground text-sm font-medium">{rank}</span>;
}

export default function EmployeeRanking() {
  const { user } = useAuth();
  const today = getTodayRange();
  const [dateFrom, setDateFrom] = useState(today.dateFrom);
  const [dateTo, setDateTo] = useState(today.dateTo);
  const [nameSearch, setNameSearch] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [page, setPage] = useState(1);

  const rankQuery = trpc.leaderboard.employeeRanking.useQuery({
    dateFrom,
    dateTo,
    nameSearch: nameSearch || undefined,
    page,
    pageSize: 30,
  });

  const { items = [], total = 0 } = rankQuery.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / 30));

  function handleReset() {
    setDateFrom(today.dateFrom);
    setDateTo(today.dateTo);
    setNameSearch("");
    setNameInput("");
    setPage(1);
  }

  function handleSearch() {
    setNameSearch(nameInput);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center px-6 shrink-0">
        <h1 className="text-lg font-semibold">员工排名</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Name search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索员工姓名..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="h-8 text-sm pl-8 w-44"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch} className="h-8 text-sm">
              搜索
            </Button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Date range */}
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />

          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            重置
          </Button>
        </div>

        {/* Ranking table */}
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
    </div>
  );
}
