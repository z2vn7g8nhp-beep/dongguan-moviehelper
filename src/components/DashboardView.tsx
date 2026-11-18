import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Film,
  Moon,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
} from 'lucide-react';
import type { Cinema, MonitorAppState, MovieWatchItem, ProbeMode } from '../shared/types';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardViewProps {
  state: MonitorAppState;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeProbeMode: (mode: ProbeMode) => void;
  onToggleCinemaEnabled: (cinema: Cinema) => void;
  onUpdateCinemaMaoyanId: (cinemaId: string, maoyanCinemaId: string) => void;
  onAddMovie: (payload: { title: string; targetFormats: string[]; notes: string }) => Promise<void>;
  onToggleStar: (movie: MovieWatchItem) => void;
  onToggleManualStop: (movie: MovieWatchItem) => void;
  onDeleteMovie: (movieId: string) => void;
  onSimulateRound: (movieId: string) => Promise<void>;
  onResetRisk: () => void;
  busyMovieId: string | null;
}

const FORMAT_OPTIONS = ['IMAX GT', 'IMAX', 'ScreenX', '杜比', '全制式'];

function formatTimeShort(iso: string | null): string {
  if (!iso) return '尚未触发';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  isDark,
  onToggleTheme,
  onChangeProbeMode,
  onToggleCinemaEnabled,
  onUpdateCinemaMaoyanId,
  onAddMovie,
  onToggleStar,
  onToggleManualStop,
  onDeleteMovie,
  onSimulateRound,
  onResetRisk,
  busyMovieId,
}) => {
  const [countdownSec, setCountdownSec] = useState<number>(60);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['IMAX GT', 'IMAX']);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCinemaId, setEditingCinemaId] = useState<string | null>(null);
  const [editingMaoyanId, setEditingMaoyanId] = useState('');
  const [brokenPosters, setBrokenPosters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateCountdown = () => {
      if (!state.riskState.nextCheckAt) {
        setCountdownSec(state.riskConfig.baseIntervalSec);
        return;
      }
      const diff = Math.max(0, Math.round((Date.parse(state.riskState.nextCheckAt) - Date.now()) / 1000));
      setCountdownSec(diff);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [state.riskState.nextCheckAt, state.riskConfig.baseIntervalSec]);

  const activeStarredMovies = state.movies.filter((m) => m.isStarred && !m.manuallyStopped);
  const enabledCinemasCount = state.cinemas.filter((c) => c.enabled).length;
  const isCircuitOpen = state.riskState.circuitState === 'open';

  const handleToggleFormat = (fmt: string) => {
    if (fmt === '全制式') {
      setSelectedFormats(['全制式']);
      return;
    }
    const withoutAll = selectedFormats.filter((f) => f !== '全制式');
    if (withoutAll.includes(fmt)) {
      const next = withoutAll.filter((f) => f !== fmt);
      setSelectedFormats(next.length > 0 ? next : ['全制式']);
    } else {
      setSelectedFormats([...withoutAll, fmt]);
    }
  };

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('请输入需要盯票的电影名称');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await onAddMovie({
        title: newTitle.trim(),
        targetFormats: selectedFormats,
        notes: newNotes.trim(),
      });
      setNewTitle('');
      setNewNotes('');
      setSelectedFormats(['IMAX GT', 'IMAX']);
      setShowAddForm(false);
    } catch (err) {
      setFormError(String((err as Error)?.message || '添加失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            东莞三家核心影院实时盯票台
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            星标电影每一轮新增排片都将立即推送提醒，直到您手动点击停止
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {isCircuitOpen ? '风控熔断冷却中' : `${countdownSec}s 后下次探测`}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900"
            role="group"
            aria-label="探测数据源模式"
          >
            {(
              [
                { id: 'auto', label: '自动(直连/沙盒)' },
                { id: 'live_maoyan', label: '猫眼直连' },
                { id: 'sandbox', label: '沙盒演练' },
              ] as { id: ProbeMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeProbeMode(opt.id)}
                className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  state.riskConfig.probeMode === opt.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色影院模式'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Circuit Breaker Alert Banner (only shown when risk control tripped) */}
      {isCircuitOpen && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-800/80 dark:bg-amber-950/50"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                猫眼风控熔断保护已触发 · 已暂停自动抓取
              </h2>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                {state.riskState.lastBlockReason || '检测到滑块或频率受限响应，系统自动退避以避免封禁。'}
                {state.riskState.cooldownUntil &&
                  ` · 预计自动解除时间 ${formatTimeShort(state.riskState.cooldownUntil)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResetRisk}
            className="min-h-[40px] rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0"
          >
            手动恢复探测
          </button>
        </div>
      )}

      {/* 4-Column Metric Strip */}
      <section aria-label="核心运行指标" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">监控影院</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {enabledCinemasCount} / {state.cinemas.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">万江 · 东城 · 南城</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">持续盯票星标</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {activeStarredMovies.length} 部
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">每轮开票持续推送</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">累计捕获轮次</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {state.alertRounds.length} 轮
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            总探测 {state.riskState.totalChecks} 次
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">猫眼风控健康</p>
          <div className="mt-1.5 flex items-center gap-2">
            {isCircuitOpen ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span
              className={`text-xl font-bold ${
                isCircuitOpen
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isCircuitOpen ? '熔断保护' : '稳态安全'}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {state.riskConfig.baseIntervalSec}s ± {state.riskConfig.jitterSec}s 抖动
          </p>
        </div>
      </section>

      {/* Dongguan 3 Cinemas Grid */}
      <section aria-labelledby="cinemas-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 id="cinemas-heading" className="font-display text-lg font-bold text-slate-900 dark:text-white">
            东莞定向监控影院（3 家）
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            串行探测间隔 {(state.riskConfig.interCinemaDelayMs / 1000).toFixed(1)}s · 防止并发风控
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {state.cinemas.map((cinema) => {
            const isEditing = editingCinemaId === cinema.id;
            return (
              <article
                key={cinema.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {cinema.district} · {cinema.brand}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                        {cinema.shortName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleCinemaEnabled(cinema)}
                      aria-pressed={cinema.enabled}
                      className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        cinema.enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cinema.enabled ? '监控中' : '已暂停'}
                    </button>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">
                    核心影厅：{cinema.featuredFormats.join(' / ')}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3.5 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">猫眼 Cinema ID</span>
                    {isEditing ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editingMaoyanId.trim()) {
                            onUpdateCinemaMaoyanId(cinema.id, editingMaoyanId.trim());
                          }
                          setEditingCinemaId(null);
                        }}
                      >
                        <input
                          type="text"
                          value={editingMaoyanId}
                          onChange={(e) => setEditingMaoyanId(e.target.value)}
                          aria-label={`修改 ${cinema.shortName} 猫眼ID`}
                          className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="submit"
                          aria-label={`保存 ${cinema.shortName} 猫眼ID`}
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {cinema.maoyanCinemaId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCinemaId(cinema.id);
                            setEditingMaoyanId(cinema.maoyanCinemaId);
                          }}
                          aria-label={`编辑 ${cinema.shortName} 猫眼ID`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-1.5 truncate text-slate-500 dark:text-slate-400">
                    {cinema.lastStatusNote}
                    {cinema.lastCheckedAt && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">
                          {formatTimeShort(cinema.lastCheckedAt)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Starred Movies Watchlist */}
      <section aria-labelledby="watchlist-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="watchlist-heading" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              星标电影盯票列表
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              所有已标星且未手动停止的影片，只要三家影院任意放出新场次，每一轮都会连续提醒
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            添加盯票电影
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleCreateMovie}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="movie-title-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  电影名称（需与猫眼片名一致或包含关键字）
                </label>
                <input
                  id="movie-title-input"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：阿凡达3：火与灰"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="movie-notes-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  抢票备注（可选）
                </label>
                <input
                  id="movie-notes-input"
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="例如：锁定华南MALL IMAX GT 中间排"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                目标影厅制式（多选）
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((fmt) => {
                  const selected = selectedFormats.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleToggleFormat(fmt)}
                      aria-pressed={selected}
                      className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        selected
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError(null);
                }}
                className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[42px] rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {isSubmitting ? '保存中...' : '标星并开始每分钟盯票'}
              </button>
            </div>
          </form>
        )}

        {state.movies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <Film className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              当前没有关注影片
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              点击上方“添加盯票电影”并标星，即可开始监控东莞三家影院开票
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.movies.map((movie) => {
              const isActivelyWatching = movie.isStarred && !movie.manuallyStopped;
              const isBusy = busyMovieId === movie.id;
              return (
                <article
                  key={movie.id}
                  data-testid={`movie-card-${movie.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-18 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
                      {!brokenPosters[movie.id] && movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={`${movie.title} 海报`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenPosters((prev) => ({ ...prev, [movie.id]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-rose-950 p-2 text-center text-white">
                          <Film className="h-5 w-5 text-rose-400" />
                          <span className="mt-1 line-clamp-2 text-[10px] font-semibold">
                            {movie.title}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          {movie.title}
                        </h3>
                        <span
                          className={`text-xs font-semibold ${
                            isActivelyWatching
                              ? 'text-rose-600 dark:text-rose-400'
                              : movie.manuallyStopped
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isActivelyWatching
                            ? '· 持续监控中（每轮必报）'
                            : movie.manuallyStopped
                              ? '· 已手动停止盯票'
                              : '· 未星标'}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                        制式：{movie.targetFormats.join(' / ')}
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">
                          已提醒 {movie.alertRoundsCount} 轮
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>最近开票 {formatTimeShort(movie.lastAlertAt)}</span>
                      </p>

                      {movie.notes && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {movie.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Controls (44px+ touch targets for Huawei mobile) */}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onToggleStar(movie)}
                      aria-pressed={movie.isStarred}
                      aria-label={movie.isStarred ? `取消星标《${movie.title}》` : `星标《${movie.title}》`}
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        movie.isStarred
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${movie.isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
                      <span>{movie.isStarred ? '已星标' : '标星'}</span>
                    </button>

                    {movie.isStarred && (
                      <button
                        type="button"
                        onClick={() => onToggleManualStop(movie)}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          movie.manuallyStopped
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'border border-slate-300 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                        }`}
                      >
                        {movie.manuallyStopped ? (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>恢复盯票</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="h-3.5 w-3.5" />
                            <span>手动停止</span>
                          </>
                        )}
                      </button>
                    )}

                    {isActivelyWatching && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSimulateRound(movie.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 whitespace-nowrap dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isBusy ? '触发中...' : '模拟新一轮开票'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteMovie(movie.id)}
                      aria-label={`移除《${movie.title}》`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
