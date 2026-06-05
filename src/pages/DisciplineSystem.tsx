import { useState, useEffect } from 'react';
import { DisciplineRule, ViolationRecord } from '@/types';
import { toast } from 'sonner';
import { confirmDelete } from '@/lib/utils';
import AnimatedModal from '@/components/AnimatedModal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import PageHeader from '@/components/PageHeader';
import AnimatedNumber from '@/components/AnimatedNumber';
import MotionTabs from '@/components/MotionTabs';
import { Button } from '@/components/Button';
import { AnimatePresence, motion } from 'framer-motion';

const defaultRules: DisciplineRule[] = [
  { id: '1', name: '止损规则', description: '当股票价格下跌超过5%时自动止损', conditions: [{ id: 'c1', type: 'loss', operator: 'greater', value: 5, parameter: 'percentage' }], actions: [{ id: 'a1', type: 'alert', message: '股票价格下跌超过5%，建议止损', severity: 'warning' }], severity: 'high', enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: '仓位控制', description: '单一股票持仓不超过总资金的10%', conditions: [{ id: 'c2', type: 'volume', operator: 'greater', value: 10, parameter: 'portfolio_percentage' }], actions: [{ id: 'a2', type: 'block', message: '单一股票持仓超过10%，禁止买入', severity: 'error' }], severity: 'high', enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: '盈利保护', description: '当盈利达到10%时至少卖出一半仓位', conditions: [{ id: 'c3', type: 'profit', operator: 'greater', value: 10, parameter: 'percentage' }], actions: [{ id: 'a3', type: 'alert', message: '股票盈利达到10%，建议至少卖出一半仓位', severity: 'info' }], severity: 'medium', enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: '4', name: '交易时间限制', description: '只在开盘后30分钟和收盘前30分钟外交易', conditions: [{ id: 'c4', type: 'time', operator: 'contains', value: '09:30-10:00,14:30-15:00', parameter: 'trading_time' }], actions: [{ id: 'a4', type: 'alert', message: '当前处于高风险交易时段，建议谨慎操作', severity: 'warning' }], severity: 'low', enabled: false, createdAt: new Date(), updatedAt: new Date() },
];

// 规则模板库
const ruleTemplates = [
  { id: 't1', name: '止损保护', description: '亏损超过指定比例时止损出场', category: '风险控制', icon: 'fa-shield-halved', severity: 'high' },
  { id: 't2', name: '止盈保护', description: '盈利达到目标时自动部分止盈', category: '盈利管理', icon: 'fa-coins', severity: 'medium' },
  { id: 't3', name: '仓位限制', description: '单一标的不超过总仓位的指定比例', category: '仓位管理', icon: 'fa-chart-pie', severity: 'high' },
  { id: 't4', name: '单日交易次数', description: '限制每日最大交易次数', category: '交易频率', icon: 'fa-repeat', severity: 'medium' },
  { id: 't5', name: '亏损总额限制', description: '单日亏损达到阈值后禁止交易', category: '风险控制', icon: 'fa-circle-exclamation', severity: 'high' },
  { id: 't6', name: '持仓时间限制', description: '单笔持仓超过指定天数后提醒检视', category: '持仓管理', icon: 'fa-clock', severity: 'low' },
];

