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

      {/* 右侧头像 */}
      <div className="flex items-center gap-3">
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
