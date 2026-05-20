import { useState } from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  isMobile: boolean;
}

export default function Header({ toggleSidebar, toggleMobileMenu, isMobile }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-sm">
      {/* 左侧菜单按钮 */}
      <button
        onClick={isMobile ? toggleMobileMenu : toggleSidebar}
        className="p-2.5 rounded-2xl hover:bg-black/5 transition-colors"
        aria-label="主菜单"
      >
        <i className="fa-solid fa-bars text-[#6B7280]"></i>
      </button>

      {/* 中间标题 */}
      <h1 className="text-lg font-bold text-[#1A1A2E]">投资看板</h1>

      {/* 右侧操作 */}
      <div className="flex items-center gap-4">
        {/* 搜索框 */}
        <div className="hidden md:flex items-center bg-black/5 rounded-2xl px-4 py-2.5">
          <i className="fa-solid fa-search text-[#9CA3AF] text-sm mr-2"></i>
          <input
            type="text"
            placeholder="搜索..."
            className="bg-transparent text-sm outline-none w-40 placeholder:text-[#9CA3AF]"
          />
        </div>

        {/* 通知 */}
        <button className="relative p-2.5 rounded-2xl hover:bg-black/5 transition-colors">
          <i className="fa-solid fa-bell text-[#6B7280]"></i>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF8E6E] rounded-full"></span>
        </button>

        {/* 头像 */}
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
          <img
            src="https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=User%20avatar%2C%20professional%20investor%2C%20portrait%2C%20simple%20style&sign=c30d19f3a99524cee2627efedcc7c0a6"
            alt="用户头像"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}