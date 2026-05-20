import { useState, useMemo, useEffect } from 'react';
import { Stock, TradeRecord } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#FF8E6E', '#5E5CE6', '#34C759', '#5856D6', '#FFB299', '#7B78E8'];

interface Pool {
  id: string;
  name: string;
  stocks: Stock[];
}

const defaultStocks: Stock[] = [
  { id: '1', code: 'AAPL', name: '苹果公司', market: 'us', price: 185.5, change: 2.3, changePercent: 1.25, tags: ['科技', '长期'], notes: '', addedAt: new Date(), poolId: '1' },
  { id: '2', code: 'MSFT', name: '微软公司', market: 'us', price: 378.9, change: -1.2, changePercent: -0.32, tags: ['科技', 'AI'], notes: '', addedAt: new Date(), poolId: '1' },
  { id: '3', code: 'GOOGL', name: 'Alphabet', market: 'us', price: 140.5, change: 3.8, changePercent: 2.78, tags: ['科技', '搜索'], notes: '', addedAt: new Date(), poolId: '1' },
  { id: '4', code: 'TSLA', name: '特斯拉公司', market: 'us', price: 248.7, change: -5.1, changePercent: -2.01, tags: ['汽车', '新能源'], notes: '', addedAt: new Date(), poolId: '2' },
  { id: '5', code: 'NVDA', name: '英伟达公司', market: 'us', price: 495.2, change: 12.5, changePercent: 2.59, tags: ['芯片', 'AI'], notes: '', addedAt: new Date(), poolId: '1' },
  { id: '6', code: 'META', name: 'Meta公司', market: 'us', price: 325.8, change: 4.2, changePercent: 1.31, tags: ['社交', '广告'], notes: '', addedAt: new Date(), poolId: '2' },
];

const getStocksFromLocalStorage = (): Stock[] => {
  const savedStocks = localStorage.getItem('stockPoolStocks');
  if (savedStocks) return JSON.parse(savedStocks, (key, value) => key === 'addedAt' ? new Date(value) : value);
  return defaultStocks;
};

export default function StockPool() {
  const [stocks, setStocks] = useState<Stock[]>(getStocksFromLocalStorage);
  const [selectedPool, setSelectedPool] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', market: 'us' as const, price: 0, tags: '', notes: '' });
  const [isEditing, setIsEditing] = useState<Stock | null>(null);

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
      poolId: '1',
    };
    setStocks([...stocks, newStock]);
    setShowAddModal(false);
    setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '' });
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
    } : s));
    setIsEditing(null);
    setShowAddModal(false);
    setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '' });
    toast.success('股票已更新');
  };

  const handleDeleteStock = (id: string) => {
    setStocks(stocks.filter(s => s.id !== id));
    toast.success('股票已删除');
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
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">股票池</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">管理您的自选股票</p>
        </div>
        <button onClick={() => { setIsEditing(null); setFormData({ code: '', name: '', market: 'us', price: 0, tags: '', notes: '' }); setShowAddModal(true); }} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-plus"></i>
          <span>添加股票</span>
        </button>
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
                <span className="text-sm font-medium text-[#1A1A2E]">批量导入</span>
                <input type="file" accept=".json" onChange={importStocks} className="hidden" />
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
                  <input type="text" className="input-soft w-full" placeholder="如 AAPL" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] mb-1 block">股票名称 *</label>
                  <input type="text" className="input-soft w-full" placeholder="如 苹果公司" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
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
                  <input type="number" className="input-soft w-full" placeholder="0.00" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">标签（逗号分隔）</label>
                <input type="text" className="input-soft w-full" placeholder="如 科技,AI,长期" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
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