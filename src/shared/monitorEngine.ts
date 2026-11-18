import type {
  AlertRound,
  Cinema,
  CinemaProbeSnapshot,
  GitHubWorkflowBundle,
  MonitorAppState,
  MovieWatchItem,
  RiskControlConfig,
  RiskControlState,
  ShowtimeSlot,
} from './types';

export const DEFAULT_CINEMAS: Cinema[] = [
  {
    id: 'dongguan-huanan-mall-wanda',
    name: '万达影城（华南MALL IMAX GT店）',
    shortName: '华南MALL万达 IMAX GT',
    district: '东莞万江 · 华南MALL',
    brand: '万达影城',
    featuredFormats: ['IMAX GT 激光', '4DX', 'VIP厅'],
    maoyanCinemaId: '15648',
    enabled: true,
    lastCheckedAt: null,
    lastStatus: 'idle',
    lastStatusNote: '等待首轮探测',
    activeShowCount: 0,
  },
  {
    id: 'dongguan-dongcheng-wanda',
    name: '万达影城（东城万达广场IMAX店）',
    shortName: '东城万达 IMAX',
    district: '东莞东城 · 东城万达广场',
    brand: '万达影城',
    featuredFormats: ['IMAX 激光', '杜比全景声', 'Prime'],
    maoyanCinemaId: '11092',
    enabled: true,
    lastCheckedAt: null,
    lastStatus: 'idle',
    lastStatusNote: '等待首轮探测',
    activeShowCount: 0,
  },
  {
    id: 'dongguan-minying-guomao-cgv',
    name: 'CGV影城（民盈·国贸城IMAX激光店）',
    shortName: '民盈国贸城 CGV',
    district: '东莞南城 · 民盈国贸城',
    brand: 'CGV影城',
    featuredFormats: ['IMAX 激光', 'ScreenX', 'GOLD CLASS'],
    maoyanCinemaId: '26341',
    enabled: true,
    lastCheckedAt: null,
    lastStatus: 'idle',
    lastStatusNote: '等待首轮探测',
    activeShowCount: 0,
  },
];

export const DEFAULT_MOVIES: MovieWatchItem[] = [
  {
    id: 'movie-dune-3',
    title: '沙丘3：救世主',
    maoyanMovieId: '1498201',
    posterUrl: '/src/assets/images/poster_dune_odyssey_1794981941105.jpg',
    targetFormats: ['IMAX GT', 'IMAX'],
    isStarred: true,
    manuallyStopped: false,
    alertRoundsCount: 1,
    lastAlertAt: '2026-11-17T21:15:00.000Z',
    seenShowKeys: [
      'dongguan-huanan-mall-wanda|2026-11-20|19:30|1号IMAX GT激光厅|IMAX GT',
      'dongguan-huanan-mall-wanda|2026-11-20|22:20|1号IMAX GT激光厅|IMAX GT',
    ],
    createdAt: '2026-11-17T18:00:00.000Z',
    notes: '优先锁定华南MALL IMAX GT 1.43:1画幅黄金场',
  },
  {
    id: 'movie-nezha-storm',
    title: '哪吒之沧海龙吟',
    maoyanMovieId: '1504118',
    posterUrl: '/src/assets/images/poster_ne_zha_storm_1794981940862.jpg',
    targetFormats: ['全制式'],
    isStarred: true,
    manuallyStopped: false,
    alertRoundsCount: 0,
    lastAlertAt: null,
    seenShowKeys: [],
    createdAt: '2026-11-17T19:30:00.000Z',
    notes: '三家影院任意首开即报，二轮加场持续盯',
  },
  {
    id: 'movie-stellar-horizon',
    title: '星际地平线',
    maoyanMovieId: '1512904',
    posterUrl: '/src/assets/images/poster_stellar_horizon_1794981941611.jpg',
    targetFormats: ['IMAX GT', 'IMAX', 'ScreenX'],
    isStarred: false,
    manuallyStopped: false,
    alertRoundsCount: 0,
    lastAlertAt: null,
    seenShowKeys: [],
    createdAt: '2026-11-17T20:00:00.000Z',
    notes: '点击星标即可纳入每分钟持续开票提醒',
  },
];

