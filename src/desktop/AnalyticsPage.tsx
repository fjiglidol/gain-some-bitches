import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { BarChart2, Dumbbell, Trophy } from 'lucide-react';
import { startOfWeek, format, addWeeks } from 'date-fns';
import type { HistorySession } from '../data/seedHistory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCENT = '#7BAFC4';
const GRID_STROKE = 'rgba(255,255,255,0.07)';
const AXIS_FILL = 'rgba(255,255,255,0.32)';

function parseDate(dateStr: string): Date {
  return new Date(dateStr.split(' ')[0] + 'T12:00:00');
}

function calcVolume(session: HistorySession): number {
  return session.exercises.reduce((total, ex) => {
    const w = parseFloat(ex.weight) || 0;
    const s = parseInt(ex.sets) || 1;
    const repsStr = String(ex.reps).split(/[-,/]/)[0];
    const r = parseInt(repsStr) || 0;
    return total + w * s * r;
  }, 0);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-sm shadow-lg"
      style={{
        background: 'rgba(10,14,18,0.92)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: ACCENT }}>
          {p.name === 'volume'
            ? `${Number(p.value).toLocaleString()} kg`
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Volume Over Time ─────────────────────────────────────────────────────────

function VolumeChart({ historyData }: { historyData: HistorySession[] }) {
  const data = useMemo(() => {
    return [...historyData]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        date: s.date.split(' ')[0].slice(5), // "MM-DD"
        volume: Math.round(calcVolume(s)),
        fullDate: s.date.split(' ')[0],
        label: s.sessionType,
      }))
      .filter(d => d.volume > 0);
  }, [historyData]);

  if (data.length === 0) return null;

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="date"
            tick={{ fill: AXIS_FILL, fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: AXIS_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(0)}t`}
            width={36}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="volume" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} name="volume" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Sessions Per Week ────────────────────────────────────────────────────────

function SessionsPerWeekChart({ historyData }: { historyData: HistorySession[] }) {
  const data = useMemo(() => {
    if (historyData.length === 0) return [];

    // Group sessions by week start (Mon)
    const weekMap = new Map<string, number>();
    for (const s of historyData) {
      const d = parseDate(s.date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(ws, 'MMM d');
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    }

    // Build sorted array
    const sorted = Array.from(weekMap.entries())
      .sort(([a], [b]) => new Date(a + ' 2026').getTime() - new Date(b + ' 2026').getTime())
      .map(([week, count]) => ({ week, count }));

    return sorted;
  }, [historyData]);

  if (data.length === 0) return null;

  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="week"
            tick={{ fill: AXIS_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: AXIS_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} name="sessions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── PR Tracker ───────────────────────────────────────────────────────────────

interface PREntry {
  exercise: string;
  weight: number;
  date: string;
}

function PRTracker({ historyData }: { historyData: HistorySession[] }) {
  const prs = useMemo((): PREntry[] => {
    const map = new Map<string, PREntry>();
    for (const session of historyData) {
      for (const ex of session.exercises) {
        // Weight may be "70/80/90" — find max
        const weights = ex.weight
          .split('/')
          .map(w => parseFloat(w))
          .filter(w => !isNaN(w) && w > 0);
        if (weights.length === 0) continue;
        const maxW = Math.max(...weights);
        const existing = map.get(ex.exercise);
        if (!existing || maxW > existing.weight) {
          map.set(ex.exercise, {
            exercise: ex.exercise,
            weight: maxW,
            date: session.date.split(' ')[0],
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
  }, [historyData]);

  if (prs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {prs.map((pr, i) => (
        <motion.div
          key={pr.exercise}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="w-7 h-7 rounded-lg dt-icon-bg flex items-center justify-center shrink-0">
            <Trophy className="w-3 h-3 dt-accent-text" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white/75 truncate">{pr.exercise}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{pr.date}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{pr.weight} kg</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export function AnalyticsPage({ historyData }: { historyData: HistorySession[] }) {
  const hasData = historyData.length > 0;
  const volumeData = historyData.filter(s => calcVolume(s) > 0);

  return (
    <motion.div
      key="dt-analytics"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="pt-14 min-h-screen"
    >
      <div className="px-8 py-10 max-w-5xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white/85 mb-1">Analytics</h1>
          <p className="text-sm text-white/30">Volume trends and personal records</p>
        </motion.div>

        {/* Empty state */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="dt-glass-card rounded-2xl py-20 flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl dt-icon-bg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 dt-accent-text opacity-50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50">No data yet</p>
              <p className="text-[12px] text-white/25 mt-1">Complete a workout on mobile to see analytics here.</p>
            </div>
          </motion.div>
        )}

        {hasData && (
          <div className="space-y-5">
            {/* Volume + Sessions Per Week — two-col */}
            <div className="grid grid-cols-[1fr_320px] gap-5">
              {/* Volume over time */}
              {volumeData.length > 0 && (
                <motion.div
                  className="dt-glass-card rounded-2xl px-6 py-5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                >
                  <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30 mb-5">
                    Volume Per Session
                  </h2>
                  <VolumeChart historyData={historyData} />
                </motion.div>
              )}

              {/* Sessions per week */}
              <motion.div
                className="dt-glass-card rounded-2xl px-6 py-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 }}
              >
                <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30 mb-5">
                  Sessions Per Week
                </h2>
                <SessionsPerWeekChart historyData={historyData} />
              </motion.div>
            </div>

            {/* PR Tracker */}
            <motion.div
              className="dt-glass-card rounded-2xl px-6 py-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.24 }}
            >
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30">
                  Personal Records
                </h2>
                <span className="text-[10px] text-white/20">— best single weight per exercise</span>
              </div>
              <PRTracker historyData={historyData} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
