import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { TradingInsight } from '@/types';
import { toast } from 'sonner';

export default function TradingInsights() {
  const [insights, setInsights] = useState<TradingInsight[]>(() => {
    const saved = localStorage.getItem('tradingInsights');
    return saved ? JSON.parse(saved, (k, v) => k === 'timestamp' ? new Date(v) : v) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });

  useEffect(() => {
    localStorage.setItem('tradingInsights', JSON.stringify(insights));
  }, [insights]);

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchQuery.toLowerCase()) || insight.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag ? insight.tags.includes(activeTag) : true;
    return matchesSearch && matchesTag;
  });

  const handleSaveInsight = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    const newInsight: TradingInsight = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      timestamp: new Date(),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      relatedTradeIds: [],
      attachments: [],
    };
    setInsights([newInsight, ...insights]);
    setShowAddModal(false);
    setFormData({ title: '', content: '', tags: '' });
    toast.success('心得已保存');
  };

  const tagCloud = useMemo(() => {
    const tagCounts: { [key: string]: number } = {};
    insights.forEach(insight => {
      insight.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const colors = ['#FF8E6E', '#5E5CE6', '#34C759', '#5856D6', '#FF3B30'];
    return Object.entries(tagCounts)
      .map(([name, count], index) => ({ name, count, color: colors[index % colors.length] }))
      .sort((a, b) => b.count - a.count);
  }, [insights]);

  const handleDeleteInsight = (id: string) => {
    setInsights(insights.filter(i => i.id !== id));
    toast.success('心得已删除');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">交易心得</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">记录和回顾您的投资思考</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-plus"></i>
          <span>写心得</span>
        </button>
      </div>

      {/* 搜索和标签 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"></i>
            <input type="text" placeholder="搜索心得..." className="input-soft w-full pl-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTag('')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTag === '' ? 'bg-gradient-to-r from-[#FF8E6E] to-[#FFB299] text-white' : 'bg-white/80 text-[#6B7280] hover:bg-black/5'}`}>
            全部
          </button>
          {tagCloud.slice(0, 4).map(tag => (
            <button key={tag.name} onClick={() => setActiveTag(tag.name)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTag === tag.name ? 'text-white' : 'bg-white/80 text-[#6B7280] hover:bg-black/5'}`} style={activeTag === tag.name ? { background: `linear-gradient(135deg, ${tag.color}, ${tag.color}aa)` } : {}}>
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* 心得列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInsights.length === 0 ? (
          <div className="col-span-full soft-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F8F9FC] flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-lightbulb text-2xl text-[#9CA3AF]"></i>
            </div>
            <p className="text-sm text-[#9CA3AF] mb-4">还没有心得记录</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">写第一篇心得</button>
          </div>
        ) : (
          filteredInsights.map((insight, index) => (
            <div key={insight.id} className="soft-card p-5 hover:shadow-lg transition-all card-enter">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] flex items-center justify-center text-white font-bold">
                    {insight.title.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1A2E]">{insight.title}</h3>
                    <p className="text-xs text-[#9CA3AF]">{format(new Date(insight.timestamp), 'yyyy-MM-dd')}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteInsight(insight.id)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                  <i className="fa-solid fa-trash text-[#FF3B30] text-sm"></i>
                </button>
              </div>
              <p className="text-sm text-[#6B7280] line-clamp-3 mb-4">{insight.content}</p>
              <div className="flex gap-2 flex-wrap">
                {insight.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-[#F8F9FC] rounded-full text-xs text-[#6B7280]">{tag}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加心得弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="soft-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">写心得</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <i className="fa-solid fa-times text-[#9CA3AF]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">标题</label>
                <input type="text" className="input-soft w-full" placeholder="心得标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">内容</label>
                <textarea className="input-soft w-full h-32 resize-none" placeholder="分享您的投资思考..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}></textarea>
              </div>
              <div>
                <label className="text-sm text-[#6B7280] mb-1 block">标签</label>
                <input type="text" className="input-soft w-full" placeholder="用逗号分隔，如：交易反思,止损" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
              </div>
              <button onClick={handleSaveInsight} className="w-full btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}