export default function DisciplineSystem() {
  const [rules, setRules] = useState<DisciplineRule[]>(() => {
    const saved = localStorage.getItem('disciplineRules');
    return saved ? JSON.parse(saved, (k, v) => k === 'createdAt' || k === 'updatedAt' ? new Date(v) : v) : defaultRules;
  });
  const [violations, setViolations] = useState<ViolationRecord[]>(() => {
    const saved = localStorage.getItem('violationRecords');
    return saved ? JSON.parse(saved, (k, v) => k === 'timestamp' ? new Date(v) : v) : [];
  });
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'violations'>('rules');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DisciplineRule | null>(null);
  const [viewingRule, setViewingRule] = useState<DisciplineRule | null>(null);
  const [newRule, setNewRule] = useState({ name: '', description: '', severity: 'medium' as 'low' | 'medium' | 'high', conditions: [] as any[], actions: [] as any[] });

  useEffect(() => {
    localStorage.setItem('disciplineRules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('violationRecords', JSON.stringify(violations));
  }, [violations]);

  const calculateHistory = () => {
    const enabledRuleCount = rules.filter(r => r.enabled).length;
    const baseline = enabledRuleCount * 30; // 假设每条启用规则每天检查一次
    const monthlyData: { [key: string]: { 遵守: number, 违反: number } } = {};

    // 初始化近6个月
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthlyData[`${date.getMonth() + 1}月`] = { 遵守: baseline, 违反: 0 };
    }

    // 按月统计真实违规记录
    violations.forEach(v => {
      const date = new Date(v.timestamp);
      const key = `${date.getMonth() + 1}月`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key].违反 += 1;
        monthlyData[key].遵守 = Math.max(0, baseline - monthlyData[key].违反);
      }
    });

    return Object.entries(monthlyData).map(([name, data]) => ({ name, 遵守: data.遵守, 违反: data.违反 }));
  };

  const totalScore = Math.round(rules.filter(r => r.enabled).reduce((sum, r) => {
    const base = r.severity === 'high' ? 90 : r.severity === 'medium' ? 75 : 60;
    return sum + base;
  }, 0) / Math.max(1, rules.filter(r => r.enabled).length));

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success('规则状态已更新');
  };

  const deleteRule = async (id: string) => {
    if (!await confirmDelete('确定要删除这条规则吗？')) return;
    setRules(rules.filter(r => r.id !== id));
    toast.success('规则已删除');
  };

  const saveRule = () => {
    if (!newRule.name.trim()) {
      toast.error('请输入规则名称');
      return;
    }
    const rule: DisciplineRule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description,
      conditions: newRule.conditions.length > 0 ? newRule.conditions : [],
      actions: newRule.actions.length > 0 ? newRule.actions : [],
      severity: newRule.severity,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setRules([...rules, rule]);
    setShowAddModal(false);
    setNewRule({ name: '', description: '', severity: 'medium', conditions: [], actions: [] });
    toast.success('规则已添加');
  };

  const updateRule = () => {
    if (!editingRule) return;
    setRules(rules.map(r => r.id === editingRule.id ? { ...r, ...editingRule, updatedAt: new Date() } : r));
    setEditingRule(null);
    toast.success('规则已更新');
  };

  const applyTemplate = (template: any) => {
    const rule: DisciplineRule = {
      id: Date.now().toString(),
      name: template.name,
      description: template.description,
      conditions: [],
      actions: [],
      severity: template.severity,
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setRules([...rules, rule]);
    setShowTemplateModal(false);
    toast.success(`已应用模板「${template.name}」`);
  };

  const exportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discipline-rules-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('规则已导出');
  };

  const importRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setRules([...rules, ...imported.map((r: any) => ({ ...r, id: Date.now().toString() + Math.random() }))]);
          toast.success(`成功导入 ${imported.length} 条规则`);
        }
      } catch {
        toast.error('文件格式错误');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const resolveViolation = (id: string) => {
    setViolations(violations.map(v => v.id === id ? { ...v, status: 'resolved' as const } : v));
    toast.success('违规记录已标记为已处理');
  };

  const deleteViolation = async (id: string) => {
    if (!await confirmDelete('确定要删除这条违规记录吗？')) return;
    setViolations(violations.filter(v => v.id !== id));
    toast.success('违规记录已删除');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="交易纪律" subtitle="设置和管理您的交易规则" icon="fa-shield-halved">
        <button onClick={() => setShowTemplateModal(true)} className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center" title="规则模板">
          <i className="fa-solid fa-layer-group text-sm"></i>
        </button>
        <button onClick={exportRules} className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center" title="导出">
          <i className="fa-solid fa-download text-sm"></i>
        </button>
        <label className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center cursor-pointer" title="导入">
          <i className="fa-solid fa-upload text-sm"></i>
          <input type="file" accept=".json" onChange={importRules} className="hidden" />
        </label>
        <button onClick={() => setShowAddModal(true)} className="h-9 px-4 rounded-xl bg-white text-[#FF8E6E] font-medium text-sm hover:bg-white/90 transition-colors flex items-center gap-1.5">
          <i className="fa-solid fa-plus text-xs"></i>
          <span>添加规则</span>
        </button>
      </PageHeader>

      {/* Tab切换 */}
      <MotionTabs
        tabs={[
          { id: 'rules', label: '规则管理', icon: 'fa-shield-halved' },
          { id: 'templates', label: '规则模板', icon: 'fa-layer-group' },
          { id: 'violations', label: '违规记录', icon: 'fa-exclamation-triangle', count: violations.filter(v => v.status === 'pending').length || undefined },
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'rules' | 'templates' | 'violations')}
        layoutId="discipline-tabs"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">纪律评分</p>
          <p className="text-3xl font-bold text-[#1A1A2E]"><AnimatedNumber value={totalScore} /></p>
          <div className="mt-3 h-2 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF8E6E] to-[#5E5CE6] rounded-full" style={{ width: `${totalScore}%` }}></div>
          </div>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">已启用规则</p>
          <p className="text-3xl font-bold text-[#34C759]"><AnimatedNumber value={rules.filter(r => r.enabled).length} /></p>
          <p className="text-xs text-[#9CA3AF] mt-2">共 {rules.length} 条规则</p>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">规则遵守率</p>
          <p className="text-3xl font-bold text-[#5E5CE6]">85%</p>
          <p className="text-xs text-[#9CA3AF] mt-2">本月表现良好</p>
        </div>
        <div className="glass-card p-5 card-enter">
          <p className="text-sm text-[#9CA3AF] mb-1">高风险规则</p>
          <p className="text-3xl font-bold text-[#FF3B30]"><AnimatedNumber value={rules.filter(r => r.severity === 'high').length} /></p>
          <p className="text-xs text-[#9CA3AF] mt-2">需要重点关注</p>
        </div>
      </div>

      {/* 遵守记录图表 */}
      <div className="soft-card p-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">规则遵守记录</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calculateHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="遵守" fill="#34C759" radius={[8, 8, 0, 0]} />
              <Bar dataKey="违反" fill="#FF3B30" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 规则列表 */}
      {activeTab === 'rules' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">交易规则</h2>
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-12">
                <img src="/ip-characters.png" alt="" className="h-16 md:h-24 mx-auto mb-4 opacity-80" />
                <p className="text-sm text-[#9CA3AF] mb-4">暂无规则，点击上方按钮添加</p>
                <button onClick={() => setShowTemplateModal(true)} className="btn-secondary">从模板添加</button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
              {rules.map(rule => (
                <motion.div
                  key={rule.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="p-4 sm:p-5 bg-[#F8F9FC] rounded-2xl relative"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      rule.severity === 'high' ? 'bg-gradient-to-br from-[#FF3B30] to-[#FF6961]' :
                      rule.severity === 'medium' ? 'bg-gradient-to-br from-[#FF8E6E] to-[#FFB299]' :
                      'bg-gradient-to-br from-[#5E5CE6] to-[#7B78E8]'
                    }`}>
                      <i className={`fa-solid ${rule.conditions[0]?.type === 'loss' ? 'fa-shield-halved' : rule.conditions[0]?.type === 'volume' ? 'fa-chart-pie' : 'fa-coins'} text-white text-sm sm:text-base`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-[#1A1A2E]">{rule.name}</h3>
                        <span className={`tag ${rule.severity === 'high' ? 'tag-red' : rule.severity === 'medium' ? 'tag-orange' : 'tag-purple'}`}>
                          {rule.severity === 'high' ? '高风险' : rule.severity === 'medium' ? '中风险' : '低风险'}
                        </span>
                        {rule.enabled && <span className="tag tag-green">已启用</span>}
                      </div>
                      <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1 line-clamp-2">{rule.description}</p>
                      <div className="flex gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs text-[#6B7280] flex-wrap">
                        <span><i className="fa-solid fa-layer-group mr-1"></i>{rule.conditions.length}条件</span>
                        <span><i className="fa-solid fa-bolt mr-1"></i>{rule.actions.length}操作</span>
                        <span><i className="fa-solid fa-clock mr-1"></i>{new Date(rule.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-3 mt-3 sm:mt-0 sm:absolute sm:right-5 sm:top-1/2 sm:-translate-y-1/2">
                    <button onClick={() => setViewingRule(rule)} className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-black/5 transition-colors" title="查看详情">
                      <i className="fa-solid fa-eye text-[#5E5CE6] text-xs sm:text-sm"></i>
                    </button>
                    <button onClick={() => setEditingRule(rule)} className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-black/5 transition-colors" title="编辑">
                      <i className="fa-solid fa-edit text-[#FF8E6E] text-xs sm:text-sm"></i>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={rule.enabled} onChange={() => toggleRule(rule.id)} />
                      <div className="w-10 h-6 sm:w-12 sm:h-7 bg-black/10 peer-checked:bg-gradient-to-r peer-checked:from-[#FF8E6E] peer-checked:to-[#FFB299] rounded-full transition-all">
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:translate-x-4 sm:peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                    <button onClick={() => deleteRule(rule.id)} className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-black/5 transition-colors" title="删除">
                      <i className="fa-solid fa-trash text-[#FF3B30] text-xs sm:text-sm"></i>
                    </button>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* 规则模板 */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ruleTemplates.map(template => (
            <div key={template.id} className="soft-card p-5 cursor-pointer hover:shadow-lg transition-all card-enter" onClick={() => applyTemplate(template)}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  template.severity === 'high' ? 'bg-gradient-to-br from-[#FF3B30]/10 to-[#FF6961]/10' :
                  template.severity === 'medium' ? 'bg-gradient-to-br from-[#FF8E6E]/10 to-[#FFB299]/10' :
                  'bg-gradient-to-br from-[#5E5CE6]/10 to-[#7B78E8]/10'
                }`}>
                  <i className={`fa-solid ${template.icon} text-xl ${
                    template.severity === 'high' ? 'text-[#FF3B30]' :
                    template.severity === 'medium' ? 'text-[#FF8E6E]' :
                    'text-[#5E5CE6]'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1A1A2E]">{template.name}</h3>
                  <span className={`tag ${template.severity === 'high' ? 'tag-red' : template.severity === 'medium' ? 'tag-orange' : 'tag-purple'}`}>
                    {template.category}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#6B7280]">{template.description}</p>
              <button className="w-full btn-secondary mt-4 text-sm">应用此模板</button>
            </div>
          ))}
        </div>
      )}

      {/* 违规记录 */}
      {activeTab === 'violations' && (
        <div className="soft-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E]">违规记录</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#9CA3AF]">待处理</span>
              <span className="px-2 py-0.5 bg-[#FF3B30] text-white text-xs rounded-full">{violations.filter(v => v.status === 'pending').length}</span>
            </div>
          </div>
          <div className="space-y-4">
            {violations.length === 0 ? (
              <div className="text-center py-12">
                <img src="/ip-characters.png" alt="" className="h-16 md:h-24 mx-auto mb-4 opacity-80" />
                <p className="text-sm text-[#9CA3AF]">暂无违规记录</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
              {violations.map(violation => (
                <motion.div
                  key={violation.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`p-5 rounded-2xl border-l-4 ${
                  violation.severity === 'error' ? 'border-[#FF3B30] bg-[#FF3B30]/5' :
                  violation.severity === 'warning' ? 'border-[#FF8E6E] bg-[#FF8E6E]/5' :
                  'border-[#5E5CE6] bg-[#5E5CE6]/5'
                }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        violation.severity === 'error' ? 'bg-[#FF3B30]/20' :
                        violation.severity === 'warning' ? 'bg-[#FF8E6E]/20' :
                        'bg-[#5E5CE6]/20'
                      }`}>
                        <i className={`fa-solid fa-exclamation-triangle ${
                          violation.severity === 'error' ? 'text-[#FF3B30]' :
                          violation.severity === 'warning' ? 'text-[#FF8E6E]' :
                          'text-[#5E5CE6]'
                        }`}></i>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#1A1A2E]">{violation.ruleName}</h3>
                          <span className={`tag ${violation.severity === 'error' ? 'tag-red' : violation.severity === 'warning' ? 'tag-orange' : 'tag-purple'}`}>
                            {violation.severity === 'error' ? '严重' : violation.severity === 'warning' ? '警告' : '提示'}
                          </span>
                          <span className={`tag ${violation.status === 'resolved' ? 'tag-green' : 'tag-orange'}`}>
                            {violation.status === 'resolved' ? '已处理' : '待处理'}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B7280] mt-1">{violation.description}</p>
                        <p className="text-xs text-[#9CA3AF] mt-2">
                          <i className="fa-solid fa-clock mr-1"></i>
                          {new Date(violation.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {violation.status === 'pending' && (
                        <button onClick={() => resolveViolation(violation.id)} className="px-4 py-2 bg-[#34C759] text-white text-sm rounded-xl hover:bg-[#30D158] transition-colors">
                          标记已处理
                        </button>
                      )}
                      <button onClick={() => deleteViolation(violation.id)} className="p-2.5 rounded-xl bg-white hover:bg-black/5 transition-colors">
                        <i className="fa-solid fa-trash text-[#FF3B30]"></i>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* 规则详情弹窗 */}
      <AnimatedModal isOpen={!!viewingRule} onClose={() => setViewingRule(null)}>
            {viewingRule && <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">规则详情</h2>
              <button onClick={() => setViewingRule(null)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">规则名称</label>
                <p className="text-base font-semibold text-[#1A1A2E]">{viewingRule.name}</p>
              </div>
              <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                <label className="text-xs text-[#9CA3AF] mb-1 block">描述</label>
                <p className="text-sm text-[#6B7280]">{viewingRule.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                  <label className="text-xs text-[#9CA3AF] mb-1 block">风险等级</label>
                  <span className={`tag ${viewingRule.severity === 'high' ? 'tag-red' : viewingRule.severity === 'medium' ? 'tag-orange' : 'tag-purple'}`}>
                    {viewingRule.severity === 'high' ? '高风险' : viewingRule.severity === 'medium' ? '中风险' : '低风险'}
                  </span>
                </div>
                <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                  <label className="text-xs text-[#9CA3AF] mb-1 block">状态</label>
                  <span className={`tag ${viewingRule.enabled ? 'tag-green' : 'tag-red'}`}>
                    {viewingRule.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>
              {viewingRule.conditions.length > 0 && (
                <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                  <label className="text-xs text-[#9CA3AF] mb-2 block">触发条件</label>
                  <div className="space-y-2">
                    {viewingRule.conditions.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <i className="fa-solid fa-circle-dot text-[#5E5CE6]"></i>
                        <span className="text-[#6B7280]">{c.type === 'loss' ? '亏损' : c.type === 'profit' ? '盈利' : c.type === 'volume' ? '仓位' : '时间'}</span>
                        <span className="text-[#1A1A2E] font-medium">
                          {c.operator === 'greater' ? '大于' : c.operator === 'less' ? '小于' : '等于'} {c.value}
                          {c.type === 'loss' || c.type === 'profit' ? '%' : c.type === 'volume' ? '%' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingRule.actions.length > 0 && (
                <div className="p-4 bg-[#F8F9FC] rounded-2xl">
                  <label className="text-xs text-[#9CA3AF] mb-2 block">执行操作</label>
                  <div className="space-y-2">
                    {viewingRule.actions.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm">
                        <i className={`fa-solid ${a.type === 'alert' ? 'fa-bell' : a.type === 'block' ? 'fa-ban' : a.type === 'notify' ? 'fa-envelope' : 'fa-file'} text-[#FF8E6E]`}></i>
                        <span className="text-[#6B7280]">{a.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => { setEditingRule(viewingRule); setViewingRule(null); }} className="w-full btn-secondary mt-4">编辑此规则</button>
            </>}
      </AnimatedModal>

      {/* 添加规则弹窗 */}
      <AnimatedModal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">添加规则</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">规则名称</label>
                <input type="text" className="input-soft w-full" placeholder="如 止损规则" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">描述</label>
                <textarea className="input-soft w-full h-20 resize-none" placeholder="规则描述..." value={newRule.description} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}></textarea>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-2 block">风险等级</label>
                <div className="flex gap-3">
                  {(['high', 'medium', 'low'] as const).map(level => (
                    <button key={level} onClick={() => setNewRule({ ...newRule, severity: level })} className={`flex-1 py-3 rounded-2xl font-medium transition-all ${newRule.severity === level ? (level === 'high' ? 'bg-[#FF3B30] text-white' : level === 'medium' ? 'bg-[#FF8E6E] text-white' : 'bg-[#5E5CE6] text-white') : 'bg-black/5 text-[#6B7280]'}`}>
                      {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onSuccess={async () => saveRule()}>保存规则</Button>
            </div>
      </AnimatedModal>

      {/* 规则模板弹窗 */}
      <AnimatedModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} maxWidth="max-w-2xl" className="max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">选择规则模板</h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ruleTemplates.map(template => (
                <div key={template.id} className="p-4 bg-[#F8F9FC] rounded-2xl cursor-pointer hover:shadow-md transition-all" onClick={() => applyTemplate(template)}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      template.severity === 'high' ? 'bg-[#FF3B30]/10' :
                      template.severity === 'medium' ? 'bg-[#FF8E6E]/10' :
                      'bg-[#5E5CE6]/10'
                    }`}>
                      <i className={`fa-solid ${template.icon} ${
                        template.severity === 'high' ? 'text-[#FF3B30]' :
                        template.severity === 'medium' ? 'text-[#FF8E6E]' :
                        'text-[#5E5CE6]'
                      }`}></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1A1A2E]">{template.name}</h3>
                      <span className={`tag text-xs ${template.severity === 'high' ? 'tag-red' : template.severity === 'medium' ? 'tag-orange' : 'tag-purple'}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7280]">{template.description}</p>
                </div>
              ))}
            </div>
      </AnimatedModal>

      {/* 编辑规则弹窗 */}
      <AnimatedModal isOpen={!!editingRule} onClose={() => setEditingRule(null)}>
            {editingRule && <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">编辑规则</h2>
              <button onClick={() => setEditingRule(null)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">规则名称</label>
                <input type="text" className="input-soft w-full" value={editingRule.name} onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">描述</label>
                <textarea className="input-soft w-full h-20 resize-none" value={editingRule.description} onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}></textarea>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-2 block">风险等级</label>
                <div className="flex gap-3">
                  {(['high', 'medium', 'low'] as const).map(level => (
                    <button key={level} onClick={() => setEditingRule({ ...editingRule, severity: level })} className={`flex-1 py-3 rounded-2xl font-medium transition-all ${editingRule.severity === level ? (level === 'high' ? 'bg-[#FF3B30] text-white' : level === 'medium' ? 'bg-[#FF8E6E] text-white' : 'bg-[#5E5CE6] text-white') : 'bg-black/5 text-[#6B7280]'}`}>
                      {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={updateRule} className="w-full btn-primary">更新规则</button>
            </div>
            </>}
      </AnimatedModal>
    </div>
  );
}
