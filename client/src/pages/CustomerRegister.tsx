import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCustomerStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const PORTRAIT_QUESTIONS = [
  { key: "relationship", label: "感情状态", options: ["单身", "恋爱中", "已婚", "离异", "其他"] },
  { key: "ageRange", label: "年龄段", options: ["18-25岁", "26-30岁", "31-35岁", "36-40岁", "40岁以上"] },
  { key: "budget", label: "预算范围", options: ["500元以下", "500-1000元", "1000-3000元", "3000元以上"] },
  { key: "urgency", label: "需求紧迫度", options: ["非常迫切", "有意向", "观望中", "暂无需求"] },
];

type Portrait = Record<string, string>;

const emptyForm = () => ({
  wxId: "",
  customerName: "",
  sourceChannel: "",
  salesAmountStr: "",
  customerBirthday: "",
  contactName: "",
  contactBirthday: "",
  notes: "",
  caseNote: "",
  portrait: {} as Portrait,
});

export default function CustomerRegister() {
  const [form, setForm] = useState(emptyForm());
  const [submitted, setSubmitted] = useState(false);

  const channelsQuery = trpc.mgmt.listChannels.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      utils.performance.myStats.invalidate();
      utils.performance.myDailyList.invalidate();
      utils.team.customers.invalidate();
      utils.team.performanceStats.invalidate();
      utils.team.performanceDailyList.invalidate();
      utils.leaderboard.individual.invalidate();
      utils.leaderboard.team.invalidate();
      utils.channelAnalytics.list.invalidate();
    },
  });

  const salesAmount = form.salesAmountStr === "" ? null : parseFloat(form.salesAmountStr);
  const status = getCustomerStatus(salesAmount);

  function setPortraitField(key: string, value: string) {
    setForm(prev => ({ ...prev, portrait: { ...prev.portrait, [key]: value } }));
  }

  function resetForm() {
    setForm(emptyForm());
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wxId.trim()) {
      toast.error("微信ID不能为空");
      return;
    }
    const portraitJson = Object.keys(form.portrait).length > 0 ? JSON.stringify(form.portrait) : null;
    try {
      await createMutation.mutateAsync({
        wxId: form.wxId.trim(),
        customerName: form.customerName || null,
        sourceChannel: form.sourceChannel === "_none" ? null : (form.sourceChannel || null),
        salesAmount: salesAmount,
        customerBirthday: form.customerBirthday || null,
        contactName: form.contactName || null,
        contactBirthday: form.contactBirthday || null,
        notes: form.notes || null,
        caseNote: form.caseNote || null,
        customerPortrait: portraitJson,
      });
      setSubmitted(true);
      toast.success("客户登记成功！");
    } catch (e: any) {
      toast.error(e?.message ?? "登记失败，请重试");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-foreground">登记成功！</h2>
          <p className="text-muted-foreground text-sm">客户信息已保存，可继续登记下一位客户。</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={resetForm} size="lg">继续登记</Button>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-[60rem]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">客户登记</h1>
        <p className="text-sm text-muted-foreground mt-1">录入新客户信息，带 <span className="text-destructive">*</span> 为必填项</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Core Follow-up Info ─────────────────────────── */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-sm font-semibold text-foreground">核心跟进信息</h3>
          </div>
          <p className="text-xs text-blue-500/80 mb-4 ml-3">（第一时间录入核心信息）</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">微信ID <span className="text-destructive">*</span></Label>
              <Input
                value={form.wxId}
                onChange={e => setForm(f => ({ ...f, wxId: e.target.value }))}
                placeholder="客户唯一标识"
                className="h-9 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">来源渠道</Label>
              <Select value={form.sourceChannel} onValueChange={v => setForm(f => ({ ...f, sourceChannel: v }))}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="请选择来源渠道" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- 不选择 --</SelectItem>
                  {channelsQuery.data?.map(ch => (
                    <SelectItem key={ch.id} value={ch.name}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">销售额（元）</Label>
              <Input
                type="number"
                value={form.salesAmountStr}
                onChange={e => setForm(f => ({ ...f, salesAmountStr: e.target.value }))}
                placeholder="空=待跟进，0=失败，>0=成功"
                className="h-9 text-sm bg-white"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">状态（系统自动判断）</Label>
              <div className="h-9 flex items-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 mt-4">
            <Label className="text-xs">跟进备注</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="记录客户的特殊需求或跟进情况..."
              rows={2}
              className="text-sm resize-none bg-white"
            />
          </div>
        </div>

        {/* ── Section 2: Customer Basic Info ─────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-muted-foreground/30 rounded-full" />
            <h3 className="text-sm font-semibold text-foreground">
              客户基本信息 <span className="text-muted-foreground font-normal text-xs">(选填，可后续补充)</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">客户姓名</Label>
              <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="输入姓名" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">客户生日/时辰</Label>
              <Input value={form.customerBirthday} onChange={e => setForm(f => ({ ...f, customerBirthday: e.target.value }))} placeholder="例如: 1990-05-20 子时" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">对象姓名</Label>
              <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="输入对象姓名" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">对象生日/生辰</Label>
              <Input value={form.contactBirthday} onChange={e => setForm(f => ({ ...f, contactBirthday: e.target.value }))} placeholder="例如: 1992-08-15 卯时" className="h-9 text-sm" />
            </div>
          </div>
        </div>

        {/* ── Section 2.5: Case Note ─────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-xs">备案登记框 <span className="text-muted-foreground font-normal">(选填)</span></Label>
          <Textarea
            value={form.caseNote}
            onChange={e => setForm(f => ({ ...f, caseNote: e.target.value }))}
            placeholder="备案信息、额外登记内容..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2 pb-8">
          <Button type="submit" size="lg" className="flex-1" disabled={createMutation.isPending}>
            {createMutation.isPending ? "登记中..." : "提交登记"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={resetForm} disabled={createMutation.isPending}>
            清空重填
          </Button>
        </div>
      </form>
    </div>
  );
}