export const DEFAULT_ALERT_ROUNDS: AlertRound[] = [
  {
    id: 'round-seed-1',
    movieId: 'movie-dune-3',
    movieTitle: '沙丘3：救世主',
    roundNumber: 1,
    detectedAt: '2026-11-17T21:15:00.000Z',
    source: 'sandbox_sim',
    cinemaNames: ['华南MALL万达 IMAX GT'],
    newShowtimes: [
      {
        cinemaId: 'dongguan-huanan-mall-wanda',
        cinemaName: '华南MALL万达 IMAX GT',
        movieTitle: '沙丘3：救世主',
        showDate: '2026-11-20',
        showTime: '19:30',
        hallName: '1号IMAX GT激光厅',
        format: 'IMAX GT',
        language: '英语 原版2D',
        priceYuan: 98,
      },
      {
        cinemaId: 'dongguan-huanan-mall-wanda',
        cinemaName: '华南MALL万达 IMAX GT',
        movieTitle: '沙丘3：救世主',
        showDate: '2026-11-20',
        showTime: '22:20',
        hallName: '1号IMAX GT激光厅',
        format: 'IMAX GT',
        language: '英语 原版2D',
        priceYuan: 89,
      },
    ],
    deliveryResults: [
      {
        channel: '浏览器本地告警',
        ok: true,
        message: '已记录第 1 轮开票事件，持续等待后续加场开票',
      },
    ],
  },
];

export function createInitialState(nowIso = new Date().toISOString()): MonitorAppState {
  return {
    cinemas: DEFAULT_CINEMAS.map((c) => ({ ...c })),
    movies: DEFAULT_MOVIES.map((m) => ({ ...m, seenShowKeys: [...m.seenShowKeys], targetFormats: [...m.targetFormats] })),
    alertRounds: DEFAULT_ALERT_ROUNDS.map((r) => ({ ...r })),
    riskConfig: {
      baseIntervalSec: 60,
      jitterSec: 12,
      interCinemaDelayMs: 3200,
      cooldownBaseMin: 15,
      probeMode: 'auto',
      maoyanCookie: '',
      userAgentPoolEnabled: true,
      autoCircuitBreaker: true,
    },
    riskState: {
      circuitState: 'closed',
      consecutiveBlocks: 0,
      cooldownUntil: null,
      lastBlockReason: null,
      lastSuccessAt: null,
      totalChecks: 0,
      totalBlocks: 0,
      nextCheckAt: null,
      lastIntervalMs: 60_000,
    },
    pushConfig: {
      browserNotificationEnabled: true,
      soundAlertEnabled: true,
      pushPlusToken: '',
      serverChanKey: '',
      barkUrl: '',
      wecomWebhook: '',
      feishuWebhook: '',
      dingtalkWebhook: '',
      customWebhookUrl: '',
    },
    updatedAt: nowIso,
  };
}

export function buildShowKey(slot: ShowtimeSlot): string {
  return [
    slot.cinemaId,
    slot.showDate.trim(),
    slot.showTime.trim(),
    slot.hallName.trim(),
    slot.format.trim(),
  ].join('|');
}

export function matchesMovieTitle(watchTitle: string, candidateTitle: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s·：:，,。.!！?？\-—()（）《》【】\[\]]+/g, '')
      .trim();
  const a = normalize(watchTitle);
  const b = normalize(candidateTitle);
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

export function matchesTargetFormat(targetFormats: string[], slot: ShowtimeSlot): boolean {
  if (!targetFormats.length || targetFormats.includes('全制式')) {
    return true;
  }
  const haystack = `${slot.format} ${slot.hallName}`.toLowerCase();
  return targetFormats.some((fmt) => {
    const f = fmt.toLowerCase().trim();
    if (f === 'imax gt') {
      return haystack.includes('imax gt') || haystack.includes('gt');
    }
    if (f === 'imax') {
      return haystack.includes('imax');
    }
    if (f === 'screenx') {
      return haystack.includes('screenx');
    }
    if (f === '杜比' || f === 'dolby') {
      return haystack.includes('杜比') || haystack.includes('dolby');
    }
    return haystack.includes(f);
  });
}

/**
 * Pure multi-round opening detection engine.
 * Rule: For every starred movie that has NOT been manually stopped (`isStarred && !manuallyStopped`),
 * any unseen showtime slots trigger a brand new AlertRound (Round 1, Round 2, Round 3...)
 * and NEVER auto-stop monitoring.
 */
