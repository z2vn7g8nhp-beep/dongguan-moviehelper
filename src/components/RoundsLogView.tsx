import React, { useMemo, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import type { MonitorAppState } from '../shared/types';

interface RoundsLogViewProps {
  state: MonitorAppState;
}

export const RoundsLogView: React.FC<RoundsLogViewProps> = ({ state }) => {
  const [cinemaFilter, setCinemaFilter] = useState<string>('all');
  const [movieFilter, setMovieFilter] = useState<string>('all');

  const filteredRounds = useMemo(() => {
    return state.alertRounds.filter((round) => {
      if (movieFilter !== 'all' && round.movieId !== movieFilter) return false;
      if (cinemaFilter !== 'all' && !round.cinemaNames.includes(cinemaFilter)) return false;
      return true;
    });
  }, [state.alertRounds, cinemaFilter, movieFilter]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          多轮开票提醒记录
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          每次检测到星标影片在东莞三家影院放出新场次，系统按轮次编号归档，不会因第一轮已开票而停止后续提醒
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setCinemaFilter('all')}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              cinemaFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            全部影院
          </button>
          {state.cinemas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCinemaFilter(c.shortName)}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                cinemaFilter === c.shortName
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {c.shortName}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>影片筛选</span>
          <select
            value={movieFilter}
            onChange={(e) => setMovieFilter(e.target.value)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">全部星标影片</option>
            {state.movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredRounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            暂无符合条件的开票提醒轮次
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            可在监控看板点击“模拟新一轮开票”或等待 60 秒自动探测捕获新场次
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRounds.map((round) => (
            <article
              key={round.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      第 {round.roundNumber} 轮开票 · {round.movieTitle}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      影院：{round.cinemaNames.join(' / ')}
                      <span aria-hidden="true"> · </span>
                      新增 {round.newShowtimes.length} 个场次
                      <span aria-hidden="true"> · </span>
                      {round.source === 'maoyan_live' ? '猫眼实时抓取' : '沙盒演练捕获'}
                    </p>
                  </div>
                </div>
                <time className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {new Date(round.detectedAt).toLocaleString('zh-CN', { hour12: false })}
                </time>
              </div>

              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-2 pr-4 font-semibold">影院</th>
                      <th className="py-2 pr-4 font-semibold">放映日期与时间</th>
                      <th className="py-2 pr-4 font-semibold">影厅 / 制式</th>
                      <th className="py-2 pr-4 font-semibold">语言版本</th>
                      <th className="py-2 text-right font-semibold">参考票价</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {round.newShowtimes.map((slot, idx) => (
                      <tr key={`${round.id}-${idx}`} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                          {slot.cinemaName}
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">
                          {slot.showDate} {slot.showTime}
                        </td>
                        <td className="py-2.5 pr-4">
                          {slot.hallName} · {slot.format}
                        </td>
                        <td className="py-2.5 pr-4">{slot.language}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {slot.priceYuan ? `¥${slot.priceYuan}` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {round.deliveryResults.length > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  {round.deliveryResults.map((d, i) => (
                    <span
                      key={`${round.id}-del-${i}`}
                      className={`inline-flex items-center gap-1.5 ${
                        d.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {d.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      <span>
                        {d.channel}: {d.message}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
