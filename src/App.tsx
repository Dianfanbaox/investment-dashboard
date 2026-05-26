import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AuthContext } from '@/contexts/authContext';
import DashboardLayout from "@/components/layout/DashboardLayout";
import Home from "@/pages/Home";
import TradeRecord from "@/pages/TradeRecords";
import StockPool from "@/pages/StockPool";
import TradingInsights from "@/pages/TradingInsights";
import DisciplineSystem from "@/pages/DisciplineSystem";
import AIAnalysis from "@/pages/AIAnalysis";
import ClearData from "@/pages/ClearData";
import Settings from "@/pages/Settings";
import { useTheme } from '@/hooks/useTheme';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 默认已登录状态
  const { theme, toggleTheme } = useTheme();

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, logout, darkMode: theme === 'dark', toggleTheme }}
    >
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
           <Route index element={<Home />} />
          <Route path="trades" element={<TradeRecord />} />
          <Route path="stock-pool" element={<StockPool />} />
          <Route path="insights" element={<TradingInsights />} />
          <Route path="discipline" element={<DisciplineSystem />} />
          <Route path="ai-analysis" element={<AIAnalysis />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/clear-data" element={<ClearData />} />
      </Routes>
    </AuthContext.Provider>
  );
}