export function detectNewOpeningRounds(
  state: MonitorAppState,
  snapshots: CinemaProbeSnapshot[],
  nowIso: string
): {
  nextMovies: MovieWatchItem[];
  newRounds: AlertRound[];
} {
  const enabledCinemaIds = new Set(state.cinemas.filter((c) => c.enabled).map((c) => c.id));
  const allShows = snapshots
    .filter((snap) => enabledCinemaIds.has(snap.cinemaId))
    .flatMap((snap) => snap.shows.map((show) => ({ show, source: snap.source })));

  const newRounds: AlertRound[] = [];

  const nextMovies = state.movies.map((movie) => {
    if (!movie.isStarred || movie.manuallyStopped) {
      return movie;
    }

    const seenSet = new Set(movie.seenShowKeys);
    const matchingNewSlots: ShowtimeSlot[] = [];
    const sourcesUsed = new Set<'maoyan_live' | 'sandbox_sim'>();

    for (const item of allShows) {
      if (!matchesMovieTitle(movie.title, item.show.movieTitle)) continue;
      if (!matchesTargetFormat(movie.targetFormats, item.show)) continue;

      const key = buildShowKey(item.show);
      if (!seenSet.has(key)) {
        seenSet.add(key);
        matchingNewSlots.push(item.show);
        sourcesUsed.add(item.source);
      }
    }

    if (matchingNewSlots.length === 0) {
      return movie;
    }

    const roundNumber = movie.alertRoundsCount + 1;
    const cinemaNames = Array.from(new Set(matchingNewSlots.map((s) => s.cinemaName)));
    const source: 'maoyan_live' | 'sandbox_sim' = sourcesUsed.has('maoyan_live')
      ? 'maoyan_live'
      : 'sandbox_sim';

    newRounds.push({
      id: `round-${movie.id}-${roundNumber}-${Date.parse(nowIso) || Date.now()}`,
      movieId: movie.id,
      movieTitle: movie.title,
      roundNumber,
      detectedAt: nowIso,
      source,
      cinemaNames,
      newShowtimes: matchingNewSlots,
      deliveryResults: [],
    });

    // Crucial: keep isStarred=true and manuallyStopped=false so subsequent rounds keep alerting!
    return {
      ...movie,
      alertRoundsCount: roundNumber,
      lastAlertAt: nowIso,
      seenShowKeys: Array.from(seenSet),
    };
  });

  return { nextMovies, newRounds };
}

/**
 * Computes safe next polling delay in milliseconds with symmetric random jitter.
 * Never returns less than 30,000ms to protect against aggressive burst polling.
 * When circuit breaker is open, returns remaining cooldown duration.
 */
export function computeNextIntervalMs(
  config: RiskControlConfig,
  riskState: RiskControlState,
  nowMs: number,
  randomFn: () => number = Math.random
): number {
  if (riskState.circuitState === 'open' && riskState.cooldownUntil) {
    const remaining = Date.parse(riskState.cooldownUntil) - nowMs;
    if (remaining > 0) {
      return Math.max(30_000, remaining);
    }
  }

  const baseMs = Math.max(30, config.baseIntervalSec) * 1000;
  const jitterRangeMs = Math.max(0, config.jitterSec) * 1000;
  const offset = (randomFn() * 2 - 1) * jitterRangeMs;
  return Math.max(30_000, Math.round(baseMs + offset));
}

const RISK_PATTERNS = [
  'verify.maoyan.com',
  'yoda',
  'captcha',
  '滑块',
  '安全验证',
  '访问过于频繁',
  '请求过于频繁',
  'antispider',
  'forbidden',
];

