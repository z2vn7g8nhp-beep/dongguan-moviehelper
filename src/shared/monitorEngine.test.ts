import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextIntervalMs,
  createInitialState,
  detectNewOpeningRounds,
  evaluateRiskResponse,
  generateGitHubWorkflowFiles,
} from './monitorEngine';
import type { CinemaProbeSnapshot } from './types';

test('starred movie triggers Round 1, stays active, and triggers Round 2 on subsequent opening', () => {
  const state = createInitialState('2026-11-17T20:00:00.000Z');
  // Use movie-nezha-storm which starts with 0 alertRoundsCount and isStarred=true
  const round1Snap: CinemaProbeSnapshot[] = [
    {
      cinemaId: 'dongguan-huanan-mall-wanda',
      fetchedAt: '2026-11-17T20:01:00.000Z',
      source: 'maoyan_live',
      shows: [
        {
          cinemaId: 'dongguan-huanan-mall-wanda',
          cinemaName: '华南MALL万达 IMAX GT',
          movieTitle: '哪吒之沧海龙吟',
          showDate: '2026-11-22',
          showTime: '19:00',
          hallName: '1号IMAX GT激光厅',
          format: 'IMAX GT',
          language: '国语 3D',
        },
      ],
    },
  ];

  const r1 = detectNewOpeningRounds(state, round1Snap, '2026-11-17T20:01:00.000Z');
  assert.equal(r1.newRounds.length, 1);
  assert.equal(r1.newRounds[0].movieId, 'movie-nezha-storm');
  assert.equal(r1.newRounds[0].roundNumber, 1);

  const updatedState = { ...state, movies: r1.nextMovies };
  const nezhaAfterR1 = updatedState.movies.find((m) => m.id === 'movie-nezha-storm')!;
  assert.equal(nezhaAfterR1.isStarred, true);
  assert.equal(nezhaAfterR1.manuallyStopped, false);
  assert.equal(nezhaAfterR1.alertRoundsCount, 1);

  // Duplicate poll with identical showtimes must NOT fire another round
  const dup = detectNewOpeningRounds(updatedState, round1Snap, '2026-11-17T20:02:00.000Z');
  assert.equal(dup.newRounds.length, 0);

  // Round 2 opens at Dongcheng Wanda IMAX
  const round2Snap: CinemaProbeSnapshot[] = [
    ...round1Snap,
    {
      cinemaId: 'dongguan-dongcheng-wanda',
      fetchedAt: '2026-11-17T20:03:00.000Z',
      source: 'maoyan_live',
      shows: [
        {
          cinemaId: 'dongguan-dongcheng-wanda',
          cinemaName: '东城万达 IMAX',
          movieTitle: '哪吒之沧海龙吟',
          showDate: '2026-11-22',
          showTime: '20:15',
          hallName: 'IMAX激光厅',
          format: 'IMAX',
          language: '国语 3D',
        },
      ],
    },
  ];

  const r2 = detectNewOpeningRounds(updatedState, round2Snap, '2026-11-17T20:03:00.000Z');
  assert.equal(r2.newRounds.length, 1);
  assert.equal(r2.newRounds[0].roundNumber, 2);
  assert.deepEqual(r2.newRounds[0].cinemaNames, ['东城万达 IMAX']);
});

test('manually stopped movie suppresses alerts until resumed', () => {
  const state = createInitialState();
  state.movies = state.movies.map((m) =>
    m.id === 'movie-nezha-storm' ? { ...m, manuallyStopped: true } : m
  );

  const snap: CinemaProbeSnapshot[] = [
    {
      cinemaId: 'dongguan-minying-guomao-cgv',
      fetchedAt: '2026-11-17T20:05:00.000Z',
      source: 'sandbox_sim',
      shows: [
        {
          cinemaId: 'dongguan-minying-guomao-cgv',
          cinemaName: '民盈国贸城 CGV',
          movieTitle: '哪吒之沧海龙吟',
          showDate: '2026-11-23',
          showTime: '14:30',
          hallName: 'IMAX厅',
          format: 'IMAX',
          language: '国语 3D',
        },
      ],
    },
  ];

  const stoppedResult = detectNewOpeningRounds(state, snap, '2026-11-17T20:05:00.000Z');
  assert.equal(stoppedResult.newRounds.length, 0);

  // Resume watching
  const resumedState = {
    ...state,
    movies: state.movies.map((m) =>
      m.id === 'movie-nezha-storm' ? { ...m, manuallyStopped: false } : m
    ),
  };
  const resumedResult = detectNewOpeningRounds(resumedState, snap, '2026-11-17T20:06:00.000Z');
  assert.equal(resumedResult.newRounds.length, 1);
});

test('risk-control circuit breaker trips on 403 or verify redirect and respects jitter floor', () => {
  const state = createInitialState();
  const now = Date.parse('2026-11-17T21:00:00.000Z');

  const blocked = evaluateRiskResponse(
    200,
    '<html>Redirecting to https://verify.maoyan.com/v2/captcha</html>',
    state.riskState,
    state.riskConfig,
    now
  );
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.nextRiskState.circuitState, 'open');
  assert.equal(blocked.nextRiskState.consecutiveBlocks, 1);
  assert.ok(blocked.nextRiskState.cooldownUntil);

  const cooldownWait = computeNextIntervalMs(state.riskConfig, blocked.nextRiskState, now + 60_000);
  assert.ok(cooldownWait >= 14 * 60_000);

  // Valid 200 resets circuit breaker
  const recovered = evaluateRiskResponse(200, '{"showData":{"movies":[]}}', blocked.nextRiskState, state.riskConfig, now + 900_000);
  assert.equal(recovered.blocked, false);
  assert.equal(recovered.nextRiskState.circuitState, 'closed');
  assert.equal(recovered.nextRiskState.consecutiveBlocks, 0);

  // Jitter floor check (>= 30s)
  const minJitterDelay = computeNextIntervalMs(
    { ...state.riskConfig, baseIntervalSec: 35, jitterSec: 20 },
    recovered.nextRiskState,
    now,
    () => 0
  );
  assert.equal(minJitterDelay, 30_000);
});

test('GitHub workflow generator includes all 3 Dongguan cinemas and starred movies', () => {
  const state = createInitialState();
  const bundle = generateGitHubWorkflowFiles(state);
  assert.match(bundle.monitorScriptJs, /15648/);
  assert.match(bundle.monitorScriptJs, /11092/);
  assert.match(bundle.monitorScriptJs, /26341/);
  assert.match(bundle.monitorScriptJs, /沙丘3：救世主/);
  assert.match(bundle.workflowYaml, /PUSHPLUS_TOKEN/);
  assert.match(bundle.readmeMd, /华为浏览器/);
});
