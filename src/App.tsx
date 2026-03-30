/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Timer,
  CheckCircle2,
  X,
  Play,
  Pause,
  RotateCcw,
  Dumbbell,
  ArrowRight,
  History,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import programmeData from './data/programme.json';
import { Programme, Session, Exercise, SetEntry, SessionProgress } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const programme = programmeData as Programme;

/** Scrolling text — only animates when the text overflows its container */
function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        setOverflow(diff > 2 ? diff : 0);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text]);

  // Speed: ~40px per second for consistent readability
  const duration = overflow > 0 ? overflow / 40 : 0;

  return (
    <div ref={containerRef} className="overflow-hidden min-w-0">
      <motion.span
        ref={textRef}
        className={cn("inline-block whitespace-nowrap", className)}
        animate={overflow > 0 ? {
          x: [0, 0, -overflow, -overflow, 0],
        } : { x: 0 }}
        transition={overflow > 0 ? {
          x: {
            duration: duration + 3,
            times: [0, 0.15, 0.5, 0.85, 1],
            repeat: Infinity,
            ease: "linear",
          }
        } : undefined}
      >
        {text}
      </motion.span>
    </div>
  );
}

/**
 * Returns a flat exercise list for any session type.
 * - Standard sessions: returns session.exercises
 * - Cardio day (structure): extracts exercises from core circuit block
 * - Day 7 (options): returns empty array (rest day, not trackable)
 */
function getSessionExercises(session: Session): Exercise[] {
  if (session.exercises) return session.exercises;
  if (session.structure) {
    // Pull trackable exercises from core circuit block
    const coreCircuit = session.structure.block_3_core_circuit;
    if (coreCircuit?.exercises) return coreCircuit.exercises;
    return [];
  }
  return [];
}

/** Whether a session is a structured cardio day (intervals + steady state) */
function isCardioDay(session: Session): boolean {
  return !!session.structure && !session.exercises;
}

/** Whether a session is a rest/options day (day_7) */
function isRestDay(session: Session): boolean {
  return !!session.options && !session.exercises;
}