export function evaluateRiskResponse(
  statusCode: number,
  bodyText: string,
  riskState: RiskControlState,
  config: RiskControlConfig,
  nowMs: number
): {
  blocked: boolean;
  reason: string | null;
  nextRiskState: RiskControlState;
} {
  const lowerBody = bodyText.toLowerCase();
  const matchedKeyword = RISK_PATTERNS.find((kw) => lowerBody.includes(kw.toLowerCase()));
  const isRateOrAuthBlock = statusCode === 403 || statusCode === 429 || statusCode === 418;

  if (isRateOrAuthBlock || matchedKeyword) {
    const nextBlocks = riskState.consecutiveBlocks + 1;
    const baseCooldown = Math.max(5, config.cooldownBaseMin);
    const backoffMinutes = Math.min(120, baseCooldown * Math.pow(2, nextBlocks - 1));
    const cooldownUntil = new Date(nowMs + backoffMinutes * 60_000).toISOString();
    const reason = isRateOrAuthBlock
      ? `HTTP ${statusCode} 触发猫眼频率/风控拦截，已进入 ${backoffMinutes} 分钟熔断冷却`
      : `响应命中风控特征 (${matchedKeyword})，已停止探测并冷却 ${backoffMinutes} 分钟`;

    return {
      blocked: true,
      reason,
      nextRiskState: {
        ...riskState,
        circuitState: config.autoCircuitBreaker ? 'open' : 'closed',
        consecutiveBlocks: nextBlocks,
        cooldownUntil: config.autoCircuitBreaker ? cooldownUntil : null,
        lastBlockReason: reason,
        totalChecks: riskState.totalChecks + 1,
        totalBlocks: riskState.totalBlocks + 1,
      },
    };
  }

  return {
    blocked: false,
    reason: null,
    nextRiskState: {
      ...riskState,
      circuitState: 'closed',
      consecutiveBlocks: 0,
      cooldownUntil: null,
      lastBlockReason: null,
      lastSuccessAt: new Date(nowMs).toISOString(),
      totalChecks: riskState.totalChecks + 1,
    },
  };
}

