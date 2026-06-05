import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
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

const CONFIRM_EVENT = 'app:confirm';

export function confirmDelete(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ result: boolean }>).detail;
      window.removeEventListener(CONFIRM_EVENT, handler);
      resolve(detail.result);
    };
    window.addEventListener(CONFIRM_EVENT, handler);
    window.dispatchEvent(new CustomEvent('app:confirm-request', { detail: { message } }));
  });
}

export const CONFIRM_EVENT_NAME = CONFIRM_EVENT;
