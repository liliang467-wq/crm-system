# CRM System TODO

## Phase 1: Database & Schema
- [x] Design and migrate: users table (with role: employee/manager/sysadmin)
- [x] Design and migrate: organizations table (multi-level hierarchy)
- [x] Design and migrate: source_channels table
- [x] Design and migrate: customers table (all fields per PRD)

## Phase 2: Backend API (tRPC Routers)
- [x] Auth: login, logout, me
- [x] Customers: create, update, delete, list (with filters, pagination)
- [x] Performance: stats panel + daily summary list
- [x] Leaderboard: individual (day/week/month) with obfuscation
- [x] Team customers: list with filters, export
- [x] Team performance: stats panel + daily summary list
- [x] Team leaderboard: day/week/month with obfuscation
- [x] System: user account management (create/edit/delete)
- [x] System: role configuration
- [x] System: organization management (CRUD)
- [x] System: source channel management (CRUD)

## Phase 3: Frontend - Layout & Auth
- [x] Global CSS theme (blue primary, clean admin style)
- [x] DashboardLayout with sidebar navigation (role-based menu)
- [x] Login page (internal account login)
- [x] Logout functionality
- [x] Role-based route protection

## Phase 4: Frontend - Employee Workspace
- [x] My Customers page (list, filters, pagination, add/edit/delete modal)
- [x] Customer form modal (two-section: required + optional fields)
- [x] Delete confirmation dialog
- [x] My Performance page (stats panel + daily detail list)

## Phase 5: Frontend - Leaderboard & Team Workspace
- [x] My Ranking page (day/week/month tabs, obfuscated data, floating own-row)
- [x] Team Customers page (extended filters, employee/team columns, export)
- [x] Team Performance page (extended stats + team daily list)
- [x] Team Ranking page (team leaderboard with floating own-team row)

## Phase 6: Frontend - System Management
- [x] User Account management page (create/edit/delete)
- [x] Organization management page (multi-level hierarchy CRUD)
- [x] Source Channel management page (CRUD)

## Phase 7: Polish & Testing
- [x] Implement data obfuscation utility (floor-truncate + "+")
- [x] Implement name desensitization utility
- [x] Implement status auto-determination logic
- [x] Server-side timestamp enforcement
- [x] All statistical formula implementations
- [x] Vitest unit tests for core business logic (23 tests passing)
- [x] Final UI polish and responsive checks

## Bug Fixes

- [x] Fix React #310 error: Hook called conditionally in CRMLayout (useLocation/useEffect called after early return)

## v1.1 Upgrade Items

- [x] #1 登录窗口改造：纯内部账密登录，取消外部自主注册，支持系统后台配置账户与密码
- [x] #2 数据刷新修复：录入新客户后我的客户列表实时刷新（optimistic update / invalidate）
- [x] #3 录入表单升级：核心跟进信息区域浅色背景突出、引导文案、新增客户画像字段（选填/选题）
- [x] #4 我的业绩统计面板UI压缩：减小高度，提升列表首屏空间
- [x] #5 我的业绩数据刷新修复：明细列表录入后即时更新
- [x] #6 团队客户数据刷新修复：下属更新后管理者端同步最新状态
- [x] #7 团队业绩统计面板UI压缩：与员工工作台一致
- [x] #8 团队业绩数据刷新修复：底层业绩数据实时上卷汇总
- [x] #9 新增“渠道管理”模块（团队工作台下）：渠道来源、客户总数、开发成功数、转化率、销售额、成功客均、全部客均；默认今日，支持时间/团队/渠道筛选
- [x] #10 组织级联修复：新建/编辑组织时选择上一级后正确联动带出下级可选列表
- [x] #11 内部登录：账户密码登录（后端存储哈希密码，前端登录表单）
- [x] #12 客户画像字段数据库迁移

## v1.2 Upgrade Items

- [x] #1 左侧导航精简：去除导航图标上的“客户关系管理”文字说明
- [x] #2 全局文案纠错：将所有“厦门”错误文案统一修正为“销售额”
- [x] #3 移除“我的客户”页面上的“录入客户”按鈕
- [x] #4 新增“客户登记”独立导航模块（员工工作台，位于“我的客户”上方），整页显示客户录入面板，新增“备案登记框”字段
- [x] #5 团队业绩统计面板UI：将原本两行展示的指标压缩为一行展示
- [x] #6 团队业绩明细数据同步修复：底层数据变动能实时准确上卷；“没有部门”归属人员合并计算展示
- [x] #7 团队客户列表补全“员工姓名”字段
- [x] #8 组织配置列表树状视觉展示：上下级关系集中展示，一/二/三级部门名称前增加+/++/+++符号（仅前端视觉，数据库存纯名称）
- [x] #sys1 录入客户后各板块数据不同步增加与更新问题全站修复
- [x] #sys2 全站加载页面报错问题修复

