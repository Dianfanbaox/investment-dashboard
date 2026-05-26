import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024 && isSidebarCollapsed) {
        setIsSidebarCollapsed(false);
      }
      if (window.innerWidth < 1024 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const mainContentMargin = isSidebarCollapsed ? 'ml-20' : 'ml-64';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFF8E7' }}>
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:flex">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      </div>

      {/* 移动端侧边栏 */}
      <div className="lg:hidden fixed inset-0 z-50">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          />
        )}
        <div
          className={`fixed top-0 left-0 bottom-0 w-64 backdrop-blur-xl border-r border-black/5 transition-transform duration-300 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ background: '#FFF5D6' }}
        >
          <Sidebar isCollapsed={false} toggleSidebar={toggleMobileMenu} />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${mainContentMargin}`}>
        <Header toggleSidebar={toggleSidebar} toggleMobileMenu={toggleMobileMenu} isMobile={windowWidth < 768} />

        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#FFF8E7' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}