import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { ROLE_LABELS } from "@/lib/crm-utils";
import { trpc } from "@/lib/trpc";
import {
  Award,
  BarChart2,
  Briefcase,
  Building2,
  Loader2,
  LogOut,
  Tag,
  Users,
  UserSquare2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

// Route access control: maps path prefixes to required minimum roles
const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: "/team-", roles: ["manager", "sysadmin"] },
  { prefix: "/sys-", roles: ["sysadmin"] },
];

type NavGroup = {
  title: string;
  items: { icon: React.ElementType; label: string; path: string; roles?: string[] }[];
};

const navGroups: NavGroup[] = [
  {
    title: "员工工作台",
    items: [
      { icon: UserSquare2, label: "客户登记", path: "/customer-register" },
      { icon: Users, label: "我的客户", path: "/my-clients" },
      { icon: BarChart2, label: "我的业绩", path: "/my-performance" },
      { icon: Award, label: "我的排行", path: "/my-ranking" },
    ],
  },
  {
    title: "团队工作台",
    items: [
      { icon: Briefcase, label: "团队客户", path: "/team-clients", roles: ["manager", "sysadmin"] },
      { icon: BarChart2, label: "团队业绩", path: "/team-performance", roles: ["manager", "sysadmin"] },
      { icon: Award, label: "团队排行", path: "/team-ranking", roles: ["manager", "sysadmin"] },
      { icon: Users, label: "员工排名", path: "/employee-ranking", roles: ["manager", "sysadmin"] },
      { icon: Tag, label: "渠道管理", path: "/team-channels", roles: ["manager", "sysadmin"] },
    ],
  },
  {
    title: "系统管理",
    items: [
      { icon: UserSquare2, label: "账户管理", path: "/sys-users", roles: ["sysadmin"] },
      { icon: Building2, label: "组织配置", path: "/sys-orgs", roles: ["sysadmin"] },
      { icon: Tag, label: "渠道配置", path: "/sys-channels", roles: ["sysadmin"] },
    ],
  },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  // ⚠️ ALL hooks MUST be called unconditionally before any early returns
  const { loading, user } = useAuth();
  const [location, navigate] = useLocation();

  // Route guard: redirect if user lacks required role for the current path
  useEffect(() => {
    if (!user) return;
    const blocked = ROUTE_ROLES.find(
      r => location.startsWith(r.prefix) && !r.roles.includes(user.role)
    );
    if (blocked) navigate("/my-clients");
  }, [location, user, navigate]);

  // Early returns AFTER all hooks
  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <InternalLoginPage />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "220px", "--sidebar-width-icon": "52px" } as React.CSSProperties}
    >
      <CRMSidebar user={user} />
      <SidebarInset>
        <main className="flex-1 min-h-screen bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CRMSidebar({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const orgQuery = trpc.mgmt.listOrganizations.useQuery(undefined, {
    enabled: user.role !== "employee",
  });

  const userOrg = orgQuery.data?.find(o => o.id === user.organizationId);

  function getOrgLabel() {
    if (!userOrg) return user.email ?? "";
    return userOrg.name;
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-3 h-full">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
            CRM
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-sidebar-foreground text-sm truncate">
              私域销售CRM
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item =>
            !item.roles || item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi}>
              {gi > 0 && <SidebarSeparator className="my-1 bg-sidebar-border" />}
              {/* Nav group title removed per v1.3 requirement */}
              <SidebarMenu className="px-2">
                {visibleItems.map(item => {
                  const isActive = location === item.path || location.startsWith(item.path + "/");
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          );
        })}
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                    {user?.name ?? "-"}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/50 truncate mt-1">
                    {ROLE_LABELS[user.role] ?? user.role} · {getOrgLabel()}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Internal account/password login page — replaces OAuth login */
function InternalLoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.loginInternal.useMutation({
    onSuccess: async () => {
      // Invalidate auth state so useAuth re-fetches the current user
      await utils.auth.me.invalidate();
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err.message || "登录失败，请检查账户和密码");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !password) {
      toast.error("请输入账户和密码");
      return;
    }
    loginMutation.mutate({ account, password });
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm mb-4 shadow-md">
              CRM
            </div>
            <h1 className="text-xl font-semibold text-slate-800">极简私域 CRM</h1>
            <p className="text-sm text-slate-500 mt-1">内部系统 · 请使用账户登录</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account" className="text-sm font-medium text-slate-700">登录账户</Label>
              <Input
                id="account"
                type="text"
                placeholder="请输入登录账户"
                value={account}
                onChange={e => setAccount(e.target.value)}
                autoComplete="username"
                className="h-10"
                disabled={loginMutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
                disabled={loginMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中...</>
              ) : "登录"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            如需账户，请联系系统管理员
          </p>
        </div>
      </div>
    </div>
  );
}
