import React from 'react';
import { Bell, Github, LayoutDashboard, Radar, RefreshCw, Smartphone } from 'lucide-react';

export type NavTab = 'dashboard' | 'rounds' | 'huawei' | 'github';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onCheckNow: () => void;
  isChecking: boolean;
  unreadRoundsCount: number;
}

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: '监控看板', shortLabel: '看板', icon: LayoutDashboard },
  { id: 'rounds', label: '开票记录', shortLabel: '记录', icon: Bell },
  { id: 'huawei', label: '华为适配', shortLabel: '华为', icon: Smartphone },
  { id: 'github', label: 'GitHub部署', shortLabel: '部署', icon: Github },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onCheckNow,
  isChecking,
  unreadRoundsCount,
}) => {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B0F17]/95">
        <div className="mx-auto flex h-[54px] max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 md:h-16">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('dashboard');
            }}
            className="font-display flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 sm:text-lg dark:text-white"
          >
            <Radar className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span>东莞IMAX开票雷达</span>
          </a>

          {/* Zone 2: 4 Clean Single-Line Nav Links (Desktop) */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="主导航">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-600 ${
                    active
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.id === 'rounds' && unreadRoundsCount > 0 ? ` (${unreadRoundsCount})` : ''}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-rose-600 dark:bg-rose-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onCheckNow}
              disabled={isChecking}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? '探测中...' : '立即探测'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Thumb-Zone Bottom Tab Bar (56px height + 54px top = 110px <= 15% of 844px) */}
      <nav
        aria-label="移动端底部导航"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-14 grid-cols-4 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#0B0F17]/95"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>
                {item.shortLabel}
                {item.id === 'rounds' && unreadRoundsCount > 0 ? `(${unreadRoundsCount})` : ''}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
