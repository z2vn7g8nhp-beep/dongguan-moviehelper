import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { GitHubDeployView } from './components/GitHubDeployView';
import { HuaweiPushView } from './components/HuaweiPushView';
import { OfflineIndicator } from './components/PWAInstallButton';
import { RoundsLogView } from './components/RoundsLogView';
import { type NavTab, TopBar } from './components/TopBar';
import { createInitialState } from './shared/monitorEngine';
import type {
  AlertRound,
  Cinema,
  MonitorAppState,
  MovieWatchItem,
  ProbeMode,
  PushChannelConfig,
  RiskControlConfig,
} from './shared/types';

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.08, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.26);
    });
  } catch {
    // Ignore autoplay restrictions
  }
}

export default function App() {
  const [state, setState] = useState<MonitorAppState>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isChecking, setIsChecking] = useState(false);
  const [busyMovieId, setBusyMovieId] = useState<string | null>(null);
  const [liveAlertBanner, setLiveAlertBanner] = useState<AlertRound | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dg-imax-theme') === 'dark';
  });

  const knownRoundIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('dg-imax-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('dg-imax-theme', 'light');
    }
  }, [isDark]);

  const notifyNewRound = useCallback(
    (round: AlertRound, currentState: MonitorAppState) => {
      setLiveAlertBanner(round);
      if (currentState.pushConfig.soundAlertEnabled) {
        playAlertChime();
      }
      if (
        currentState.pushConfig.browserNotificationEnabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(`第 ${round.roundNumber} 轮开票 · ${round.movieTitle}`, {
          body: `${round.cinemaNames.join(' / ')} 新增 ${round.newShowtimes.length} 场开票（持续盯票中）`,
        });
      }
    },
    []
  );

  const syncStateFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as MonitorAppState;

      if (!initialLoadedRef.current) {
        next.alertRounds.forEach((r) => knownRoundIdsRef.current.add(r.id));
        initialLoadedRef.current = true;
      } else {
        const unseen = next.alertRounds.filter((r) => !knownRoundIdsRef.current.has(r.id));
        unseen.forEach((r) => knownRoundIdsRef.current.add(r.id));
        if (unseen.length > 0) {
          notifyNewRound(unseen[0], next);
        }
      }

      setState(next);
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(`同步服务端监控状态失败：${String((err as Error)?.message || err)}`);
    } finally {
      setLoading(false);
    }
  }, [notifyNewRound]);

  useEffect(() => {
    syncStateFromServer();
    const timer = setInterval(syncStateFromServer, 10_000);
    return () => clearInterval(timer);
  }, [syncStateFromServer]);

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/monitor/check-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassCooldown: false }),
      });
      const data = await res.json();
      if (data.state) {
        const next = data.state as MonitorAppState;
        const unseen = next.alertRounds.filter((r) => !knownRoundIdsRef.current.has(r.id));
        unseen.forEach((r) => knownRoundIdsRef.current.add(r.id));
        if (unseen.length > 0) notifyNewRound(unseen[0], next);
        setState(next);
      }
    } catch (err) {
      setErrorBanner(`立即探测失败：${String((err as Error)?.message || err)}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleChangeProbeMode = async (probeMode: ProbeMode) => {
    const res = await fetch('/api/config/risk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probeMode }),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleToggleCinemaEnabled = async (cinema: Cinema) => {
    const res = await fetch(`/api/cinemas/${encodeURIComponent(cinema.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !cinema.enabled }),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleUpdateCinemaMaoyanId = async (cinemaId: string, maoyanCinemaId: string) => {
    const res = await fetch(`/api/cinemas/${encodeURIComponent(cinemaId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maoyanCinemaId }),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleAddMovie = async (payload: { title: string; targetFormats: string[]; notes: string }) => {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, isStarred: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '添加影片失败');
    }
    if (data.state) setState(data.state);
  };

  const handleToggleStar = async (movie: MovieWatchItem) => {
    const res = await fetch(`/api/movies/${encodeURIComponent(movie.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isStarred: !movie.isStarred,
        manuallyStopped: movie.isStarred ? movie.manuallyStopped : false,
      }),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleToggleManualStop = async (movie: MovieWatchItem) => {
    const res = await fetch(`/api/movies/${encodeURIComponent(movie.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manuallyStopped: !movie.manuallyStopped }),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleDeleteMovie = async (movieId: string) => {
    const res = await fetch(`/api/movies/${encodeURIComponent(movieId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleSimulateRound = async (movieId: string) => {
    setBusyMovieId(movieId);
    try {
      const res = await fetch('/api/monitor/simulate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || '模拟开票失败');
        return;
      }
      if (data.state) {
        const next = data.state as MonitorAppState;
        const unseen = next.alertRounds.filter((r) => !knownRoundIdsRef.current.has(r.id));
        unseen.forEach((r) => knownRoundIdsRef.current.add(r.id));
        if (unseen.length > 0) notifyNewRound(unseen[0], next);
        setState(next);
      }
    } finally {
      setBusyMovieId(null);
    }
  };

  const handleSaveRiskConfig = async (next: Partial<RiskControlConfig>) => {
    const res = await fetch('/api/config/risk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleSimulateRisk = async () => {
    const res = await fetch('/api/monitor/simulate-risk', { method: 'POST' });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleResetRisk = async () => {
    const res = await fetch('/api/risk/reset', { method: 'POST' });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleSavePushConfig = async (next: PushChannelConfig) => {
    const res = await fetch('/api/config/push', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (data.state) setState(data.state);
  };

  const handleSendTestPush = async () => {
    const res = await fetch('/api/push/test', { method: 'POST' });
    const data = await res.json();
    return data.results || [];
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-12 dark:bg-[#0B0F17] dark:text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCheckNow={handleCheckNow}
        isChecking={isChecking}
        unreadRoundsCount={state.alertRounds.length}
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-8">
        {errorBanner && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
          >
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="关闭错误提示"
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-rose-100 dark:hover:bg-rose-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {liveAlertBanner && (
          <div
            role="status"
            className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 sm:flex-row sm:items-center dark:border-rose-800 dark:bg-rose-950/50"
          >
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-sm font-bold text-rose-950 dark:text-rose-100">
                  第 {liveAlertBanner.roundNumber} 轮开票提醒 · 《{liveAlertBanner.movieTitle}》
                </p>
                <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
                  {liveAlertBanner.cinemaNames.join(' / ')} 新开 {liveAlertBanner.newShowtimes.length} 个场次 · 仍持续盯票中（直到手动停止）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('rounds');
                  setLiveAlertBanner(null);
                }}
                className="min-h-[38px] rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                查看场次详情
              </button>
              <button
                type="button"
                onClick={() => setLiveAlertBanner(null)}
                aria-label="关闭开票弹窗"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            state={state}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onChangeProbeMode={handleChangeProbeMode}
            onToggleCinemaEnabled={handleToggleCinemaEnabled}
            onUpdateCinemaMaoyanId={handleUpdateCinemaMaoyanId}
            onAddMovie={handleAddMovie}
            onToggleStar={handleToggleStar}
            onToggleManualStop={handleToggleManualStop}
            onDeleteMovie={handleDeleteMovie}
            onSimulateRound={handleSimulateRound}
            onResetRisk={handleResetRisk}
            busyMovieId={busyMovieId}
          />
        ) : activeTab === 'rounds' ? (
          <RoundsLogView state={state} />
        ) : activeTab === 'huawei' ? (
          <HuaweiPushView
            config={state.pushConfig}
            onSaveConfig={handleSavePushConfig}
            onSendTestPush={handleSendTestPush}
          />
        ) : (
          <GitHubDeployView
            state={state}
            onSaveRiskConfig={handleSaveRiskConfig}
            onSimulateRisk={handleSimulateRisk}
            onResetRisk={handleResetRisk}
          />
        )}
      </main>

      <OfflineIndicator />
    </div>
  );
}
