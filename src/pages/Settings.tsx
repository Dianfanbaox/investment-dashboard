import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#FF8E6E', '#5E5CE6', '#34C759', '#9CA3AF'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({ email: true, inApp: true, riskAlerts: true, weeklyReport: false });

  const storageData = [
    { name: '交易记录', value: 45, color: '#FF8E6E' },
    { name: '股票数据', value: 30, color: '#5E5CE6' },
    { name: '心得记录', value: 15, color: '#34C759' },
    { name: '其他', value: 10, color: '#9CA3AF' },
  ];

  const exportAllData = () => {
    const data = {
      trades: JSON.parse(localStorage.getItem('trades') || '[]'),
      stockPool: JSON.parse(localStorage.getItem('stockPoolStocks') || '[]'),
      disciplineRules: JSON.parse(localStorage.getItem('disciplineRules') || '[]'),
      violationRecords: JSON.parse(localStorage.getItem('violationRecords') || '[]'),
      tradingInsights: JSON.parse(localStorage.getItem('tradingInsights') || '[]'),
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
        toast.success('数据已导入，请刷新页面查看');
      } catch {
        toast.error('文件格式错误');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">系统设置</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">管理您的个人设置和数据</p>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2">
        {[
          { id: 'profile', label: '个人资料', icon: 'fa-user' },
          { id: 'notifications', label: '通知设置', icon: 'fa-bell' },
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
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white shadow-lg">
                <img src="https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=User%20avatar%2C%20professional%20investor%2C%20portrait%2C%20simple%20style&sign=c30d19f3a99524cee2627efedcc7c0a6" alt="头像" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A2E]">个人投资者</h3>
                <p className="text-sm text-[#9CA3AF]">专注价值投资和长期持有</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">昵称</label>
                <p className="text-sm font-medium text-[#1A1A2E]">个人投资者</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">邮箱</label>
                <p className="text-sm font-medium text-[#1A1A2E]">investor@example.com</p>
              </div>
              <button className="btn-secondary w-full" onClick={() => toast.info('编辑资料功能开发中')}>编辑资料</button>
            </div>
          </div>

          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">账户统计</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#FF8E6E]">6</p>
                <p className="text-xs text-[#9CA3AF] mt-1">交易记录</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#5E5CE6]">4</p>
                <p className="text-xs text-[#9CA3AF] mt-1">自选股票</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#34C759]">3</p>
                <p className="text-xs text-[#9CA3AF] mt-1">纪律规则</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                <p className="text-2xl font-bold text-[#5856D6]">85</p>
                <p className="text-xs text-[#9CA3AF] mt-1">纪律评分</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 通知设置 */}
      {activeTab === 'notifications' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">通知偏好</h2>
          <div className="space-y-4">
            {[
              { key: 'email', label: '邮件通知', desc: '接收交易提醒和报告', color: '#FF8E6E' },
              { key: 'inApp', label: '应用通知', desc: '应用内实时提醒', color: '#5E5CE6' },
              { key: 'riskAlerts', label: '风险提醒', desc: '亏损超过阈值时提醒', color: '#FF3B30' },
              { key: 'weeklyReport', label: '周报', desc: '每周投资报告摘要', color: '#34C759' },
            ].map(item => (
              <div key={item.key} className="p-4 bg-[#F8F9FC] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                    <i className="fa-solid fa-bell" style={{ color: item.color }}></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">{item.label}</p>
                    <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notifications[item.key as keyof typeof notifications]} onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })} />
                  <div className="w-12 h-7 bg-black/10 peer-checked:bg-gradient-to-r peer-checked:from-[#FF8E6E] peer-checked:to-[#FFB299] rounded-full transition-all">
                    <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据管理 */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="soft-card p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">存储使用</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={storageData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name }) => name}>
                    {storageData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {storageData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-[#6B7280]">{item.name}</span>
                </div>
              ))}
            </div>
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
                  <p className="text-xs text-[#9CA3AF]">下载所有数据为JSON文件</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#9CA3AF]"></i>
              </button>
              <label className="w-full p-4 bg-[#F8F9FC] rounded-2xl flex items-center gap-3 hover:bg-black/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-[#FF8E6E]/10 flex items-center justify-center">
                  <i className="fa-solid fa-upload text-[#FF8E6E]"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-[#1A1A2E]">导入数据</p>
                  <p className="text-xs text-[#9CA3AF]">从JSON文件恢复数据</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#9CA3AF]"></i>
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
              <button onClick={() => { localStorage.clear(); toast.success('数据已清空'); }} className="w-full p-4 bg-[#FF3B30]/10 rounded-2xl flex items-center gap-3 hover:bg-[#FF3B30]/20 transition-colors">
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
              投资看板是一款专注于个人投资管理的仪表盘应用，帮助您追踪交易记录、管理股票池、遵守交易纪律，并提供AI辅助分析功能。
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
    </div>
  );
}