export function generateGitHubWorkflowFiles(state: MonitorAppState): GitHubWorkflowBundle {
  const activeCinemas = state.cinemas.filter((c) => c.enabled);
  const starredMovies = state.movies.filter((m) => m.isStarred && !m.manuallyStopped);

  const cinemaConfigJson = JSON.stringify(
    activeCinemas.map((c) => ({
      id: c.id,
      name: c.shortName,
      maoyanCinemaId: c.maoyanCinemaId,
    })),
    null,
    2
  );

  const watchlistJson = JSON.stringify(
    starredMovies.map((m) => ({
      title: m.title,
      targetFormats: m.targetFormats,
      manuallyStopped: m.manuallyStopped,
    })),
    null,
    2
  );

  const workflowYaml = `name: 东莞IMAX开票雷达 (每分钟探测与多轮提醒)

on:
  schedule:
    # GitHub Actions 官方 cron 最短 5 分钟一次；
    # 如需单次 job 内按每 ${state.riskConfig.baseIntervalSec}s±${state.riskConfig.jitterSec}s 连续巡检，请启用下方 LOOP_ROUNDS=4
    - cron: '*/5 * * * *'
  workflow_dispatch:
    inputs:
      loop_rounds:
        description: '单次任务连续探测轮次 (1=单次, 4=连续约4分钟)'
        required: false
        default: '4'

permissions:
  contents: read

jobs:
  monitor-dongguan-imax:
    runs-on: ubuntu-latest
    timeout-minutes: 6
    steps:
      - name: 检出仓库代码
        uses: actions/checkout@v4

      - name: 安装 Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 恢复多轮已提醒场次状态缓存
        uses: actions/cache@v4
        with:
          path: .monitor-cache/seen-shows.json
          key: dongguan-imax-seen-\${{ github.run_id }}
          restore-keys: |
            dongguan-imax-seen-

      - name: 执行东莞三家影院开票探测 (带猫眼风控熔断保护)
        env:
          PUSHPLUS_TOKEN: \${{ secrets.PUSHPLUS_TOKEN }}
          SERVERCHAN_KEY: \${{ secrets.SERVERCHAN_KEY }}
          BARK_URL: \${{ secrets.BARK_URL }}
          WECOM_WEBHOOK: \${{ secrets.WECOM_WEBHOOK }}
          FEISHU_WEBHOOK: \${{ secrets.FEISHU_WEBHOOK }}
          MAOYAN_COOKIE: \${{ secrets.MAOYAN_COOKIE }}
          BASE_INTERVAL_SEC: '${state.riskConfig.baseIntervalSec}'
          JITTER_SEC: '${state.riskConfig.jitterSec}'
          LOOP_ROUNDS: \${{ github.event.inputs.loop_rounds || '4' }}
        run: node scripts/monitor-dongguan.mjs
`;

  const monitorScriptJs = `/**
 * 东莞三家IMAX影院猫眼开票监控脚本 (GitHub Actions 专用)
 * 星标电影每一轮新增场次都会推送提醒，直到在配置中手动移除或设为 manuallyStopped: true
 */
import fs from 'node:fs';
import path from 'node:path';

const CINEMAS = ${cinemaConfigJson};

const WATCHLIST = ${watchlistJson};

const CACHE_FILE = path.resolve('.monitor-cache/seen-shows.json');
const BASE_INTERVAL_SEC = Math.max(45, Number(process.env.BASE_INTERVAL_SEC || 60));
const JITTER_SEC = Number(process.env.JITTER_SEC || 12);
const LOOP_ROUNDS = Math.min(5, Math.max(1, Number(process.env.LOOP_ROUNDS || 1)));

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; HarmonyOS; ALN-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 HuaweiBrowser/15.0.0.301 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; HUAWEI Mate 60 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch {}
  return { seenKeys: [], roundByMovie: {}, blockedUntil: 0 };
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function isRiskBlocked(status, text) {
  const lower = text.toLowerCase();
  return (
    status === 403 ||
    status === 429 ||
    lower.includes('verify.maoyan.com') ||
    lower.includes('yoda') ||
    lower.includes('安全验证') ||
    lower.includes('访问过于频繁')
  );
}

async function fetchCinemaShows(cinema) {
  const url = \`https://m.maoyan.com/ajax/cinemaDetail?cinemaId=\${cinema.maoyanCinemaId}\`;
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const headers = {
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Referer': \`https://m.maoyan.com/shows/\${cinema.maoyanCinemaId}\`,
  };
  if (process.env.MAOYAN_COOKIE) {
    headers['Cookie'] = process.env.MAOYAN_COOKIE;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  if (isRiskBlocked(res.status, text)) {
    throw new Error(\`RISK_BLOCKED:\${res.status}\`);
  }
  const data = JSON.parse(text);
  const movies = data?.showData?.movies || [];
  const slots = [];
  for (const m of movies) {
    for (const s of m.shows || []) {
      for (const p of s.plist || []) {
        slots.push({
          key: \`\${cinema.id}|\${s.showDate}|\${p.tm}|\${p.th}|\${p.tp || ''}\`,
          cinemaName: cinema.name,
          movieTitle: m.nm,
          showDate: s.showDate,
          showTime: p.tm,
          hallName: p.th,
          format: p.tp || '普通/待确认',
          price: p.vipPrice || p.baseSellPrice || '',
        });
      }
    }
  }
  return slots;
}

async function notifyAll(title, content) {
  const tasks = [];
  if (process.env.PUSHPLUS_TOKEN) {
    tasks.push(
      fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: process.env.PUSHPLUS_TOKEN, title, content, template: 'markdown' }),
      })
    );
  }
  if (process.env.BARK_URL) {
    const base = process.env.BARK_URL.replace(/\\/$/, '');
    tasks.push(fetch(\`\${base}/\${encodeURIComponent(title)}/\${encodeURIComponent(content)}?group=DongguanIMAX\`));
  }
  if (process.env.WECOM_WEBHOOK) {
    tasks.push(
      fetch(process.env.WECOM_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'markdown', markdown: { content: \`**\${title}**\\n\${content}\` } }),
      })
    );
  }
  if (process.env.FEISHU_WEBHOOK) {
    tasks.push(
      fetch(process.env.FEISHU_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text: \`\${title}\\n\${content}\` } }),
      })
    );
  }
  await Promise.allSettled(tasks);
}

async function runOnce(cache) {
  if (cache.blockedUntil && Date.now() < cache.blockedUntil) {
    console.log('风控熔断冷却中，跳过本次探测');
    return;
  }
  const seen = new Set(cache.seenKeys || []);
  const allSlots = [];

  for (const cinema of CINEMAS) {
    try {
      const slots = await fetchCinemaShows(cinema);
      allSlots.push(...slots);
      await sleep(2500 + Math.random() * 2000); // 影院间串行间隔，防并发风控
    } catch (err) {
      if (String(err.message).startsWith('RISK_BLOCKED')) {
        cache.blockedUntil = Date.now() + 30 * 60 * 1000;
        saveCache(cache);
        await notifyAll('猫眼风控熔断预警', \`影院 \${cinema.name} 触发验证拦截，已自动冷却30分钟。\`);
        return;
      }
      console.error(\`探测失败 \${cinema.name}:\`, err.message);
    }
  }

  for (const watch of WATCHLIST) {
    if (watch.manuallyStopped) continue;
    const matched = allSlots.filter((slot) => {
      const titleHit = slot.movieTitle.includes(watch.title) || watch.title.includes(slot.movieTitle);
      if (!titleHit) return false;
      if (watch.targetFormats.includes('全制式')) return true;
      return watch.targetFormats.some((f) => \`\${slot.format} \${slot.hallName}\`.toLowerCase().includes(f.toLowerCase()));
    });

    const fresh = matched.filter((s) => !seen.has(s.key));
    if (fresh.length > 0) {
      fresh.forEach((s) => seen.add(s.key));
      const round = (cache.roundByMovie[watch.title] || 0) + 1;
      cache.roundByMovie[watch.title] = round;
      const lines = fresh.slice(0, 12).map((s) => \`- \${s.cinemaName} | \${s.showDate} \${s.showTime} | \${s.hallName} (\${s.format})\`).join('\\n');
      await notifyAll(\`[第\${round}轮开票] \${watch.title}\`, \`检测到 \${fresh.length} 个新开场次：\\n\${lines}\\n\\n*本片仍处于持续盯票状态，后续新加场次将继续提醒。*\`);
    }
  }

  cache.seenKeys = Array.from(seen);
  saveCache(cache);
}

async function main() {
  const cache = loadCache();
  for (let i = 0; i < LOOP_ROUNDS; i++) {
    await runOnce(cache);
    if (i < LOOP_ROUNDS - 1) {
      const jitter = (Math.random() * 2 - 1) * JITTER_SEC * 1000;
      const waitMs = Math.max(35000, BASE_INTERVAL_SEC * 1000 + jitter);
      await sleep(waitMs);
    }
  }
}

main();
`;

  const readmeMd = `# 东莞IMAX开票雷达 (GitHub Actions + 华为手机适配指南)

## 1. 监控范围（东莞三家核心影院）
${activeCinemas.map((c) => `- **${c.shortName}** (${c.district}) · 猫眼ID: \`${c.maoyanCinemaId}\``).join('\n')}

