import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { createElement } from "react"
import type { TradeRecord } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function loadTradesFromStorage(): TradeRecord[] {
  try {
    const data = localStorage.getItem('trades');
    if (!data) return [];
    return JSON.parse(data, (key, value) => key === 'timestamp' ? new Date(value) : value);
  } catch {
    return [];
  }
}

export function confirmDelete(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = toast(
      createElement('div', { className: 'flex flex-col gap-2' },
        createElement('span', null, message),
        createElement('div', { className: 'flex gap-2 justify-end' },
          createElement('button', {
            className: 'px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors',
            onClick: () => { toast.dismiss(id); resolve(false); }
          }, '取消'),
          createElement('button', {
            className: 'px-3 py-1 rounded-lg text-sm text-white hover:opacity-90 transition-opacity',
            style: { background: '#FF3B30' },
            onClick: () => { toast.dismiss(id); resolve(true); }
          }, '确认删除')
        )
      ),
      { duration: 10000 }
    );
  });
}
