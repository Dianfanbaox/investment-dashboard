import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

// 图标映射
const iconMap: { [key: string]: string } = {
  '仪表盘': '/仪表盘图标_pixian_ai.png',
  '交易记录': '/交易记录图标_pixian_ai.png',
  '股票池': '/股票池图标_pixian_ai.png',
  '交易心得': '/交易心得图标_pixian_ai.png',
  '交易纪律': '/交易纪律图标_pixian_ai.png',
  'AI分析': '/AI分析图标_pixian_ai.png',
  '设置': '/设置图标_pixian_ai.png',
};

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const navItems = [
    { path: '/', label: '仪表盘' },
    { path: '/trades', label: '交易记录' },
    { path: '/stock-pool', label: '股票池' },
    { path: '/insights', label: '交易心得' },
    { path: '/discipline', label: '交易纪律' },
    { path: '/ai-analysis', label: 'AI分析' },
    { path: '/settings', label: '设置' },
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
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <img src="/ip-characters.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!isCollapsed && (
          <div className="ml-3">
            <span className="text-base font-bold text-[#2D2D2D]">投资助手</span>
            <p className="text-xs text-[#BBB]">智能财务管理</p>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <ul className="space-y-3">
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
                <img
                  src={iconMap[item.label]}
                  alt={item.label}
                  className={`${isCollapsed ? 'w-12 h-12' : 'w-12 h-12 mr-3'}`}
                  style={{ objectFit: 'contain' }}
                />
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部小角色装饰 */}
      {!isCollapsed && (
        <div className="px-5 pb-4 flex justify-center">
          <img src="/ip-characters.png" alt="" className="h-12 opacity-60" />
        </div>
      )}
    </div>
  );
}