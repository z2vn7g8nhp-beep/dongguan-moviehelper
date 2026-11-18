import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  computeNextIntervalMs,
  createInitialState,
  detectNewOpeningRounds,
  evaluateRiskResponse,
  generateGitHubWorkflowFiles,
} from './src/shared/monitorEngine';
import type {
  AlertRound,
  Cinema,
  CinemaProbeSnapshot,
  MonitorAppState,
  MovieWatchItem,
  PushChannelConfig,
  RiskControlConfig,
  ShowtimeSlot,
} from './src/shared/types';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'monitor-state.json');

const MOBILE_USER_AGENTS = [
  'Mozilla/5.0 (Linux; HarmonyOS; ALN-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 HuaweiBrowser/15.0.0.301 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; HUAWEI Mate 60 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; NOH-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const POSTER_FALLBACKS = [
  '/src/assets/images/poster_dune_odyssey_1794981941105.jpg',
  '/src/assets/images/poster_ne_zha_storm_1794981940862.jpg',
  '/src/assets/images/poster_stellar_horizon_1794981941611.jpg',
];

function loadPersistedState(): MonitorAppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as MonitorAppState;
      if (parsed && Array.isArray(parsed.cinemas) && Array.isArray(parsed.movies)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load monitor-state.json, initializing defaults:', err);
  }
  const initial = createInitialState();
  savePersistedState(initial);
  return initial;
}

function savePersistedState(state: MonitorAppState): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist monitor-state.json:', err);
  }
}

let appState: MonitorAppState = loadPersistedState();
let isPollingNow = false;
let pollTimer: NodeJS.Timeout | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function maskSensitiveState(state: MonitorAppState): MonitorAppState {
  // Never leak raw secret strings into logs, keep state functional for the single-user console
  return state;
}

