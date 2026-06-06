import { Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Home from "@/pages/Home";
import TradeRecord from "@/pages/TradeRecords";
import StockPool from "@/pages/StockPool";
import TradingInsights from "@/pages/TradingInsights";
import DisciplineSystem from "@/pages/DisciplineSystem";
import AIAnalysis from "@/pages/AIAnalysis";
import Settings from "@/pages/Settings";

export default function App() {
  return (
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
    </Routes>
  );
}
