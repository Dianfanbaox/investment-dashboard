import { Quote } from '../types';

function symbolToTencent(code: string, market?: 'sh' | 'sz' | 'hk' | 'us'): string {
  if (market === 'sh') return `sh${code}`;
  if (market === 'sz') return `sz${code}`;
  if (market === 'hk') return `hk${code}`;
  if (market === 'us') return `us${code}`;

  // Auto-detect by code pattern
  if (/^\d{6}$/.test(code)) {
    if (code.startsWith('6')) return `sh${code}`;
    if (code.startsWith('0') || code.startsWith('3')) return `sz${code}`;
  }
  // US stocks usually have 1-5 letters
  if (/^[A-Z]{1,5}$/i.test(code)) return `us${code.toUpperCase()}`;
  // HK stocks
  if (/^\d{4,5}$/.test(code)) return `hk${code}`;

  return `us${code.toUpperCase()}`;
}

// Convert GBK buffer to UTF-8 string
function gbkToUtf8(buffer: ArrayBuffer): string {
  try {
    // Try gb18030 which is more widely supported than gbk
    const decoder = new TextDecoder('gb18030');
    return decoder.decode(buffer);
  } catch {
    // Fallback: try gbk
    try {
      const decoder = new TextDecoder('gbk');
      return decoder.decode(buffer);
    } catch {
      // Last resort: treat as latin1
      const decoder = new TextDecoder('latin1');
      return decoder.decode(buffer);
    }
  }
}

function parseTencentData(data: string): { price: number; change: number; changePercent: number; name: string } | null {
  try {
    // Format: "v_usAAPL="200~名称~代码~当前价~昨收~今开~成交量~..."
    // Split by ~
    const equalIndex = data.indexOf('=');
    if (equalIndex === -1) return null;
    const dataPart = data.substring(equalIndex + 1);
    const parts = dataPart.split('~');
    if (parts.length < 50) return null;

    const price = parseFloat(parts[3]) || 0;
    const yesterdayClose = parseFloat(parts[4]) || 0;
    const change = price - yesterdayClose;
    const changePercent = yesterdayClose ? (change / yesterdayClose) * 100 : 0;
    const name = parts[1] || '';

    return { price, change, changePercent, name };
  } catch {
    return null;
  }
}

export async function getQuote(code: string, market?: 'sh' | 'sz' | 'hk' | 'us'): Promise<Quote | null> {
  try {
    const tencentSymbol = symbolToTencent(code, market);
    const url = `https://qt.gtimg.cn/q=${tencentSymbol}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch quote for ${code}: ${response.status}`);
      return null;
    }

    // Get array buffer to handle GBK encoding
    const buffer = await response.arrayBuffer();
    const text = gbkToUtf8(buffer);
    const parsed = parseTencentData(text);

    if (!parsed || parsed.price === 0) {
      return null;
    }

    return {
      symbol: code.toUpperCase(),
      name: parsed.name,
      price: parsed.price,
      change: parsed.change,
      changePercent: parsed.changePercent,
      currency: market === 'sh' || market === 'sz' ? 'CNY' : market === 'hk' ? 'HKD' : 'USD',
      market,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${code}:`, error);
    return null;
  }
}

export async function getQuotes(codes: string[], market?: 'sh' | 'sz' | 'hk' | 'us'): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();

  const symbols = codes.map(c => symbolToTencent(c, market));
  const url = `https://qt.gtimg.cn/q=${symbols.join(',')}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return results;

    const buffer = await response.arrayBuffer();
    const text = gbkToUtf8(buffer);
    const lines = text.split('\n');

    codes.forEach((code, index) => {
      if (lines[index]) {
        const parsed = parseTencentData(lines[index]);
        if (parsed && parsed.price > 0) {
          results.set(code.toUpperCase(), {
            symbol: code.toUpperCase(),
            name: parsed.name,
            price: parsed.price,
            change: parsed.change,
            changePercent: parsed.changePercent,
            currency: market === 'sh' || market === 'sz' ? 'CNY' : market === 'hk' ? 'HKD' : 'USD',
            market,
          });
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quotes batch:', error);
  }

  return results;
}

export function detectMarket(code: string): 'sh' | 'sz' | 'hk' | 'us' | undefined {
  if (/^\d{6}$/.test(code)) {
    if (code.startsWith('6')) return 'sh';
    if (code.startsWith('0') || code.startsWith('3')) return 'sz';
  }
  if (/^(00|30|60)\d{5}$/.test(code)) return 'sz';
  if (/^(68|60)\d{5}$/.test(code)) return 'sh';
  if (/^\d{4,5}$/.test(code) && parseInt(code) < 10000) return 'hk';
  return 'us';
}
