import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isHuawei, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <Download className="h-4 w-4 text-rose-600" />
        安装桌面应用
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Smartphone className="h-4 w-4 text-rose-600" />
        {isHuawei ? '添加到华为桌面' : isIOS ? '添加到iPhone桌面' : '手机桌面安装指南'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-guide-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  手机桌面安装与华为适配说明
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  支持华为浏览器 / HarmonyOS / Android Chrome / iOS Safari
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="关闭安装指南"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">华为手机 / 华为浏览器</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  <li>点击华为浏览器底部菜单栏右侧「≡ / 更多」或「分享」图标。</li>
                  <li>选择「添加到桌面」，生成“莞影雷达”独立全屏快捷应用。</li>
                  <li>建议同时在“华为适配”标签页绑定 PushPlus 微信通知，息屏零漏报。</li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">iPhone / iPad Safari</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  点击底部「分享」按钮，向下滑动并选择「添加到主屏幕」。
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm md:bottom-4 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>当前处于离线状态 · 展示本地缓存数据，GitHub 云端后台仍可独立推送</span>
    </div>
  );
};
