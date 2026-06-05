import type { ReactNode } from 'react';

interface MobileCardFieldProps {
  label: string;
  value: ReactNode;
  align?: 'left' | 'right';
}

export default function MobileCardField({ label, value, align = 'left' }: MobileCardFieldProps) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${align === 'right' ? 'text-right' : ''}`}>{value}</span>
    </div>
  );
}
