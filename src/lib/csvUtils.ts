import { TradeRecord } from '../types';

export function tradesToCSV(trades: TradeRecord[]): string {
  const headers = ['日期', '股票代码', '股票名称', '类型', '价格', '数量', '手续费', '备注'];
  const rows = trades.map(t => [
    new Date(t.timestamp).toISOString().split('T')[0],
    t.stockCode,
    t.stockName,
    t.type === 'buy' ? '买入' : '卖出',
    t.price.toString(),
    t.quantity.toString(),
    t.fee.toString(),
    t.notes || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseCSV(content: string): Partial<TradeRecord>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records: Partial<TradeRecord>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const record: Partial<TradeRecord> = {
      id: Date.now().toString() + i,
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/^"|"$/g, '');
      switch (header) {
        case '日期':
        case '时间':
          record.timestamp = new Date(value);
          break;
        case '股票代码':
          record.stockCode = value;
          break;
        case '股票名称':
          record.stockName = value;
          break;
        case '类型':
          record.type = value === '买入' || value === 'buy' ? 'buy' : 'sell';
          break;
        case '价格':
          record.price = parseFloat(value) || 0;
          break;
        case '数量':
          record.quantity = parseInt(value) || 0;
          break;
        case '手续费':
          record.fee = parseFloat(value) || 0;
          break;
        case '备注':
          record.notes = value;
          break;
      }
    });

    if (record.stockCode && record.price && record.quantity) {
      records.push(record);
    }
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

export function generateCSVTemplate(): string {
  return `日期,股票代码,股票名称,类型,价格,数量,手续费,备注
2024-01-01,AAPL,苹果公司,买入,185.50,10,12.50,长期持有
2024-01-15,MSFT,微软公司,买入,342.80,5,9.80,AI业务增长`;
}
