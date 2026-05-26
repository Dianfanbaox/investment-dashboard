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
      className={`fixed left-0 top-0 h-full border-r border-black/5 transition-all duration-300 flex flex-col z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ background: '#FFF5D6' }}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-5 border-b border-black/5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF8E6E, #FFB299)' }}>
          <i className="fa-solid fa-chart-line text-white text-sm"></i>
        </div>
        {!isCollapsed && (
          <div className="ml-3">
            <span className="text-base font-bold text-[#2D2D2D]">投资助手</span>
            <p className="text-xs text-[#BBB]">智能财务管理</p>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1.5">
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

      {/* 底部小角色装饰 */}
      {!isCollapsed && (
        <div className="px-5 pb-4 flex justify-center">
          <div className="flex items-end gap-1 opacity-60">
            <div className="w-6 h-6 rounded-full" style={{ background: '#FFF9C4' }}>
              <div className="w-2 h-3 rounded-full absolute -top-1 left-0.5" style={{ background: '#FFF9C4' }} />
              <div className="w-2 h-3 rounded-full absolute -top-1 right-0.5" style={{ background: '#FFF9C4' }} />
            </div>
            <div className="w-7 h-7 rounded-full" style={{ background: '#FFFFFF', border: '1px solid #EEE' }} />
            <div className="w-6 h-6 rounded-full" style={{ background: '#FFFFFF', border: '1px solid #EEE' }} />
          </div>
        </div>
      )}
    </div>
  );
}
