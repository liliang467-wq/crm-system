import CustomerFormModal from "@/components/CustomerFormModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
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
import {
  formatCurrency,
  formatDate,
  getCustomerStatus,
  getTodayRange,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Download, Edit2, RotateCcw, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TeamClients() {
  const today = getTodayRange();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("_all");
  const [status, setStatus] = useState("_all");
  const [dateFrom, setDateFrom] = useState(today.dateFrom);
  const [dateTo, setDateTo] = useState(today.dateTo);
  const [orgId, setOrgId] = useState("_all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const channelsQuery = trpc.mgmt.listChannels.useQuery();
  const orgsQuery = trpc.mgmt.listOrganizations.useQuery();
  const utils = trpc.useUtils();

  const listQuery = trpc.team.customers.useQuery({
    search: search || undefined,
    channel: channel === "_all" ? undefined : channel,
    status: status === "_all" ? undefined : (status as any),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    orgId: orgId === "_all" ? undefined : parseInt(orgId),
    page,
    pageSize: 30,
  });

  const deleteMutation = trpc.team.deleteCustomer.useMutation({
    onSuccess: () => {
      toast.success("客户已删除");
      setDeleteId(null);
      utils.team.customers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleReset() {
    setSearch(""); setChannel("_all"); setStatus("_all");
    setDateFrom(today.dateFrom); setDateTo(today.dateTo);
    setOrgId("_all"); setPage(1);
  }

  function handleExport() {
    const { items = [] } = listQuery.data ?? {};
    if (items.length === 0) { toast.info("暂无数据可导出"); return; }
    const headers = ["微信ID", "客户姓名", "渠道来源", "状态", "销售额", "录入时间", "组织ID"];
    const rows = items.map(c => [
      c.wxId,
      c.customerName ?? "",
      c.sourceChannel ?? "",
      STATUS_LABELS[getCustomerStatus(c.salesAmount)],
      c.salesAmount ?? "",
      formatDate(c.createdAt),
      c.organizationId ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `团队客户_${dateFrom}_${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const { items = [], total = 0 } = listQuery.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">团队客户</h1>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          导出 Excel
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-lg border flex flex-col h-full">
          {/* Filters */}
          <div className="p-4 border-b bg-muted/30 flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="微信ID / 客户姓名 / 员工姓名" className="pl-8 h-8 text-sm w-52" />
            </div>

            <Select value={channel} onValueChange={v => { setChannel(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="全部渠道" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部来源渠道</SelectItem>
                {channelsQuery.data?.map(ch => <SelectItem key={ch.id} value={ch.name}>{ch.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-28"><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部状态</SelectItem>
                <SelectItem value="success">开发成功</SelectItem>
                <SelectItem value="pending">待跟进</SelectItem>
                <SelectItem value="fail">开发失败</SelectItem>
              </SelectContent>
            </Select>

            <Select value={orgId} onValueChange={v => { setOrgId(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="全部团队" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全部团队</SelectItem>
                {orgsQuery.data?.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
            <span className="text-muted-foreground text-sm">—</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />

            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />重置
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow>
                  <TableHead className="text-xs">微信ID</TableHead>
                  <TableHead className="text-xs">客户姓名</TableHead>
                  <TableHead className="text-xs">渠道来源</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">销售额</TableHead>
                  <TableHead className="text-xs">员工姓名</TableHead>
                  <TableHead className="text-xs">录入时间</TableHead>
                  <TableHead className="text-xs">团队</TableHead>
                  <TableHead className="text-xs text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">暂无数据</TableCell></TableRow>
                ) : items.map(client => {
                  const st = getCustomerStatus(client.salesAmount);
                  return (
                    <TableRow key={client.id} className="group">
                      <TableCell className="font-medium text-sm">{client.wxId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{client.customerName || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{client.sourceChannel || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[st]}`}>{STATUS_LABELS[st]}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {client.salesAmount !== null ? formatCurrency(parseFloat(String(client.salesAmount))) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(client as any).employeeName ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(client.createdAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(client as any).orgName ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-primary hover:text-primary" onClick={() => { setEditData(client); setFormOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5 mr-1" />编辑
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t flex items-center justify-between bg-card">
            <span className="text-sm text-muted-foreground">共 {total} 条数据，每页 30 条</span>
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

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => utils.team.customers.invalidate()} initialData={editData} isTeamMode />
      <DeleteConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate({ id: deleteId })} loading={deleteMutation.isPending} />
    </div>
  );
}
