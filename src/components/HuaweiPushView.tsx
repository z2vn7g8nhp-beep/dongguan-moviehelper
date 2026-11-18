import React, { useState } from 'react';
import { Bell, CheckCircle2, Send, ShieldAlert, Smartphone, Volume2 } from 'lucide-react';
import type { PushChannelConfig } from '../shared/types';
import { PWAInstallButton } from './PWAInstallButton';

interface HuaweiPushViewProps {
  config: PushChannelConfig;
  onSaveConfig: (next: PushChannelConfig) => Promise<void>;
  onSendTestPush: () => Promise<{ channel: string; ok: boolean; message: string }[]>;
}

export const HuaweiPushView: React.FC<HuaweiPushViewProps> = ({
  config,
  onSaveConfig,
  onSendTestPush,
}) => {
  const [draft, setDraft] = useState<PushChannelConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ channel: string; ok: boolean; message: string }[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handleRequestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') {
      setBrowserPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      new Notification('东莞IMAX开票雷达', {
        body: '浏览器与华为桌面应用通知已授权，前景开票将即时弹窗提醒。',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await onSaveConfig(draft);
      setSaveMessage('推送通道配置已保存，后续每一轮开票都将同步投递');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      await onSaveConfig(draft);
      const res = await onSendTestPush();
      setTestResults(res);
      if (
        draft.browserNotificationEnabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('东莞IMAX开票雷达 · 测试通知', {
          body: '华南MALL万达 IMAX GT / 东城万达 / 民盈国贸城 CGV 通道测试成功！',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            华为手机适配与多通道推送
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            解决 HarmonyOS / EMUI 息屏杀浏览器后台问题：推荐「华为浏览器 PWA 桌面安装 + PushPlus 微信/企业微信双通道」
          </p>
        </div>
        <PWAInstallButton />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Push Channel Configuration */}
        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              开票推送通道配置
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              填写任意 Token / Webhook 即自动生效
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-rose-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">浏览器系统弹窗</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    权限状态：{browserPermission === 'granted' ? '已授权' : browserPermission === 'denied' ? '已拒绝' : '未授权'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestBrowserPermission}
                className="min-h-[36px] rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                授权弹窗
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Volume2 className="h-4 w-4 text-rose-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">前景开票提示音</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Web Audio 清脆蜂鸣</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({ ...d, soundAlertEnabled: !d.soundAlertEnabled }))
                }
                aria-pressed={draft.soundAlertEnabled}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold ${
                  draft.soundAlertEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {draft.soundAlertEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pushplus-token" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                PushPlus Token（华为手机最稳方案 · 微信服务号直推，息屏必达）
              </label>
              <input
                id="pushplus-token"
                type="text"
                value={draft.pushPlusToken}
                onChange={(e) => setDraft((d) => ({ ...d, pushPlusToken: e.target.value }))}
                placeholder="输入 pushplus.plus 获取的 token"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wecom-webhook" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  企业微信机器人 Webhook
                </label>
                <input
                  id="wecom-webhook"
                  type="url"
                  value={draft.wecomWebhook}
                  onChange={(e) => setDraft((d) => ({ ...d, wecomWebhook: e.target.value }))}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="feishu-webhook" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  飞书机器人 Webhook
                </label>
                <input
                  id="feishu-webhook"
                  type="url"
                  value={draft.feishuWebhook}
                  onChange={(e) => setDraft((d) => ({ ...d, feishuWebhook: e.target.value }))}
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="serverchan-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Server酱 SendKey
                </label>
                <input
                  id="serverchan-key"
                  type="text"
                  value={draft.serverChanKey}
                  onChange={(e) => setDraft((d) => ({ ...d, serverChanKey: e.target.value }))}
                  placeholder="SCT..."
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="bark-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bark 推送地址 / 自定义 Webhook
                </label>
                <input
                  id="bark-url"
                  type="url"
                  value={draft.barkUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, barkUrl: e.target.value }))}
                  placeholder="https://api.day.app/你的Key"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {saveMessage && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {saveMessage}
            </p>
          )}

          {testResults && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950">
              <p className="font-semibold text-slate-900 dark:text-white">推送测试回执：</p>
              <ul className="mt-1.5 space-y-1">
                {testResults.map((r, i) => (
                  <li key={i} className={r.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {r.channel}：{r.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {saving ? '保存中...' : '保存通道配置'}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            >
              <Send className="h-3.5 w-3.5" />
              {testing ? '测试投递中...' : '发送测试提醒'}
            </button>
          </div>
        </form>

        {/* Right: HarmonyOS / Huawei Optimization Guide */}
        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-5 w-5 text-rose-600" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                华为 HarmonyOS / 华为浏览器适配清单
              </h2>
            </div>

            <ol className="mt-4 space-y-3.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-900 dark:text-white">1. PWA 安装到华为桌面：</strong>
                本应用已配置独立 Manifest 与 Service Worker（支持全屏 standalone 模式与底部手势安全区），在华为浏览器点击菜单「添加到桌面」即可像原生 App 一样启动。
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">2. 为什么强烈建议配置 PushPlus / 企业微信：</strong>
                华为鸿蒙与安卓系统会在锁屏数分钟后冻结网页标签页定时任务，无法依赖手机网页长驻后台；由服务器或 GitHub Actions 在云端每分钟抓取，再通过微信/华为 HMS 系统级推送通道触达手机，锁屏也能毫秒级响铃。
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">3. 若需华为浏览器前台常驻盯票：</strong>
                前往手机 <span className="font-mono text-slate-800 dark:text-slate-200">设置 → 应用和服务 → 应用启动管理</span>，关闭华为浏览器/接收App的“自动管理”，手动开启「允许自启动、允许后台活动」。
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                桌面端/手机端触控适配指标
              </h2>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              所有核心操作按钮（标星、手动停止、立即探测、切换标签）均采用 ≥ 44px 触控热区与底部拇指导航栏设计，并支持华为折叠屏/平板宽屏自动展开多列视图。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
