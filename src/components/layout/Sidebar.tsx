import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const navItems = [
    { path: '/', label: '仪表盘', icon: 'fa-chart-pie' },
    { path: '/trades', label: '交易记录', icon: 'fa-exchange-alt' },
    { path: '/stock-pool', label: '股票池', icon: 'fa-layer-group' },
    { path: '/insights', label: '交易心得', icon: 'fa-lightbulb' },
    { path: '/discipline', label: '交易纪律', icon: 'fa-shield-halved' },
    { path: '/ai-analysis', label: 'AI分析', icon: 'fa-robot' },
    { path: '/settings', label: '设置', icon: 'fa-gear' },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white/95 backdrop-blur-xl border-r border-black/5 transition-all duration-300 flex flex-col z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-5 border-b border-black/5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center shadow-lg">
          <i className="fa-solid fa-chart-line text-white text-sm"></i>
        </div>
        {!isCollapsed && (
          <div className="ml-3">
            <span className="text-base font-bold text-[#1A1A2E]">投资助手</span>
            <p className="text-xs text-[#9CA3AF]">智能财务管理</p>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={() => {
                  if (window.innerWidth < 768) {
                    toggleSidebar();
                  }
                }}
              >
                <i className={`fa-solid ${item.icon} ${isCollapsed ? 'text-lg' : 'mr-3 text-sm'}`}></i>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      </div>
  );
}