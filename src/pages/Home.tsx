import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { TradeRecord, DisciplineRule, Position } from '@/types';
import { usePositions, getPositionPrice } from '@/hooks/usePositions';

// 从localStorage获取交易数据
const getRecentTrades = (): (TradeRecord & { typeLabel: string; date: string; profit: number })[] => {
  const savedTrades = localStorage.getItem('trades');
  if (!savedTrades) return [];

  const allTrades: TradeRecord[] = JSON.parse(savedTrades, (key, value) => {
    if (key === 'timestamp') return new Date(value);
    return value;
  });

  const getProfitForSellTrade = (sellTrade: TradeRecord, trades: TradeRecord[]): number => {
    if (sellTrade.type === 'buy') return 0;
    const stockTrades = trades
      .filter(t => t.stockCode === sellTrade.stockCode && t.type === 'buy')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (stockTrades.length === 0) return 0;
    const avgCost = stockTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) /
                    stockTrades.reduce((sum, t) => sum + t.quantity, 0);
    return parseFloat(((sellTrade.price - avgCost) * sellTrade.quantity - sellTrade.fee).toFixed(2));
  };

  return allTrades
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)
    .map(trade => ({
      ...trade,
      typeLabel: trade.type === 'buy' ? '买入' : '卖出',
      date: new Date(trade.timestamp).toLocaleDateString('zh-CN'),
      profit: trade.type === 'buy' ? 0 : getProfitForSellTrade(trade, allTrades)
    }));
};

// 计算收益走势
const calculatePerformanceData = (trades: TradeRecord[]): { name: string, value: number, income: number }[] => {
  const periods: { [key: string]: { value: number, income: number } } = {};
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const name = `${date.getMonth() + 1}月`;
    periods[name] = { value: 0, income: 0 };
  }

  trades.forEach(trade => {
    const date = new Date(trade.timestamp);
    const name = `${date.getMonth() + 1}月`;
    if (periods[name] !== undefined && trade.type === 'sell') {
      const stockBuys = trades
        .filter(t => t.stockCode === trade.stockCode && t.type === 'buy' && new Date(t.timestamp) < new Date(trade.timestamp));
      if (stockBuys.length > 0) {
        const totalBuyCost = stockBuys.reduce((sum, t) => sum + t.price * t.quantity, 0);
        const totalBuyQty = stockBuys.reduce((sum, t) => sum + t.quantity, 0);
        const avgCost = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
        periods[name].value += (trade.price - avgCost) * trade.quantity - trade.fee;
      }
    }
  });

  let cumulative = 0;
  return Object.entries(periods).map(([name, data]) => {
    cumulative += data.value;
    return { name, value: parseFloat(cumulative.toFixed(2)), income: data.value };
  });
};

