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
    name: '万达影城（华南MALL-IMAXGT激光店）',
    shortName: '华南MALL万达 IMAX GT',
    district: '东莞万江 · 华南MALL D区3层',
    brand: '万达影城',
    featuredFormats: ['IMAX GT 激光', '4DX', 'VIP厅'],
    maoyanCinemaId: '1485',
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
    district: '东莞东城 · 东城万达广场4层',
    brand: '万达影城',
    featuredFormats: ['IMAX 激光', '杜比全景声', 'Prime'],
    maoyanCinemaId: '10418',
    enabled: true,
    lastCheckedAt: null,
    lastStatus: 'idle',
    lastStatusNote: '等待首轮探测',
    activeShowCount: 0,
  },
  {
    id: 'dongguan-minying-guomao-cgv',
    name: 'CGV影城（民盈·国贸城店）',
    shortName: '民盈国贸城 CGV',
    district: '东莞东城/南城交界 · 民盈国贸城4层',
    brand: 'CGV影城',
    featuredFormats: ['IMAX', 'ScreenX', 'GOLD CLASS'],
    maoyanCinemaId: '26100',
    enabled: true,
    lastCheckedAt: null,
    lastStatus: 'idle',
    lastStatusNote: '等待首轮探测',
    activeShowCount: 0,
  },
];

export const DEFAULT_MOVIES: MovieWatchItem[] = [
  {
    id: 'movie-avengers-5',
    title: '复仇者联盟5',
    aliases: ['复联5', '毁灭之日', '毁灭日', 'Avengers: Doomsday'],
    maoyanMovieId: '',
    posterUrl: '/src/assets/images/poster_stellar_horizon_1794981941611.jpg',
    targetFormats: ['IMAX GT', 'IMAX'],
    isStarred: true,
    manuallyStopped: false,
    alertRoundsCount: 0,
    lastAlertAt: null,
    seenShowKeys: [],
    createdAt: '2026-11-17T23:00:00.000Z',
    notes: '重点蹲华南MALL IMAX GT 激光厅首开与加场（兼容复联5/毁灭之日）',
  },
  {
    id: 'movie-odyssey',
    title: '奥德赛',
    maoyanMovieId: '1545360',
    posterUrl: '/src/assets/images/poster_dune_odyssey_1794981941105.jpg',
    targetFormats: ['IMAX GT', 'IMAX'],
    isStarred: false,
    manuallyStopped: false,
    alertRoundsCount: 0,
    lastAlertAt: null,
    seenShowKeys: [],
    createdAt: '2026-11-17T18:00:00.000Z',
    notes: '优先锁定华南MALL IMAX GT 激光厅黄金场',
  },
  {
    id: 'movie-nezha-storm',
    title: '哪吒之沧海龙吟',
    maoyanMovieId: '1504118',
    posterUrl: '/src/assets/images/poster_ne_zha_storm_1794981940862.jpg',
    targetFormats: ['全制式'],
    isStarred: false,
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

export const DEFAULT_ALERT_ROUNDS: AlertRound[] = [];

export function createInitialState(nowIso = new Date().toISOString()): MonitorAppState {
  return {
    cinemas: DEFAULT_CINEMAS.map((c) => ({ ...c })),
    movies: DEFAULT_MOVIES.map((m) => ({
      ...m,
      seenShowKeys: [...m.seenShowKeys],
      targetFormats: [...m.targetFormats],
    })),
    alertRounds: [],
    riskConfig: {
      baseIntervalSec: 60,
      jitterSec: 12,
      interCinemaDelayMs: 3200,
      cooldownBaseMin: 15,
      probeMode: 'auto',
      maoyanCookie: '',
      maoyanProxyUrl: '',
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

const MOVIE_ALIAS_GROUPS: string[][] = [
  ['复联5', '复仇者联盟5', '复仇者联盟毁灭', '毁灭之日', '毁灭日', 'avengersdoomsday', 'avengers5'],
  ['复联6', '复仇者联盟6', '秘密战争', 'avengerssecretwars', 'secretwars'],
  ['沙丘3', '沙丘救世主', 'dune3', 'dunemessiah'],
];

export function matchesMovieTitle(
  watchTitle: string,
  candidateTitle: string,
  extraAliases: string[] = []
): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s·：:，,。.!！?？\-—()（）《》【】\[\]]+/g, '')
      .trim();
  const cand = normalize(candidateTitle);
  if (!cand) return false;

  const terms = [watchTitle, ...extraAliases].map(normalize).filter(Boolean);
  for (const term of terms) {
    if (cand === term || cand.includes(term) || term.includes(cand)) {
      return true;
    }
    for (const group of MOVIE_ALIAS_GROUPS) {
      const termInGroup = group.some((g) => term.includes(g) || g.includes(term));
      const candInGroup = group.some((g) => cand.includes(g) || g.includes(cand));
      if (termInGroup && candInGroup) {
        return true;
      }
    }
  }
  return false;
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
      if (!matchesMovieTitle(movie.title, item.show.movieTitle, movie.aliases || [])) continue;
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

    return {
      ...movie,
      alertRoundsCount: roundNumber,
      lastAlertAt: nowIso,
      seenShowKeys: Array.from(seenSet),
    };
  });

  return { nextMovies, newRounds };
}

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

