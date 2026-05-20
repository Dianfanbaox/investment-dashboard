import { TradeRecord } from '@/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  error?: string;
}

// 获取用户交易数据摘要
const getTradesSummary = (trades: TradeRecord[]): string => {
  if (trades.length === 0) {
    return '目前没有任何交易记录。';
  }

  const buyTrades = trades.filter(t => t.type === 'buy');
  const sellTrades = trades.filter(t => t.type === 'sell');

  // 按股票分组
  const stocks: { [code: string]: { name: string, trades: TradeRecord[] } } = {};
  trades.forEach(t => {
    if (!stocks[t.stockCode]) {
      stocks[t.stockCode] = { name: t.stockName, trades: [] };
    }
    stocks[t.stockCode].trades.push(t);
  });

  // 计算总收益
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

  const summary = `
交易统计：
- 总交易次数: ${trades.length}次
- 买入: ${buyTrades.length}次
- 卖出: ${sellTrades.length}次

股票详情：
${stockSummaries.join('\n')}

当前总收益: ${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toFixed(2)}
`;

  return summary;
};

// 发送消息到 Claude API
export const sendMessageToClaude = async (
  apiKey: string,
  message: string,
  chatHistory: Message[]
): Promise<AIResponse> => {
  try {
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: chatHistory.map(m => ({
          role: m.role,
          content: m.content
        })).concat([{ role: 'user' as const, content: message }])
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();

    if (data.content && data.content.length > 0) {
      return { content: data.content[0].text };
    }

    throw new Error('无效的API响应');
  } catch (error) {
    if (error instanceof Error) {
      return { content: '', error: error.message };
    }
    return { content: '', error: '未知错误' };
  }
};