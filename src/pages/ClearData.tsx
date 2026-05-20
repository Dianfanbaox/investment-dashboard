import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ClearData() {
  const [isClearing, setIsClearing] = useState(false);
  const navigate = useNavigate();
  
  // 清除所有数据的函数
  const clearAllData = () => {
    // 显示确认对话框
    if (window.confirm('警告：此操作将清除系统中所有数据，包括交易记录、股票池、心得等，且无法恢复。确定要继续吗？')) {
      setIsClearing(true);
      
      try {
        // 列出所有需要清除的localStorage键
        const keysToClear = [
          'trades',
          'stockPools',
          'tradingInsights',
          'disciplineRules',
          'userProfile',
          'ai_api_key'
          // 注意：保留theme设置，避免用户需要重新设置主题偏好
        ];
        
        // 清除每个键
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // 显示成功提示
        toast.success('所有数据已成功清除');
        
        // 延迟后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        // 显示错误提示
        toast.error('清除数据时出现错误，请重试');
        setIsClearing(false);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">清除系统数据</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">重置系统中的所有预设数据</p>
        </div>
        
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fa-solid fa-exclamation-triangle text-red-500 dark:text-red-400 text-xl"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300">重要提示</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>此操作将清除以下所有数据：</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>所有交易记录</li>
                    <li>所有股票池配置</li>
                    <li>所有交易心得</li>
                    <li>所有交易纪律规则</li>
                    <li>用户资料设置</li>
                    <li>AI API密钥配置</li>
                  </ul>
                  <p className="mt-2">数据删除后将无法恢复，请谨慎操作！</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={clearAllData}
              disabled={isClearing}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow flex items-center justify-center transition-colors duration-200 flex-1"
            >
              {isClearing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  正在清除...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-trash-alt mr-2"></i>
                  清除所有数据
                </>
              )}
            </button>
            
            <button
              onClick={() => navigate('/')}
              disabled={isClearing}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            >
              取消
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>如果您只想删除特定类型的数据，请前往相应功能页面进行操作。</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>清除数据后，系统将恢复到初始状态，您可以重新添加您的交易数据。</p>
      </div>
    </div>
  );
}