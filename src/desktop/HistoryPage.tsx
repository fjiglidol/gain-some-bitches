import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Dumbbell, Calendar, Filter } from 'lucide-react';
import type { HistorySession } from '../data/seedHistory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  return new Date(dateStr.split(' ')[0] + 'T12:00:00');
}

function calcVolume(session: HistorySession): number {
  return session.exercises.reduce((total, ex) => {
    const w = parseFloat(ex.weight) || 0;
    const s = parseInt(ex.sets) || 1;
    // reps may be "8-12" or "10" — take first number
    const repsStr = String(ex.reps).split(/[-,/]/)[0];
    const r = parseInt(repsStr) || 0;
    return total + w * s * r;
  }, 0);
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
  return `${v.toLocaleString()} kg`;
}

function uniqueTypes(sessions: HistorySession[]): string[] {
  const s = new Set(sessions.map(s => s.sessionType));
  return ['All', ...Array.from(s).sort()];
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────

function SessionDetailModal({
  session,
  onClose,
}: {
  session: HistorySession;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: 'rgba(6,10,14,0.75)', backdropFilter: 'blur(12px)' }} />

        <motion.div
          className="dt-glass-card rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col relative z-10"
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/08 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/35 mb-1">
                  {session.date.split(' ')[0]}
                </p>
                <h2 className="text-lg font-bold text-white/90">{session.sessionType}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-white/08 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-4 mt-3">
              <span className="text-[11px] text-white/35">{session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}</span>
              <span className="text-[11px] text-white/35">
                {formatVolume(calcVolume(session))} total volume
              </span>
            </div>
          </div>

          {/* Exercise list */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {session.exercises.map((ex, i) => (
              <div key={i} className="rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px' }}>
                <p className="text-sm font-semibold text-white/85 mb-2">{ex.exercise}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {ex.weight && (
                    <span className="text-[12px] text-white/50">
                      <span className="text-white/25 mr-1">weight</span>{ex.weight} kg
                    </span>
                  )}
                  {ex.sets && (
                    <span className="text-[12px] text-white/50">
                      <span className="text-white/25 mr-1">sets</span>{ex.sets}
                    </span>
                  )}
                  {ex.reps && (
                    <span className="text-[12px] text-white/50">
                      <span className="text-white/25 mr-1">reps</span>{ex.reps}
                    </span>
                  )}
                </div>
                {ex.notes && (
                  <p className="text-[11px] text-white/30 mt-2 leading-snug italic">{ex.notes}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  index,
  onOpen,
}: {
  session: HistorySession;
  index: number;
  onOpen: () => void;
}) {
  const volume = calcVolume(session);
  const dateLabel = session.date.split(' ')[0];
  const dayLabel = session.date.split(' ')[1] ?? '';

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onOpen}
      className="w-full text-left group"
    >
      <div
        className="grid items-center gap-4 px-5 py-4 rounded-xl transition-colors duration-150 cursor-pointer"
        style={{
          gridTemplateColumns: '1fr 140px 100px 80px 32px',
          background: 'rgba(255,255,255,0.0)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.0)')}
      >
        {/* Session type */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg dt-icon-bg flex items-center justify-center shrink-0">
            <Dumbbell className="w-3 h-3 dt-accent-text" />
          </div>
          <p className="text-sm font-semibold text-white/85 truncate">{session.sessionType}</p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-white/20 shrink-0" />
          <span className="text-[12px] font-mono text-white/45">{dateLabel}</span>
          <span className="text-[11px] text-white/20">{dayLabel}</span>
        </div>

        {/* Volume */}
        <span className="text-[12px] font-mono text-white/60 tabular-nums">
          {volume > 0 ? formatVolume(volume) : '—'}
        </span>

        {/* Exercises */}
        <span className="text-[12px] text-white/40 tabular-nums">
          {session.exercises.length} ex
        </span>

        {/* Arrow */}
        <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
    </motion.button>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────

export function HistoryPage({ historyData }: { historyData: HistorySession[] }) {
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);

  const sessionTypes = useMemo(() => uniqueTypes(historyData), [historyData]);

  const filtered = useMemo(() => {
    if (selectedType === 'All') return historyData;
    return historyData.filter(s => s.sessionType === selectedType);
  }, [historyData, selectedType]);

  return (
    <motion.div
      key="dt-history"
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
          className="mb-7"
        >
          <h1 className="text-2xl font-bold text-white/85 mb-1">History</h1>
          <p className="text-sm text-white/30">All logged sessions</p>
        </motion.div>

        {/* Filters */}
        {historyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="flex items-center gap-2 mb-5 flex-wrap"
          >
            <Filter className="w-3.5 h-3.5 text-white/25 shrink-0" />
            {sessionTypes.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                  selectedType === t
                    ? 'dt-accent-bg text-white'
                    : 'text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </motion.div>
        )}

        {/* Table */}
        {historyData.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="dt-glass-card rounded-2xl py-20 flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl dt-icon-bg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 dt-accent-text opacity-50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50">No sessions logged yet</p>
              <p className="text-[12px] text-white/25 mt-1">Complete a workout on mobile to see it here.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="dt-glass-card rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
          >
            {/* Column headers */}
            <div
              className="grid items-center gap-4 px-5 py-3 border-b border-white/06"
              style={{ gridTemplateColumns: '1fr 140px 100px 80px 32px' }}
            >
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25">Session</span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25">Date</span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25">Volume</span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25">Exercises</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/04">
              {filtered.length === 0 ? (
                <p className="text-sm text-white/30 py-10 text-center">No sessions match this filter.</p>
              ) : (
                filtered.map((s, i) => (
                  <SessionRow
                    key={`${s.date}|${s.sessionType}`}
                    session={s}
                    index={i}
                    onOpen={() => setSelectedSession(s)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail modal */}
      {selectedSession && (
        <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </motion.div>
  );
}
