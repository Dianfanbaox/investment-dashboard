interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  isMobile: boolean;
}

export default function Header({ toggleSidebar, toggleMobileMenu, isMobile }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-xl border-b border-black/5">
      {/* 左侧菜单按钮 */}
      <button
        onClick={isMobile ? toggleMobileMenu : toggleSidebar}
        className="p-2.5 rounded-full hover:bg-black/5 transition-colors"
        aria-label="主菜单"
      >
        <i className="fa-solid fa-bars text-[#888]"></i>
      </button>

      {/* 中间标题 */}
      <h1 className="text-lg font-bold text-[#2D2D2D]">投资看板</h1>

      {/* 右侧操作 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="hidden md:flex items-center bg-[#F5F5F5] rounded-full px-4 py-2">
          <i className="fa-solid fa-search text-[#BBB] text-sm mr-2"></i>
          <input
            type="text"
            placeholder="搜索内容..."
            className="bg-transparent text-sm outline-none w-36 placeholder:text-[#BBB]"
          />
        </div>

        {/* 通知 */}
        <button className="relative p-2.5 rounded-full hover:bg-black/5 transition-colors">
          <i className="fa-solid fa-bell text-[#888]"></i>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF8E6E] rounded-full"></span>
        </button>

        {/* 头像 */}
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm">
          <img
            src="/avatar.jpg"
            alt="用户头像"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
