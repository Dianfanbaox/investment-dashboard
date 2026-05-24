import { useState, useMemo, useEffect } from 'react';
import { Stock, TradeRecord } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { getQuote, detectMarket } from '@/services/marketService';

const COLORS = ['#FF8E6E', '#5E5CE6', '#34C759', '#5856D6', '#FFB299', '#7B78E8'];

interface Pool {
  id: string;
  name: string;
  stocks: Stock[];
}

const getStocksFromLocalStorage = (): Stock[] => {
  const savedStocks = localStorage.getItem('stockPoolStocks');
  if (savedStocks) return JSON.parse(savedStocks, (key, value) => key === 'addedAt' ? new Date(value) : value);
  return [];
};

export default function StockPool() {
  const [stocks, setStocks] = useState<Stock[]>(getStocksFromLocalStorage);
  const [selectedPool, setSelectedPool] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', market: 'us' as const, price: 0, tags: '', notes: '', poolId: '1' });
  const [isEditing, setIsEditing] = useState<Stock | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchPoolId, setBatchPoolId] = useState('1');
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('stockPoolStocks', JSON.stringify(stocks));
  }, [stocks]);

  const pools = useMemo((): Pool[] => {
    return [
      { id: 'all', name: '全部股票', stocks },
      { id: '1', name: '核心池', stocks: stocks.filter(s => s.poolId === '1') },
      { id: '2', name: '关注池', stocks: stocks.filter(s => s.poolId === '2') },
    ];
  }, [stocks]);

  const currentPool = pools.find(p => p.id === selectedPool) || pools[0];
  const chartData = currentPool.stocks.slice(0, 6).map((s, i) => ({ name: s.code, value: s.price * 10, fill: COLORS[i % COLORS.length] }));

  const handleAddStock = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('请填写股票代码和名称');
      return;
    }
    const newStock: Stock = {
      id: Date.now().toString(),
      code: formData.code.toUpperCase(),
      name: formData.name,
      market: formData.market,
      price: formData.price || 0,
      change: 0,
      changePercent: 0,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: formData.notes,
      addedAt: new Date(),
      poolId: formData.poolId,
    };
    setStocks([...stocks, newStock]);
    setShowAddModal(false);
    setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '', poolId: '1' });
    toast.success('股票已添加');
  };

  const handleUpdateStock = () => {
    if (!isEditing || !formData.code.trim() || !formData.name.trim()) return;
    setStocks(stocks.map(s => s.id === isEditing.id ? {
      ...s,
      code: formData.code.toUpperCase(),
      name: formData.name,
      market: formData.market,
      price: formData.price || s.price,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : s.tags || [],
      notes: formData.notes,
      poolId: formData.poolId,
    } : s));
    setIsEditing(null);
    setShowAddModal(false);
    setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '', poolId: '1' });
    toast.success('股票已更新');
  };

  const handleDeleteStock = (id: string) => {
    setStocks(stocks.filter(s => s.id !== id));
    toast.success('股票已删除');
  };

  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  const handleStockCodeBlur = async (code: string) => {
    if (!code.trim() || isEditing) return;
    setIsFetchingQuote(true);

    const market = detectMarket(code);
    const quote = await getQuote(code, market);

    if (quote) {
      const detectedMarket = detectMarket(code) || 'us';
      setFormData(prev => ({
        ...prev,
        code: code.toUpperCase(),
        name: quote.name || prev.name,
        market: detectedMarket,
        price: quote.price || prev.price,
      }));
      toast.success(`已获取 ${code} 的最新价格`);
    } else {
      setFormData(prev => ({
        ...prev,
        code: code.toUpperCase(),
        market: market || prev.market,
      }));
    }
    setIsFetchingQuote(false);
  };

  const handleRefreshPrices = async () => {
    if (stocks.length === 0) {
      toast.error('股票池为空');
      return;
    }
    toast.info('正在刷新价格...');
    let updated = 0;
    for (const stock of stocks) {
      const market = detectMarket(stock.code) || stock.market;
      const quote = await getQuote(stock.code, market);
      if (quote) {
        setStocks(prev => prev.map(s =>
          s.id === stock.id
            ? { ...s, price: quote.price, change: quote.change, changePercent: quote.changePercent }
            : s
        ));
        updated++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    toast.success(`已更新 ${updated} 只股票价格`);
  };

  const exportStocks = () => {
    const blob = new Blob([JSON.stringify(stocks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `股票池-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('股票数据已导出');
  };

  const importStocks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const newStocks = imported.map((s: any) => ({
            ...s,
            id: Date.now().toString() + Math.random(),
            addedAt: new Date(),
          }));
          setStocks([...stocks, ...newStocks]);
          toast.success(`成功导入 ${imported.length} 只股票`);
        }
      } catch {
        toast.error('文件格式错误');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const openEditModal = (stock: Stock) => {
    setIsEditing(stock);
    setFormData({
      code: stock.code,
      name: stock.name,
      market: stock.market || 'us',
      price: stock.price || 0,
      tags: stock.tags?.join(', ') || '',
      notes: stock.notes || '',
      poolId: stock.poolId || '1',
    });
    setShowAddModal(true);
  };

  const handleBatchTextImport = async () => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('请输入至少一个股票代码');
      return;
    }
    const existingCodes = new Set(stocks.map(s => s.code));
    const newCodes = lines.filter(c => !existingCodes.has(c.toUpperCase()));
    if (newCodes.length === 0) {
      toast.info('所有股票都已在池中');
      return;
    }
    setIsBatchLoading(true);
    toast.info(`正在获取 ${newCodes.length} 只股票信息...`);
    const newStocks: Stock[] = [];
    for (const code of newCodes) {
      const market = detectMarket(code);
      const quote = await getQuote(code, market);
      newStocks.push({
        id: Date.now().toString() + Math.random(),
        code: code.toUpperCase(),
        name: quote?.name || code,
        market: market || 'hk',
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
        tags: [],
        notes: '',
        addedAt: new Date(),
        poolId: batchPoolId,
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    setStocks(prev => [...prev, ...newStocks]);
    setShowBatchModal(false);
    setBatchText('');
    setIsBatchLoading(false);
    toast.success(`成功添加 ${newStocks.length} 只股票`);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast.error('CSV 文件为空或格式错误');
          return;
        }
        const header = lines[0].toLowerCase();
        if (!header.includes('code') && !header.includes('代码')) {
          toast.error('CSV 第一行必须是表头，包含 code 或 代码 列');
          return;
        }
        const existingCodes = new Set(stocks.map(s => s.code));
        const newStocks: Stock[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 1 || !cols[0]) continue;
          const code = cols[0].toUpperCase();
          if (existingCodes.has(code)) continue;
          newStocks.push({
            id: Date.now().toString() + Math.random() + i,
            code,
            name: cols[1] || code,
            market: (cols[2] as any) || 'hk',
            price: parseFloat(cols[3]) || 0,
            change: 0,
            changePercent: 0,
            tags: cols[4] ? cols[4].split('|').map(t => t.trim()).filter(Boolean) : [],
            notes: cols[5] || '',
            addedAt: new Date(),
            poolId: batchPoolId,
          });
        }
        if (newStocks.length === 0) {
          toast.info('没有新股票需要导入');
          return;
        }
        setStocks(prev => [...prev, ...newStocks]);
        toast.success(`成功导入 ${newStocks.length} 只股票`);
      } catch {
        toast.error('文件解析失败');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">股票池</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">管理您的自选股票</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefreshPrices} className="btn-secondary flex items-center gap-2 text-sm">
            <i className="fa-solid fa-refresh"></i>
            <span>刷新价格</span>
          </button>
          <button onClick={() => { setIsEditing(null); setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '' }); setShowAddModal(true); }} className="btn-primary flex items-center gap-2">
            <i className="fa-solid fa-plus"></i>
            <span>添加股票</span>
          </button>
          <button onClick={() => setShowBatchModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <i className="fa-solid fa-layer-group"></i>
            <span>批量添加</span>
          </button>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2">
        {pools.map(pool => (
          <button key={pool.id} onClick={() => setSelectedPool(pool.id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${selectedPool === pool.id ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white shadow-lg' : 'bg-white/80 text-[#6B7280] hover:bg-black/5'}`}>
            {pool.name} ({pool.stocks.length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 股票列表 */}
        <div className="lg:col-span-2 space-y-4">
          {currentPool.stocks.length === 0 ? (
            <div className="soft-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F8F9FC] flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-inbox text-2xl text-[#9CA3AF]"></i>
              </div>
              <p className="text-sm text-[#9CA3AF]">暂无股票</p>
            </div>
          ) : (
            currentPool.stocks.map((stock, index) => (
              <div key={stock.id} className="soft-card p-5 flex items-center justify-between card-enter">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500]' : index === 1 ? 'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]' : index === 2 ? 'bg-gradient-to-br from-[#CD7F32] to-[#B8860B]' : 'bg-gradient-to-br from-[#5E5CE6] to-[#7B78E8]'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#1A1A2E]">{stock.name}</p>
                    <p className="text-sm text-[#9CA3AF]">{stock.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#1A1A2E]">¥{stock.price?.toFixed(2) || '0.00'}</p>
                  <p className={`text-sm ${(stock.changePercent || 0) >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    {(stock.changePercent || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(stock)} className="p-2.5 rounded-xl bg-[#F8F9FC] hover:bg-black/5 transition-colors">
                    <i className="fa-solid fa-edit text-[#5E5CE6]"></i>
                  </button>
                  <button onClick={() => handleDeleteStock(stock.id)} className="p-2.5 rounded-xl bg-[#F8F9FC] hover:bg-black/5 transition-colors">
                    <i className="fa-solid fa-trash text-[#FF3B30]"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右侧统计 */}
        <div className="space-y-4">
          <div className="soft-card p-6">
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">股票分布</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                  <span className="text-xs text-[#6B7280]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card p-6">
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">快速操作</h3>
            <div className="space-y-3">
              <button onClick={() => { setIsEditing(null); setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '' }); setShowAddModal(true); }} className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF8E6E]/10 flex items-center justify-center">
                  <i className="fa-solid fa-plus text-[#FF8E6E]"></i>
                </div>
                <span className="text-sm font-medium text-[#1A1A2E]">添加自选</span>
              </button>
              <label className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-[#5E5CE6]/10 flex items-center justify-center">
                  <i className="fa-solid fa-file-import text-[#5E5CE6]"></i>
                </div>
                <span className="text-sm font-medium text-[#1A1A2E]">导入JSON</span>
                <input type="file" accept=".json" onChange={importStocks} className="hidden" />
              </label>
              <label className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-[#FFB299]/10 flex items-center justify-center">
                  <i className="fa-solid fa-file-csv text-[#FF8E6E]"></i>
                </div>
                <span className="text-sm font-medium text-[#1A1A2E]">导入CSV</span>
                <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
              </label>
              <button onClick={exportStocks} className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                  <i className="fa-solid fa-download text-[#34C759]"></i>
                </div>
                <span className="text-sm font-medium text-[#1A1A2E]">导出数据</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 批量添加弹窗 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBatchModal(false)}>
          <div className="soft-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">批量添加股票</h2>
              <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">股票代码（每行一个）</label>
                <textarea
                  className="input-soft w-full h-40 resize-none font-mono"
                  placeholder={"1810\n9988\n0700\n3690\nAAPL\nTSLA"}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                />
                <p className="text-xs text-[#9CA3AF] mt-1">支持港股、A股、美股代码，自动获取名称和价格</p>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">添加到</label>
                <select className="input-soft w-full" value={batchPoolId} onChange={(e) => setBatchPoolId(e.target.value)}>
                  <option value="1">核心池</option>
                  <option value="2">关注池</option>
                </select>
              </div>
              <button onClick={handleBatchTextImport} disabled={isBatchLoading} className="w-full btn-primary disabled:opacity-50">
                {isBatchLoading ? (
                  <span><i className="fa-solid fa-spinner fa-spin mr-2"></i>正在获取股票信息...</span>
                ) : (
                  <span><i className="fa-solid fa-layer-group mr-2"></i>批量添加</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑股票弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowAddModal(false); setIsEditing(null); }}>
          <div className="soft-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">{isEditing ? '编辑股票' : '添加股票'}</h2>
              <button onClick={() => { setShowAddModal(false); setIsEditing(null); }} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票代码 *</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-soft w-full pr-10"
                      placeholder="输入代码后自动获取信息"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      onBlur={(e) => handleStockCodeBlur(e.target.value)}
                    />
                    {isFetchingQuote && (
                      <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#FF8E6E]"></i>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票名称 *</label>
                  <input type="text" className="input-soft w-full" placeholder="自动获取或手动输入" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">市场</label>
                  <select className="input-soft w-full" value={formData.market} onChange={(e) => setFormData({ ...formData, market: e.target.value as any })}>
                    <option value="us">美股</option>
                    <option value="hk">港股</option>
                    <option value="sh">A股沪市</option>
                    <option value="sz">A股深市</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">当前价格</label>
                  <input type="number" className="input-soft w-full" placeholder="自动获取或手动输入" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票池</label>
                  <select className="input-soft w-full" value={formData.poolId} onChange={(e) => setFormData({ ...formData, poolId: e.target.value })}>
                    <option value="1">核心池</option>
                    <option value="2">关注池</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">标签（逗号分隔）</label>
                  <input type="text" className="input-soft w-full" placeholder="如 科技,AI,长期" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">备注</label>
                <textarea className="input-soft w-full h-20 resize-none" placeholder="股票备注..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea>
              </div>
              <button onClick={isEditing ? handleUpdateStock : handleAddStock} className="w-full btn-primary">
                {isEditing ? '保存修改' : '添加股票'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}