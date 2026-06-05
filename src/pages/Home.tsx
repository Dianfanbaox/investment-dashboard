import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TradeRecord, DisciplineRule, Position } from '@/types';
import { usePositions } from '@/hooks/usePositions';
import { loadTradesFromStorage } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import { useIsMobile } from '@/lib/breakpoints';
import MobileCard from '@/components/MobileCard';
import MobileCardField from '@/components/MobileCardField';

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
const calculatePerformanceData = (trades: TradeRecord[], timeRange: '1M' | '3M' | '6M' | '1Y' = '6M'): { name: string, value: number, income: number }[] => {
  const monthSpanMap = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const monthSpan = monthSpanMap[timeRange];
  const periods: { [key: string]: { value: number, income: number } } = {};
  const now = new Date();

  for (let i = monthSpan - 1; i >= 0; i--) {
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
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  const { positions, totalValue, totalCost, totalFloatingPnL, totalFloatingPnLPct, totalRealizedPnL } = usePositions();

  useEffect(() => {
    setTrades(loadTradesFromStorage());
    const handleStorageChange = () => {
      setTrades(loadTradesFromStorage());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const recentTradesData = getRecentTrades();
  const performanceData = calculatePerformanceData(trades, timeRange);
  const disciplineScoreData = calculateDisciplineScoreData(positions);
  const disciplineScore = Math.round(disciplineScoreData.reduce((sum, item) => sum + item.score, 0) / Math.max(1, disciplineScoreData.length));

  const totalPnL = totalFloatingPnL + totalRealizedPnL;

  return (
    <div className="space-y-5">
      {/* ========== 顶部横幅 ========== */}
      <div
        className="relative soft-card overflow-hidden"
        style={{
          backgroundImage: "url('/banner.png')",
          backgroundSize: '100% auto',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          aspectRatio: '1717 / 371',
        }}
      />

      {/* ========== 4列统计卡片 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 持仓总市值 */}
        <div className="card-blue soft-card p-4 relative overflow-hidden card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">持仓总市值 <span className="text-yellow-500">●</span></p>
              <div className="mt-2">
                <span className="text-2xl font-bold">¥<AnimatedNumber value={totalValue} format={(v) => v.toLocaleString()} /></span>
                <p className="text-xs text-gray-500">+¥{totalCost.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 浮动盈亏 */}
        <div className="card-green soft-card p-4 relative card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">浮动盈亏 <span className="text-green-400">●</span></p>
              <div className="mt-2">
                <span className={`text-2xl font-bold ${totalFloatingPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalFloatingPnL >= 0 ? '+' : ''}¥<AnimatedNumber value={Math.abs(totalFloatingPnL)} format={(v) => v.toLocaleString()} />
                </span>
                <div className="mt-1">
                  <span className={`bg-white px-2 py-0.5 rounded-full text-[10px] border ${totalFloatingPnL >= 0 ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'}`}>
                    {totalFloatingPnL >= 0 ? '+' : ''}{totalFloatingPnLPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <span className="absolute bottom-2 right-4 text-3xl">🌷</span>
          </div>
        </div>

        {/* 已实现盈亏 */}
        <div className="card-red soft-card p-4 relative card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">已实现盈亏 <span className="text-red-400">●</span></p>
              <div className="mt-2">
                <span className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-red-500' : 'text-red-500'}`}>
                   ¥<AnimatedNumber value={Math.abs(totalRealizedPnL)} format={(v) => v.toLocaleString()} />
                </span>
                <p className="text-xs text-gray-500">{totalPnL >= 0 ? '+' : '-'}¥{Math.abs(totalPnL).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 持仓数量 */}
        <div className="card-blue/50 soft-card p-4 relative card-enter">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">持仓股票 <span className="text-blue-400">●</span></p>
              <div className="mt-2">
                 <span className="text-2xl font-bold"><AnimatedNumber value={positions.length} /> <small className="text-sm font-normal">只</small></span>
                <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-300 to-yellow-400 transition-all duration-500"
                    style={{ width: `${disciplineScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">纪律评分 {disciplineScore}</p>
              </div>
            </div>
            <div className="absolute top-8 right-4">
              <span className="text-lg">👑</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 当前持仓 + 账户概览 双栏 ========== */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧 - 当前持仓 */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white soft-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">当前持仓 <span className="text-yellow-400">⭐</span></h3>
              <button
                onClick={() => navigate('/trades')}
                className="bg-[#ffe79c] border-2 border-[#4a4a4a] rounded-xl px-4 py-1 text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow"
              >
                添加交易 <span>➕</span>
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-[#FFF8E7] flex items-center justify-center mb-3 mx-auto">
                  <i className="fa-solid fa-inbox text-xl text-[#BBB]"></i>
                </div>
                <p className="text-sm text-[#999]">暂无持仓</p>
                <button
                  onClick={() => navigate('/trades')}
                  className="mt-3 btn-primary text-sm"
                >
                  添加第一笔买入
                </button>
              </div>
            ) : isMobile ? (
                <div className="space-y-3">
                  {positions.map((position) => (
                    <MobileCard key={position.stockCode}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-purple-100 text-purple-600 text-xs">
                            {position.stockCode.substring(0, 2)}
                          </span>
                          <div>
                            <p className="font-bold text-sm">{position.stockCode}</p>
                            <p className="text-[10px] text-gray-400">{position.stockName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${position.floatingPnLPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.floatingPnLPct >= 0 ? '+' : ''}{position.floatingPnLPct.toFixed(2)}%
                          </span>
                          <p className={`text-xs ${position.floatingPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.floatingPnL >= 0 ? '+' : ''}¥{Math.abs(position.floatingPnL).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-2">
                        <MobileCardField label="持仓数量" value={position.shares} />
                        <MobileCardField label="成本均价" value={`¥${position.avgCost.toFixed(2)}`} />
                        <MobileCardField label="当前价" value={`¥${position.currentPrice.toFixed(2)}`} />
                      </div>
                    </MobileCard>
                  ))}
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                  <thead className="text-gray-400 font-normal">
                    <tr>
                      <th className="pb-2 font-normal">股票</th>
                      <th className="pb-2 font-normal">持仓数量</th>
                      <th className="pb-2 font-normal">成本均价</th>
                      <th className="pb-2 font-normal">当前价</th>
                      <th className="pb-2 font-normal">浮动盈亏</th>
                      <th className="pb-2 font-normal">盈亏%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position, index) => (
                      <tr key={position.stockCode} className={`${index % 2 === 0 ? 'bg-[#fff9e6]' : 'bg-white'} rounded-xl overflow-hidden`}>
                        <td className="p-4 rounded-l-2xl flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index % 2 === 0 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {position.stockCode.substring(0, 2)}
                          </span>
                          <div>
                            <p className="font-bold">{position.stockCode}</p>
                            <p className="text-[10px] text-gray-500">{position.stockName}</p>
                          </div>
                        </td>
                        <td className="p-4 font-bold">{position.shares}</td>
                        <td className="p-4">¥{position.avgCost.toFixed(2)}</td>
                        <td className="p-4">¥{position.currentPrice.toFixed(2)}</td>
                        <td className={`p-4 font-bold ${position.floatingPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.floatingPnL >= 0 ? '+' : ''}¥{Math.abs(position.floatingPnL).toFixed(2)}
                        </td>
                        <td className="p-4 rounded-r-2xl">
                          <span className={`${position.floatingPnLPct >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-3 py-1 rounded-full text-xs font-bold`}>
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
        </div>

        {/* 右侧 - 账户概览 */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white soft-card p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-8">账户概览 <span className="text-yellow-400">⭐</span></h3>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" fill="transparent" r="58" stroke="#f3f4f6" strokeWidth="8" />
                  <circle
                    cx="64" cy="64" fill="transparent" r="58"
                    stroke="#3b82f6"
                    strokeDasharray="364"
                    strokeDashoffset={364 - (disciplineScore * 3.64)}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                   <span className="text-4xl font-bold"><AnimatedNumber value={disciplineScore} /></span>
                  <span className="text-[10px] text-gray-400">评分</span>
                </div>
                <div className="absolute -top-4 -right-2 transform rotate-12">
                  <span className="text-2xl">👑</span>
                </div>
              </div>
              <div className="w-full mt-10 space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-2xl border border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-200 text-red-600 rounded-full p-1 text-[10px]">↑</span>
                    <span className="text-sm">买入交易</span>
                  </div>
                  <span className="font-bold">{trades.filter(t => t.type === 'buy').length} 笔</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-200 text-blue-600 rounded-full p-1 text-[10px]">↓</span>
                    <span className="text-sm">卖出交易</span>
                  </div>
                  <span className="font-bold">{trades.filter(t => t.type === 'sell').length} 笔</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 收益走势 + 小贴士 双栏 ========== */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* 左侧 - 收益走势 */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white soft-card p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">收益走势 <span className="text-yellow-400">⭐</span></h3>
                <p className="text-xs text-gray-400">累计收益走势趋势</p>
              </div>
              <div className="flex gap-2">
                {['1M', '3M', '6M', '1Y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as '1M' | '3M' | '6M' | '1Y')}
                    className={`px-3 py-1 rounded-full text-xs ${
                      timeRange === range
                        ? 'bg-orange-200 text-orange-600 font-bold'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbd38d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fbd38d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#CCC" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#CCC" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #333',
                      borderRadius: '12px',
                      boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`¥${value.toFixed(2)}`, '累计收益']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#fbd38d"
                    strokeWidth={3}
                    fill="url(#areaGradient)"
                    dot={{ r: 0 }}
                    activeDot={{ r: 6, fill: '#fbd38d', stroke: 'white', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 右侧 - 小贴士 */}
        <div className="col-span-12 lg:col-span-3">
          <div className="card-yellow soft-card p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">小贴士 <span className="text-yellow-400">⭐</span></h3>
            <div className="flex flex-col items-center gap-4 flex-1 justify-between">
              <div className="relative w-full">
                <div className="bg-white hand-drawn-border p-4 text-sm leading-relaxed relative">
                  投资是一场马拉松，保持耐心，长期坚持会有收获哦！
                  <div className="absolute -bottom-3 left-8 w-6 h-6 bg-white border-b-2 border-r-2 border-gray-800 transform rotate-45"></div>
                </div>
              </div>
              <div className="w-full flex justify-between items-end">
                <img
                  src="/tips-character.png"
                  alt=""
                  className="h-44 w-auto object-contain"
                />
                <div className="text-red-400 text-3xl pb-4">💕</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 最近交易 ========== */}
      <div className="bg-white soft-card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">最近交易 <span className="text-yellow-400">⭐</span></h3>
            <p className="text-xs text-gray-400">最新的交易记录列表</p>
          </div>
          <button
            onClick={() => navigate('/trades')}
            className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            查看全部
          </button>
        </div>

        {recentTradesData.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-[#FFF8E7] flex items-center justify-center mb-3 mx-auto">
              <i className="fa-solid fa-inbox text-xl text-[#BBB]"></i>
            </div>
            <p className="text-sm text-[#999]">暂无交易记录</p>
            <button
              onClick={() => navigate('/trades')}
              className="mt-3 btn-primary text-sm"
            >
              添加第一笔交易
            </button>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {recentTradesData.map((trade, index) => (
              <MobileCard key={index}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index % 2 === 0 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {trade.stockCode.substring(0, 2)}
                    </span>
                    <div>
                      <p className="font-bold text-sm">{trade.stockCode}</p>
                      <p className="text-[10px] text-gray-400">{trade.stockName}</p>
                    </div>
                  </div>
                  <span className={`${trade.typeLabel === '买入' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-2.5 py-1 rounded-full text-xs font-bold`}>
                    {trade.typeLabel}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <MobileCardField label="价格" value={`¥${trade.price}`} />
                  <MobileCardField label="数量" value={trade.quantity} />
                  <MobileCardField label="日期" value={trade.date} />
                  {trade.typeLabel === '卖出' && (
                    <MobileCardField
                      label="收益"
                      value={
                        <span className={trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {trade.profit >= 0 ? '+' : ''}¥{trade.profit.toFixed(2)}
                        </span>
                      }
                    />
                  )}
                </div>
              </MobileCard>
            ))}
          </div>
        ) : (
          <table className="w-full text-left text-sm border-separate border-spacing-y-2">
            <thead className="text-gray-400 font-normal">
              <tr>
                <th className="pb-2 font-normal">股票</th>
                <th className="pb-2 font-normal">类型</th>
                <th className="pb-2 font-normal">价格</th>
                <th className="pb-2 font-normal">数量</th>
                <th className="pb-2 font-normal">日期</th>
                <th className="pb-2 font-normal">收益</th>
              </tr>
            </thead>
            <tbody>
              {recentTradesData.map((trade, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-[#fff9e6]' : 'bg-white'} rounded-xl overflow-hidden`}>
                  <td className="p-4 rounded-l-2xl flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index % 2 === 0 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {trade.stockCode.substring(0, 2)}
                    </span>
                    <div>
                      <p className="font-bold">{trade.stockCode}</p>
                      <p className="text-[10px] text-gray-500">{trade.stockName}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`${trade.typeLabel === '买入' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-3 py-1 rounded-full text-xs font-bold`}>
                      {trade.typeLabel}
                    </span>
                  </td>
                  <td className="p-4">¥{trade.price}</td>
                  <td className="p-4 font-bold">{trade.quantity}</td>
                  <td className="p-4 text-gray-500">{trade.date}</td>
                  <td className="p-4 rounded-r-2xl">
                    <span className={`font-bold ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.profit >= 0 ? '+' : ''}¥{trade.profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========== 快捷操作 ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/trades')}
          className="bg-white soft-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-[#ffe79c] border-2 border-[#4a4a4a] flex items-center justify-center">
            <i className="fa-solid fa-plus text-[#4a4a4a] text-sm"></i>
          </div>
          <span className="text-xs font-bold text-[#333]">记录交易</span>
        </button>
        <button
          onClick={() => navigate('/stock-pool')}
          className="bg-white soft-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-[#ffe79c] border-2 border-[#4a4a4a] flex items-center justify-center">
            <i className="fa-solid fa-star text-[#4a4a4a] text-sm"></i>
          </div>
          <span className="text-xs font-bold text-[#333]">管理自选</span>
        </button>
        <button
          onClick={() => navigate('/discipline')}
          className="bg-white soft-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-[#ffe79c] border-2 border-[#4a4a4a] flex items-center justify-center">
            <i className="fa-solid fa-shield-halved text-[#4a4a4a] text-sm"></i>
          </div>
          <span className="text-xs font-bold text-[#333]">交易纪律</span>
        </button>
        <button
          onClick={() => navigate('/ai-analysis')}
          className="bg-white soft-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-[#ffe79c] border-2 border-[#4a4a4a] flex items-center justify-center">
            <i className="fa-solid fa-robot text-[#4a4a4a] text-sm"></i>
          </div>
          <span className="text-xs font-bold text-[#333]">AI分析</span>
        </button>
      </div>
    </div>
  );
}