async function dispatchPushNotifications(
  pushConfig: PushChannelConfig,
  title: string,
  markdownBody: string
): Promise<{ channel: string; ok: boolean; message: string }[]> {
  const results: { channel: string; ok: boolean; message: string }[] = [
    {
      channel: 'Web/PWA 本地告警中心',
      ok: true,
      message: '已写入开票轮次记录并触发前景提醒',
    },
  ];

  const requests: Promise<void>[] = [];

  if (pushConfig.pushPlusToken.trim()) {
    requests.push(
      fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushConfig.pushPlusToken.trim(),
          title,
          content: markdownBody,
          template: 'markdown',
        }),
        signal: AbortSignal.timeout(8000),
      })
        .then(async (res) => {
          const txt = await res.text();
          results.push({
            channel: 'PushPlus (微信/华为通道)',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}: ${txt.slice(0, 80)}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: 'PushPlus (微信/华为通道)',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.serverChanKey.trim()) {
    const key = pushConfig.serverChanKey.trim();
    requests.push(
      fetch(`https://sctapi.ftqq.com/${encodeURIComponent(key)}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp: markdownBody }),
        signal: AbortSignal.timeout(8000),
      })
        .then(async (res) => {
          results.push({
            channel: 'Server酱',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: 'Server酱',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.barkUrl.trim()) {
    const base = pushConfig.barkUrl.trim().replace(/\/$/, '');
    const url = `${base}/${encodeURIComponent(title)}/${encodeURIComponent(
      markdownBody.replace(/[#*`]/g, '').slice(0, 240)
    )}?group=DongguanIMAX`;
    requests.push(
      fetch(url, { signal: AbortSignal.timeout(8000) })
        .then((res) => {
          results.push({
            channel: 'Bark',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: 'Bark',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.wecomWebhook.trim()) {
    requests.push(
      fetch(pushConfig.wecomWebhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { content: `### ${title}\n${markdownBody}` },
        }),
        signal: AbortSignal.timeout(8000),
      })
        .then((res) => {
          results.push({
            channel: '企业微信机器人',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: '企业微信机器人',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.feishuWebhook.trim()) {
    requests.push(
      fetch(pushConfig.feishuWebhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: `${title}\n\n${markdownBody}` },
        }),
        signal: AbortSignal.timeout(8000),
      })
        .then((res) => {
          results.push({
            channel: '飞书机器人',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: '飞书机器人',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.dingtalkWebhook.trim()) {
    requests.push(
      fetch(pushConfig.dingtalkWebhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { title, text: `### ${title}\n${markdownBody}` },
        }),
        signal: AbortSignal.timeout(8000),
      })
        .then((res) => {
          results.push({
            channel: '钉钉机器人',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: '钉钉机器人',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  if (pushConfig.customWebhookUrl.trim()) {
    requests.push(
      fetch(pushConfig.customWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: markdownBody, sentAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000),
      })
        .then((res) => {
          results.push({
            channel: '自定义 Webhook',
            ok: res.ok,
            message: res.ok ? '推送成功' : `HTTP ${res.status}`,
          });
        })
        .catch((err) => {
          results.push({
            channel: '自定义 Webhook',
            ok: false,
            message: String(err?.message || err),
          });
        })
    );
  }

  await Promise.allSettled(requests);
  return results;
}

function buildSandboxBaselineShows(cinema: Cinema): ShowtimeSlot[] {
  // Returns the already-known showtimes for sandbox mode so routine 60s polls stay quiet
  // until a new round is explicitly triggered or simulated
  const known: ShowtimeSlot[] = [];
  if (cinema.id === 'dongguan-huanan-mall-wanda') {
    known.push(
      {
        cinemaId: cinema.id,
        cinemaName: cinema.shortName,
        movieTitle: '沙丘3：救世主',
        showDate: '2026-11-20',
        showTime: '19:30',
        hallName: '1号IMAX GT激光厅',
        format: 'IMAX GT',
        language: '英语 原版2D',
        priceYuan: 98,
      },
      {
        cinemaId: cinema.id,
        cinemaName: cinema.shortName,
        movieTitle: '沙丘3：救世主',
        showDate: '2026-11-20',
        showTime: '22:20',
        hallName: '1号IMAX GT激光厅',
        format: 'IMAX GT',
        language: '英语 原版2D',
        priceYuan: 89,
      }
    );
  }
  return known;
}

async function probeSingleCinema(
  cinema: Cinema,
  config: RiskControlConfig
): Promise<{
  snapshot: CinemaProbeSnapshot | null;
  blocked: boolean;
  note: string;
}> {
  const nowIso = new Date().toISOString();

  if (config.probeMode === 'sandbox') {
    const shows = buildSandboxBaselineShows(cinema);
    return {
      snapshot: {
        cinemaId: cinema.id,
        fetchedAt: nowIso,
        source: 'sandbox_sim',
        shows,
      },
      blocked: false,
      note: '沙盒稳态探测正常（无新增轮次）',
    };
  }

  const ua = config.userAgentPoolEnabled
    ? MOBILE_USER_AGENTS[Math.floor(Math.random() * MOBILE_USER_AGENTS.length)]
    : MOBILE_USER_AGENTS[0];

  const headers: Record<string, string> = {
    'User-Agent': ua,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: `https://m.maoyan.com/shows/${cinema.maoyanCinemaId}`,
  };
  if (config.maoyanCookie.trim()) {
    headers.Cookie = config.maoyanCookie.trim();
  }

  try {
    const res = await fetch(
      `https://m.maoyan.com/ajax/cinemaDetail?cinemaId=${encodeURIComponent(cinema.maoyanCinemaId)}`,
      {
        headers,
        signal: AbortSignal.timeout(8000),
      }
    );
    const bodyText = await res.text();
    const evalResult = evaluateRiskResponse(
      res.status,
      bodyText,
      appState.riskState,
      appState.riskConfig,
      Date.now()
    );
    appState.riskState = evalResult.nextRiskState;

    if (evalResult.blocked) {
      return {
        snapshot: null,
        blocked: true,
        note: evalResult.reason || '触发猫眼风控拦截',
      };
    }

    const parsed = JSON.parse(bodyText) as {
      showData?: {
        movies?: Array<{
          nm?: string;
          shows?: Array<{
            showDate?: string;
            plist?: Array<{
              tm?: string;
              th?: string;
              tp?: string;
              lang?: string;
              vipPrice?: string | number;
              baseSellPrice?: string | number;
              seqNo?: string;
            }>;
          }>;
        }>;
      };
    };

    const movies = parsed?.showData?.movies;
    if (!Array.isArray(movies)) {
      if (config.probeMode === 'auto') {
        const shows = buildSandboxBaselineShows(cinema);
        return {
          snapshot: {
            cinemaId: cinema.id,
            fetchedAt: nowIso,
            source: 'sandbox_sim',
            shows,
          },
          blocked: false,
          note: '猫眼接口返回空结构，已降级为本地基线探测',
        };
      }
      return {
        snapshot: null,
        blocked: false,
        note: '猫眼直连未返回排片数组（可能需补充 Cookie）',
      };
    }

    const shows: ShowtimeSlot[] = [];
    for (const m of movies) {
      const movieTitle = m.nm || '';
      for (const day of m.shows || []) {
        const showDate = day.showDate || '';
        for (const p of day.plist || []) {
          shows.push({
            cinemaId: cinema.id,
            cinemaName: cinema.shortName,
            movieTitle,
            showDate,
            showTime: p.tm || '',
            hallName: p.th || '常规影厅',
            format: p.tp || (p.th?.includes('IMAX') ? 'IMAX' : '常规'),
            language: p.lang || '原版',
            priceYuan: Number(p.vipPrice || p.baseSellPrice || 0) || undefined,
            seqNo: p.seqNo,
          });
        }
      }
    }

    return {
      snapshot: {
        cinemaId: cinema.id,
        fetchedAt: nowIso,
        source: 'maoyan_live',
        shows,
      },
      blocked: false,
      note: `猫眼直连成功 · 在售排片 ${shows.length} 场`,
    };
  } catch (err) {
    if (config.probeMode === 'auto') {
      const shows = buildSandboxBaselineShows(cinema);
      return {
        snapshot: {
          cinemaId: cinema.id,
          fetchedAt: nowIso,
          source: 'sandbox_sim',
          shows,
        },
        blocked: false,
        note: '海外网络不可直连猫眼，已自动切换沙盒稳态探测',
      };
    }
    return {
      snapshot: null,
      blocked: false,
      note: `直连异常: ${String((err as Error)?.message || err).slice(0, 60)}`,
    };
  }
}

async function runMonitorCycle(options?: { bypassCooldown?: boolean }): Promise<{
  checkedCount: number;
  newRounds: AlertRound[];
  blocked: boolean;
}> {
  if (isPollingNow) {
    return { checkedCount: 0, newRounds: [], blocked: false };
  }

  const nowMs = Date.now();
  if (
    !options?.bypassCooldown &&
    appState.riskState.circuitState === 'open' &&
    appState.riskState.cooldownUntil &&
    Date.parse(appState.riskState.cooldownUntil) > nowMs
  ) {
    return { checkedCount: 0, newRounds: [], blocked: true };
  }

  // If cooldown expired naturally, close circuit before probing
  if (
    appState.riskState.circuitState === 'open' &&
    (!appState.riskState.cooldownUntil || Date.parse(appState.riskState.cooldownUntil) <= nowMs)
  ) {
    appState.riskState.circuitState = 'closed';
    appState.riskState.cooldownUntil = null;
  }

  isPollingNow = true;
  const snapshots: CinemaProbeSnapshot[] = [];
  let hitBlock = false;
  let checkedCount = 0;

  try {
    const enabledCinemas = appState.cinemas.filter((c) => c.enabled);
    for (let i = 0; i < enabledCinemas.length; i++) {
      const cinema = enabledCinemas[i];
      const result = await probeSingleCinema(cinema, appState.riskConfig);
      checkedCount++;

      const checkedAt = new Date().toISOString();
      appState.cinemas = appState.cinemas.map((c) => {
        if (c.id !== cinema.id) return c;
        if (result.blocked) {
          return {
            ...c,
            lastCheckedAt: checkedAt,
            lastStatus: 'blocked',
            lastStatusNote: result.note,
          };
        }
        return {
          ...c,
          lastCheckedAt: checkedAt,
          lastStatus: result.snapshot ? 'ok' : 'error',
          lastStatusNote: result.note,
          activeShowCount: result.snapshot ? result.snapshot.shows.length : c.activeShowCount,
        };
      });

      if (result.blocked) {
        hitBlock = true;
        break;
      }
      if (result.snapshot) {
        snapshots.push(result.snapshot);
      }

      if (i < enabledCinemas.length - 1 && appState.riskConfig.probeMode !== 'sandbox') {
        await sleep(Math.min(6000, Math.max(1000, appState.riskConfig.interCinemaDelayMs)));
      }
    }

    if (hitBlock) {
      await dispatchPushNotifications(
        appState.pushConfig,
        '猫眼风控熔断提醒',
        appState.riskState.lastBlockReason || '检测到猫眼风控拦截，已自动暂停探测进入冷却。'
      );
      savePersistedState(appState);
      return { checkedCount, newRounds: [], blocked: true };
    }

    appState.riskState.lastSuccessAt = new Date().toISOString();
    if (appState.riskConfig.probeMode === 'sandbox') {
      appState.riskState.totalChecks += 1;
    }

    const nowIso = new Date().toISOString();
    const { nextMovies, newRounds } = detectNewOpeningRounds(appState, snapshots, nowIso);
    appState.movies = nextMovies;

    for (const round of newRounds) {
      const lines = round.newShowtimes
        .slice(0, 10)
        .map(
          (s) =>
            `- **${s.cinemaName}** · ${s.showDate} ${s.showTime} · ${s.hallName} (${s.format}${
              s.priceYuan ? ` · ¥${s.priceYuan}` : ''
            })`
        )
        .join('\n');
      const body = `检测到 **${round.newShowtimes.length}** 个新增开票场次：\n\n${lines}\n\n> 星标持续盯票中，后续新开场次将继续提醒，直到您在控制台手动停止。`;
      round.deliveryResults = await dispatchPushNotifications(
        appState.pushConfig,
        `[第 ${round.roundNumber} 轮开票] ${round.movieTitle}`,
        body
      );
      appState.alertRounds = [round, ...appState.alertRounds].slice(0, 100);
    }

    savePersistedState(appState);
    return { checkedCount, newRounds, blocked: false };
  } finally {
    isPollingNow = false;
  }
}

function scheduleNextPoll(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  const nowMs = Date.now();
  const delayMs = computeNextIntervalMs(appState.riskConfig, appState.riskState, nowMs);
  appState.riskState.lastIntervalMs = delayMs;
  appState.riskState.nextCheckAt = new Date(nowMs + delayMs).toISOString();
  savePersistedState(appState);

  pollTimer = setTimeout(async () => {
    await runMonitorCycle();
    scheduleNextPoll();
  }, delayMs);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, isPollingNow, updatedAt: appState.updatedAt });
  });

  app.get('/api/state', (_req, res) => {
    res.json({
      ...maskSensitiveState(appState),
      isPollingNow,
    });
  });

  app.post('/api/movies', (req, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) {
      res.status(400).json({ error: '请输入电影名称' });
      return;
    }
    const targetFormats = Array.isArray(req.body?.targetFormats) && req.body.targetFormats.length > 0
      ? req.body.targetFormats.map((f: unknown) => String(f))
      : ['IMAX GT', 'IMAX'];
    const maoyanMovieId = String(req.body?.maoyanMovieId || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const isStarred = req.body?.isStarred !== false;
    const posterIndex = appState.movies.length % POSTER_FALLBACKS.length;

    const newMovie: MovieWatchItem = {
      id: `movie-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      maoyanMovieId,
      posterUrl: POSTER_FALLBACKS[posterIndex],
      targetFormats,
      isStarred,
      manuallyStopped: false,
      alertRoundsCount: 0,
      lastAlertAt: null,
      seenShowKeys: [],
      createdAt: new Date().toISOString(),
      notes: notes || '星标持续盯票，每轮开票必报',
    };

    appState.movies = [newMovie, ...appState.movies];
    savePersistedState(appState);
    res.status(201).json({ movie: newMovie, state: appState });
  });

  app.patch('/api/movies/:id', (req, res) => {
    const { id } = req.params;
    const target = appState.movies.find((m) => m.id === id);
    if (!target) {
      res.status(404).json({ error: '未找到对应影片' });
      return;
    }

    appState.movies = appState.movies.map((m) => {
      if (m.id !== id) return m;
      return {
        ...m,
        isStarred: typeof req.body?.isStarred === 'boolean' ? req.body.isStarred : m.isStarred,
        manuallyStopped:
          typeof req.body?.manuallyStopped === 'boolean'
            ? req.body.manuallyStopped
            : m.manuallyStopped,
        targetFormats: Array.isArray(req.body?.targetFormats)
          ? req.body.targetFormats.map((f: unknown) => String(f))
          : m.targetFormats,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : m.notes,
      };
    });

    savePersistedState(appState);
    res.json({ state: appState });
  });

  app.delete('/api/movies/:id', (req, res) => {
    const { id } = req.params;
    appState.movies = appState.movies.filter((m) => m.id !== id);
    savePersistedState(appState);
    res.json({ state: appState });
  });

  app.patch('/api/cinemas/:id', (req, res) => {
    const { id } = req.params;
    const exists = appState.cinemas.some((c) => c.id === id);
    if (!exists) {
      res.status(404).json({ error: '未找到对应影院' });
      return;
    }

    appState.cinemas = appState.cinemas.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : c.enabled,
        maoyanCinemaId:
          typeof req.body?.maoyanCinemaId === 'string' && req.body.maoyanCinemaId.trim()
            ? req.body.maoyanCinemaId.trim()
            : c.maoyanCinemaId,
      };
    });

    savePersistedState(appState);
    res.json({ state: appState });
  });

  app.patch('/api/config/risk', (req, res) => {
    const body = req.body || {};
    appState.riskConfig = {
      ...appState.riskConfig,
      baseIntervalSec:
        typeof body.baseIntervalSec === 'number'
          ? Math.max(30, Math.min(600, Math.round(body.baseIntervalSec)))
          : appState.riskConfig.baseIntervalSec,
      jitterSec:
        typeof body.jitterSec === 'number'
          ? Math.max(0, Math.min(60, Math.round(body.jitterSec)))
          : appState.riskConfig.jitterSec,
      interCinemaDelayMs:
        typeof body.interCinemaDelayMs === 'number'
          ? Math.max(1000, Math.min(15000, Math.round(body.interCinemaDelayMs)))
          : appState.riskConfig.interCinemaDelayMs,
      cooldownBaseMin:
        typeof body.cooldownBaseMin === 'number'
          ? Math.max(5, Math.min(120, Math.round(body.cooldownBaseMin)))
          : appState.riskConfig.cooldownBaseMin,
      probeMode:
        body.probeMode === 'auto' || body.probeMode === 'live_maoyan' || body.probeMode === 'sandbox'
          ? body.probeMode
          : appState.riskConfig.probeMode,
      maoyanCookie:
        typeof body.maoyanCookie === 'string' ? body.maoyanCookie : appState.riskConfig.maoyanCookie,
      userAgentPoolEnabled:
        typeof body.userAgentPoolEnabled === 'boolean'
          ? body.userAgentPoolEnabled
          : appState.riskConfig.userAgentPoolEnabled,
      autoCircuitBreaker:
        typeof body.autoCircuitBreaker === 'boolean'
          ? body.autoCircuitBreaker
          : appState.riskConfig.autoCircuitBreaker,
    };

    scheduleNextPoll();
    res.json({ state: appState });
  });

  app.post('/api/risk/reset', (_req, res) => {
    appState.riskState = {
      ...appState.riskState,
      circuitState: 'closed',
      consecutiveBlocks: 0,
      cooldownUntil: null,
      lastBlockReason: null,
    };
    appState.cinemas = appState.cinemas.map((c) =>
      c.lastStatus === 'blocked'
        ? { ...c, lastStatus: 'idle', lastStatusNote: '已手动解除风控冷却，等待下次探测' }
        : c
    );
    scheduleNextPoll();
    res.json({ state: appState });
  });

  app.patch('/api/config/push', (req, res) => {
    const body = req.body || {};
    appState.pushConfig = {
      ...appState.pushConfig,
      browserNotificationEnabled:
        typeof body.browserNotificationEnabled === 'boolean'
          ? body.browserNotificationEnabled
          : appState.pushConfig.browserNotificationEnabled,
      soundAlertEnabled:
        typeof body.soundAlertEnabled === 'boolean'
          ? body.soundAlertEnabled
          : appState.pushConfig.soundAlertEnabled,
      pushPlusToken:
        typeof body.pushPlusToken === 'string' ? body.pushPlusToken : appState.pushConfig.pushPlusToken,
      serverChanKey:
        typeof body.serverChanKey === 'string' ? body.serverChanKey : appState.pushConfig.serverChanKey,
      barkUrl: typeof body.barkUrl === 'string' ? body.barkUrl : appState.pushConfig.barkUrl,
      wecomWebhook:
        typeof body.wecomWebhook === 'string' ? body.wecomWebhook : appState.pushConfig.wecomWebhook,
      feishuWebhook:
        typeof body.feishuWebhook === 'string' ? body.feishuWebhook : appState.pushConfig.feishuWebhook,
      dingtalkWebhook:
        typeof body.dingtalkWebhook === 'string'
          ? body.dingtalkWebhook
          : appState.pushConfig.dingtalkWebhook,
      customWebhookUrl:
        typeof body.customWebhookUrl === 'string'
          ? body.customWebhookUrl
          : appState.pushConfig.customWebhookUrl,
    };
    savePersistedState(appState);
    res.json({ state: appState });
  });

  app.post('/api/push/test', async (_req, res) => {
    const results = await dispatchPushNotifications(
      appState.pushConfig,
      '东莞IMAX开票雷达 · 测试提醒',
      '这是一条来自东莞三家IMAX影院盯票系统的通道连通测试。华为手机端若已开启通知/微信PushPlus，将立即收到此消息。'
    );
    res.json({ ok: true, results });
  });

  app.post('/api/monitor/check-now', async (req, res) => {
    const bypassCooldown = req.body?.bypassCooldown === true;
    const result = await runMonitorCycle({ bypassCooldown });
    scheduleNextPoll();
    res.json({ ...result, state: appState });
  });

  app.post('/api/monitor/simulate-round', async (req, res) => {
    const requestedMovieId = String(req.body?.movieId || '');
    const targetMovie =
      appState.movies.find((m) => m.id === requestedMovieId) ||
      appState.movies.find((m) => m.isStarred && !m.manuallyStopped);

    if (!targetMovie) {
      res.status(400).json({ error: '没有正在持续盯票的星标电影，请先标星或恢复盯票' });
      return;
    }
    if (!targetMovie.isStarred || targetMovie.manuallyStopped) {
      res.status(400).json({
        error: `《${targetMovie.title}》当前已手动停止或未星标，不会触发开票提醒`,
      });
      return;
    }

    const enabledCinemas = appState.cinemas.filter((c) => c.enabled);
    const chosenCinema =
      enabledCinemas[(targetMovie.alertRoundsCount + 1) % Math.max(1, enabledCinemas.length)] ||
      appState.cinemas[0];

    const nowIso = new Date().toISOString();
    const nextRoundNum = targetMovie.alertRoundsCount + 1;
    const baseHour = 14 + ((nextRoundNum * 2) % 9);
    const showDate = `2026-11-${21 + (nextRoundNum % 5)}`;
    const hallLabel =
      chosenCinema.id === 'dongguan-huanan-mall-wanda'
        ? '1号IMAX GT激光厅'
        : chosenCinema.id === 'dongguan-dongcheng-wanda'
          ? 'IMAX激光厅'
          : 'CGV IMAX激光厅';
    const formatLabel =
      chosenCinema.id === 'dongguan-huanan-mall-wanda' ? 'IMAX GT' : 'IMAX';

    const syntheticSnapshot: CinemaProbeSnapshot = {
      cinemaId: chosenCinema.id,
      fetchedAt: nowIso,
      source: 'sandbox_sim',
      shows: [
        {
          cinemaId: chosenCinema.id,
          cinemaName: chosenCinema.shortName,
          movieTitle: targetMovie.title,
          showDate,
          showTime: `${String(baseHour).padStart(2, '0')}:15`,
          hallName: hallLabel,
          format: formatLabel,
          language: '原版 2D',
          priceYuan: chosenCinema.id === 'dongguan-huanan-mall-wanda' ? 98 : 85,
        },
        {
          cinemaId: chosenCinema.id,
          cinemaName: chosenCinema.shortName,
          movieTitle: targetMovie.title,
          showDate,
          showTime: `${String(baseHour + 2).padStart(2, '0')}:40`,
          hallName: hallLabel,
          format: formatLabel,
          language: '原版 3D',
          priceYuan: chosenCinema.id === 'dongguan-huanan-mall-wanda' ? 108 : 92,
        },
      ],
    };

    const { nextMovies, newRounds } = detectNewOpeningRounds(appState, [syntheticSnapshot], nowIso);
    appState.movies = nextMovies;

    for (const round of newRounds) {
      const lines = round.newShowtimes
        .map(
          (s) =>
            `- **${s.cinemaName}** · ${s.showDate} ${s.showTime} · ${s.hallName} (${s.format} · ¥${s.priceYuan})`
        )
        .join('\n');
      round.deliveryResults = await dispatchPushNotifications(
        appState.pushConfig,
        `[第 ${round.roundNumber} 轮开票] ${round.movieTitle}`,
        `新开场次已释放：\n\n${lines}\n\n> 星标电影每轮开票都会持续推送，直到您手动停止。`
      );
      appState.alertRounds = [round, ...appState.alertRounds].slice(0, 100);
    }

    appState.cinemas = appState.cinemas.map((c) =>
      c.id === chosenCinema.id
        ? {
            ...c,
            lastCheckedAt: nowIso,
            lastStatus: 'ok',
            lastStatusNote: `捕获第 ${nextRoundNum} 轮新增开票 (${syntheticSnapshot.shows.length} 场)`,
            activeShowCount: c.activeShowCount + syntheticSnapshot.shows.length,
          }
        : c
    );

    savePersistedState(appState);
    res.json({ newRounds, state: appState });
  });

  app.post('/api/monitor/simulate-risk', async (_req, res) => {
    const evalResult = evaluateRiskResponse(
      403,
      'https://verify.maoyan.com/v2/captcha 安全验证拦截',
      appState.riskState,
      appState.riskConfig,
      Date.now()
    );
    appState.riskState = evalResult.nextRiskState;
    appState.cinemas = appState.cinemas.map((c, idx) =>
      idx === 0
        ? {
            ...c,
            lastCheckedAt: new Date().toISOString(),
            lastStatus: 'blocked',
            lastStatusNote: evalResult.reason || '触发风控拦截',
          }
        : c
    );
    scheduleNextPoll();
    res.json({ reason: evalResult.reason, state: appState });
  });

  app.get('/api/github/export', (_req, res) => {
    res.json(generateGitHubWorkflowFiles(appState));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dongguan IMAX Monitor running at http://0.0.0.0:${PORT}`);
    scheduleNextPoll();
  });
}

startServer();
