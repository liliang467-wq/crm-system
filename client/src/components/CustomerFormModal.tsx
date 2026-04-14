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
import { Textarea } from "@/components/ui/textarea";
import { getCustomerStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Portrait question options
const PORTRAIT_QUESTIONS = [
  { key: "relationship", label: "感情状态", options: ["单身", "恋爱中", "已婚", "离异", "其他"] },
  { key: "ageRange", label: "年龄段", options: ["18-25岁", "26-30岁", "31-35岁", "36-40岁", "40岁以上"] },
  { key: "budget", label: "预算范围", options: ["500元以下", "500-1000元", "1000-3000元", "3000元以上"] },
  { key: "urgency", label: "需求紧迫度", options: ["非常迫切", "有意向", "观望中", "暂无需求"] },
];

type Portrait = Record<string, string>;

type CustomerData = {
  id?: number;
  wxId?: string;
  customerName?: string | null;
  sourceChannel?: string | null;
  salesAmount?: string | number | null;
  customerBirthday?: string | null;
  contactName?: string | null;
  contactBirthday?: string | null;
  notes?: string | null;
  customerPortrait?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CustomerData | null;
  isTeamMode?: boolean;
};

export default function CustomerFormModal({ open, onClose, onSuccess, initialData, isTeamMode }: Props) {
  const isEdit = !!initialData?.id;

  const [wxId, setWxId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [sourceChannel, setSourceChannel] = useState("");
  const [salesAmountStr, setSalesAmountStr] = useState("");
  const [customerBirthday, setCustomerBirthday] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactBirthday, setContactBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [portrait, setPortrait] = useState<Portrait>({});
  const [caseNote, setCaseNote] = useState("");

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
  const updateMutation = trpc.customers.update.useMutation({
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
  const teamUpdateMutation = trpc.team.updateCustomer.useMutation({
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

  useEffect(() => {
    if (open) {
      setWxId(initialData?.wxId ?? "");
      setCustomerName(initialData?.customerName ?? "");
      setSourceChannel(initialData?.sourceChannel ?? "");
      const sa = initialData?.salesAmount;
      setSalesAmountStr(sa !== null && sa !== undefined ? String(sa) : "");
      setCustomerBirthday(initialData?.customerBirthday ?? "");
      setContactName(initialData?.contactName ?? "");
      setContactBirthday(initialData?.contactBirthday ?? "");
      setNotes(initialData?.notes ?? "");
      setCaseNote((initialData as any)?.caseNote ?? "");
      try {
        setPortrait(initialData?.customerPortrait ? JSON.parse(initialData.customerPortrait) : {});
      } catch {
        setPortrait({});
      }
    }
  }, [open, initialData]);

  const salesAmount = salesAmountStr === "" ? null : parseFloat(salesAmountStr);
  const status = getCustomerStatus(salesAmount);

  function setPortraitField(key: string, value: string) {
    setPortrait(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!wxId.trim()) {
      toast.error("微信ID不能为空");
      return;
    }
    const portraitJson = Object.keys(portrait).length > 0 ? JSON.stringify(portrait) : null;
    const payload = {
      wxId: wxId.trim(),
      customerName: customerName || null,
      sourceChannel: sourceChannel === "_none" ? null : (sourceChannel || null),
      salesAmount: salesAmount,
      customerBirthday: customerBirthday || null,
      contactName: contactName || null,
      contactBirthday: contactBirthday || null,
      notes: notes || null,
      customerPortrait: portraitJson,
      caseNote: caseNote || null,
    };
    try {
      if (isEdit && initialData?.id) {
        if (isTeamMode) {
          await teamUpdateMutation.mutateAsync({ id: initialData.id, ...payload });
        } else {
          await updateMutation.mutateAsync({ id: initialData.id, ...payload });
        }
        toast.success("客户信息已更新");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("客户录入成功");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "操作失败");
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || teamUpdateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑客户信息" : "客户录入"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Section 1: Core Follow-up Info ─────────────────────────── */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <h3 className="text-sm font-semibold text-foreground">核心跟进信息</h3>
            </div>
            <p className="text-xs text-blue-500/80 mb-4 ml-3">（第一时间录入核心信息）</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">微信ID <span className="text-destructive">*</span></Label>
                <Input
                  value={wxId}
                  onChange={e => setWxId(e.target.value)}
                  placeholder="客户唯一标识"
                  className="h-9 text-sm bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">来源渠道</Label>
                <Select value={sourceChannel} onValueChange={setSourceChannel}>
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
                  value={salesAmountStr}
                  onChange={e => setSalesAmountStr(e.target.value)}
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
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="记录客户的特殊需求或跟进情况..."
                rows={2}
                className="text-sm resize-none bg-white"
              />
            </div>
          </div>

          {/* ── Section 2: Customer Profile ─────────────────────────────── */}
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
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="输入姓名" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">客户生日/时辰</Label>
                <Input value={customerBirthday} onChange={e => setCustomerBirthday(e.target.value)} placeholder="例如: 1990-05-20 子时" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">对象姓名</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="输入对象姓名" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">对象生日/生辰</Label>
                <Input value={contactBirthday} onChange={e => setContactBirthday(e.target.value)} placeholder="例如: 1992-08-15 卯时" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          {/* ── Section 2.5: Case Note ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-xs">备案登记框 <span className="text-muted-foreground font-normal">(选填)</span></Label>
            <Textarea
              value={caseNote}
              onChange={e => setCaseNote(e.target.value)}
              placeholder="备案信息、额外登记内容..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* ── Section 3: Customer Portrait ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-muted-foreground/30 rounded-full" />
              <h3 className="text-sm font-semibold text-foreground">
                客户画像 <span className="text-muted-foreground font-normal text-xs">(选填，选题形式)</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PORTRAIT_QUESTIONS.map(q => (
                <div key={q.key} className="space-y-1.5">
                  <Label className="text-xs">{q.label}</Label>
                  <Select
                    value={portrait[q.key] ?? "_none"}
                    onValueChange={v => setPortraitField(q.key, v === "_none" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">-- 暂不填写 --</SelectItem>
                      {q.options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>取消</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "保存中..." : "保存记录"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
