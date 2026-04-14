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
import { formatDate, ROLE_LABELS } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type UserForm = {
  id?: number;
  openId: string;
  name: string;
  email: string;
  password: string;
  role: "employee" | "manager" | "sysadmin";
  organizationId: string;
};

const defaultForm: UserForm = { openId: "", name: "", email: "", password: "", role: "employee", organizationId: "_none" };

export default function SysUsers() {
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<UserForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const usersQuery = trpc.mgmt.listUsers.useQuery();
  const orgsQuery = trpc.mgmt.listOrganizations.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.mgmt.createUser.useMutation({
    onSuccess: () => { toast.success("账户已创建"); setFormOpen(false); utils.mgmt.listUsers.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.mgmt.updateUser.useMutation({
    onSuccess: () => { toast.success("账户已更新"); setFormOpen(false); utils.mgmt.listUsers.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.mgmt.deleteUser.useMutation({
    onSuccess: () => { toast.success("账户已删除"); setDeleteId(null); utils.mgmt.listUsers.invalidate(); },
    onError: e => toast.error(e.message),
  });

  function openCreate() {
    setEditData(defaultForm);
    setFormOpen(true);
  }

  function openEdit(u: any) {
    setEditData({
      id: u.id,
      openId: u.openId,
      name: u.name ?? "",
      email: u.email ?? "",
      password: "",
      role: u.role,
      organizationId: u.organizationId ? String(u.organizationId) : "_none",
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!editData.name.trim()) { toast.error("员工姓名不能为空"); return; }
    const orgId = editData.organizationId === "_none" ? null : parseInt(editData.organizationId);
    if (editData.id) {
      await updateMutation.mutateAsync({ id: editData.id, name: editData.name, role: editData.role, organizationId: orgId, password: editData.password || undefined });
    } else {
      if (!editData.openId.trim()) { toast.error("登录账户不能为空"); return; }
      if (!editData.password.trim()) { toast.error("初始密码不能为空"); return; }
      await createMutation.mutateAsync({ openId: editData.openId, name: editData.name, email: editData.email || null, password: editData.password, role: editData.role, organizationId: orgId });
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold">账户管理</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />新建账户
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs">员工姓名</TableHead>
                <TableHead className="text-xs">登录账户 (OpenID)</TableHead>
                <TableHead className="text-xs">邮箱</TableHead>
                <TableHead className="text-xs">角色</TableHead>
                <TableHead className="text-xs">所属部门</TableHead>
                <TableHead className="text-xs">创建时间</TableHead>
                <TableHead className="text-xs text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">加载中...</TableCell></TableRow>
              ) : (usersQuery.data ?? []).map(u => (
                <TableRow key={u.id} className="group">
                  <TableCell className="text-sm font-medium">{u.name ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">{u.openId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email ?? "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "sysadmin" ? "bg-purple-100 text-purple-700" :
                      u.role === "manager" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {orgsQuery.data?.find(o => o.id === u.organizationId)?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-primary hover:text-primary" onClick={() => openEdit(u)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" />编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editData.id ? "编辑账户" : "新建账户"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editData.id && (
              <div className="space-y-1.5">
                <Label className="text-xs">登录账户 <span className="text-destructive">*</span></Label>
                <Input value={editData.openId} onChange={e => setEditData(d => ({ ...d, openId: e.target.value }))} placeholder="用于登录的账户名" className="h-9 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">员工姓名 <span className="text-destructive">*</span></Label>
              <Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} placeholder="输入姓名" className="h-9 text-sm" />
            </div>
            {!editData.id && (
              <div className="space-y-1.5">
                <Label className="text-xs">邮箱</Label>
                <Input type="email" value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} placeholder="可选" className="h-9 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {editData.id ? "重置密码（留空则不修改）" : "初始密码"}
                {!editData.id && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                type="password"
                value={editData.password}
                onChange={e => setEditData(d => ({ ...d, password: e.target.value }))}
                placeholder={editData.id ? "输入新密码（留空不修改）" : "设置初始登录密码"}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">角色</Label>
              <Select value={editData.role} onValueChange={v => setEditData(d => ({ ...d, role: v as any }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">员工</SelectItem>
                  <SelectItem value="manager">管理</SelectItem>
                  <SelectItem value="sysadmin">系统管理</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">所属部门</Label>
              <Select value={editData.organizationId} onValueChange={v => setEditData(d => ({ ...d, organizationId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择部门" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- 不分配 --</SelectItem>
                  {orgsQuery.data?.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
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
        title="确认删除该账户？"
        description="删除后该员工将无法登录系统，相关客户数据不会被删除。"
      />
    </div>
  );
}
