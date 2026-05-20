import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TradeRecord, Stock, StockPool } from '@/types';
import { toast } from 'sonner';

const mockTrades: TradeRecord[] = [
  { id: '1', stockCode: 'AAPL', stockName: '苹果公司', type: 'buy', price: 185.5, quantity: 10, timestamp: new Date('2023-06-01T09:30:00'), fee: 12.5, notes: '长期持有', tags: ['科技', '长期'] },
  { id: '2', stockCode: 'MSFT', stockName: '微软公司', type: 'buy', price: 342.8, quantity: 5, timestamp: new Date('2023-06-02T10:15:00'), fee: 9.8, notes: 'AI业务增长', tags: ['科技', 'AI'] },
  { id: '3', stockCode: 'GOOGL', stockName: 'Alphabet公司', type: 'buy', price: 128.3, quantity: 8, timestamp: new Date('2023-06-05T14:20:00'), fee: 10.2, notes: '搜索业务稳定', tags: ['科技', '搜索'] },
  { id: '4', stockCode: 'AMZN', stockName: '亚马逊公司', type: 'sell', price: 132.5, quantity: 15, timestamp: new Date('2023-06-10T11:45:00'), fee: 15.7, notes: '达到目标价', tags: ['电商', '止盈'] },
  { id: '5', stockCode: 'TSLA', stockName: '特斯拉公司', type: 'buy', price: 248.7, quantity: 6, timestamp: new Date('2023-06-12T09:10:00'), fee: 8.5, notes: '新能源趋势', tags: ['汽车', '新能源'] },
  { id: '6', stockCode: 'AAPL', stockName: '苹果公司', type: 'sell', price: 198.2, quantity: 10, timestamp: new Date('2023-06-15T15:30:00'), fee: 14.2, notes: '短期获利了结', tags: ['科技', '止盈'] },
];

export const calculateHoldings = (trades: TradeRecord[]) => {
  const holdings: { [stockCode: string]: { stockCode: string, stockName: string, quantity: number, avgPrice: number, totalCost: number } } = {};
  trades.forEach(trade => {
    if (!holdings[trade.stockCode]) {
      holdings[trade.stockCode] = { stockCode: trade.stockCode, stockName: trade.stockName, quantity: 0, avgPrice: 0, totalCost: 0 };
    }
    const stockHolding = holdings[trade.stockCode];
    if (trade.type === 'buy') {
      const newTotalQuantity = stockHolding.quantity + trade.quantity;
      const newTotalCost = stockHolding.totalCost + (trade.price * trade.quantity);
      stockHolding.quantity = newTotalQuantity;
      stockHolding.totalCost = newTotalCost;
      stockHolding.avgPrice = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
    } else if (trade.type === 'sell') {
      stockHolding.quantity = Math.max(0, stockHolding.quantity - Math.min(stockHolding.quantity, trade.quantity));
      if (stockHolding.quantity === 0) {
        stockHolding.avgPrice = 0;
        stockHolding.totalCost = 0;
      }
    }
  });
  return Object.values(holdings).filter(holding => holding.quantity > 0);
};

