import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import GlobalConfirm from '@/components/GlobalConfirm';

export default function DashboardLayout() {
  const location = useLocation();
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

  const mainContentMargin = isSidebarCollapsed ? 'ml-0 lg:ml-20' : 'ml-0 lg:ml-64';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFF8E7' }}>
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:flex">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      </div>

      {/* 移动端侧边栏 */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          />
          <div
            className="fixed top-0 left-0 bottom-0 w-64 backdrop-blur-xl border-r border-black/5 transition-transform duration-300 translate-x-0"
            style={{ background: '#FFF5D6' }}
          >
            <Sidebar isCollapsed={false} toggleSidebar={toggleMobileMenu} />
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${mainContentMargin}`}>
        <Header toggleSidebar={toggleSidebar} toggleMobileMenu={toggleMobileMenu} isMobile={windowWidth < 1024} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6" style={{ background: '#FFF8E7' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <BottomNav />

      {/* 全局确认弹窗 */}
      <GlobalConfirm />
    </div>
  );
}