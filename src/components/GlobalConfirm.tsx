import { useState, useEffect } from 'react';
import AnimatedModal from '@/components/AnimatedModal';
import { CONFIRM_EVENT_NAME } from '@/lib/utils';

export default function GlobalConfirm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setMessage(detail.message);
      setOpen(true);
    };
    window.addEventListener('app:confirm-request', handler);
    return () => window.removeEventListener('app:confirm-request', handler);
  }, []);

  const respond = (result: boolean) => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT_NAME, { detail: { result } }));
  };

  return (
    <AnimatedModal isOpen={open} onClose={() => respond(false)} maxWidth="max-w-sm">
      <div className="text-center">
        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4">
          <img src="/clear-confirm-character.png" alt="" className="w-full h-full object-contain" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#1A1A2E] mb-1 sm:mb-2">确认删除？</h3>
        <p className="text-xs sm:text-sm text-[#6B7280] mb-4 sm:mb-6">{message}</p>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={() => respond(false)} className="flex-1 btn-secondary">取消</button>
          <button onClick={() => respond(true)} className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-2xl bg-[#FF3B30] text-white font-medium hover:bg-[#FF3B30]/90 transition-colors text-sm sm:text-base">确认删除</button>
        </div>
      </div>
    </AnimatedModal>
  );
}