export default function App() {
  const [screen, setScreen] = useState<'select' | 'workout' | 'summary'>('select');
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);
  const [setData, setSetData] = useState<{ [exIdx: number]: SetEntry[] }>({});
  const [skipped, setSkipped] = useState<{ [exIdx: number]: boolean }>({});
  const [elapsed, setElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [restTimer, setRestTimer] = useState<{ active: boolean; remaining: number; total: number; exName: string }>({
    active: false,
    remaining: 0,
    total: 0,
    exName: ''
  });

  const [historyData, setHistoryData] = useState<{ date: string; sessionType: string; exercises: { exercise: string; weight: string; sets: string; reps: string; notes: string }[] }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount — try API first, fall back to localStorage
  useEffect(() => {
    fetch('/api/history')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setHistoryData(d.sessions || []))
      .catch(() => {
        // Offline / GitHub Pages — load from localStorage
        const stored = localStorage.getItem('gsb_history');
        if (stored) {
          try { setHistoryData(JSON.parse(stored)); } catch {}
        }
      });
  }, [screen]);

  // Load saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('liftoff_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SessionProgress;
        // Optional: Check if saved session is recent (e.g., within 12 hours)
        if (Date.now() - parsed.savedAt < 12 * 60 * 60 * 1000) {
          // We could show a "Resume" prompt here, but for now let's just keep it in memory
          // and only resume if the user clicks a specific button.
        }
      } catch (e) {
        console.error('Failed to parse saved session', e);
      }
    }
  }, []);

  // Session Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Rest Timer Logic
  useEffect(() => {
    if (restTimer.active && restTimer.remaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(prev => ({ ...prev, remaining: prev.remaining - 1 }));
      }, 1000);
    } else if (restTimer.remaining <= 0 && restTimer.active) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      setRestTimer(prev => ({ ...prev, active: false }));
      // Vibrate if supported
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restTimer.active, restTimer.remaining]);

  const saveProgress = (key: string, data: typeof setData, skip: typeof skipped, time: number) => {
    const progress: SessionProgress = {
      sessionKey: key,
      setData: data,
      skipped: skip,
      elapsed: time,
      savedAt: Date.now()
    };
    localStorage.setItem('liftoff_session', JSON.stringify(progress));
  };

  const startSession = (key: string, resume = false) => {
    const session = programme.sessions[key];
    if (!session) return;

    if (resume) {
      const saved = localStorage.getItem('liftoff_session');
      if (saved) {
        const parsed = JSON.parse(saved) as SessionProgress;
        setCurrentSessionKey(parsed.sessionKey);
        setSetData(parsed.setData);
        setSkipped(parsed.skipped);
        setElapsed(parsed.elapsed);
      }
    } else {
      setCurrentSessionKey(key);
      const initialSetData: { [idx: number]: SetEntry[] } = {};
      const exercises = getSessionExercises(session);
      exercises.forEach((ex, idx) => {
        initialSetData[idx] = Array.from({ length: ex.sets || 1 }, () => ({
          weight: '',
          reps: '',
          note: '',
          logged: false
        }));
      });
      setSetData(initialSetData);
      setSkipped({});
      setElapsed(0);
    }
    
    setIsTimerRunning(true);
    setScreen('workout');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    setIsTimerRunning(false);
    setScreen('summary');
    localStorage.removeItem('liftoff_session');
    await saveToICloud();
  };

  const generateCSV = () => {
    if (!currentSessionKey) return '';
    const session = programme.sessions[currentSessionKey];
    const header = 'Date,Session_Type,Exercise,Weight_kg,Sets,Reps,Notes';
    const dateStr = format(new Date(), 'yyyy-MM-dd (EEE)');
    const sessionType = session.label.split(' — ')[1] || session.label;
    
    const exercises = getSessionExercises(session);
    const lines = [header];
    exercises.forEach((ex, idx) => {
      if (skipped[idx]) return;
      const sets = setData[idx] || [];
      const loggedSets = sets.filter(s => s.weight !== '' || s.reps !== '');
      if (loggedSets.length === 0) return;

      const weights = loggedSets.map(s => s.weight || '0').join('/');
      const reps = loggedSets.map(s => s.reps || (ex.duration_seconds ? `${ex.duration_seconds}s` : '0')).join('/');
      const notes = loggedSets.map(s => s.note).filter(Boolean).join('; ');
      
      lines.push(`"${dateStr}","${sessionType}","${ex.name}","${weights}",${loggedSets.length},"${reps}","${notes}"`);
    });

    return lines.join('\n');
  };

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveToICloud = async () => {
    const csv = generateCSV();
    if (!csv || csv.split('\n').length <= 1) return;
    if (!currentSessionKey) return;

    // Always save to localStorage (works offline / GitHub Pages)
    const session = programme.sessions[currentSessionKey];
    const sessionType = session.label.split(' — ')[1] || session.label;
    const dateStr = format(new Date(), 'yyyy-MM-dd (EEE)');
    const exercises = getSessionExercises(session);
    const loggedExercises = exercises
      .map((ex, idx) => {
        if (skipped[idx]) return null;
        const sets = setData[idx] || [];
        const logged = sets.filter(s => s.weight !== '' || s.reps !== '');
        if (logged.length === 0) return null;
        return {
          exercise: ex.name,
          weight: logged.map(s => s.weight || '0').join('/'),
          sets: String(logged.length),
          reps: logged.map(s => s.reps || '0').join('/'),
          notes: logged.map(s => s.note).filter(Boolean).join('; ')
        };
      })
      .filter(Boolean) as { exercise: string; weight: string; sets: string; reps: string; notes: string }[];

    const newSession = { date: dateStr, sessionType, exercises: loggedExercises };
    const stored = localStorage.getItem('gsb_history');
    const existing = stored ? JSON.parse(stored) : [];
    existing.unshift(newSession);
    localStorage.setItem('gsb_history', JSON.stringify(existing));

    setSavingStatus('saving');
    try {
      const res = await fetch('/api/save-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv })
      });
      if (res.ok) {
        setSavingStatus('saved');
      } else {
        // API unavailable (GitHub Pages) — localStorage save is enough
        setSavingStatus('saved');
      }
    } catch {
      // Offline — already saved to localStorage
      setSavingStatus('saved');
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-violet-500/30 selection:text-white relative">
      <div className="app-bg" />

      <div className="relative z-10">
      <AnimatePresence mode="wait">
        {screen === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto px-5 py-10"
          >
            <header className="mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">Gain Some Bitches</h1>
              <p className="text-white/50 font-medium">{format(new Date(), 'EEEE, MMMM do')}</p>
            </header>

            <div className="grid gap-3">
              {Object.entries(programme.sessions).map(([key, session]) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startSession(key)}
                  className="group relative flex flex-col items-start p-5 glass rounded-2xl hover:bg-white/12 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-violet-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5">{session.focus}</span>
                  <h3 className="text-lg font-bold text-white mb-3">{session.label}</h3>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                      <Timer className="w-3 h-3 mr-1" />
                      {session.estimated_duration_minutes}m
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                      <Dumbbell className="w-3 h-3 mr-1" />
                      {isCardioDay(session)
                        ? 'Cardio'
                        : isRestDay(session)
                        ? 'Rest Day'
                        : `${getSessionExercises(session).length} Exercises`}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Past Workouts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full flex flex-col items-start p-5 glass-pink rounded-2xl hover:bg-pink-500/15 transition-all text-left overflow-hidden"
              >
                <div className="w-full flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Past Workouts</span>
                  <motion.div animate={{ rotate: historyOpen ? 90 : 0 }}>
                    <ChevronRight className="w-5 h-5 text-pink-400/60" />
                  </motion.div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Workout History</h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-pink-500/15 text-[11px] font-semibold text-pink-300">
                  <History className="w-3 h-3 mr-1" />
                  {historyData.length} Sessions
                </span>
              </button>

              <AnimatePresence>
                {historyOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {historyData.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-sm">No workouts logged yet</div>
                      ) : (
                        historyData.map((session, i) => (
                          <HistoryCard key={i} session={session} />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {screen === 'workout' && currentSessionKey && (
          <motion.div
            key="workout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-32"
          >
            <header className="sticky top-0 z-30 glass-header px-6 py-4">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm('Exit workout? Progress will be saved.')) {
                      saveProgress(currentSessionKey, setData, skipped, elapsed);
                      setScreen('select');
                    }
                  }}
                  className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight">
                    {programme.sessions[currentSessionKey].label.split(' — ')[1]}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isTimerRunning ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )} />
                    <span className="text-lg font-bold tabular-nums text-white/80">{formatTime(elapsed)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-2 -mr-2 text-white/50 hover:text-white transition-colors"
                >
                  {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            </header>

            <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
              {getSessionExercises(programme.sessions[currentSessionKey]).map((ex, idx) => (
                <ExerciseCard
                  key={idx}
                  idx={idx}
                  exercise={ex}
                  sets={setData[idx] || []}
                  isSkipped={skipped[idx]}
                  onUpdateSet={(si, field, val) => {
                    const newData = { ...setData };
                    newData[idx][si] = { ...newData[idx][si], [field]: val };
                    setSetData(newData);
                    saveProgress(currentSessionKey, newData, skipped, elapsed);
                  }}
                  onToggleSkip={() => {
                    const newSkipped = { ...skipped, [idx]: !skipped[idx] };
                    setSkipped(newSkipped);
                    saveProgress(currentSessionKey, setData, newSkipped, elapsed);
                  }}
                  onAddSet={() => {
                    const newData = { ...setData };
                    newData[idx].push({ weight: '', reps: '', note: '', logged: false });
                    setSetData(newData);
                  }}
                  onAddDropSet={() => {
                    const newData = { ...setData };
                    const currentSets = newData[idx];
                    const lastFilledSet = [...currentSets].reverse().find(s => s.weight !== '');
                    const dropWeight = lastFilledSet
                      ? String(Math.round(parseFloat(lastFilledSet.weight) * 0.8 * 2) / 2)
                      : '';
                    currentSets.push({ weight: dropWeight, reps: '', note: 'drop set', logged: false, isDropSet: true });
                    setSetData(newData);
                    saveProgress(currentSessionKey, newData, skipped, elapsed);
                  }}
                  onStartRest={(secs) => {
                    setRestTimer({ active: true, remaining: secs, total: secs, exName: ex.name });
                  }}
                />
              ))}
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-5 bottom-fade pointer-events-none">
              <div className="max-w-2xl mx-auto pointer-events-auto flex gap-3">
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setScreen('select');
                    localStorage.removeItem('liftoff_session');
                  }}
                  className="flex-1 glass text-white/60 font-bold py-4 rounded-2xl hover:bg-white/15 transition-all active:scale-[0.98]"
                >
                  Quit Session
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-[2] bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all active:scale-[0.98]"
                >
                  Finish Workout
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'summary' && currentSessionKey && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto px-5 py-12"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full mb-6 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-2">Workout Complete!</h1>
              <p className="text-white/50 font-medium">Excellent work today.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-12">
              <div className="glass p-5 rounded-2xl text-center">
                <span className="block text-2xl font-black text-white">{Math.round(elapsed / 60)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Minutes</span>
              </div>
              <div className="glass p-5 rounded-2xl text-center">
                <span className="block text-2xl font-black text-white">
                  {Object.values(setData).flat().filter(s => s.weight !== '' || s.reps !== '').length}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sets</span>
              </div>
              <div className="glass p-5 rounded-2xl text-center">
                <span className="block text-2xl font-black text-white">
                  {getSessionExercises(programme.sessions[currentSessionKey]).filter((_, i) => !skipped[i]).length}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Exercises</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className={cn(
                "w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl transition-all",
                savingStatus === 'saving' && "glass text-white/50",
                savingStatus === 'saved' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                savingStatus === 'error' && "bg-red-500/15 text-red-400 border border-red-500/30",
                savingStatus === 'idle' && "glass text-white/30"
              )}>
                {savingStatus === 'saving' && (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                )}
                {savingStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Workout saved
                  </>
                )}
                {savingStatus === 'error' && (
                  <button onClick={saveToICloud} className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Save failed — tap to retry
                  </button>
                )}
              </div>
              <button
                onClick={() => setScreen('select')}
                className="w-full glass-strong text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {restTimer.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 glass-overlay flex flex-col items-center justify-center p-8"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Rest Period</span>
            <h3 className="text-xl font-bold text-white mb-12 text-center">{restTimer.exName}</h3>

            <div className="relative w-64 h-64 mb-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  fill="none" stroke="currentColor"
                  strokeWidth="4" className="text-white/10"
                />
                <motion.circle
                  cx="50" cy="50" r="45"
                  fill="none" stroke="currentColor"
                  strokeWidth="4" className="text-violet-500"
                  strokeDasharray="283"
                  animate={{ strokeDashoffset: 283 - (283 * (restTimer.remaining / restTimer.total)) }}
                  transition={{ duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black tabular-nums text-white">{restTimer.remaining}</span>
                <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">Seconds</span>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-xs">
              <button
                onClick={() => setRestTimer(prev => ({ ...prev, active: false }))}
                className="flex-1 glass text-white/70 font-bold py-4 rounded-2xl hover:bg-white/15 transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => setRestTimer(prev => ({ ...prev, remaining: prev.remaining + 30, total: prev.total + 30 }))}
                className="flex-1 bg-violet-600 text-white font-bold py-4 rounded-2xl hover:bg-violet-500 transition-all"
              >
                +30s
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function ExerciseCard({
  idx,
  exercise,
  sets,
  isSkipped,
  onUpdateSet,
  onToggleSkip,
  onAddSet,
  onAddDropSet,
  onStartRest
}: {
  idx: number;
  exercise: Exercise;
  sets: SetEntry[];
  isSkipped: boolean;
  onUpdateSet: (si: number, field: keyof SetEntry, val: any) => void;
  onToggleSkip: () => void;
  onAddSet: () => void;
  onAddDropSet: () => void;
  onStartRest: (secs: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(idx === 0);
  const isComplete = sets.every(s => s.weight !== '' && s.reps !== '');

  return (
    <motion.div
      layout
      className={cn(
        "glass rounded-3xl transition-all overflow-hidden",
        isSkipped ? "opacity-50" : isComplete ? "border-emerald-500/30" : ""
      )}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-start gap-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {exercise.superset_group && (
              <span className="text-[10px] font-black bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {exercise.superset_group}
              </span>
            )}
            <MarqueeText text={exercise.name} className="text-lg font-bold text-white" />
          </div>
          <p className="text-xs font-medium text-white/40">
            {exercise.sets ? `${exercise.sets} sets • ` : ''}{exercise.reps || (exercise.duration_seconds ? `${exercise.duration_seconds}s` : '')}{exercise.rest_seconds ? ` • ${exercise.rest_seconds}s rest` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSkip(); }}
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full border transition-all",
              isSkipped ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
            )}
          >
            {isSkipped ? 'Skipped' : 'Skip'}
          </button>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && !isSkipped && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5"
          >
            {exercise.notes && (
              <div className="mb-4 p-3 bg-violet-500/10 rounded-xl border-l-4 border-violet-500 text-xs text-white/60 leading-relaxed">
                {exercise.notes}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-[28px_1fr_1fr_1.5fr] gap-2 px-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Set</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Weight</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Reps</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Note</span>
              </div>
              {sets.map((set, si) => (
                <div key={si} className="grid grid-cols-[28px_1fr_1fr_1.5fr] gap-2 items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                    set.isDropSet && set.weight && set.reps ? "bg-amber-500/20 text-amber-400" :
                    set.weight && set.reps ? "bg-emerald-500/20 text-emerald-400" :
                    set.isDropSet ? "bg-amber-500/10 text-amber-400/50 border border-dashed border-amber-500/30" :
                    "bg-white/10 text-white/30"
                  )}>
                    {set.isDropSet ? <ChevronDown className="w-3.5 h-3.5" /> : si + 1}
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={set.weight}
                    onChange={(e) => onUpdateSet(si, 'weight', e.target.value)}
                    className="w-full glass-input rounded-xl py-2 px-1 text-center text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={exercise.type === 'timed' ? 'sec' : 'reps'}
                    value={set.reps}
                    onChange={(e) => onUpdateSet(si, 'reps', e.target.value)}
                    className="w-full glass-input rounded-xl py-2 px-1 text-center text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="note"
                    value={set.note}
                    onChange={(e) => onUpdateSet(si, 'note', e.target.value)}
                    className="bg-transparent border-none text-xs text-white/40 placeholder:text-white/15 focus:outline-none focus:text-white/70"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onAddSet}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white/70 font-bold py-3 rounded-xl hover:bg-white/15 transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Set
              </button>
              <button
                onClick={onAddDropSet}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-400 font-bold py-3 rounded-xl hover:bg-amber-500/25 transition-all text-xs"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Drop Set
              </button>
              {exercise.rest_seconds ? (
                <button
                  onClick={() => onStartRest(exercise.rest_seconds!)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 font-bold py-3 rounded-xl hover:bg-emerald-500/25 transition-all text-xs"
                >
                  <Timer className="w-3.5 h-3.5" />
                  Rest {exercise.rest_seconds}s
                </button>
              ) : (
                <button
                  onClick={() => onStartRest(60)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 font-bold py-3 rounded-xl hover:bg-emerald-500/25 transition-all text-xs"
                >
                  <Timer className="w-3.5 h-3.5" />
                  Rest 60s
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistoryCard({ session }: { session: { date: string; sessionType: string; exercises: { exercise: string; weight: string; sets: string; reps: string; notes: string }[] } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-pink rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-pink-500/10 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-sm font-bold text-white">{session.date}</span>
          </div>
          <span className="text-xs font-semibold text-pink-400">{session.sessionType}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/40">{session.exercises.length} exercises</span>
          <motion.div animate={{ rotate: open ? 90 : 0 }}>
            <ChevronRight className="w-4 h-4 text-pink-400/50" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-pink-500/20"
          >
            <div className="p-4 space-y-2">
              {session.exercises.map((ex, i) => (
                <div key={i} className="flex items-start justify-between py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/80 truncate">{ex.exercise}</p>
                    {ex.notes && <p className="text-[10px] text-white/30 truncate">{ex.notes}</p>}
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className="text-sm font-bold text-pink-400">{ex.weight || '—'}</span>
                    <span className="text-[10px] text-white/40 ml-1">kg</span>
                    <span className="text-xs text-white/30 mx-1">×</span>
                    <span className="text-sm font-bold text-white/70">{ex.reps || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