## v1.2 Upgrade Items

- [x] #1 左侧导航精简：去除导航图标上的"客户关系管理"文字说明（侧边栏分组标题已为极简样式，折叠时仅显示图标）
- [x] #2 全局文案纠错：代码库中无"厦门"错误文案，所有"销售额"标签均已正确
- [x] #3 移除"我的客户"页面上的"录入客户"按钮
- [x] #4 新增"客户登记"独立导航模块（员工工作台，位于"我的客户"上方），整页显示客户录入面板，新增"备案登记框"字段
- [x] #5 团队业绩统计面板UI：将原本两行展示的指标压缩为一行展示（overflow-x-auto 单行）
- [x] #6 团队业绩明细数据同步修复：全站录入/编辑/删除后所有相关查询立即 invalidate
- [x] #7 团队客户列表补全"员工姓名"字段（新增列，显示 employeeName）
- [x] #8 组织配置列表树状视觉展示：一/二/三级部门名称前增加+/++/+++符号，并按层级缩进
- [x] #sys1 录入客户后各板块数据不同步全站修复（CustomerFormModal + CustomerRegister 全量 invalidate）
- [x] #sys2 全站加载页面报错问题修复（TypeScript 零错误，23 个测试通过，服务器干净启动）

## v1.3 Fixes

- [x] #1 左侧导航去除"客户关系管理"文案（彻底清除所有残留）
- [x] #2 品牌名"极简私域销售"更换为"私域销售CRM"
- [x] #3 客户登记页面登记信息面板居中修复为左对齐
- [x] #4 团队业绩页面列表数据不同步修复；无团队人员合并统计
- [x] #5 修复 React removeChild DOM 错误（多页面 NotFoundError）

## v1.4 Changes

- [x] #1 客户登记页面区域宽度增加1.25倍，去除下部客户画像登记区域域
- [x] #2 我的业绩明细列表：只要有客户数就显示（不再要求销售额>0）
- [x] #3 团队业绩明细：只要有客户总数就显示
- [x] #4 组织配置列表：按树状层级集中排列（父级→子级→孙级依次排列，同父级的子级连续显示）

## v1.5 Changes

- [x] #1 修复"我的业绩"明细列表数据不显示/更新丢失问题（实时同步）
- [x] #2 修复"团队业绩"明细列表数据不显示/无法实时上卷问题
- [x] #3 "我的业绩"顶部新增个人业绩常驻面板（复用"我的排行"个人真实业绩样式）
- [x] #4 "我的排行"排行榜截断为前30名，销售额/成功客均/全部客均启用模糊化规则（首位有效数字+）
- [x] #5 新增"员工排名"模块（团队工作台，团队排行下方），复用排行逻辑，新增员工姓名搜索+时间范围筛选

## v1.5 修复项

- [x] 我的业绩明细：默认显示最近7天，每天一行，最新在上，超7行分页
- [x] 团队业绩明细：默认显示当天，每团队一行，同一天多团队并列展示，超7行分页

## 系统全面审查

- [x] 功能优化审查：检查所有模块代码质量和业务逻辑
- [x] 逐页面浏览器测试：验证所有页面正常打开，修复问题
- [x] 性能测试：API响应时间、前端加载速度
- [x] 空间容量评估：数据库大小、存储限制、可支持员工和客户数量

## 审查报告优化项

- [x] 添加数据库索引：customers表的createdById、organizationId、createdAt、sourceChannel字段（6个索引已生效）
- [x] 优化数据库连接池配置：显式配置池参数(min:2, max:10, idle:30s)
- [x] 前端tRPC batch查询优化：QueryClient staleTime=30s, gcTime=5min, refetchOnWindowFocus=false
- [x] 数据备份导出功能：管理员可导出客户/用户/组织/渠道全量CSV

## v1.6 修复项

- [x] 我的业绩明细：默认日期要展示出来，无数据日显示为0
- [x] 团队业绩明细：默认日期展示，无数据团队显示为0，无团队名称统一为"未分配"
- [x] 团队客户列表："团队"字段改为"团队名称"，格式为三级名称（二级部门），如：业务一组（事业一部）
- [x] 团队业绩/团队排名：使用三级团队维度排名，团队名称格式为三级名称（二级部门）