## 2. 星标多轮提醒原则
- 星标电影（\`isStarred: true\`）只要在三家影院检测到**未曾提醒过的新场次**（如首映开票、次日加场、IMAX GT补场），就会立即触发新一轮提醒（第1轮、第2轮、第3轮...）。
- **不会自动停止**：除非您手动将其停止，否则每一轮新开票都会继续推送。

## 3. 猫眼风控防护策略
- **随机抖动探测**：默认基础周期 \`${state.riskConfig.baseIntervalSec}s ± ${state.riskConfig.jitterSec}s\`，避免整点机械请求。
- **串行影院间隔**：三家影院之间保留 \`${(state.riskConfig.interCinemaDelayMs / 1000).toFixed(1)}s\` 以上停顿。
- **熔断器保护**：遇到 HTTP 403/429 或 \`verify.maoyan.com\` 滑块验证特征时，立即中止探测并冷却，不强行高频重试。

## 4. GitHub Secrets 配置（推荐搭配华为手机使用）
在仓库 **Settings -> Secrets and variables -> Actions** 中添加：
- \`PUSHPLUS_TOKEN\`: 强烈推荐华为手机用户使用（支持微信服务号/企业微信毫秒级推送，不依赖浏览器后台常驻）。
- \`WECOM_WEBHOOK\` / \`FEISHU_WEBHOOK\`: 企业微信或飞书群机器人通知，华为鸿蒙系统可直接在应用启动管理设为允许后台运行。
- \`MAOYAN_COOKIE\`: （可选）在手机浏览器打开猫眼H5后复制的合法Cookie，可显著降低匿名风控概率。

## 5. 华为手机 PWA 安装与防杀后台
1. 使用**华为浏览器**打开本 Web App 线上地址。
2. 点击底部菜单 **“工具箱 / 更多” -> “添加到桌面”**，即可获得独立全屏图标。
3. 如需开启网页前景实时雷达：进入手机 **设置 -> 应用和服务 -> 应用启动管理**，找到华为浏览器或飞书/微信，改为**手动管理**并开启“允许自启动、允许后台活动”。
`;

  return {
    workflowYaml,
    monitorScriptJs,
    readmeMd,
  };
}
