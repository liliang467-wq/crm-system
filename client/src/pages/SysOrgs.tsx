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
import { trpc } from "@/lib/trpc";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OrgForm = {
  id?: number;
  name: string;
  leaderId: string;
  parentId: string;
  grandParentId: string;
};

const defaultForm: OrgForm = { name: "", leaderId: "_none", parentId: "_none", grandParentId: "_none" };

export default function SysOrgs() {
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<OrgForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const orgsQuery = trpc.mgmt.listOrganizations.useQuery();
  const usersQuery = trpc.mgmt.listUsers.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.mgmt.createOrganization.useMutation({
    onSuccess: () => { toast.success("组织已创建"); setFormOpen(false); utils.mgmt.listOrganizations.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.mgmt.updateOrganization.useMutation({
    onSuccess: () => { toast.success("组织已更新"); setFormOpen(false); utils.mgmt.listOrganizations.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.mgmt.deleteOrganization.useMutation({
    onSuccess: () => { toast.success("组织已删除"); setDeleteId(null); utils.mgmt.listOrganizations.invalidate(); },
    onError: e => toast.error(e.message),
  });

  function openCreate() { setEditData(defaultForm); setFormOpen(true); }
  function openEdit(o: any) {
    setEditData({
      id: o.id,
      name: o.name,
      leaderId: o.leaderId ? String(o.leaderId) : "_none",
      parentId: o.parentId ? String(o.parentId) : "_none",
      grandParentId: o.grandParentId ? String(o.grandParentId) : "_none",
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!editData.name.trim()) { toast.error("组织名称不能为空"); return; }
    const payload = {
      name: editData.name,
      leaderId: editData.leaderId === "_none" ? null : parseInt(editData.leaderId),
      parentId: editData.parentId === "_none" ? null : parseInt(editData.parentId),
      grandParentId: editData.grandParentId === "_none" ? null : parseInt(editData.grandParentId),
    };
    if (editData.id) {
      await updateMutation.mutateAsync({ id: editData.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  const orgs = orgsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const isLoading = createMutation.isPending || updateMutation.isPending;

  function getOrgName(id: number | null | undefined) {
    if (!id) return "-";
    return orgs.find(o => o.id === id)?.name ?? "-";
  }
  function getUserName(id: number | null | undefined) {
    if (!id) return "-";
    return users.find(u => u.id === id)?.name ?? "-";
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">组织配置</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />新建组织
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs">组织名称</TableHead>
                <TableHead className="text-xs">负责人</TableHead>
                <TableHead className="text-xs">上一级</TableHead>
                <TableHead className="text-xs">上二级</TableHead>
                <TableHead className="text-xs text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgsQuery.isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
              ) : orgs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">暂无组织，请新建</TableCell></TableRow>
              ) : orgs.map(o => (
                <TableRow key={o.id} className="group">
                  <TableCell className="text-sm font-medium">{o.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getUserName(o.leaderId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getOrgName(o.parentId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getOrgName(o.grandParentId)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-primary hover:text-primary" onClick={() => openEdit(o)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" />编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(o.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editData.id ? "编辑组织" : "新建组织"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">组织名称 <span className="text-destructive">*</span></Label>
              <Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} placeholder="输入组织名称" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">负责人</Label>
              <Select value={editData.leaderId} onValueChange={v => setEditData(d => ({ ...d, leaderId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择负责人" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- 不指定 --</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.openId}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">所属上一级</Label>
              <Select
                value={editData.parentId}
                onValueChange={v => {
                  // Auto-cascade: when parent changes, auto-fill grandParent from parent's parentId
                  const parentOrg = orgs.find(o => String(o.id) === v);
                  const autoGrandParent = parentOrg?.parentId ? String(parentOrg.parentId) : "_none";
                  setEditData(d => ({ ...d, parentId: v, grandParentId: autoGrandParent }));
                }}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择上级组织" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- 最高级（无上级）--</SelectItem>
                  {orgs.filter(o => o.id !== editData.id).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">所属上二级 <span className="text-muted-foreground font-normal">（选择上一级后自动带出）</span></Label>
              <Select value={editData.grandParentId} onValueChange={v => setEditData(d => ({ ...d, grandParentId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择上上级组织" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- 无 --</SelectItem>
                  {orgs.filter(o => o.id !== editData.id && o.id !== (editData.parentId === "_none" ? -1 : parseInt(editData.parentId))).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
        title="确认删除该组织？"
        description="删除后该组织下的员工将失去团队归属，请谨慎操作。"
      />
    </div>
  );
}