const STRICT_RISK_PATTERNS = [
  'verify.maoyan.com',
  'yoda',
  '滑块',
  '安全验证',
  '访问过于频繁',
  '请求过于频繁',
  'antispider',
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
  const trimmed = bodyText.trim();
  const isValidMaoyanJson =
    statusCode === 200 && trimmed.startsWith('{') && trimmed.includes('"showData"');
  const lowerBody = bodyText.toLowerCase();
  const matchedKeyword = isValidMaoyanJson
    ? undefined
    : STRICT_RISK_PATTERNS.find((kw) => lowerBody.includes(kw.toLowerCase())) ||
      (statusCode >= 400 && lowerBody.includes('forbidden') ? 'forbidden' : undefined);
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

export function generateGitHubWorkflowFiles(
  state: MonitorAppState,
  options?: { runnerType?: 'ubuntu-latest' | 'self-hosted' }
): GitHubWorkflowBundle {
  const runnerType = options?.runnerType || 'ubuntu-latest';
  const activeCinemas = state.cinemas.filter((c) => c.enabled);
  const starredMovies = state.movies.filter((m) => m.isStarred && !m.manuallyStopped);

  const watchlistPayload = {
    cinemas: activeCinemas.map((c) => ({
      id: c.id,
      name: c.shortName,
      maoyanCinemaId: c.maoyanCinemaId,
    })),
    watchlist: starredMovies.map((m) => ({
      title: m.title,
      ...(m.aliases && m.aliases.length > 0 ? { aliases: m.aliases } : {}),
      targetFormats: m.targetFormats,
      manuallyStopped: m.manuallyStopped,
    })),
  };

  const watchlistJson = JSON.stringify(watchlistPayload, null, 2);

  const workflowYaml = `name: 东莞IMAX开票雷达 (零Secret免Cookie直连版)

on:
  schedule:
    # GitHub Actions 定时任务（单次 job 内可按约每分钟连续巡检 4 轮）
    - cron: '*/5 * * * *'
  workflow_dispatch:
    inputs:
      loop_rounds:
        description: '单次任务连续探测轮次 (1=单次, 4=每分钟连跑约4分钟)'
        required: false
        default: '4'

# 只需在仓库 Settings -> Actions -> General -> Workflow permissions 开启 Read and write permissions
permissions:
  contents: write
  issues: write

# 防止 cron-job.org 外部触发与 GitHub 自带 schedule 同时运行导致提交冲突
concurrency:
  group: dongguan-imax-monitor
  cancel-in-progress: false

jobs:
  monitor-dongguan-imax:
    runs-on: ${runnerType}
    timeout-minutes: 6
    steps:
      - name: 检出仓库代码
        uses: actions/checkout@v4

      - name: 安装 Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 执行东莞三家影院猫眼开票探测 (零Cookie直连 + 自动开Issue提醒)
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: \${{ github.repository }}
          # 以下第三方推送与Cookie均为可选，不填也能通过 GitHub Issue + 仓库状态文件直接提醒
          PUSHPLUS_TOKEN: \${{ secrets.PUSHPLUS_TOKEN }}
          WECOM_WEBHOOK: \${{ secrets.WECOM_WEBHOOK }}
          FEISHU_WEBHOOK: \${{ secrets.FEISHU_WEBHOOK }}
          BARK_URL: \${{ secrets.BARK_URL }}
          MAOYAN_COOKIE: \${{ secrets.MAOYAN_COOKIE }}
          BASE_INTERVAL_SEC: '${state.riskConfig.baseIntervalSec}'
          JITTER_SEC: '${state.riskConfig.jitterSec}'
          LOOP_ROUNDS: \${{ github.event.inputs.loop_rounds || '4' }}
        run: node scripts/monitor-dongguan.mjs

      - name: 提交已提醒轮次缓存到仓库（免外部数据库）
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if [ -n "$(git status --porcelain .monitor-cache)" ]; then
            git add .monitor-cache/seen-shows.json
            git commit -m "chore: update dongguan imax seen rounds [skip ci]"
            git pull --rebase --autostash origin "\${{ github.ref_name }}" || true
            git push
          fi
`;

  const monitorScriptJs = `/**
 * 东莞三家IMAX影院猫眼开票监控脚本 (GitHub Actions 免Cookie直连版)
 * 只需开启 GitHub Repository Settings -> Actions -> Workflow permissions (Read and write)
 * 星标电影每一轮新增场次都会自动发 GitHub Issue 提醒（可联动手机通知），直到手动停止
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG = ${watchlistJson};

function loadConfig() {
  const cfgPath = path.resolve('config/watchlist.json');
  try {
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch {}
  return DEFAULT_CONFIG;
}

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
  const trimmed = text.trim();
  if (status === 200 && trimmed.startsWith('{') && trimmed.includes('"showData"')) {
    return false;
  }
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
        const rawPrice = Number(p.vipPrice || p.baseSellPrice);
        slots.push({
          key: \`\${cinema.id}|\${s.showDate}|\${p.tm}|\${p.th}|\${p.tp || ''}\`,
          cinemaName: cinema.name,
          movieTitle: m.nm,
          showDate: s.showDate,
          showTime: p.tm,
          hallName: p.th,
          format: p.tp || '普通/待确认',
          price: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : undefined,
        });
      }
    }
  }
  return slots;
}

async function createGitHubIssueAlert(title, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return;
  try {
    await fetch(\`https://api.github.com/repos/\${repo}/issues\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    });
  } catch (e) {
    console.error('GitHub Issue 推送失败:', e.message);
  }
}

async function notifyAll(title, content) {
  const tasks = [createGitHubIssueAlert(title, content)];

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

async function runOnce(cache, config) {
  if (cache.blockedUntil && Date.now() < cache.blockedUntil) {
    console.log('风控熔断冷却中，跳过本次探测');
    return;
  }
  const seen = new Set(cache.seenKeys || []);
  const allSlots = [];

  for (const cinema of config.cinemas) {
    try {
      const slots = await fetchCinemaShows(cinema);
      allSlots.push(...slots);
      await sleep(2500 + Math.random() * 2000);
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

  const ALIAS_GROUPS = [
    ['复联5', '复仇者联盟5', '复仇者联盟毁灭', '毁灭之日', '毁灭日', 'avengersdoomsday', 'avengers5'],
    ['复联6', '复仇者联盟6', '秘密战争', 'avengerssecretwars', 'secretwars'],
    ['沙丘3', '沙丘救世主', 'dune3', 'dunemessiah'],
  ];
  const normalizeTitle = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[\\s·：:，,。.!！?？\\-—()（）《》【】\\[\\]]+/g, '')
      .trim();
  const isTitleMatch = (watch, candidateTitle) => {
    const cand = normalizeTitle(candidateTitle);
    if (!cand) return false;
    const terms = [watch.title, ...(watch.aliases || [])].map(normalizeTitle).filter(Boolean);
    for (const term of terms) {
      if (cand === term || cand.includes(term) || term.includes(cand)) return true;
      for (const group of ALIAS_GROUPS) {
        if (
          group.some((g) => term.includes(g) || g.includes(term)) &&
          group.some((g) => cand.includes(g) || g.includes(cand))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  for (const watch of config.watchlist) {
    if (watch.manuallyStopped) continue;
    const matched = allSlots.filter((slot) => {
      if (!isTitleMatch(watch, slot.movieTitle)) return false;
      if (watch.targetFormats.includes('全制式')) return true;
      return watch.targetFormats.some((f) => \`\${slot.format} \${slot.hallName}\`.toLowerCase().includes(f.toLowerCase()));
    });

    const fresh = matched.filter((s) => !seen.has(s.key));
    if (fresh.length > 0) {
      fresh.forEach((s) => seen.add(s.key));
      const round = (cache.roundByMovie[watch.title] || 0) + 1;
      cache.roundByMovie[watch.title] = round;
      const lines = fresh.slice(0, 15).map((s) => \`- **\${s.cinemaName}** | \${s.showDate} \${s.showTime} | \${s.hallName} (\${s.format})\${s.price ? \` ¥\${s.price}\` : ''}\`).join('\\n');
      await notifyAll(\`[第\${round}轮开票] \${watch.title}\`, \`检测到 \${fresh.length} 个新开场次：\\n\${lines}\\n\\n> 本片仍处于持续盯票状态，后续新加场次将继续提醒。\`);
    }
  }

  cache.seenKeys = Array.from(seen);
  saveCache(cache);
}

async function main() {
  const config = loadConfig();
  const cache = loadCache();
  for (let i = 0; i < LOOP_ROUNDS; i++) {
    await runOnce(cache, config);
    if (i < LOOP_ROUNDS - 1) {
      const jitter = (Math.random() * 2 - 1) * JITTER_SEC * 1000;
      const waitMs = Math.max(35000, BASE_INTERVAL_SEC * 1000 + jitter);
      await sleep(waitMs);
    }
  }
}

main();
`;

  const readmeMd = `# 东莞IMAX开票雷达 (GitHub Actions 免Cookie零Secret开箱即用版)

## 1. 只需开启 1 个 GitHub Action 权限即可开跑
不需要手动配置 Cookie、不需要买服务器、也不强制填写第三方 Token：
1. 将本代码推送到你的 GitHub 仓库。
2. 打开仓库 **Settings → Actions → General → Workflow permissions**。
3. 选中 **Read and write permissions**，点击 **Save**。
4. 前往 **Actions** 标签页启用工作流即可！每当检测到星标电影新开票，GitHub Actions 会自动：
   - 直接请求猫眼公开影院排片接口抓取东莞三家影院；
   - 自动在仓库内创建一个 **GitHub Issue**（配合手机 GitHub App 或邮件提醒即可在华为手机收到弹窗）；
   - 自动把已提醒的场次提交到 \`.monitor-cache/seen-shows.json\`，确保每一轮加场都不重报、不漏报。

## 2. 东莞三家核心影院（已核实猫眼真实 Cinema ID）
${activeCinemas.map((c) => `- **${c.shortName}** (${c.district}) · 猫眼ID: \`${c.maoyanCinemaId}\``).join('\n')}

## 3. 可选进阶：华为手机微信秒级提醒
如果你希望通过微信直接收通知，只需在 **Settings → Secrets and variables → Actions** 中额外添加一个 \`PUSHPLUS_TOKEN\`（或 \`WECOM_WEBHOOK\` / \`FEISHU_WEBHOOK\`），脚本会自动双通道推送。
`;

  return {
    workflowYaml,
    monitorScriptJs,
    watchlistJson,
    readmeMd,
  };
}
