import { motion } from 'framer-motion';

export interface MotionTabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface MotionTabsProps {
  tabs: MotionTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId: string;
  className?: string;
}

export default function MotionTabs({ tabs, activeId, onChange, layoutId, className = '' }: MotionTabsProps) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 ${className}`}>
      {tabs.map(tab => {
        const isActive = activeId === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] ${
              isActive ? 'text-white shadow-lg' : 'bg-white/80 text-[#6B7280] hover:bg-black/5'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-gradient-to-r from-[#FF8E6E] to-[#FFB299]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && <i className={`fa-solid ${tab.icon}`}></i>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && <span>({tab.count})</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