// 计算纪律评分
const calculateDisciplineScoreData = (positions: Position[]): { name: string, score: number }[] => {
  const savedRules = localStorage.getItem('disciplineRules');
  const rules: DisciplineRule[] = savedRules ? JSON.parse(savedRules) : [];

  if (positions.length === 0) {
    return [
      { name: '风险控制', score: 0 },
      { name: '入场规则', score: 0 },
      { name: '出场规则', score: 0 },
      { name: '资金管理', score: 0 },
    ];
  }

  const enabledRules = rules.filter(r => r.enabled);
  const hasStopLoss = enabledRules.some(r => r.conditions.some(c => c.type === 'loss'));
  const riskScore = hasStopLoss ? 85 : 60;

  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.shares, 0);
  const maxPosition = positions.length > 0
    ? Math.max(...positions.map(p => totalValue > 0 ? (p.currentPrice * p.shares) / totalValue * 100 : 0))
    : 0;
  const positionScore = maxPosition > 30 ? 60 : maxPosition > 20 ? 80 : 95;

  const avgHoldingPeriod = 30;
  const holdingScore = avgHoldingPeriod < 7 ? 60 : avgHoldingPeriod < 30 ? 80 : 95;

  return [
    { name: '风险控制', score: Math.min(100, Math.max(0, riskScore)) },
    { name: '仓位管理', score: Math.min(100, Math.max(0, positionScore)) },
    { name: '持仓周期', score: Math.min(100, Math.max(0, holdingScore)) },
    { name: '规则遵守', score: enabledRules.length > 0 ? 80 : 50 },
  ];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { positions, totalValue, totalCost, totalFloatingPnL, totalFloatingPnLPct, totalRealizedPnL } = usePositions();

  useEffect(() => {
    const loadTrades = () => {
      const savedTrades = localStorage.getItem('trades');
      return savedTrades ? JSON.parse(savedTrades, (key, value) => {
        if (key === 'timestamp') return new Date(value);
        return value;
      }) : [];
    };
    setTrades(loadTrades());
    const handleStorageChange = () => {
      setTrades(loadTrades());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const recentTradesData = getRecentTrades();
  const performanceData = calculatePerformanceData(trades);
  const disciplineScoreData = calculateDisciplineScoreData(positions);
  const disciplineScore = Math.round(disciplineScoreData.reduce((sum, item) => sum + item.score, 0) / Math.max(1, disciplineScoreData.length));

  const totalPnL = totalFloatingPnL + totalRealizedPnL;

  return (
    <div className="space-y-6">
      {/* 持仓概览 - 4列布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 持仓总市值 */}
        <div className="glass-card p-5 card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF] mb-1">持仓总市值</p>
              <p className="text-2xl font-bold text-[#1A1A2E]">
                ¥{totalValue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-chart-line text-white"></i>
            </div>
          </div>
          <div className="mt-4 text-xs text-[#9CA3AF]">
            持仓成本 ¥{totalCost.toLocaleString()}
          </div>
        </div>

        {/* 浮动盈亏 */}
        <div className="glass-card p-5 card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF] mb-1">浮动盈亏</p>
              <p className={`text-2xl font-bold ${totalFloatingPnL >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {totalFloatingPnL >= 0 ? '+' : ''}¥{Math.abs(totalFloatingPnL).toLocaleString()}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              totalFloatingPnL >= 0 ? 'bg-gradient-to-br from-[#34C759] to-[#30D158]' : 'bg-gradient-to-br from-[#FF3B30] to-[#FF6961]'
            }`}>
              <i className={`fa-solid ${totalFloatingPnL >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-white`}></i>
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${totalFloatingPnL >= 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
              {totalFloatingPnL >= 0 ? '+' : ''}{totalFloatingPnLPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 已实现盈亏 */}
        <div className="glass-card p-5 card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF] mb-1">已实现盈亏</p>
              <p className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {totalRealizedPnL >= 0 ? '+' : ''}¥{Math.abs(totalRealizedPnL).toLocaleString()}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              totalRealizedPnL >= 0 ? 'bg-gradient-to-br from-[#5E5CE6] to-[#7B78E8]' : 'bg-gradient-to-br from-[#FF3B30] to-[#FF6961]'
            }`}>
              <i className={`fa-solid ${totalRealizedPnL >= 0 ? 'fa-check-circle' : 'fa-times-circle'} text-white`}></i>
            </div>
          </div>
          <div className="mt-4 text-xs text-[#9CA3AF]">
            {totalPnL >= 0 ? '盈利' : '亏损'}总额 {totalPnL >= 0 ? '+' : ''}¥{Math.abs(totalPnL).toLocaleString()}
          </div>
        </div>

        {/* 持仓数量 */}
        <div className="glass-card p-5 card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF] mb-1">持仓股票</p>
              <p className="text-2xl font-bold text-[#1A1A2E]">{positions.length} <span className="text-sm font-normal text-[#9CA3AF]">只</span></p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-layer-group text-white"></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-black/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5E5CE6] to-[#7B78E8] rounded-full transition-all duration-500"
                style={{ width: `${disciplineScore}%` }}
              ></div>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1">纪律评分 {disciplineScore}</p>
          </div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="soft-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A2E]">当前持仓</h2>
            <p className="text-sm text-[#9CA3AF]">各股票持仓及盈亏情况</p>
          </div>
          <button
            onClick={() => navigate('/trades')}
            className="text-sm font-medium text-[#FF8E6E] hover:text-[#FF7A5C] transition-colors"
          >
            添加交易
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#F8F9FC] flex items-center justify-center mb-4 mx-auto">
              <i className="fa-solid fa-inbox text-2xl text-[#9CA3AF]"></i>
            </div>
            <p className="text-sm text-[#9CA3AF]">暂无持仓</p>
            <button
              onClick={() => navigate('/trades')}
              className="mt-4 btn-primary text-sm"
            >
              添加第一笔买入
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>股票</th>
                  <th>持仓数量</th>
                  <th>成本均价</th>
                  <th>当前价</th>
                  <th>浮动盈亏</th>
                  <th>盈亏%</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.stockCode}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5E5CE6]/10 to-[#7B78E8]/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-[#5E5CE6]">{position.stockCode.substring(0, 2)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A2E]">{position.stockCode}</p>
                          <p className="text-xs text-[#9CA3AF]">{position.stockName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-[#6B7280]">{position.shares}</td>
                    <td className="text-[#6B7280]">¥{position.avgCost.toFixed(2)}</td>
                    <td className="text-[#6B7280]">¥{position.currentPrice.toFixed(2)}</td>
                    <td className={position.floatingPnL >= 0 ? 'gain' : 'loss'}>
                      <span className={`font-semibold ${position.floatingPnL >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                        {position.floatingPnL >= 0 ? '+' : ''}¥{Math.abs(position.floatingPnL).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${position.floatingPnLPct >= 0 ? 'tag-green' : 'tag-red'}`}>
                        {position.floatingPnLPct >= 0 ? '+' : ''}{position.floatingPnLPct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 主内容区 - 双栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 收益走势图 */}
        <div className="lg:col-span-2 soft-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">收益走势</h2>
              <p className="text-sm text-[#9CA3AF]">累计收益变化趋势</p>
            </div>
            <div className="flex gap-2">
              {['1M', '3M', '6M', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as '1M' | '3M' | '6M' | '1Y')}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    timeRange === range
                      ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white shadow-lg'
                      : 'bg-black/5 text-[#6B7280] hover:bg-black/10'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8E6E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FF8E6E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '累计收益']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#FF8E6E"
                  strokeWidth={3}
                  fill="url(#colorValue)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, fill: '#FF8E6E', stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 右侧 - 账户概览 */}
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">账户概览</h2>

          {/* 圆形进度指示器 */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="circular-progress w-32 h-32" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#F0F0F5"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#purpleGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${disciplineScore * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5E5CE6" />
                    <stop offset="100%" stopColor="#7B78E8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1A1A2E]">{disciplineScore}</p>
                  <p className="text-xs text-[#9CA3AF]">评分</p>
                </div>
              </div>
            </div>
          </div>

          {/* 快速统计 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#F8F9FC] rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF8E6E]/10 flex items-center justify-center">
                  <i className="fa-solid fa-arrow-up text-[#FF8E6E] text-sm"></i>
                </div>
                <span className="text-sm text-[#6B7280]">买入交易</span>
              </div>
              <span className="text-sm font-semibold text-[#1A1A2E]">
                {trades.filter(t => t.type === 'buy').length} 笔
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8F9FC] rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#5E5CE6]/10 flex items-center justify-center">
                  <i className="fa-solid fa-arrow-down text-[#5E5CE6] text-sm"></i>
                </div>
                <span className="text-sm text-[#6B7280]">卖出交易</span>
              </div>
              <span className="text-sm font-semibold text-[#1A1A2E]">
                {trades.filter(t => t.type === 'sell').length} 笔
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8F9FC] rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                  <i className="fa-solid fa-wallet text-[#34C759] text-sm"></i>
                </div>
                <span className="text-sm text-[#6B7280]">持仓价值</span>
              </div>
              <span className="text-sm font-semibold text-[#1A1A2E]">
                ¥{totalValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 交易记录列表 */}
      <div className="soft-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A2E]">最近交易</h2>
            <p className="text-sm text-[#9CA3AF]">最新的交易记录列表</p>
          </div>
          <button
            onClick={() => navigate('/trades')}
            className="text-sm font-medium text-[#FF8E6E] hover:text-[#FF7A5C] transition-colors"
          >
            查看全部
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>股票</th>
              <th>类型</th>
              <th>价格</th>
              <th>数量</th>
              <th>日期</th>
              <th>收益</th>
            </tr>
          </thead>
          <tbody>
            {recentTradesData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#F8F9FC] flex items-center justify-center mb-4">
                      <i className="fa-solid fa-inbox text-2xl text-[#9CA3AF]"></i>
                    </div>
                    <p className="text-sm text-[#9CA3AF]">暂无交易记录</p>
                    <button
                      onClick={() => navigate('/trades')}
                      className="mt-4 btn-primary text-sm"
                    >
                      添加第一笔交易
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              recentTradesData.map((trade, index) => (
                <tr key={index}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5E5CE6]/10 to-[#7B78E8]/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#5E5CE6]">{trade.stockCode.substring(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A2E]">{trade.stockCode}</p>
                        <p className="text-xs text-[#9CA3AF]">{trade.stockName}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`tag ${trade.typeLabel === '买入' ? 'tag-green' : 'tag-red'}`}>
                      {trade.typeLabel}
                    </span>
                  </td>
                  <td className="text-[#6B7280]">¥{trade.price}</td>
                  <td className="text-[#6B7280]">{trade.quantity}</td>
                  <td className="text-[#9CA3AF]">{trade.date}</td>
                  <td className={trade.profit >= 0 ? 'gain' : 'loss'}>
                    <span className={`font-semibold ${trade.profit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {trade.profit >= 0 ? '+' : ''}¥{trade.profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/trades')}
          className="soft-card p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-md">
            <i className="fa-solid fa-plus text-white"></i>
          </div>
          <span className="text-sm font-medium text-[#1A1A2E]">记录交易</span>
        </button>
        <button
          onClick={() => navigate('/stock-pool')}
          className="soft-card p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5E5CE6] to-[#7B78E8] flex items-center justify-center shadow-md">
            <i className="fa-solid fa-star text-white"></i>
          </div>
          <span className="text-sm font-medium text-[#1A1A2E]">管理自选</span>
        </button>
        <button
          onClick={() => navigate('/discipline')}
          className="soft-card p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center shadow-md">
            <i className="fa-solid fa-shield-halved text-white"></i>
          </div>
          <span className="text-sm font-medium text-[#1A1A2E]">交易纪律</span>
        </button>
        <button
          onClick={() => navigate('/ai-analysis')}
          className="soft-card p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5856D6] to-[#7B78E8] flex items-center justify-center shadow-md">
            <i className="fa-solid fa-robot text-white"></i>
          </div>
          <span className="text-sm font-medium text-[#1A1A2E]">AI分析</span>
        </button>
      </div>
    </div>
  );
}