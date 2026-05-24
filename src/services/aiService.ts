import { TradeRecord } from '@/types';

const DEFAULT_API_URL = '/siliconflow-api/v1/chat/completions';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  error?: string;
}

const getTradesSummary = (trades: TradeRecord[]): string => {
  if (trades.length === 0) {
    return '目前没有任何交易记录。';
  }

  const buyTrades = trades.filter(t => t.type === 'buy');
  const sellTrades = trades.filter(t => t.type === 'sell');

  const stocks: { [code: string]: { name: string, trades: TradeRecord[] } } = {};
  trades.forEach(t => {
    if (!stocks[t.stockCode]) {
      stocks[t.stockCode] = { name: t.stockName, trades: [] };
    }
    stocks[t.stockCode].trades.push(t);
  });

  let totalProfit = 0;
  const stockSummaries: string[] = [];

  Object.entries(stocks).forEach(([code, data]) => {
    const sortedTrades = data.trades.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let holdingQty = 0;
    let totalCost = 0;

    sortedTrades.forEach(t => {
      if (t.type === 'buy') {
        holdingQty += t.quantity;
        totalCost += t.price * t.quantity;
      } else {
        const avgCost = holdingQty > 0 ? totalCost / holdingQty : 0;
        totalProfit += (t.price - avgCost) * t.quantity - t.fee;
        holdingQty -= t.quantity;
        if (holdingQty <= 0) {
          holdingQty = 0;
          totalCost = 0;
        } else {
          totalCost = avgCost * holdingQty;
        }
      }
    });

    if (holdingQty > 0) {
      stockSummaries.push(`${data.name}(${code}): 持仓${holdingQty}股，成本${totalCost.toFixed(2)}`);
    }
  });

  return `
交易统计：
- 总交易次数: ${trades.length}次
- 买入: ${buyTrades.length}次
- 卖出: ${sellTrades.length}次

股票详情：
${stockSummaries.join('\n')}

当前总收益: ${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toFixed(2)}
`;
};

export const sendMessageToClaude = async (
  apiKey: string,
  message: string,
  chatHistory: Message[]
): Promise<AIResponse> => {
  try {
    const apiUrl = localStorage.getItem('ai_api_url') || DEFAULT_API_URL;
    const model = localStorage.getItem('ai_model') || DEFAULT_MODEL;

    const trades = localStorage.getItem('trades');
    const tradesData: TradeRecord[] = trades ? JSON.parse(trades, (k: string, v: unknown) => {
      if (k === 'timestamp') return new Date(v as string);
      return v;
    }) : [];

    const systemPrompt = `你是用户的AI投资助手。你的职责是：
1. 分析用户的交易记录，提供个性化建议
2. 评估用户的投资组合表现和风险
3. 给出实用的投资建议和策略

用户交易数据：
${getTradesSummary(tradesData)}

请根据用户的交易数据提供专业、有价值的分析和建议。保持回答简洁、专业、易懂。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      return { content: data.choices[0].message.content };
    }

    throw new Error('无效的API响应');
  } catch (error) {
    if (error instanceof Error) {
      return { content: '', error: error.message };
    }
    return { content: '', error: '未知错误' };
  }
};