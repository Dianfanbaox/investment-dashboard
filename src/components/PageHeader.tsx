import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconSrc?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon, iconSrc, children }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF8E6E] to-[#FFB299] p-4 sm:p-5 lg:p-6">
      {/* 装饰圆点 */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between gap-3">
        {/* 左侧标题区 */}
        <div className="flex items-center gap-3 min-w-0">
          {(iconSrc || icon) && (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              {iconSrc ? (
                <img src={iconSrc} alt="" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              ) : (
                <i className={`fa-solid ${icon} text-white text-sm sm:text-base`}></i>
              )}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/70 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* 右侧按钮区 */}
        {children && (
          <div className="flex items-center gap-1.5 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
