import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, Download, Github, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
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
  const [runnerType, setRunnerType] = useState<'ubuntu-latest' | 'self-hosted'>('ubuntu-latest');
  const [activeFile, setActiveFile] = useState<'workflow' | 'script' | 'watchlist' | 'readme'>('workflow');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [repoSlug, setRepoSlug] = useState('your-name/dongguan-moviehelper');

  const [baseIntervalSec, setBaseIntervalSec] = useState(state.riskConfig.baseIntervalSec);
  const [jitterSec, setJitterSec] = useState(state.riskConfig.jitterSec);
  const [interCinemaDelayMs, setInterCinemaDelayMs] = useState(state.riskConfig.interCinemaDelayMs);
  const [cooldownBaseMin, setCooldownBaseMin] = useState(state.riskConfig.cooldownBaseMin);
  const [maoyanCookie, setMaoyanCookie] = useState(state.riskConfig.maoyanCookie);
  const [savingRisk, setSavingRisk] = useState(false);
  const [riskNotice, setRiskNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/github/export?runner=${runnerType}`)
      .then((res) => res.json())
      .then((data: GitHubWorkflowBundle) => setBundle(data))
      .catch(() => {});
  }, [state.updatedAt, runnerType]);

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
      setRiskNotice('风控节流策略已更新，GitHub 部署文件已同步刷新');
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
        : activeFile === 'watchlist'
          ? bundle.watchlistJson
          : bundle.readmeMd;

  const currentFileName =
    activeFile === 'workflow'
      ? 'ticket-monitor.yml'
      : activeFile === 'script'
        ? 'monitor-dongguan.mjs'
        : activeFile === 'watchlist'
          ? 'watchlist.json'
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
          GitHub Actions 零配置部署与风控护栏
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          已直连核实东莞三家影院猫眼公开接口（免 Cookie / 免外部数据库），只需开启 GitHub Action 读写权限即可跑通
        </p>
      </div>

      {/* Zero-Secret GitHub Permission Guide */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/70 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-2">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              只需开启 1 个 GitHub Action 权限，即可免 Cookie 自动运行
            </h2>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <li>
                把本仓库代码推送到你的 GitHub 仓库（工作流 <span className="font-mono">.github/workflows/ticket-monitor.yml</span> 与监控脚本均已就绪）。
              </li>
              <li>
                打开 GitHub 仓库：
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  Settings → Actions → General → Workflow permissions
                </span>
                ，勾选 <strong className="text-emerald-800 dark:text-emerald-300">Read and write permissions</strong> 后点击 Save。
              </li>
              <li>
                每当星标电影在东莞三家影院放出新场次，GitHub Actions 会自动在你的仓库创建 <strong>Issue 提醒</strong>（手机登录 GitHub App 或邮件提醒即可收推送），并将已提醒轮次自动提交保存；无需任何 Cookie 或第三方 Token。
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* cron-job.org Anti-Delay Trigger Card */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/70 dark:bg-amber-950/25">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="w-full space-y-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                热门大片抢票必配：cron-job.org 准点触发（防止 GitHub 官方 cron 延迟 10~40 分钟）
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                GitHub 自带的 <span className="font-mono">schedule: &apos;*/5 * * * *&apos;</span> 经常受排队影响延迟 10~40 分钟甚至跳过触发。蹲《复联5》等热门 IMAX GT 场次时，用免费 <span className="font-mono font-semibold">cron-job.org</span> 每 5 分钟准点触发一次 <span className="font-mono">workflow_dispatch</span>（每次内部自动连跑 4 轮 ≈ 每分钟一探），工作流已内置 <span className="font-mono">concurrency</span> 排队保护不会冲突。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cron-repo-slug" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  输入你的 GitHub 仓库（用户名/仓库名）
                </label>
                <input
                  id="cron-repo-slug"
                  type="text"
                  value={repoSlug}
                  onChange={(e) => setRepoSlug(e.target.value.trim())}
                  placeholder="例如：username/dongguan-moviehelper"
                  className="mt-1.5 min-h-[40px] w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 dark:border-amber-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col justify-end text-xs text-slate-600 dark:text-slate-400">
                <p>触发频率：<strong className="text-slate-900 dark:text-white">每 5 分钟</strong> · 请求方法：<strong className="font-mono text-slate-900 dark:text-white">POST</strong></p>
                <p className="mt-0.5">需先在 GitHub 头像 → Settings → Developer settings 生成仅含 Actions(Read &amp; write) 权限的 Token</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-amber-200 bg-white/90 p-3.5 text-xs dark:border-amber-900/60 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">1. Request URL：</span>
                  <code className="break-all font-mono text-slate-900 dark:text-amber-200">
                    {`https://api.github.com/repos/${repoSlug || 'your-name/dongguan-moviehelper'}/actions/workflows/ticket-monitor.yml/dispatches`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `https://api.github.com/repos/${repoSlug || 'your-name/dongguan-moviehelper'}/actions/workflows/ticket-monitor.yml/dispatches`
                    );
                    setCopiedKey('cron-url');
                    setTimeout(() => setCopiedKey(null), 1800);
                  }}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {copiedKey === 'cron-url' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'cron-url' ? '已复制' : '复制 URL'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">2. Request Body：</span>
                  <code className="font-mono text-slate-900 dark:text-amber-200">
                    {`{"ref":"main","inputs":{"loop_rounds":"4"}}`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText('{"ref":"main","inputs":{"loop_rounds":"4"}}');
                    setCopiedKey('cron-body');
                    setTimeout(() => setCopiedKey(null), 1800);
                  }}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {copiedKey === 'cron-body' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'cron-body' ? '已复制' : '复制 Body'}</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-2 font-mono text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
                3. Headers 填 3 行：<span className="text-slate-900 dark:text-slate-200">Accept: application/vnd.github+json</span> ·{' '}
                <span className="text-slate-900 dark:text-slate-200">Content-Type: application/json</span> ·{' '}
                <span className="text-slate-900 dark:text-slate-200">Authorization: Bearer 你的GitHub_PAT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Generated GitHub Repo Bundle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Github className="h-5 w-5 text-slate-900 dark:text-white" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                GitHub 仓库部署文件（实时同步当前影院与星标片单）
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                已配置东莞真实猫眼影院 ID：华南MALL万达(1485) · 东城万达(10418) · 民盈国贸城CGV(26100)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
              role="group"
              aria-label="Runner 运行环境"
            >
              <button
                type="button"
                onClick={() => setRunnerType('ubuntu-latest')}
                className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold ${
                  runnerType === 'ubuntu-latest'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                GitHub 云端
              </button>
              <button
                type="button"
                onClick={() => setRunnerType('self-hosted')}
                className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold ${
                  runnerType === 'self-hosted'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                自托管主机
              </button>
            </div>

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
              { id: 'watchlist', label: 'config/watchlist.json' },
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

        <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
          <code>{currentFileContent}</code>
        </pre>
      </section>

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

        <form onSubmit={handleSaveRisk} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <details className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              进阶可选：附加猫眼 Cookie（通常留空即可直连，仅在极端高并发风控时备用）
            </summary>
            <div className="mt-3">
              <label htmlFor="maoyan-cookie" className="sr-only">
                猫眼 H5 Cookie
              </label>
              <input
                id="maoyan-cookie"
                type="password"
                value={maoyanCookie}
                onChange={(e) => setMaoyanCookie(e.target.value)}
                placeholder="可留空；如需填入，仅保存在本地配置"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </details>

          <div className="flex items-center justify-between gap-4">
            {riskNotice ? (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {riskNotice}
              </p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={savingRisk}
              className="min-h-[44px] rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {savingRisk ? '应用中...' : '应用风控参数'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
