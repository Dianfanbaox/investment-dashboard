import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
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
  const [apiUrlInput, setApiUrlInput] = useState(localStorage.getItem('ai_api_url') || '/siliconflow-api/v1/chat/completions');
  const [modelInput, setModelInput] = useState(localStorage.getItem('ai_model') || 'Qwen/Qwen2.5-7B-Instruct');
  const { positions } = usePositions();

  // 业绩分析：按月计算已实现盈亏（FIFO）
  const performanceData = (() => {
    const trades = loadTrades().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const monthlyPnL: { [key: string]: number } = {};

    // FIFO 计算每笔卖出的盈亏
    const lots: { [code: string]: { price: number; quantity: number }[] } = {};
    trades.forEach(t => {
      if (!lots[t.stockCode]) lots[t.stockCode] = [];
      if (t.type === 'buy') {
        lots[t.stockCode].push({ price: t.price, quantity: t.quantity });
      } else {
        const month = new Date(t.timestamp).toLocaleString('zh-CN', { month: 'numeric' }) + '月';
        let remaining = t.quantity;
        let pnl = 0;
        while (remaining > 0 && lots[t.stockCode].length > 0) {
          const lot = lots[t.stockCode][0];
          const qty = Math.min(lot.quantity, remaining);
          pnl += (t.price - lot.price) * qty;
          lot.quantity -= qty;
          remaining -= qty;
          if (lot.quantity === 0) lots[t.stockCode].shift();
        }
        monthlyPnL[month] = (monthlyPnL[month] || 0) + pnl;
      }
    });

    // 取最近有数据的 6 个月
    const monthOrder = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const dataMonths = monthOrder.filter(m => monthlyPnL[m] !== undefined);
    const showMonths = dataMonths.length > 0 ? dataMonths.slice(-6) : monthOrder.slice(0, 6);

    return showMonths.map(name => ({
      name,
      盈亏: Math.round((monthlyPnL[name] || 0) * 100) / 100,
    }));
  })();

  // 交易习惯评估
  const tradingHabits = (() => {
    const trades = loadTrades().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sellTrades = trades.filter(t => t.type === 'sell');

    // 1. 分散投资：持仓股票数量
    const stockCount = positions.length;
    const diversification = stockCount >= 5 ? 90 : stockCount >= 3 ? 70 : stockCount >= 2 ? 50 : 30;

    // 2. 持有期：买入到卖出的平均天数
    const holdingDaysList: number[] = [];
    const lotsByStock: { [code: string]: { date: Date; quantity: number }[] } = {};
    trades.forEach(t => {
      if (!lotsByStock[t.stockCode]) lotsByStock[t.stockCode] = [];
      if (t.type === 'buy') {
        lotsByStock[t.stockCode].push({ date: new Date(t.timestamp), quantity: t.quantity });
      } else {
        let remaining = t.quantity;
        while (remaining > 0 && lotsByStock[t.stockCode].length > 0) {
          const lot = lotsByStock[t.stockCode][0];
          const qty = Math.min(lot.quantity, remaining);
          const days = (new Date(t.timestamp).getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24);
          holdingDaysList.push(days);
          lot.quantity -= qty;
          remaining -= qty;
          if (lot.quantity === 0) lotsByStock[t.stockCode].shift();
        }
      }
    });
    const avgHoldingDays = holdingDaysList.length > 0 ? holdingDaysList.reduce((s, d) => s + d, 0) / holdingDaysList.length : 0;
    const longTermScore = avgHoldingDays >= 90 ? 90 : avgHoldingDays >= 30 ? 70 : avgHoldingDays >= 7 ? 50 : 30;

    // 3. 止损执行：亏损卖出占比
    const lossSells = sellTrades.filter(t => {
      const stockLots = trades.filter(b => b.stockCode === t.stockCode && b.type === 'buy' && new Date(b.timestamp) < new Date(t.timestamp));
      if (stockLots.length === 0) return false;
      const avgCost = stockLots.reduce((s, b) => s + b.price * b.quantity, 0) / stockLots.reduce((s, b) => s + b.quantity, 0);
      return t.price < avgCost;
    }).length;
    const stopLossScore = sellTrades.length > 0 ? Math.round((1 - lossSells / sellTrades.length) * 100) : 50;

    // 4. 胜率：盈利卖出占比
    const winSells = sellTrades.filter(t => {
      const stockLots = trades.filter(b => b.stockCode === t.stockCode && b.type === 'buy' && new Date(b.timestamp) < new Date(t.timestamp));
      if (stockLots.length === 0) return false;
      const avgCost = stockLots.reduce((s, b) => s + b.price * b.quantity, 0) / stockLots.reduce((s, b) => s + b.quantity, 0);
      return t.price >= avgCost;
    }).length;
    const winRate = sellTrades.length > 0 ? Math.round((winSells / sellTrades.length) * 100) : 50;

    return [
      { name: '分散投资', score: diversification, status: diversification >= 60 ? 'positive' : diversification >= 40 ? 'neutral' : 'negative' },
      { name: '持有周期', score: longTermScore, status: longTermScore >= 60 ? 'positive' : longTermScore >= 40 ? 'neutral' : 'negative', detail: `平均 ${Math.round(avgHoldingDays)} 天` },
      { name: '止损纪律', score: stopLossScore, status: stopLossScore >= 60 ? 'positive' : stopLossScore >= 40 ? 'neutral' : 'negative' },
      { name: '胜率', score: winRate, status: winRate >= 60 ? 'positive' : winRate >= 40 ? 'neutral' : 'negative', detail: `${winSells}/${sellTrades.length}` },
    ];
  })();

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
      if (apiUrlInput.trim()) localStorage.setItem('ai_api_url', apiUrlInput.trim());
      if (modelInput.trim()) localStorage.setItem('ai_model', modelInput.trim());
      setIsApiConfigured(true);
      toast.success('API 配置已保存');
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
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">配置 AI 服务</h2>
          <p className="text-sm text-[#6B7280] mb-4">支持硅基流动等 OpenAI 兼容的 API 服务。</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">API 地址</label>
              <input
                type="text"
                placeholder="https://api.siliconflow.cn/v1/chat/completions"
                className="input-soft w-full"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">模型名称</label>
              <input
                type="text"
                placeholder="Qwen/Qwen2.5-7B-Instruct"
                className="input-soft w-full"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[#6B7280] mb-1 block">API Key</label>
              <input
                type="password"
                placeholder="输入 API Key..."
                className="input-soft w-full"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            <button onClick={saveApiKey} className="w-full btn-primary">保存配置</button>
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
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">月度已实现盈亏</h2>
          <p className="text-sm text-[#9CA3AF] mb-4">基于 FIFO 算法，计算每月卖出交易的实际盈亏</p>
          {performanceData.some(d => d.盈亏 !== 0) ? (
            <>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, '盈亏']}
                    />
                    <Bar dataKey="盈亏" radius={[8, 8, 0, 0]}>
                      {performanceData.map((entry, index) => (
                        <Cell key={index} fill={entry.盈亏 >= 0 ? '#34C759' : '#FF3B30'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                  <p className="text-lg font-bold text-[#34C759]">¥{performanceData.filter(d => d.盈亏 > 0).reduce((s, d) => s + d.盈亏, 0).toFixed(0)}</p>
                  <p className="text-xs text-[#9CA3AF]">总盈利</p>
                </div>
                <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                  <p className="text-lg font-bold text-[#FF3B30]">¥{Math.abs(performanceData.filter(d => d.盈亏 < 0).reduce((s, d) => s + d.盈亏, 0)).toFixed(0)}</p>
                  <p className="text-xs text-[#9CA3AF]">总亏损</p>
                </div>
                <div className="p-4 bg-[#F8F9FC] rounded-2xl text-center">
                  <p className={`text-lg font-bold ${performanceData.reduce((s, d) => s + d.盈亏, 0) >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>¥{performanceData.reduce((s, d) => s + d.盈亏, 0).toFixed(0)}</p>
                  <p className="text-xs text-[#9CA3AF]">净盈亏</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F8F9FC] flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-chart-bar text-2xl text-[#9CA3AF]"></i>
              </div>
              <p className="text-sm text-[#9CA3AF]">暂无已实现盈亏数据</p>
            </div>
          )}
        </div>
      )}

      {/* 交易习惯 */}
      {activeTab === 'habits' && (
        <div className="soft-card p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">交易习惯评估</h2>
          <div className="space-y-5">
            {tradingHabits.map((habit, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-20 text-sm text-[#6B7280]">{habit.name}</div>
                <div className="flex-1 h-3 bg-[#F8F9FC] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${habit.status === 'positive' ? 'bg-gradient-to-r from-[#34C759] to-[#30D158]' : habit.status === 'negative' ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299]' : 'bg-gradient-to-r from-[#5E5CE6] to-[#7B78E8]'}`} style={{ width: `${habit.score}%` }}></div>
                </div>
                <div className={`w-20 text-right text-sm font-medium ${habit.status === 'positive' ? 'text-[#34C759]' : habit.status === 'negative' ? 'text-[#FF8E6E]' : 'text-[#5E5CE6]'}`}>
                  {habit.score}%{habit.detail && <span className="text-xs text-[#9CA3AF] ml-1">{habit.detail}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#F8F9FC] rounded-2xl">
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2">分析结论</h3>
            <ul className="text-sm text-[#6B7280] space-y-1">
              {tradingHabits.map((h, i) => (
                <li key={i}>• {h.name}：{h.score >= 60 ? '良好' : h.score >= 40 ? '一般' : '需改进'}{h.detail ? `（${h.detail}）` : ''}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}