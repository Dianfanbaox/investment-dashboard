import { TradeRecord, DisciplineRule, ViolationRecord, RuleCondition } from '../types';

function loadRules(): DisciplineRule[] {
  try {
    const data = localStorage.getItem('disciplineRules');
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
      if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
  } catch {
    return [];
  }
}

function loadTrades(): TradeRecord[] {
  try {
    const data = localStorage.getItem('trades');
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
      if (key === 'timestamp') return new Date(value);
      return value;
    });
  } catch {
    return [];
  }
}

function checkCondition(condition: RuleCondition, trade: TradeRecord, allTrades: TradeRecord[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (condition.type) {
    case 'price': {
      const value = Number(condition.value);
      switch (condition.operator) {
        case 'greater': return trade.price > value;
        case 'less': return trade.price < value;
        case 'equal': return trade.price === value;
        default: return false;
      }
    }

    case 'volume': {
      const value = Number(condition.value);
      switch (condition.operator) {
        case 'greater': return trade.quantity > value;
        case 'less': return trade.quantity < value;
        case 'equal': return trade.quantity === value;
        default: return false;
      }
    }

    case 'time': {
      const hour = new Date(trade.timestamp).getHours();
      const value = Number(condition.value);
      if (condition.parameter === 'hour') {
        switch (condition.operator) {
          case 'greater': return hour > value;
          case 'less': return hour < value;
          case 'equal': return hour === value;
          default: return false;
        }
      }
      return false;
    }

    case 'loss': {
      const value = Number(condition.value);
      const todayTrades = allTrades.filter(t => {
        const tradeDate = new Date(t.timestamp);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
      });
      const todaySells = todayTrades.filter(t => t.type === 'sell');
      if (todaySells.length === 0) return false;
      let totalLoss = 0;
      todaySells.forEach(sell => {
        const buys = allTrades.filter(
          b => b.stockCode === sell.stockCode && b.type === 'buy' && new Date(b.timestamp) < new Date(sell.timestamp)
        );
        if (buys.length > 0) {
          const avgCost = buys.reduce((sum, b) => sum + b.price * b.quantity, 0) / buys.reduce((sum, b) => sum + b.quantity, 0);
          totalLoss += (sell.price - avgCost) * sell.quantity - sell.fee;
        }
      });
      return totalLoss < -value;
    }

    case 'profit': {
      const value = Number(condition.value);
      const todayTrades = allTrades.filter(t => {
        const tradeDate = new Date(t.timestamp);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
      });
      const todaySells = todayTrades.filter(t => t.type === 'sell');
      if (todaySells.length === 0) return false;
      let totalProfit = 0;
      todaySells.forEach(sell => {
        const buys = allTrades.filter(
          b => b.stockCode === sell.stockCode && b.type === 'buy' && new Date(b.timestamp) < new Date(sell.timestamp)
        );
        if (buys.length > 0) {
          const avgCost = buys.reduce((sum, b) => sum + b.price * b.quantity, 0) / buys.reduce((sum, b) => sum + b.quantity, 0);
          totalProfit += (sell.price - avgCost) * sell.quantity - sell.fee;
        }
      });
      return totalProfit > value;
    }

    default:
      return false;
  }
}

export function checkTradeViolations(trade: TradeRecord): ViolationRecord[] {
  const rules = loadRules().filter(r => r.enabled);
  const allTrades = loadTrades();
  const violations: ViolationRecord[] = [];

  rules.forEach(rule => {
    const violated = rule.conditions.some(condition => checkCondition(condition, trade, allTrades));
    if (violated) {
      violations.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ruleId: rule.id,
        ruleName: rule.name,
        description: `${rule.name} - ${rule.description || '触发规则'}`,
        timestamp: new Date(),
        severity: rule.severity === 'high' ? 'error' : rule.severity === 'medium' ? 'warning' : 'info',
        status: 'pending',
      });
    }
  });

  return violations;
}

export function saveViolationRecord(violation: ViolationRecord): void {
  const existing = loadViolations();
  existing.push(violation);
  localStorage.setItem('violationRecords', JSON.stringify(existing));
}

export function loadViolations(): ViolationRecord[] {
  try {
    const data = localStorage.getItem('violationRecords');
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
      if (key === 'timestamp') return new Date(value);
      return value;
    });
  } catch {
    return [];
  }
}

export function getViolationStats(): { month: string, compliant: number, violated: number }[] {
  const violations = loadViolations();
  const trades = loadTrades();
  const months: { [key: string]: { compliant: number, violated: number } } = {};
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { compliant: 0, violated: 0 };
  }

  violations.forEach(v => {
    const date = new Date(v.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].violated++;
    }
  });

  trades.forEach(t => {
    const date = new Date(t.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].compliant++;
    }
  });

  return Object.entries(months).map(([month, data]) => ({
    month: month.slice(5) + '月',
    compliant: data.compliant,
    violated: data.violated,
  }));
}
