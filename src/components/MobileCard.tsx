import type { ReactNode } from 'react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function MobileCard({ children, className = '', onClick }: MobileCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
