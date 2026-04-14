import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { Edit2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SysChannels() {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const channelsQuery = trpc.mgmt.listChannels.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.mgmt.createChannel.useMutation({
    onSuccess: () => { toast.success("渠道已添加"); setFormOpen(false); utils.mgmt.listChannels.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.mgmt.updateChannel.useMutation({
    onSuccess: () => { toast.success("渠道已更新"); setFormOpen(false); utils.mgmt.listChannels.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.mgmt.deleteChannel.useMutation({
    onSuccess: () => { toast.success("渠道已删除"); setDeleteId(null); utils.mgmt.listChannels.invalidate(); },
    onError: e => toast.error(e.message),
  });

  function openCreate() { setEditId(null); setName(""); setFormOpen(true); }
  function openEdit(ch: any) { setEditId(ch.id); setName(ch.name); setFormOpen(true); }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("渠道名称不能为空"); return; }
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, name: name.trim() });
    } else {
      await createMutation.mutateAsync({ name: name.trim() });
    }
  }

  const channels = channelsQuery.data ?? [];
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">渠道来源配置</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />新增渠道
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-lg border">
          {channels.length === 0 && !channelsQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Tag className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">暂无渠道配置，点击右上角新增</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">渠道名称</TableHead>
                  <TableHead className="text-xs">添加时间</TableHead>
                  <TableHead className="text-xs text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
                ) : channels.map(ch => (
                  <TableRow key={ch.id} className="group">
                    <TableCell className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/60" />
                        {ch.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ch.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-primary hover:text-primary" onClick={() => openEdit(ch)}>
                          <Edit2 className="h-3.5 w-3.5 mr-1" />编辑
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(ch.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "编辑渠道" : "新增渠道"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">渠道名称 <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：微信公众号、小红书引流"
                className="h-9 text-sm"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isLoading}>取消</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate({ id: deleteId })}
        loading={deleteMutation.isPending}
        title="确认删除该渠道？"
        description="删除后该渠道标签将不再出现在下拉选项中，已录入的客户数据不受影响。"
      />
    </div>
  );
}