export default function TradeRecords() {
  const [trades, setTrades] = useState<TradeRecord[]>(() => {
    const savedTrades = localStorage.getItem('trades');
    return savedTrades ? JSON.parse(savedTrades, (key, value) => key === 'timestamp' ? new Date(value) : value) : mockTrades;
  });
  const [chartView, setChartView] = useState<'trades' | 'profit'>('trades');
  const [timeRange, setTimeRange] = useState<'6months' | '12months' | 'year'>('6months');
  const [filter, setFilter] = useState({ dateRange: 'month', stockCode: '', tradeType: 'all' });
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'buy', price: 0, quantity: 0, fee: 0, timestamp: new Date(), tags: '', notes: '', stockCode: '', stockName: '' });

  const calculateProfit = (trade: TradeRecord, allTrades: TradeRecord[]) => {
    if (trade.type === 'buy') return 0;
    const stockTrades = allTrades.filter(t => t.stockCode === trade.stockCode).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const buyTrades = stockTrades.filter(t => t.type === 'buy' && new Date(t.timestamp) < new Date(trade.timestamp));
    if (buyTrades.length === 0) return 0;
    const avgCost = buyTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / buyTrades.reduce((sum, t) => sum + t.quantity, 0);
    return parseFloat(((trade.price - avgCost) * trade.quantity - trade.fee).toFixed(2));
  };

  const calculateMonthlyStats = () => {
    const monthlyData: { [key: string]: { buy: number, sell: number, profit: number } } = {};
    trades.forEach(trade => {
      const month = new Date(trade.timestamp).toLocaleString('zh-CN', { month: 'numeric' });
      if (!monthlyData[month]) monthlyData[month] = { buy: 0, sell: 0, profit: 0 };
      monthlyData[month][trade.type === 'buy' ? 'buy' : 'sell']++;
      monthlyData[month].profit += calculateProfit(trade, trades);
    });
    return Object.entries(monthlyData).map(([month, data]) => ({
      name: new Date(2023, parseInt(month, 10) - 1, 1).toLocaleString('zh-CN', { month: 'short' }),
      买入: data.buy, 卖出: data.sell, 盈亏: data.profit
    }));
  };

  const holdings = useMemo(() => calculateHoldings(trades), [trades]);

  useEffect(() => {
    localStorage.setItem('trades', JSON.stringify(trades));
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (filter.stockCode && !trade.stockCode.toLowerCase().includes(filter.stockCode.toLowerCase())) return false;
      if (filter.tradeType !== 'all' && trade.type !== filter.tradeType) return false;
      return true;
    });
  }, [trades, filter]);

  const handleAddTrade = (newTrade: any) => {
    const tradeWithId = { ...newTrade, id: Date.now().toString() };
    setTrades([...trades, tradeWithId]);
    setIsAddTradeOpen(false);
    toast.success('交易记录已添加');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">交易记录</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">管理和分析您的交易数据</p>
        </div>
        <button onClick={() => setIsAddTradeOpen(true)} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-plus"></i>
          <span>添加交易</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">总交易</p>
          <p className="text-2xl font-bold text-[#1A1A2E]">{trades.length}</p>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">买入</p>
          <p className="text-2xl font-bold text-[#34C759]">{trades.filter(t => t.type === 'buy').length}</p>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">卖出</p>
          <p className="text-2xl font-bold text-[#FF8E6E]">{trades.filter(t => t.type === 'sell').length}</p>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">持仓</p>
          <p className="text-2xl font-bold text-[#5E5CE6]">{holdings.length} 只</p>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="soft-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1A1A2E]">月度交易统计</h2>
            <div className="flex gap-2">
              <button onClick={() => setChartView('trades')} className={`px-4 py-2 text-sm rounded-xl transition-all ${chartView === 'trades' ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white' : 'bg-black/5 text-[#6B7280]'}`}>交易次数</button>
              <button onClick={() => setChartView('profit')} className={`px-4 py-2 text-sm rounded-xl transition-all ${chartView === 'profit' ? 'bg-gradient-to-r from-[#5E5CE6] to-[#7B78E8] text-white' : 'bg-black/5 text-[#6B7280]'}`}>盈亏分析</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calculateMonthlyStats()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }} />
                {chartView === 'trades' ? (
                  <>
                    <Bar dataKey="买入" fill="#34C759" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="卖出" fill="#FF8E6E" radius={[8, 8, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="盈亏" fill="url(#profitGradient)" radius={[8, 8, 0, 0]} />
                )}
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5E5CE6" />
                    <stop offset="100%" stopColor="#7B78E8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="soft-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1A1A2E]">盈亏趋势</h2>
            <div className="flex gap-1">
              {(['6months', '12months', 'year'] as const).map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 text-xs rounded-lg transition-all ${timeRange === range ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white' : 'text-[#9CA3AF] hover:bg-black/5'}`}>
                  {range === '6months' ? '近6月' : range === '12months' ? '近1年' : '今年'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calculateMonthlyStats()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8E6E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF8E6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="盈亏" stroke="#FF8E6E" strokeWidth={3} fill="url(#areaGradient)" dot={{ r: 0 }} activeDot={{ r: 6, fill: '#FF8E6E', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 持仓股票 */}
      {holdings.length > 0 && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">当前持仓</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {holdings.map((holding, index) => (
              <div key={holding.stockCode} className="p-4 bg-[#F8F9FC] rounded-2xl card-enter">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500]' : index === 1 ? 'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]' : index === 2 ? 'bg-gradient-to-br from-[#CD7F32] to-[#B8860B]' : 'bg-gradient-to-br from-[#5E5CE6] to-[#7B78E8]'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{holding.stockName}</p>
                    <p className="text-xs text-[#9CA3AF]">{holding.stockCode}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF]">持仓数量</span>
                    <span className="font-medium text-[#1A1A2E]">{holding.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF]">平均成本</span>
                    <span className="font-medium text-[#1A1A2E]">¥{holding.avgPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF]">持仓价值</span>
                    <span className="font-bold text-[#FF8E6E]">¥{(holding.avgPrice * holding.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 交易记录表格 */}
      <div className="soft-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#1A1A2E]">交易列表</h2>
          <div className="flex gap-3">
            <input type="text" placeholder="搜索股票代码..." className="input-soft text-sm w-48" value={filter.stockCode} onChange={(e) => setFilter({ ...filter, stockCode: e.target.value })} />
            <select className="input-soft text-sm" value={filter.tradeType} onChange={(e) => setFilter({ ...filter, tradeType: e.target.value })}>
              <option value="all">全部类型</option>
              <option value="buy">买入</option>
              <option value="sell">卖出</option>
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>股票</th>
              <th>类型</th>
              <th>价格</th>
              <th>数量</th>
              <th>金额</th>
              <th>手续费</th>
              <th>收益</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-[#9CA3AF]">暂无交易记录</td></tr>
            ) : (
              filteredTrades.map((trade) => (
                <tr key={trade.id}>
                  <td className="text-[#9CA3AF]">{format(new Date(trade.timestamp), 'yyyy-MM-dd')}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5E5CE6]/10 to-[#7B78E8]/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#5E5CE6]">{trade.stockCode.substring(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A2E]">{trade.stockCode}</p>
                        <p className="text-xs text-[#9CA3AF]">{trade.stockName}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className={`tag ${trade.type === 'buy' ? 'tag-green' : 'tag-red'}`}>{trade.type === 'buy' ? '买入' : '卖出'}</span></td>
                  <td className="text-[#6B7280]">¥{trade.price.toFixed(2)}</td>
                  <td className="text-[#6B7280]">{trade.quantity}</td>
                  <td className="text-[#6B7280]">¥{(trade.price * trade.quantity).toFixed(2)}</td>
                  <td className="text-[#6B7280]">¥{trade.fee.toFixed(2)}</td>
                  <td className={calculateProfit(trade, trades) >= 0 ? 'gain' : 'loss'}>
                    <span className={`font-semibold ${calculateProfit(trade, trades) >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {calculateProfit(trade, trades) >= 0 ? '+' : ''}¥{calculateProfit(trade, trades).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 添加交易弹窗 */}
      {isAddTradeOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAddTradeOpen(false)}>
          <div className="soft-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">添加交易</h2>
              <button onClick={() => setIsAddTradeOpen(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button onClick={() => setFormData({ ...formData, type: 'buy' })} className={`flex-1 py-3 rounded-2xl font-medium transition-all ${formData.type === 'buy' ? 'bg-[#34C759] text-white' : 'bg-black/5 text-[#6B7280]'}`}>
                  <i className="fa-solid fa-arrow-up mr-2"></i>买入
                </button>
                <button onClick={() => setFormData({ ...formData, type: 'sell' })} className={`flex-1 py-3 rounded-2xl font-medium transition-all ${formData.type === 'sell' ? 'bg-[#FF8E6E] text-white' : 'bg-black/5 text-[#6B7280]'}`}>
                  <i className="fa-solid fa-arrow-down mr-2"></i>卖出
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票代码</label>
                  <input type="text" className="input-soft w-full" placeholder="如 AAPL" value={formData.stockCode} onChange={(e) => setFormData({ ...formData, stockCode: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票名称</label>
                  <input type="text" className="input-soft w-full" placeholder="如 苹果公司" value={formData.stockName} onChange={(e) => setFormData({ ...formData, stockName: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">价格</label>
                  <input type="number" className="input-soft w-full" placeholder="0.00" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">数量</label>
                  <input type="number" className="input-soft w-full" placeholder="0" value={formData.quantity || ''} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">备注</label>
                <textarea className="input-soft w-full h-20 resize-none" placeholder="交易原因..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea>
              </div>
              <button onClick={() => {
                if (!formData.stockCode || !formData.stockName || !formData.price || !formData.quantity) {
                  toast.error('请填写完整信息');
                  return;
                }
                handleAddTrade({ ...formData, timestamp: formData.timestamp });
              }} className="w-full btn-primary">保存交易</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}