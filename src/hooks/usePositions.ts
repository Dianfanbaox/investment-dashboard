import { useMemo } from 'react';
import { TradeRecord, Position, PositionsSummary, Stock } from '../types';

const STORAGE_KEY = 'trades';
const STOCK_POOL_KEY = 'stockPoolStocks';

function loadTrades(): TradeRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
      if (key === 'timestamp') return new Date(value);
      return value;
    });
  } catch {
    return [];
  }
}

function loadStockPoolPrices(): Map<string, number> {
  try {
    const data = localStorage.getItem(STOCK_POOL_KEY);
    if (!data) return new Map();
    const stocks: Stock[] = JSON.parse(data);
    const priceMap = new Map<string, number>();
    stocks.forEach(s => {
      if (s.price && s.price > 0) {
        priceMap.set(s.code, s.price);
      }
    });
    return priceMap;
  } catch {
    return new Map();
  }
}

function groupByStock(trades: TradeRecord[]): Map<string, TradeRecord[]> {
  const groups = new Map<string, TradeRecord[]>();
  trades.forEach(trade => {
    const key = trade.stockCode;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(trade);
  });
  return groups;
}

export function usePositions(): PositionsSummary {
  const trades = useMemo(() => loadTrades(), []);
  const stockPoolPrices = useMemo(() => loadStockPoolPrices(), []);

  const summary = useMemo(() => {
    const groups = groupByStock(trades);
    const positions: Position[] = [];
    let totalValue = 0;
    let totalCost = 0;
    let totalFloatingPnL = 0;
    let totalRealizedPnL = 0;

    groups.forEach((stockTrades, stockCode) => {
      const sorted = [...stockTrades].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const lots: { price: number; quantity: number }[] = [];
      let realizedPnL = 0;
      let buyCount = 0;
      let sellCount = 0;
      let stockName = stockCode;

      sorted.forEach(trade => {
        stockName = trade.stockName || stockCode;
        if (trade.type === 'buy') {
          buyCount++;
          lots.push({ price: trade.price, quantity: trade.quantity });
        } else {
          sellCount++;
          let remaining = trade.quantity;
          while (remaining > 0 && lots.length > 0) {
            const lot = lots[0];
            const sellQty = Math.min(lot.quantity, remaining);
            realizedPnL += (trade.price - lot.price) * sellQty;
            lot.quantity -= sellQty;
            remaining -= sellQty;
            if (lot.quantity === 0) lots.shift();
          }
        }
      });

      const shares = lots.reduce((s, l) => s + l.quantity, 0);
      const costSum = lots.reduce((s, l) => s + l.price * l.quantity, 0);
      const avgCost = shares > 0 ? costSum / shares : 0;
      const poolPrice = stockPoolPrices.get(stockCode);
      const currentPrice = poolPrice ?? avgCost;
      const floatingPnL = shares > 0 ? (currentPrice - avgCost) * shares : 0;
      const floatingPnLPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
      const positionValue = shares * currentPrice;
      const positionCost = shares * avgCost;

      totalValue += positionValue;
      totalCost += positionCost;
      totalFloatingPnL += floatingPnL;
      totalRealizedPnL += realizedPnL;

      if (shares > 0) {
        positions.push({
          stockCode,
          stockName,
          shares,
          avgCost,
          currentPrice,
          floatingPnL,
          floatingPnLPct,
          realizedPnL,
          buyCount,
          sellCount,
        });
      }
    });

    const totalFloatingPnLPct = totalCost > 0
      ? ((totalValue - totalCost) / totalCost) * 100
      : 0;

    return {
      totalValue,
      totalCost,
      totalFloatingPnL,
      totalFloatingPnLPct,
      totalRealizedPnL,
      positions: positions.sort((a, b) => b.floatingPnL - a.floatingPnL),
    };
  }, [trades]);

  return summary;
}

export function updatePositionPrice(stockCode: string, newPrice: number): void {
  localStorage.setItem(`position_price_${stockCode}`, String(newPrice));
}

export function getPositionPrice(stockCode: string): number | null {
  const price = localStorage.getItem(`position_price_${stockCode}`);
  return price ? parseFloat(price) : null;
}
