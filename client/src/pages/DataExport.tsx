import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Database, Users, Building2, Radio, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function downloadCsv(csv: string, filename: string) {
  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  isLoading: boolean;
  lastExported?: { count: number; filename: string } | null;
}

function ExportCard({ title, description, icon, onExport, isLoading, lastExported }: ExportCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Button onClick={onExport} disabled={isLoading} variant="outline" size="sm">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />导出中...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />导出 CSV</>
            )}
          </Button>
          {lastExported && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              已导出 {lastExported.count} 条
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataExport() {
  const [exportState, setExportState] = useState<Record<string, { count: number; filename: string } | null>>({});

  const customersExport = trpc.dataExport.exportCustomers.useQuery(undefined, { enabled: false });
  const usersExport = trpc.dataExport.exportUsers.useQuery(undefined, { enabled: false });
  const orgsExport = trpc.dataExport.exportOrganizations.useQuery(undefined, { enabled: false });
  const channelsExport = trpc.dataExport.exportChannels.useQuery(undefined, { enabled: false });

  const handleExport = async (
    key: string,
    refetch: () => Promise<any>,
  ) => {
    try {
      const result = await refetch();
      if (result.data) {
        downloadCsv(result.data.csv, result.data.filename);
        setExportState(prev => ({ ...prev, [key]: { count: result.data.count, filename: result.data.filename } }));
        toast.success(`成功导出 ${result.data.count} 条数据`);
      }
    } catch (e: any) {
      toast.error(e.message || "导出失败");
    }
  };

  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const doExport = async (key: string, refetch: () => Promise<any>) => {
    setLoadingKey(key);
    await handleExport(key, refetch);
    setLoadingKey(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据备份</h1>
        <p className="text-muted-foreground mt-1">
          导出系统数据为 CSV 文件，用于离线备份或数据分析。文件使用 UTF-8 编码（含 BOM），可直接用 Excel 打开。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ExportCard
          title="客户数据"
          description="全部客户信息，含微信ID、姓名、渠道、销售额、备注等"
          icon={<Database className="h-5 w-5" />}
          onExport={() => doExport("customers", customersExport.refetch)}
          isLoading={loadingKey === "customers"}
          lastExported={exportState.customers}
        />
        <ExportCard
          title="员工/用户数据"
          description="全部系统账户，含姓名、账号、角色、所属团队等"
          icon={<Users className="h-5 w-5" />}
          onExport={() => doExport("users", usersExport.refetch)}
          isLoading={loadingKey === "users"}
          lastExported={exportState.users}
        />
        <ExportCard
          title="组织架构"
          description="全部团队/部门信息，含层级关系和负责人"
          icon={<Building2 className="h-5 w-5" />}
          onExport={() => doExport("orgs", orgsExport.refetch)}
          isLoading={loadingKey === "orgs"}
          lastExported={exportState.orgs}
        />
        <ExportCard
          title="渠道配置"
          description="全部来源渠道名称和创建信息"
          icon={<Radio className="h-5 w-5" />}
          onExport={() => doExport("channels", channelsExport.refetch)}
          isLoading={loadingKey === "channels"}
          lastExported={exportState.channels}
        />
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-amber-800">
            <strong>提示：</strong>建议定期导出数据进行离线备份。导出的 CSV 文件包含所有字段数据，
            密码等敏感信息已自动排除。导出操作仅限系统管理员执行。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
