/**
 * DesktopApp — Phase 1 desktop shell.
 * Renders above md (768px) unless force-mobile is enabled in Settings.
 *
 * Palette (pulled from Nordic hero image):
 *   Water-blue accent:  #7BAFC4
 *   Wood-warm accent:   #C4A882
 *   Glass base:         rgba(255,255,255,0.07) / rgba(255,255,255,0.04)
 *   Topbar border:      rgba(255,255,255,0.10)
 *   Text primary:       rgba(255,255,255,0.92)
 *   Text muted:         rgba(255,255,255,0.38)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, BarChart2, Clock, Settings, ChevronRight, Activity } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { mergeHistory, type HistorySession } from '../data/seedHistory';

// ─── Types ────────────────────────────────────────────────────────────────────
type DesktopPage = 'home' | 'history' | 'analytics' | 'settings';

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_LINKS: { page: DesktopPage; label: string }[] = [
  { page: 'home',      label: 'Home'      },
  { page: 'history',   label: 'History'   },
  { page: 'analytics', label: 'Analytics' },
  { page: 'settings',  label: 'Settings'  },
];

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({
  activePage,
  onNav,
}: {
  activePage: DesktopPage;
  onNav: (p: DesktopPage) => void;
}) {
  return (
    <header className="dt-topbar fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-8">
      {/* Logo */}
      <button
        onClick={() => onNav('home')}
        className="flex items-center gap-2.5 mr-auto group"
        aria-label="GSB Home"
      >
        <div className="w-7 h-7 rounded-md dt-accent-bg flex items-center justify-center">
          <Dumbbell className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-mono text-sm font-bold tracking-widest uppercase text-white/90 group-hover:text-white transition-colors">
          GSB
        </span>
      </button>

      {/* Nav links */}
      <nav className="flex items-center gap-1" aria-label="Desktop navigation">
        {NAV_LINKS.map(({ page, label }) => (
          <button
            key={page}
            onClick={() => onNav(page)}
            className={`dt-nav-link relative px-4 py-1.5 text-[13px] font-medium tracking-wide transition-colors rounded-lg ${
              activePage === page
                ? 'dt-nav-active text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {label}
            {activePage === page && (
              <motion.span
                layoutId="dt-nav-indicator"
                className="absolute bottom-[-1px] left-4 right-4 h-[2px] dt-accent-bg rounded-full"
              />
            )}
          </button>
        ))}
      </nav>
    </header>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="dt-glass-card rounded-2xl px-6 py-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">{label}</span>
        <div className="w-7 h-7 rounded-lg dt-icon-bg flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white/92 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-white/35 mt-1.5 leading-snug">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Recent Session Row ───────────────────────────────────────────────────────
function RecentSessionRow({ session, index }: { session: HistorySession; index: number }) {
  const dateLabel = session.date.split(' ')[0];
  const exerciseCount = session.exercises.length;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.45 + index * 0.06 }}
      className="flex items-center gap-4 py-3.5 border-b border-white/5 last:border-0"
    >
      <div className="w-8 h-8 rounded-xl dt-icon-bg flex items-center justify-center shrink-0">
        <Dumbbell className="w-3.5 h-3.5 dt-accent-text" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/85 truncate">{session.sessionType}</p>
        <p className="text-[11px] text-white/35">{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</p>
      </div>
      <span className="text-[11px] text-white/30 font-mono shrink-0">{dateLabel}</span>
    </motion.div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ historyData }: { historyData: HistorySession[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Sessions this week
  const sessionsThisWeek = historyData.filter(s => {
    const d = new Date(s.date.split(' ')[0] + 'T12:00:00');
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  // Total logged sets this week
  const setsThisWeek = sessionsThisWeek.reduce((acc, s) => {
    return acc + s.exercises.reduce((a, e) => a + (parseInt(e.sets || '0') || 0), 0);
  }, 0);

  // Total sessions all time
  const totalSessions = historyData.length;

  // Recent 5 sessions
  const recentSessions = historyData.slice(0, 5);

  return (
    <motion.div
      key="dt-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="pt-14 min-h-screen"
    >
      {/* Hero band */}
      <div className="relative h-[44vh] min-h-[320px] flex items-end pb-12 px-8 overflow-hidden">
        {/* Hero image — layered behind existing fixed bg */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Headline */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase dt-accent-text mb-2">
            {format(today, 'EEEE, MMMM do')}
          </p>
          <h1 className="text-5xl font-bold text-white leading-[1.05] mb-1">
            Train hard,
            <br />
            <span className="dt-accent-text">gain some.</span>
          </h1>
        </motion.div>
      </div>

      {/* Content grid */}
      <div className="px-8 py-8 max-w-6xl mx-auto">

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="This Week"
            value={sessionsThisWeek.length}
            sub={`session${sessionsThisWeek.length !== 1 ? 's' : ''} completed`}
            icon={<Activity className="w-3.5 h-3.5 dt-accent-text" />}
            delay={0.2}
          />
          <StatCard
            label="Sets Logged"
            value={setsThisWeek}
            sub="this week"
            icon={<BarChart2 className="w-3.5 h-3.5 dt-accent-text" />}
            delay={0.27}
          />
          <StatCard
            label="All Time"
            value={totalSessions}
            sub="total sessions"
            icon={<Clock className="w-3.5 h-3.5 dt-accent-text" />}
            delay={0.34}
          />
        </div>

        {/* Two-col: recent sessions + placeholder card */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Recent sessions */}
          <motion.div
            className="dt-glass-card rounded-2xl px-6 py-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/35">
                Recent Sessions
              </h2>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
            </div>
            {recentSessions.length > 0 ? (
              recentSessions.map((s, i) => (
                <RecentSessionRow key={`${s.date}-${s.sessionType}`} session={s} index={i} />
              ))
            ) : (
              <p className="text-sm text-white/25 py-6 text-center">No sessions yet.</p>
            )}
          </motion.div>

          {/* This Week placeholder card */}
          <motion.div
            className="dt-glass-card rounded-2xl px-6 py-5 flex flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.42 }}
          >
            <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/35 mb-4">
              This Week
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
              <div className="w-12 h-12 rounded-2xl dt-icon-bg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 dt-accent-text opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/50">Weekly breakdown</p>
                <p className="text-[11px] text-white/25 mt-1">Coming in phase 2</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stub Page ────────────────────────────────────────────────────────────────
function StubPage({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <motion.div
      key={`dt-${label}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pt-14 min-h-screen flex items-center justify-center"
    >
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl dt-icon-bg flex items-center justify-center mx-auto mb-5">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-white/80 mb-2">{label}</h2>
        <p className="text-sm text-white/30">Coming in phase 2</p>
      </div>
    </motion.div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({
  forceMobile,
  onToggleForceMobile,
}: {
  forceMobile: boolean;
  onToggleForceMobile: () => void;
}) {
  return (
    <motion.div
      key="dt-settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pt-14 min-h-screen"
    >
      <div className="px-8 py-12 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-2xl font-bold text-white/85 mb-1">Settings</h1>
          <p className="text-sm text-white/30 mb-8">Preferences and display options</p>
        </motion.div>

        <motion.div
          className="dt-glass-card rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {/* Section: Display */}
          <div className="px-6 pt-5 pb-2">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Display</p>
          </div>

          {/* Force mobile toggle */}
          <div className="px-6 py-4 flex items-center gap-4 border-t border-white/5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white/80">Force mobile view</p>
              <p className="text-[11px] text-white/35 mt-0.5 leading-snug">
                Preview the mobile layout on this desktop window. Reload persists the setting.
              </p>
            </div>
            {/* Toggle */}
            <button
              role="switch"
              aria-checked={forceMobile}
              onClick={onToggleForceMobile}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                forceMobile ? 'dt-accent-bg' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  forceMobile ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </motion.div>

        {/* App info */}
        <motion.div
          className="dt-glass-card rounded-2xl overflow-hidden mt-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          <div className="px-6 pt-5 pb-2">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">About</p>
          </div>
          <div className="px-6 py-4 border-t border-white/5">
            <p className="text-sm font-semibold text-white/80">GSB Workout Tracker</p>
            <p className="text-[11px] text-white/35 mt-0.5">Phase 1 — Desktop shell</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── DesktopApp (root) ────────────────────────────────────────────────────────
export default function DesktopApp({
  forceMobile,
  onToggleForceMobile,
}: {
  forceMobile: boolean;
  onToggleForceMobile: () => void;
}) {
  const [page, setPage] = useState<DesktopPage>('home');
  const [historyData, setHistoryData] = useState<HistorySession[]>([]);

  // Load history — same logic as mobile (API → localStorage + seed)
  useEffect(() => {
    fetch('/api/history')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setHistoryData(d.sessions || []))
      .catch(() => {
        const stored = localStorage.getItem('gsb_history');
        let local: HistorySession[] = [];
        try { local = stored ? JSON.parse(stored) : []; } catch {}
        setHistoryData(mergeHistory(local));
      });
  }, []);

  return (
    <div className="min-h-screen font-sans text-white dt-root">
      {/* Fixed hero background — desktop only */}
      <div className="dt-hero-bg" />
      {/* Subtle dark veil over background so content is readable */}
      <div className="dt-hero-overlay" />

      <TopBar activePage={page} onNav={setPage} />

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {page === 'home' && <HomePage key="home" historyData={historyData} />}
          {page === 'history' && (
            <StubPage key="history" label="History" icon={<Clock className="w-6 h-6 dt-accent-text opacity-70" />} />
          )}
          {page === 'analytics' && (
            <StubPage key="analytics" label="Analytics" icon={<BarChart2 className="w-6 h-6 dt-accent-text opacity-70" />} />
          )}
          {page === 'settings' && (
            <SettingsPage
              key="settings"
              forceMobile={forceMobile}
              onToggleForceMobile={onToggleForceMobile}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
