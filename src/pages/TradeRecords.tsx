import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TradeRecord, Stock, StockPool } from '@/types';
import { toast } from 'sonner';
import { checkTradeViolations, saveViolationRecord } from '@/hooks/useDisciplineCheck';
import { tradesToCSV, downloadCSV, parseCSV, generateCSVTemplate } from '@/lib/csvUtils';
import { getQuote, detectMarket } from '@/services/marketService';

export const calculateHoldings = (trades: TradeRecord[]) => {
  const holdings: { [stockCode: string]: { stockCode: string, stockName: string, lots: { price: number; quantity: number }[] } } = {};
  const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  sorted.forEach(trade => {
    if (!holdings[trade.stockCode]) {
      holdings[trade.stockCode] = { stockCode: trade.stockCode, stockName: trade.stockName, lots: [] };
    }
    const h = holdings[trade.stockCode];
    if (trade.type === 'buy') {
      h.lots.push({ price: trade.price, quantity: trade.quantity });
    } else if (trade.type === 'sell') {
      let remaining = Math.min(h.lots.reduce((s, l) => s + l.quantity, 0), trade.quantity);
      while (remaining > 0 && h.lots.length > 0) {
        const lot = h.lots[0];
        if (lot.quantity <= remaining) {
          remaining -= lot.quantity;
          h.lots.shift();
        } else {
          lot.quantity -= remaining;
          remaining = 0;
        }
      }
    }
  });
  return Object.values(holdings)
    .map(h => {
      const quantity = h.lots.reduce((s, l) => s + l.quantity, 0);
      const totalCost = h.lots.reduce((s, l) => s + l.price * l.quantity, 0);
      return { stockCode: h.stockCode, stockName: h.stockName, quantity, avgPrice: quantity > 0 ? totalCost / quantity : 0, totalCost };
    })
    .filter(h => h.quantity > 0);
};

export default function TradeRecords() {
  const [trades, setTrades] = useState<TradeRecord[]>(() => {
    const savedTrades = localStorage.getItem('trades');
    return savedTrades ? JSON.parse(savedTrades, (key, value) => key === 'timestamp' ? new Date(value) : value) : [];
  });
  const [chartView, setChartView] = useState<'trades' | 'profit'>('trades');
  const [timeRange, setTimeRange] = useState<'6months' | '12months' | 'year'>('6months');
  const [filter, setFilter] = useState({ dateRange: 'month', stockCode: '', tradeType: 'all' });
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'buy', price: 0, quantity: 0, fee: 0, timestamp: new Date(), tags: '', notes: '', stockCode: '', stockName: '' });
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  const handleStockCodeBlur = async (code: string) => {
    if (!code.trim()) return;
    setIsFetchingQuote(true);

    const market = detectMarket(code);
    const quote = await getQuote(code, market);

    if (quote) {
      setFormData(prev => ({
        ...prev,
        stockCode: code.toUpperCase(),
        stockName: quote.name || prev.stockName,
        price: quote.price || prev.price,
      }));
      toast.success(`已获取 ${code} 的最新价格 ¥${quote.price}`);
    } else {
      setFormData(prev => ({
        ...prev,
        stockCode: code.toUpperCase(),
      }));
    }
    setIsFetchingQuote(false);
  };

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
      const date = new Date(trade.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[month]) monthlyData[month] = { buy: 0, sell: 0, profit: 0 };
      monthlyData[month][trade.type === 'buy' ? 'buy' : 'sell']++;
      monthlyData[month].profit += calculateProfit(trade, trades);
    });
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        name: `${month.split('-')[0]}年${parseInt(month.split('-')[1], 10)}月`,
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

    // 检查纪律违规
    const violations = checkTradeViolations(tradeWithId);
    if (violations.length > 0) {
      violations.forEach(v => saveViolationRecord(v));
      toast.warning(`检测到 ${violations.length} 条违规记录`);
    } else {
      toast.success('交易记录已添加');
    }
    setIsAddTradeOpen(false);
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      toast.error('暂无交易记录可导出');
      return;
    }
    const csv = tradesToCSV(trades);
    downloadCSV(csv, `交易记录_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('导出成功');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = parseCSV(content) as TradeRecord[];

      if (imported.length === 0) {
        toast.error('导入失败，请检查文件格式');
        return;
      }

      const existingIds = new Set(trades.map(t => `${t.stockCode}_${t.timestamp}_${t.price}_${t.quantity}`));
      const newTrades = imported.filter(t => {
        const key = `${t.stockCode}_${t.timestamp}_${t.price}_${t.quantity}`;
        return !existingIds.has(key);
      });

      if (newTrades.length === 0) {
        toast.info('没有新的交易记录需要导入');
        return;
      }

      setTrades([...trades, ...newTrades]);
      toast.success(`成功导入 ${newTrades.length} 条交易记录`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, '交易记录导入模板.csv');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/ip-characters.png" alt="" className="h-8 md:h-12 opacity-90" />
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">交易记录</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">管理和分析您的交易数据</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
          <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <i className="fa-solid fa-download"></i>
            <span className="hidden sm:inline">导出</span>
          </button>
          <label className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 cursor-pointer">
            <i className="fa-solid fa-upload"></i>
            <span className="hidden sm:inline">导入</span>
          </label>
          <button onClick={() => setIsAddTradeOpen(true)} className="btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <i className="fa-solid fa-plus"></i>
            <span>添加</span>
          </button>
        </div>
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
              <AreaChart data={calculateMonthlyStats().filter(item => {
                const [year, month] = item.name.replace('年', '-').replace('月', '').split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const now = new Date();
                if (timeRange === 'year') return date.getFullYear() === now.getFullYear();
                const monthsBack = timeRange === '6months' ? 6 : 12;
                const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1);
                return date >= cutoff;
              })} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <span className="text-[#9CA3AF]">成本</span>
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
        <div className="overflow-x-auto">
        <table className="data-table min-w-[600px]">
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
              <tr><td colSpan={8} className="text-center py-12">
                <img src="/ip-characters.png" alt="" className="h-16 md:h-24 mx-auto mb-4 opacity-80" />
                <p className="text-sm text-[#9CA3AF]">暂无交易记录</p>
              </td></tr>
            ) : (
              filteredTrades.map((trade) => (
                <tr key={trade.id}>
                  <td className="text-[#9CA3AF] whitespace-nowrap">{format(new Date(trade.timestamp), 'yyyy-MM-dd')}</td>
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
                  <div className="relative">
                    <input
                      type="text"
                      className="input-soft w-full pr-10"
                      placeholder="输入代码后自动获取价格"
                      value={formData.stockCode}
                      onChange={(e) => setFormData({ ...formData, stockCode: e.target.value })}
                      onBlur={(e) => handleStockCodeBlur(e.target.value)}
                    />
                    {isFetchingQuote && (
                      <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#FF8E6E]"></i>
                    )}
                  </div>
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