import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import AnimatedModal from '@/components/AnimatedModal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#FF8E6E', '#5E5CE6', '#34C759', '#9CA3AF'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [nickname, setNickname] = useState(localStorage.getItem('user_nickname') || '个人投资者');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // AI 配置
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('ai_api_url') || '/siliconflow-api/v1/chat/completions');
  const [model, setModel] = useState(localStorage.getItem('ai_model') || 'Qwen/Qwen2.5-7B-Instruct');
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');

  // 统计数据（动态读取）
  const stats = useMemo(() => {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    const stockPool = JSON.parse(localStorage.getItem('stockPoolStocks') || '[]');
    const rules = JSON.parse(localStorage.getItem('disciplineRules') || '[]');
    const violations = JSON.parse(localStorage.getItem('violationRecords') || '[]');
    const insights = JSON.parse(localStorage.getItem('tradingInsights') || '[]');
    return { trades, stockPool, rules, violations, insights };
  }, []);

  // 存储使用量
  const storageData = useMemo(() => {
    const keys = [
      { name: '交易记录', key: 'trades', color: '#FF8E6E' },
      { name: '股票池', key: 'stockPoolStocks', color: '#5E5CE6' },
      { name: '纪律规则', key: 'disciplineRules', color: '#34C759' },
      { name: '违规记录', key: 'violationRecords', color: '#5856D6' },
      { name: '交易心得', key: 'tradingInsights', color: '#FFB299' },
    ];
    return keys.map(k => {
      const data = localStorage.getItem(k.key) || '';
      return { name: k.name, value: Math.max(1, new Blob([data]).size), color: k.color };
    }).filter(k => k.value > 1);
  }, []);

  const totalStorageKB = useMemo(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key) || '').length * 2;
      }
    }
    return (total / 1024).toFixed(1);
  }, []);

  const saveProfile = () => {
    localStorage.setItem('user_nickname', nickname);
    setIsEditingProfile(false);
    toast.success('昵称已保存');
  };

  const saveAIConfig = () => {
    if (apiKey.trim()) localStorage.setItem('ai_api_key', apiKey.trim());
    if (apiUrl.trim()) localStorage.setItem('ai_api_url', apiUrl.trim());
    if (model.trim()) localStorage.setItem('ai_model', model.trim());
    toast.success('AI 配置已保存');
  };

  const exportAllData = () => {
    const data = {
      trades: JSON.parse(localStorage.getItem('trades') || '[]'),
      stockPool: JSON.parse(localStorage.getItem('stockPoolStocks') || '[]'),
      disciplineRules: JSON.parse(localStorage.getItem('disciplineRules') || '[]'),
      violationRecords: JSON.parse(localStorage.getItem('violationRecords') || '[]'),
      tradingInsights: JSON.parse(localStorage.getItem('tradingInsights') || '[]'),
      ai_api_key: localStorage.getItem('ai_api_key') || '',
      ai_api_url: localStorage.getItem('ai_api_url') || '',
      ai_model: localStorage.getItem('ai_model') || '',
      user_nickname: localStorage.getItem('user_nickname') || '',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `投资看板数据-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('数据已导出');
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.trades) localStorage.setItem('trades', JSON.stringify(data.trades));
        if (data.stockPool) localStorage.setItem('stockPoolStocks', JSON.stringify(data.stockPool));
        if (data.disciplineRules) localStorage.setItem('disciplineRules', JSON.stringify(data.disciplineRules));
        if (data.violationRecords) localStorage.setItem('violationRecords', JSON.stringify(data.violationRecords));
        if (data.tradingInsights) localStorage.setItem('tradingInsights', JSON.stringify(data.tradingInsights));
        if (data.ai_api_key) localStorage.setItem('ai_api_key', data.ai_api_key);
        if (data.ai_api_url) localStorage.setItem('ai_api_url', data.ai_api_url);
        if (data.ai_model) localStorage.setItem('ai_model', data.ai_model);
        if (data.user_nickname) localStorage.setItem('user_nickname', data.user_nickname);
        toast.success('数据已导入，请刷新页面查看');
      } catch {
        toast.error('文件格式错误');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearAllData = () => {
    const appKeys = [
      'trades', 'stockPoolStocks', 'disciplineRules',
      'violationRecords', 'tradingInsights',
      'ai_api_key', 'ai_api_url', 'ai_model', 'user_nickname'
    ];
    appKeys.forEach(key => localStorage.removeItem(key));
    // 清除所有持仓价格缓存
    Object.keys(localStorage).filter(k => k.startsWith('position_price_')).forEach(k => localStorage.removeItem(k));
    setShowClearConfirm(false);
    toast.success('所有数据已清空');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 md:gap-4">
        <img src="/ip-characters.png" alt="" className="h-10 md:h-16 opacity-80" />
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">系统设置</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">管理您的个人设置和数据</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'profile', label: '个人资料', icon: 'fa-user' },
          { id: 'ai', label: 'AI 配置', icon: 'fa-robot' },
          { id: 'data', label: '数据管理', icon: 'fa-database' },
          { id: 'about', label: '关于', icon: 'fa-circle-info' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white shadow-lg' : 'bg-white/80 text-[#6B7280] hover:bg-black/5'
            }`}>
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 个人资料 */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">个人信息</h2>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-user text-white text-3xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A2E]">{nickname}</h3>
                <p className="text-sm text-[#9CA3AF]">专注价值投资和长期持有</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">昵称</label>
                {isEditingProfile ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-soft flex-1 text-sm"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                    <button onClick={saveProfile} className="btn-primary text-sm px-4">保存</button>
                    <button onClick={() => setIsEditingProfile(false)} className="btn-secondary text-sm px-4">取消</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1A1A2E]">{nickname}</p>
                    <button onClick={() => setIsEditingProfile(true)} className="text-xs text-[#5E5CE6] hover:underline">编辑</button>
                  </div>
                )}
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">数据存储</label>
                <p className="text-sm font-medium text-[#1A1A2E]">LocalStorage · {totalStorageKB} KB</p>
              </div>
            </div>
          </div>

          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">账户统计</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#FF8E6E]">{stats.trades.length}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">交易记录</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#5E5CE6]">{stats.stockPool.length}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">自选股票</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#34C759]">{stats.rules.length}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">纪律规则</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#5856D6]">{stats.violations.length}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">违规记录</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 配置 */}
      {activeTab === 'ai' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">AI 服务配置</h2>
          <p className="text-sm text-[#6B7280] mb-6">支持硅基流动等 OpenAI 兼容的 API 服务。</p>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">API 地址</label>
              <input
                type="text"
                className="input-soft w-full"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">模型名称</label>
              <input
                type="text"
                className="input-soft w-full"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Qwen/Qwen2.5-7B-Instruct"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">在硅基流动后台查看可用模型列表</p>
            </div>
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">API Key</label>
              <input
                type="password"
                className="input-soft w-full"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <button onClick={saveAIConfig} className="btn-primary">保存配置</button>
            {apiKey && (
              <div className="p-3 bg-[#34C759]/10 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-check-circle text-[#34C759]"></i>
                <span className="text-sm text-[#34C759]">API Key 已配置</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据管理 */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">存储使用</h2>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-[#1A1A2E]">{totalStorageKB} KB</p>
              <p className="text-xs text-[#9CA3AF]">LocalStorage 总占用</p>
            </div>
            {storageData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={storageData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                        {storageData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                        formatter={(value: number) => [`${(value / 1024).toFixed(1)} KB`, '占用']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {storageData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-[#6B7280]">{item.name} ({(item.value / 1024).toFixed(1)}KB)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#9CA3AF] text-center py-8">暂无数据</p>
            )}
          </div>

          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">数据操作</h2>
            <div className="space-y-4">
              <button onClick={exportAllData} className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#5E5CE6]/10 flex items-center justify-center">
                  <i className="fa-solid fa-download text-[#5E5CE6]"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-[#1A1A2E]">导出数据</p>
                  <p className="text-xs text-[#9CA3AF]">下载所有数据为 JSON 文件</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#9CA3AF]"></i>
              </button>
              <label className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-[#FF8E6E]/10 flex items-center justify-center">
                  <i className="fa-solid fa-upload text-[#FF8E6E]"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-[#1A1A2E]">导入数据</p>
                  <p className="text-xs text-[#9CA3AF]">从 JSON 文件恢复数据</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#9CA3AF]"></i>
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
              <button onClick={() => setShowClearConfirm(true)} className="w-full p-4 bg-[#FF3B30]/10 rounded-2xl flex items-center gap-3 hover:bg-[#FF3B30]/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/20 flex items-center justify-center">
                  <i className="fa-solid fa-trash text-[#FF3B30]"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-[#FF3B30]">清空数据</p>
                  <p className="text-xs text-[#9CA3AF]">删除所有本地存储数据</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#9CA3AF]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 关于 */}
      {activeTab === 'about' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">关于投资看板</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-chart-line text-white text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A1A2E]">投资看板</h3>
                <p className="text-sm text-[#9CA3AF]">版本 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              投资看板是一款专注于个人投资管理的仪表盘应用，帮助您追踪交易记录、管理股票池、遵守交易纪律，并提供AI辅助分析功能。所有数据存储在浏览器本地，不会上传到任何服务器。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <i className="fa-solid fa-code text-2xl text-[#5E5CE6] mb-2"></i>
                <p className="text-sm font-medium text-[#1A1A2E]">React + TypeScript</p>
                <p className="text-xs text-[#9CA3AF]">前端框架</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <i className="fa-solid fa-palette text-2xl text-[#FF8E6E] mb-2"></i>
                <p className="text-sm font-medium text-[#1A1A2E]">TailwindCSS</p>
                <p className="text-xs text-[#9CA3AF]">样式框架</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <i className="fa-solid fa-database text-2xl text-[#34C759] mb-2"></i>
                <p className="text-sm font-medium text-[#1A1A2E]">LocalStorage</p>
                <p className="text-xs text-[#9CA3AF]">数据存储</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 清空数据确认弹窗 */}
      <AnimatedModal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} maxWidth="max-w-sm">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-exclamation-triangle text-[#FF3B30] text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">确认清空所有数据？</h3>
              <p className="text-sm text-[#6B7280] mb-6">此操作不可撤销，所有交易记录、股票池、纪律规则等数据将被永久删除。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearConfirm(false)} className="flex-1 btn-secondary">取消</button>
                <button onClick={clearAllData} className="flex-1 py-3 px-6 rounded-2xl bg-[#FF3B30] text-white font-medium hover:bg-[#FF3B30]/90 transition-colors">确认清空</button>
              </div>
            </div>
      </AnimatedModal>
    </div>
  );
}
