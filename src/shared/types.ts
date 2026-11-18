export type ProbeMode = 'auto' | 'live_maoyan' | 'sandbox';

export type CircuitState = 'closed' | 'open';

export interface Cinema {
  id: string;
  name: string;
  shortName: string;
  district: string;
  brand: '万达影城' | 'CGV影城';
  featuredFormats: string[];
  maoyanCinemaId: string;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastStatus: 'ok' | 'idle' | 'blocked' | 'error';
  lastStatusNote: string;
  activeShowCount: number;
}

export interface ShowtimeSlot {
  cinemaId: string;
  cinemaName: string;
  movieTitle: string;
  showDate: string; // e.g. '2026-11-20'
  showTime: string; // e.g. '19:30'
  hallName: string; // e.g. 'IMAX GT 激光厅'
  format: string; // e.g. 'IMAX GT'
  language: string; // e.g. '英语 3D'
  priceYuan?: number;
  seqNo?: string;
}

export interface CinemaProbeSnapshot {
  cinemaId: string;
  fetchedAt: string;
  source: 'maoyan_live' | 'sandbox_sim';
  shows: ShowtimeSlot[];
}

export interface MovieWatchItem {
  id: string;
  title: string;
  maoyanMovieId: string;
  posterUrl: string;
  targetFormats: string[]; // e.g. ['IMAX GT', 'IMAX', '杜比/ScreenX'] or ['全制式']
  isStarred: boolean;
  manuallyStopped: boolean;
  alertRoundsCount: number;
  lastAlertAt: string | null;
  seenShowKeys: string[];
  createdAt: string;
  notes?: string;
}

export interface AlertRound {
  id: string;
  movieId: string;
  movieTitle: string;
  roundNumber: number;
  detectedAt: string;
  source: 'maoyan_live' | 'sandbox_sim';
  cinemaNames: string[];
  newShowtimes: ShowtimeSlot[];
  deliveryResults: {
    channel: string;
    ok: boolean;
    message: string;
  }[];
}

export interface RiskControlConfig {
  baseIntervalSec: number; // default 60
  jitterSec: number; // default 12 -> 48s..72s
  interCinemaDelayMs: number; // default 3200
  cooldownBaseMin: number; // default 15
  probeMode: ProbeMode;
  maoyanCookie: string;
  maoyanProxyUrl: string;
  userAgentPoolEnabled: boolean;
  autoCircuitBreaker: boolean;
}

export interface RiskControlState {
  circuitState: CircuitState;
  consecutiveBlocks: number;
  cooldownUntil: string | null;
  lastBlockReason: string | null;
  lastSuccessAt: string | null;
  totalChecks: number;
  totalBlocks: number;
  nextCheckAt: string | null;
  lastIntervalMs: number;
}

export interface PushChannelConfig {
  browserNotificationEnabled: boolean;
  soundAlertEnabled: boolean;
  pushPlusToken: string; // 微信 + 华为服务通知友好
  serverChanKey: string;
  barkUrl: string;
  wecomWebhook: string;
  feishuWebhook: string;
  dingtalkWebhook: string;
  customWebhookUrl: string;
}

export interface MonitorAppState {
  cinemas: Cinema[];
  movies: MovieWatchItem[];
  alertRounds: AlertRound[];
  riskConfig: RiskControlConfig;
  riskState: RiskControlState;
  pushConfig: PushChannelConfig;
  updatedAt: string;
}

export interface GitHubWorkflowBundle {
  workflowYaml: string;
  monitorScriptJs: string;
  watchlistJson: string;
  readmeMd: string;
}
