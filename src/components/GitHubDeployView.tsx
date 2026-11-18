import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Github, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { GitHubWorkflowBundle, MonitorAppState, RiskControlConfig } from '../shared/types';

interface GitHubDeployViewProps {
  state: MonitorAppState;
  onSaveRiskConfig: (next: Partial<RiskControlConfig>) => Promise<void>;
  onSimulateRisk: () => Promise<void>;
  onResetRisk: () => Promise<void>;
}

export const GitHubDeployView: React.FC<GitHubDeployViewProps> = ({
  state,
  onSaveRiskConfig,
  onSimulateRisk,
  onResetRisk,
}) => {
  const [bundle, setBundle] = useState<GitHubWorkflowBundle | null>(null);
  const [activeFile, setActiveFile] = useState<'workflow' | 'script' | 'readme'>('workflow');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [baseIntervalSec, setBaseIntervalSec] = useState(state.riskConfig.baseIntervalSec);
  const [jitterSec, setJitterSec] = useState(state.riskConfig.jitterSec);
  const [interCinemaDelayMs, setInterCinemaDelayMs] = useState(state.riskConfig.interCinemaDelayMs);
  const [cooldownBaseMin, setCooldownBaseMin] = useState(state.riskConfig.cooldownBaseMin);
  const [maoyanCookie, setMaoyanCookie] = useState(state.riskConfig.maoyanCookie);
  const [savingRisk, setSavingRisk] = useState(false);
  const [riskNotice, setRiskNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github/export')
      .then((res) => res.json())
      .then((data: GitHubWorkflowBundle) => setBundle(data))
      .catch(() => {});
  }, [state.updatedAt]);

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRisk(true);
    setRiskNotice(null);
    try {
      await onSaveRiskConfig({
        baseIntervalSec,
        jitterSec,
        interCinemaDelayMs,
        cooldownBaseMin,
        maoyanCookie,
      });
      setRiskNotice('风控节流策略已更新，GitHub 部署脚本已同步刷新');
    } finally {
      setSavingRisk(false);
    }
  };

  const currentFileContent = !bundle
    ? '正在生成 GitHub 部署包...'
    : activeFile === 'workflow'
      ? bundle.workflowYaml
      : activeFile === 'script'
        ? bundle.monitorScriptJs
        : bundle.readmeMd;

  const currentFileName =
    activeFile === 'workflow'
      ? 'ticket-monitor.yml'
      : activeFile === 'script'
        ? 'monitor-dongguan.mjs'
        : 'README_GITHUB_HUAWEI.md';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentFileContent);
    setCopiedKey(activeFile);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const minSec = Math.max(30, baseIntervalSec - jitterSec);
  const maxSec = baseIntervalSec + jitterSec;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          GitHub Actions 部署与猫眼风控护栏
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          支持一键导出当前东莞三家影院与星标片单到 GitHub 仓库运行，内置随机抖动、UA 轮换与 403/滑块熔断退避
        </p>
      </div>

      {/* Risk Control Settings */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {state.riskState.circuitState === 'open' ? (
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            )}
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                猫眼风控策略与频率控制
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                当前实际探测窗口：每 <span className="font-mono tabular-nums font-semibold">{minSec}s ~ {maxSec}s</span> 一次
                <span aria-hidden="true"> · </span>
                累计风控拦截 <span className="font-mono tabular-nums">{state.riskState.totalBlocks}</span> 次
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSimulateRisk}
              className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
            >
              模拟风控拦截
            </button>
            <button
              type="button"
              onClick={onResetRisk}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              恢复探测
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveRisk} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="risk-interval" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              基础抓取周期（秒）
            </label>
            <input
              id="risk-interval"
              type="number"
              min={30}
              max={600}
              value={baseIntervalSec}
              onChange={(e) => setBaseIntervalSec(Number(e.target.value) || 60)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="risk-jitter" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              随机抖动范围（±秒）
            </label>
            <input
              id="risk-jitter"
              type="number"
              min={0}
              max={60}
              value={jitterSec}
              onChange={(e) => setJitterSec(Number(e.target.value) || 0)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="risk-cinema-delay" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              影院间串行间隔（毫秒）
            </label>
            <input
              id="risk-cinema-delay"
              type="number"
              min={1000}
              max={15000}
              step={200}
              value={interCinemaDelayMs}
              onChange={(e) => setInterCinemaDelayMs(Number(e.target.value) || 3000)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="risk-cooldown" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              风控熔断基础冷却（分钟）
            </label>
            <input
              id="risk-cooldown"
              type="number"
              min={5}
              max={120}
              value={cooldownBaseMin}
              onChange={(e) => setCooldownBaseMin(Number(e.target.value) || 15)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="maoyan-cookie" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              猫眼 H5 Cookie（可选 · 减少匿名访问触发滑块概率）
            </label>
            <input
              id="maoyan-cookie"
              type="password"
              value={maoyanCookie}
              onChange={(e) => setMaoyanCookie(e.target.value)}
              placeholder="仅保存在本地服务端内存/配置，导出 GitHub 时请写入 Secrets.MAOYAN_COOKIE"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingRisk}
              className="min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {savingRisk ? '应用中...' : '应用风控参数'}
            </button>
          </div>
        </form>

        {riskNotice && (
          <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {riskNotice}
          </p>
        )}
      </section>

      {/* Live Generated GitHub Repo Bundle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Github className="h-5 w-5 text-slate-900 dark:text-white" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                GitHub Actions 一键部署包（已注入当前影院与星标片单）
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                将以下 3 个文件提交到你的 GitHub 仓库，并在 Settings → Secrets 配置推送 Token 即可云端 24 小时盯票
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copiedKey === activeFile ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === activeFile ? '已复制' : '复制代码'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载文件</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'workflow', label: '.github/workflows/ticket-monitor.yml' },
              { id: 'script', label: 'scripts/monitor-dongguan.mjs' },
              { id: 'readme', label: 'README_GITHUB_HUAWEI.md' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFile(tab.id)}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                activeFile === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <pre className="mt-4 max-h-[460px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
          <code>{currentFileContent}</code>
        </pre>
      </section>
    </div>
  );
};
