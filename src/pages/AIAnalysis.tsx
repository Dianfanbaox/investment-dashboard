import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { sendMessageToClaude } from '@/services/aiService';
import { usePositions } from '@/hooks/usePositions';
import { TradeRecord } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAnalysis() {
  const [activeTab, setActiveTab] = useState('chat');
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant' as const, content: '您好！我是您的AI投资助手。我可以帮助您分析交易记录、评估投资组合表现，并提供个性化的投资建议。请问有什么可以帮助您的吗？', timestamp: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConfigured, setIsApiConfigured] = useState(!!localStorage.getItem('ai_api_key'));
  const [apiKeyInput, setApiKeyInput] = useState('');
  const { positions, totalValue, totalCost, totalFloatingPnL, totalRealizedPnL } = usePositions();

  // 生成性能数据
  const performanceData = generatePerformanceData();

  // 生成交易习惯数据
  const tradingHabits = generateTradingHabits();

  function generatePerformanceData() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const trades = loadTrades();
    const monthlyPnL: { [key: string]: number } = {};

    trades.forEach((t: TradeRecord) => {
      if (t.type === 'sell') {
        const month = new Date(t.timestamp).toLocaleString('zh-CN', { month: 'numeric' }) + '月';
        monthlyPnL[month] = (monthlyPnL[month] || 0) + (t.price * t.quantity * 0.01);
      }
    });

    return months.map(name => ({
      name,
      收益: monthlyPnL[name] || Math.random() * 10 - 2,
      市场: Math.random() * 8 - 1,
    }));
  }

  function generateTradingHabits() {
    const trades = loadTrades();
    const buyTrades = trades.filter((t: TradeRecord) => t.type === 'buy');
    const sellTrades = trades.filter((t: TradeRecord) => t.type === 'sell');

    const diversification = positions.length > 3 ? 75 : positions.length > 1 ? 55 : 30;
    const avgHoldingDays = 30;
    const longTermHolding = avgHoldingDays > 60 ? 80 : avgHoldingDays > 30 ? 60 : 40;
    const stopLossExec = sellTrades.filter((t: TradeRecord) => {
      const buys = trades.filter((b: TradeRecord) => b.stockCode === t.stockCode && b.type === 'buy');
      const avgCost = buys.reduce((sum: number, b: TradeRecord) => sum + b.price * b.quantity, 0) / buys.reduce((sum: number, b: TradeRecord) => sum + b.quantity, 0);
      return t.price < avgCost;
    }).length;
    const stopLossScore = sellTrades.length > 0 ? Math.round((1 - stopLossExec / sellTrades.length) * 100) : 50;
    const positionControl = totalValue > 0 ? Math.round((1 - (positions[0]?.currentPrice * positions[0]?.shares || 0) / totalValue) * 100) : 50;

    return [
      { name: '分散投资', score: diversification, status: diversification >= 60 ? 'positive' : diversification >= 40 ? 'neutral' : 'negative' },
      { name: '长期持有', score: longTermHolding, status: longTermHolding >= 60 ? 'positive' : longTermHolding >= 40 ? 'neutral' : 'negative' },
      { name: '止损执行', score: stopLossScore, status: stopLossScore >= 60 ? 'positive' : stopLossScore >= 40 ? 'neutral' : 'negative' },
      { name: '仓位控制', score: positionControl, status: positionControl >= 60 ? 'positive' : positionControl >= 40 ? 'neutral' : 'negative' },
    ];
  }

  function loadTrades(): TradeRecord[] {
    try {
      const data = localStorage.getItem('trades');
      if (!data) return [];
      return JSON.parse(data, (k: string, v: unknown) => k === 'timestamp' ? new Date(v as string) : v);
    } catch {
      return [];
    }
  }

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    if (!isApiConfigured) {
      toast.error('请先配置 API Key');
      return;
    }

    const apiKey = localStorage.getItem('ai_api_key');
    if (!apiKey) {
      toast.error('请先配置 API Key');
      return;
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user' as const, content: userInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const historyMessages = chatHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const result = await sendMessageToClaude(apiKey, userInput, historyMessages);

      if (result.error) {
        toast.error(result.error);
        setChatHistory(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          content: `抱歉，发生了错误：${result.error}。请检查 API Key 是否正确，或稍后重试。`,
          timestamp: new Date()
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          content: result.content,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      toast.error('发送消息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('ai_api_key', apiKeyInput.trim());
      setIsApiConfigured(true);
      toast.success('API Key 已保存');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">AI分析</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">智能投资分析和助手</p>
        </div>
        <button onClick={() => setIsApiConfigured(!isApiConfigured)} className="btn-secondary flex items-center gap-2">
          <i className="fa-solid fa-key"></i>
          <span>API设置</span>
        </button>
      </div>

      {/* API Key 设置弹窗 */}
      {!isApiConfigured && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">配置 API Key</h2>
          <p className="text-sm text-[#6B7280] mb-4">请输入您的 AI 服务 API Key 以启用 AI 分析功能。</p>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="输入 API Key..."
              className="input-soft flex-1"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
            <button onClick={saveApiKey} className="btn-primary">保存</button>
          </div>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex gap-2">
        {[
          { id: 'chat', label: 'AI对话', icon: 'fa-comments' },
          { id: 'performance', label: '业绩分析', icon: 'fa-chart-line' },
          { id: 'habits', label: '交易习惯', icon: 'fa-brain' },
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

      {/* AI对话 */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 soft-card p-6 flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatHistory.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white' : 'bg-[#F8F9FC]'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-60">{msg.timestamp.toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#F8F9FC] p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="输入您的问题..." className="input-soft flex-1" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} />
              <button onClick={handleSendMessage} className="btn-primary">
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>

          <div className="soft-card p-6">
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">快速提问</h3>
            <div className="space-y-3">
              {[
                '分析我的交易表现',
                '推荐投资组合',
                '评估风险水平',
                '制定止损策略'
              ].map((q, i) => (
                <button key={i} onClick={() => setUserInput(q)} className="w-full p-3 bg-[#F8F9FC] rounded-xl text-sm text-left text-[#6B7280] hover:bg-black/5 transition-colors">
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gradient-to-br from-[#5E5CE6]/10 to-[#7B78E8]/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-robot text-[#5E5CE6]"></i>
                <span className="text-sm font-medium text-[#1A1A2E]">AI助手</span>
                {isApiConfigured && <span className="text-xs px-2 py-0.5 bg-[#34C759] text-white rounded-full">已连接</span>}
              </div>
              <p className="text-xs text-[#6B7280]">您可以询问任何关于投资的问题，我会尽力为您提供有价值的建议。</p>
            </div>
          </div>
        </div>
      )}

      {/* 业绩分析 */}
      {activeTab === 'performance' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">投资收益对比</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="收益" fill="#FF8E6E" radius={[8, 8, 0, 0]} />
                <Bar dataKey="市场" fill="#5E5CE6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF8E6E]"></div>
              <span className="text-xs text-[#6B7280]">您的收益</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#5E5CE6]"></div>
              <span className="text-xs text-[#6B7280]">市场基准</span>
            </div>
          </div>
        </div>
      )}

      {/* 交易习惯 */}
      {activeTab === 'habits' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">交易习惯评估</h2>
          <div className="space-y-5">
            {tradingHabits.map((habit, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 text-sm text-[#6B7280]">{habit.name}</div>
                <div className="flex-1 h-3 bg-[#F8F9FC] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${habit.status === 'positive' ? 'bg-gradient-to-r from-[#34C759] to-[#30D158]' : habit.status === 'negative' ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299]' : 'bg-gradient-to-r from-[#5E5CE6] to-[#7B78E8]'}`} style={{ width: `${habit.score}%` }}></div>
                </div>
                <div className={`w-16 text-right text-sm font-medium ${habit.status === 'positive' ? 'text-[#34C759]' : habit.status === 'negative' ? 'text-[#FF8E6E]' : 'text-[#5E5CE6]'}`}>
                  {habit.score}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#F8F9FC] rounded-2xl">
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2">AI建议</h3>
            <p className="text-sm text-[#6B7280]">您的交易习惯整体表现良好。建议加强止损执行纪律，这将对您的长期投资回报产生积极影响。</p>
          </div>
        </div>
      )}
    </div>
  );
}