/**
 * 交易记录类型定义
 */
export interface TradeRecord {
  id: string;
  stockCode: string;
  stockName: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: Date;
  fee: number;
  notes?: string;
  tags?: string[];
}

/**
 * 股票池类型定义
 */
export interface StockPool {
  id: string;
  name: string;
  description?: string;
  stocks: Stock[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 股票信息类型定义
 */
export interface Stock {
  id: string;
  code: string;
  name: string;
  market?: 'sh' | 'sz' | 'hk' | 'us';
  price?: number;
  change?: number;
  changePercent?: number;
  tags?: string[];
  notes?: string;
  addedAt: Date;
  poolId: string;
}

/**
 * 交易心得类型定义
 */
export interface TradingInsight {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  tags: string[];
  relatedTradeIds?: string[];
  attachments?: InsightAttachment[];
}

/**
 * 心得附件类型定义
 */
export interface InsightAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
}

/**
 * 交易纪律规则类型定义
 */
export interface DisciplineRule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 规则条件类型定义
 */
export interface RuleCondition {
  id: string;
  type: 'price' | 'volume' | 'time' | 'profit' | 'loss' | 'custom';
  operator: 'greater' | 'less' | 'equal' | 'contains' | 'not_contains';
  value: number | string;
  parameter: string;
}

/**
 * 规则操作类型定义
 */
export interface RuleAction {
  id: string;
  type: 'alert' | 'block' | 'notify' | 'log';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * 纪律执行记录类型定义
 */
export interface DisciplineExecution {
  id: string;
  ruleId: string;
  tradeId: string;
  timestamp: Date;
  status: 'compliant' | 'violated' | 'warning';
  details: string;
  scoreImpact: number;
}

/**
 * AI分析请求类型定义
 */
export interface AIRequest {
  prompt: string;
  context?: {
    tradeIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    focusAreas?: ('performance' | 'risk' | 'discipline' | 'opportunities')[];
  };
}

/**
 * 纪律违规记录类型定义
 */
export interface ViolationRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  description: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error';
  status: 'pending' | 'resolved';
}

/**
 * AI分析响应类型定义
 */
export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  timestamp: Date;
  confidence: number;
  sources?: {
    type: string;
    id: string;
    relevance: number;
  }[];
}

/**
 * 持仓信息类型定义
 */
export interface Position {
  stockCode: string;
  stockName: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  floatingPnL: number;
  floatingPnLPct: number;
  realizedPnL: number;
  buyCount: number;
  sellCount: number;
  market?: 'sh' | 'sz' | 'hk' | 'us';
}

/**
 * 行情数据类型定义
 */
export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  market?: 'sh' | 'sz' | 'hk' | 'us';
}

/**
 * 持仓汇总类型定义
 */
export interface PositionsSummary {
  totalValue: number;
  totalCost: number;
  totalFloatingPnL: number;
  totalFloatingPnLPct: number;
  totalRealizedPnL: number;
  positions: Position[];
}