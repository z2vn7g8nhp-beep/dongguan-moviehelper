/**
 * 东莞三家IMAX影院猫眼开票监控脚本 (GitHub Actions 专用)
 * 星标电影每一轮新增场次都会推送提醒，直到在配置中手动移除或设为 manuallyStopped: true
 */
import fs from 'node:fs';
import path from 'node:path';

const CINEMAS = [
  {
    "id": "dongguan-huanan-mall-wanda",
    "name": "华南MALL万达 IMAX GT",
    "maoyanCinemaId": "15648"
  },
  {
    "id": "dongguan-dongcheng-wanda",
    "name": "东城万达 IMAX",
    "maoyanCinemaId": "11092"
  },
  {
    "id": "dongguan-minying-guomao-cgv",
    "name": "民盈国贸城 CGV",
    "maoyanCinemaId": "26341"
  }
];

const WATCHLIST = [
  {
    "title": "沙丘3：救世主",
    "targetFormats": [
      "IMAX GT",
      "IMAX"
    ],
    "manuallyStopped": false
  },
  {
    "title": "哪吒之沧海龙吟",
    "targetFormats": [
      "全制式"
    ],
    "manuallyStopped": false
  }
];

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
  const url = `https://m.maoyan.com/ajax/cinemaDetail?cinemaId=${cinema.maoyanCinemaId}`;
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const headers = {
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Referer': `https://m.maoyan.com/shows/${cinema.maoyanCinemaId}`,
  };
  if (process.env.MAOYAN_COOKIE) {
    headers['Cookie'] = process.env.MAOYAN_COOKIE;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  if (isRiskBlocked(res.status, text)) {
    throw new Error(`RISK_BLOCKED:${res.status}`);
  }
  const data = JSON.parse(text);
  const movies = data?.showData?.movies || [];
  const slots = [];
  for (const m of movies) {
    for (const s of m.shows || []) {
      for (const p of s.plist || []) {
        slots.push({
          key: `${cinema.id}|${s.showDate}|${p.tm}|${p.th}|${p.tp || ''}`,
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
    const base = process.env.BARK_URL.replace(/\/$/, '');
    tasks.push(fetch(`${base}/${encodeURIComponent(title)}/${encodeURIComponent(content)}?group=DongguanIMAX`));
  }
  if (process.env.WECOM_WEBHOOK) {
    tasks.push(
      fetch(process.env.WECOM_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'markdown', markdown: { content: `**${title}**\n${content}` } }),
      })
    );
  }
  if (process.env.FEISHU_WEBHOOK) {
    tasks.push(
      fetch(process.env.FEISHU_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text: `${title}\n${content}` } }),
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
        await notifyAll('猫眼风控熔断预警', `影院 ${cinema.name} 触发验证拦截，已自动冷却30分钟。`);
        return;
      }
      console.error(`探测失败 ${cinema.name}:`, err.message);
    }
  }

  for (const watch of WATCHLIST) {
    if (watch.manuallyStopped) continue;
    const matched = allSlots.filter((slot) => {
      const titleHit = slot.movieTitle.includes(watch.title) || watch.title.includes(slot.movieTitle);
      if (!titleHit) return false;
      if (watch.targetFormats.includes('全制式')) return true;
      return watch.targetFormats.some((f) => `${slot.format} ${slot.hallName}`.toLowerCase().includes(f.toLowerCase()));
    });

    const fresh = matched.filter((s) => !seen.has(s.key));
    if (fresh.length > 0) {
      fresh.forEach((s) => seen.add(s.key));
      const round = (cache.roundByMovie[watch.title] || 0) + 1;
      cache.roundByMovie[watch.title] = round;
      const lines = fresh.slice(0, 12).map((s) => `- ${s.cinemaName} | ${s.showDate} ${s.showTime} | ${s.hallName} (${s.format})`).join('\n');
      await notifyAll(`[第${round}轮开票] ${watch.title}`, `检测到 ${fresh.length} 个新开场次：\n${lines}\n\n*本片仍处于持续盯票状态，后续新加场次将继续提醒。*`);
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
