import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: '仪表盘', icon: '/仪表盘图标_pixian_ai.png' },
  { path: '/trades', label: '交易记录', icon: '/交易记录图标_pixian_ai.png' },
  { path: '/stock-pool', label: '股票池', icon: '/股票池图标_pixian_ai.png' },
  { path: '/ai-analysis', label: 'AI分析', icon: '/AI分析图标_pixian_ai.png' },
  { path: '/settings', label: '设置', icon: '/设置图标_pixian_ai.png' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-black/5 backdrop-blur-xl"
      style={{ background: '#FFF5D6', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-1 transition-colors ${
                isActive ? 'text-[#FF8E6E]' : 'text-[#999]'
              }`
            }
          >
            <img src={item.icon} alt={item.label} className="w-6 h-6 object-contain" />
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
