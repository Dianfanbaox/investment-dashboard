# 投资看板 - 项目规范

## 项目概述

个人投资管理仪表盘，追踪交易记录、管理股票池、遵守交易纪律、AI辅助分析。

## 技术栈

- **前端框架**: React 18 + TypeScript + Vite
- **样式**: TailwindCSS + 自定义 CSS 变量
- **图表**: Recharts (BarChart, LineChart, AreaChart, PieChart)
- **路由**: React Router v6
- **通知**: Sonner (toast)
- **数据存储**: LocalStorage

## 目录结构

```
src/
├── pages/           # 页面组件
│   ├── Home.tsx           # 首页仪表盘
│   ├── TradeRecords.tsx   # 交易记录
│   ├── StockPool.tsx      # 股票池
│   ├── DisciplineSystem.tsx  # 交易纪律
│   ├── AIAnalysis.tsx     # AI分析
│   ├── TradingInsights.tsx # 交易心得
│   └── Settings.tsx       # 系统设置
├── components/      # 可复用组件
├── types/          # TypeScript 类型定义
└── index.css        # 全局样式
```

## 开发规范

### UI 风格
- 玻璃拟态 (Glassmorphism) + 软阴影风格
- 配色: 橙 (#FF8E6E) + 紫 (#5E5CE6)
- 卡片圆角: 20-24px (rounded-2xl/rounded-3xl)

### 组件命名
- 页面组件: PascalCase (如 `StockPool.tsx`)
- 样式类: 小写 + 连字符 (如 `soft-card`, `glass-card`)
- 按钮使用 `btn-primary` / `btn-secondary`

### 功能要求
- **所有按钮必须有 onClick 处理函数**，禁止空按钮
- **所有表单必须能保存数据到 state/localStorage**
- **弹窗必须有开/关逻辑**
- 不允许假数据模拟（AI 响应除外）

### 数据持久化
- 交易记录 → `localStorage.trades`
- 股票池 → `localStorage.stockPoolStocks`
- 纪律规则 → `localStorage.disciplineRules`
- 违规记录 → `localStorage.violationRecords`
- 交易心得 → `localStorage.tradingInsights`

## 验证命令

改完代码后必须运行验证：

```bash
# 构建检查
npx vite build

# 开发服务器
npx vite
```

## 注意事项

- 删除 `node_modules` 和 `dist` 不提交
- 密钥/token 不进代码
- 每次改完主动验证，不要只改不验

<claude-mem-context>
# Memory Context

# [投资看板] recent context, 2026-06-05 12:41am GMT+8

No previous sessions found.
</claude-mem-context>