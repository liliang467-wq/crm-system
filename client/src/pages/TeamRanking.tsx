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
  formatCurrency,
  formatPercent,
  obfuscateValue,
} from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import TeamNameDisplay from "@/components/TeamNameDisplay";
import { ChevronLeft, ChevronRight, Medal } from "lucide-react";
import { useMemo, useState } from "react";

type Period = "day" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = { day: "日榜", week: "周榜", month: "月榜" };

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500 font-bold text-base">🥇</span>;
  if (rank === 2) return <span className="text-gray-400 font-bold text-base">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-base">🥉</span>;
  return <span className="text-muted-foreground text-sm font-medium">{rank}</span>;
}

const PAGE_SIZE = 30;

const ZERO_ENTRY = {
  total: 0,
  successCount: 0,
  totalSales: 0,
  conversionRate: 0,
  avgPerSuccess: 0,
  avgPerAll: 0,
  employeeCount: 0,
  avgPerEmployee: 0,
};

export default function TeamRanking() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("day");
  const [page, setPage] = useState(1);

  // Fetch ranking data (only teams with data)
  const rankQuery = trpc.leaderboard.team.useQuery({ period, page: 1, pageSize: 9999 });
  // Always fetch own team rank regardless of pagination
  const myTeamRankQuery = trpc.leaderboard.myTeamRank.useQuery({ period });
  // Fetch all orgs with formatted names to identify leaf teams
  const orgsFormattedQuery = trpc.mgmt.listOrganizationsFormatted.useQuery();

  const { items: rankedItems = [] } = rankQuery.data ?? {};
  const myTeamEntry = myTeamRankQuery.data;
  const myOrgId = user?.organizationId;

  // Identify leaf-level orgs (三级部门): orgs that are NOT a parent of any other org
  const leafOrgs = useMemo(() => {
    const allOrgs = orgsFormattedQuery.data ?? [];
    const parentIds = new Set(allOrgs.map(o => o.parentId).filter(Boolean));
    return allOrgs.filter(o => !parentIds.has(o.id));
  }, [orgsFormattedQuery.data]);

  // Merge ranked items with all leaf teams: fill zero-data teams, always add "未分配"
  const allTeamRows = useMemo(() => {
    // Build a map of orgId -> ranked data
    const rankedMap = new Map<number | null, typeof rankedItems[0]>();
    for (const item of rankedItems) {
      if (item.orgId == null) {
        rankedMap.set(null, item);
      } else {
        rankedMap.set(item.orgId, item);
      }
    }

    type TeamRow = {
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
    };

    const rows: TeamRow[] = [];

    // Add all leaf teams (with data or zero-filled)
    for (const org of leafOrgs) {
      const existing = rankedMap.get(org.id);
      if (existing) {
        rows.push({
          orgId: org.id,
          orgName: org.displayName, // Use formatted name: 三级部门（二级部门）
          total: existing.total,
          successCount: existing.successCount,
          totalSales: existing.totalSales,
          conversionRate: existing.conversionRate,
          avgPerSuccess: existing.avgPerSuccess,
          avgPerAll: existing.avgPerAll,
          employeeCount: existing.employeeCount,
          avgPerEmployee: existing.avgPerEmployee,
        });
      } else {
        rows.push({
          orgId: org.id,
          orgName: org.displayName,
          ...ZERO_ENTRY,
        });
      }
    }

    // Always add "未分配" row
    const unassignedData = rankedMap.get(null);
    rows.push({
      orgId: null,
      orgName: "未分配",
      ...(unassignedData ? {
        total: unassignedData.total,
        successCount: unassignedData.successCount,
        totalSales: unassignedData.totalSales,
        conversionRate: unassignedData.conversionRate,
        avgPerSuccess: unassignedData.avgPerSuccess,
        avgPerAll: unassignedData.avgPerAll,
        employeeCount: unassignedData.employeeCount,
        avgPerEmployee: unassignedData.avgPerEmployee,
      } : ZERO_ENTRY),
    });

    // Sort by totalSales descending, then by total, then by name for stability
    rows.sort((a, b) => {
      if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
      if (b.total !== a.total) return b.total - a.total;
      return (a.orgName ?? "").localeCompare(b.orgName ?? "");
    });

    // Assign ranks
    return rows.map((row, idx) => ({
      ...row,
      rank: idx + 1,
    }));
  }, [rankedItems, leafOrgs]);

  const totalTeams = allTeamRows.length;
  const totalPages = Math.max(1, Math.ceil(totalTeams / PAGE_SIZE));
  const pageItems = allTeamRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">团队排行</h1>
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
                  <TableHead className="text-xs">团队名称</TableHead>
                  <TableHead className="text-xs">客户数</TableHead>
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
                {(rankQuery.isLoading || orgsFormattedQuery.isLoading) ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">暂无排行数据</TableCell></TableRow>
                ) : pageItems.map(item => {
                  const isMyOrg = myOrgId != null && item.orgId === myOrgId;
                  return (
                    <TableRow key={item.orgId ?? "unassigned"} className={`${isMyOrg ? "bg-primary/5 font-medium" : ""} ${item.total === 0 ? "text-muted-foreground" : ""}`}>
                      <TableCell><RankBadge rank={item.rank} /></TableCell>
                      <TableCell className="text-sm">
                        {isMyOrg ? (
                          <span className="text-primary font-semibold">
                            <TeamNameDisplay name={item.orgName} highlight /> <span className="text-xs">(我的团队)</span>
                          </span>
                        ) : (
                          <TeamNameDisplay name={item.orgName} />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.total}</TableCell>
                      <TableCell className="text-sm">{item.successCount}</TableCell>
                      <TableCell className="text-sm">{formatPercent(item.conversionRate)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {isMyOrg ? formatCurrency(item.totalSales) : (item.totalSales > 0 ? `¥${obfuscateValue(item.totalSales)}` : formatCurrency(0))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isMyOrg ? formatCurrency(item.avgPerSuccess) : (item.avgPerSuccess > 0 ? `¥${obfuscateValue(item.avgPerSuccess)}` : formatCurrency(0))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isMyOrg ? formatCurrency(item.avgPerAll) : (item.avgPerAll > 0 ? `¥${obfuscateValue(item.avgPerAll)}` : formatCurrency(0))}
                      </TableCell>
                      <TableCell className="text-sm">{item.employeeCount}</TableCell>
                      <TableCell className="text-sm">
                        {isMyOrg ? formatCurrency(item.avgPerEmployee) : (item.avgPerEmployee > 0 ? `¥${obfuscateValue(item.avgPerEmployee)}` : formatCurrency(0))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {totalTeams} 个团队</span>
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

      {/* Floating own-team row — always shows real data, independent of pagination */}
      {user && myTeamEntry && myOrgId && (
        <div className="fixed bottom-0 left-[var(--sidebar-width,220px)] right-0 bg-primary text-primary-foreground border-t border-primary/20 shadow-lg z-20">
          <div className="px-6 py-3 flex items-center gap-5 text-sm overflow-x-auto">
            <div className="flex items-center gap-2 font-semibold shrink-0">
              <Medal className="h-4 w-4" />
              <span>我的团队排名: #{myTeamEntry.rank}</span>
            </div>
            <div className="h-4 w-px bg-primary-foreground/30 shrink-0" />
            <span className="shrink-0"><TeamNameDisplay name={myTeamEntry.orgName} /></span>
            <span className="shrink-0">人数: {myTeamEntry.employeeCount}</span>
            <span className="shrink-0">客户数: {myTeamEntry.total}</span>
            <span className="shrink-0">成功: {myTeamEntry.successCount}</span>
            <span className="shrink-0">转化率: {formatPercent(myTeamEntry.conversionRate)}</span>
            <span className="shrink-0">销售额: {formatCurrency(myTeamEntry.totalSales)}</span>
            <span className="shrink-0">人均: {formatCurrency(myTeamEntry.avgPerEmployee)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
