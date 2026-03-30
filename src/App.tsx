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
  Calendar,
  Share2,
  Download,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Zap,
  Moon,
  Star,
  Activity,
  ChevronUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import programmeData from './data/programme.json';
import { Programme, Session, Exercise, SetEntry, SessionProgress } from './types';
import {
  evaluateSession,
  getRecommendedWeights,
  computeFatigueScore,
  loadCoachingState,
  saveCoachingState,
  PostSessionFeedback,
  SessionEvaluation,
  CoachingState,
  FatigueLevel,
  ExerciseFlag
} from './coachingEngine';

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
  const [screen, setScreen] = useState<'select' | 'workout' | 'feedback' | 'coach_review' | 'summary'>('select');
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

  // Coaching state
  const [coachingState, setCoachingState] = useState<CoachingState>(() => loadCoachingState());
  const [pendingFeedback, setPendingFeedback] = useState<PostSessionFeedback | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<SessionEvaluation | null>(null);
  const [recommendedWeights, setRecommendedWeights] = useState<Record<string, number | null>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Seed history: pre-existing sessions that were logged before the app tracked via localStorage
  const seedHistory = [
    { date: '2026-03-21 (Sat)', sessionType: 'Push', exercises: [
      { exercise: 'Bench Press (warm-up ramp)', weight: '60', sets: '1', reps: '', notes: 'Comeback after 2-week break; ramped from 60 to 80' },
      { exercise: 'Bench Press', weight: '80', sets: '1', reps: 'n/a', notes: 'Felt tough; 2-week break caused strength drop from 90kg PR' },
      { exercise: 'Bench Press', weight: '70', sets: '1', reps: '6', notes: 'Felt ok/controlled' },
      { exercise: 'Incline Dumbbell Press', weight: '40', sets: '3', reps: '8-12', notes: 'Dropped weight; slow and controlled reps' },
      { exercise: 'Seated Shoulder Press (machine)', weight: '12/10/8', sets: '3', reps: '', notes: 'Drop set: 12->10->8 kg' },
      { exercise: 'Cable Chest Fly', weight: '', sets: '3', reps: '12-15', notes: 'Added for inner chest contraction focus' },
      { exercise: 'Hanging Leg Raises', weight: '', sets: '3', reps: '8-15', notes: 'Ab finisher' },
      { exercise: 'Cable Crunch', weight: '', sets: '3', reps: '10-15', notes: 'Ab finisher' },
      { exercise: 'Plank', weight: '', sets: '2', reps: '30-45s', notes: 'Ab finisher' },
      { exercise: 'Incline Walk', weight: '', sets: '1', reps: '15 min', notes: 'Post-workout cardio' },
    ]},
    { date: '2026-03-23 (Mon)', sessionType: 'Push', exercises: [
      { exercise: 'Barbell Bench Press', weight: '90', sets: '1', reps: '8', notes: 'Hit pre-break PR. Strong momentum.' },
    ]},
  ];

  // Load history on mount — try API first, fall back to localStorage
  useEffect(() => {
    fetch('/api/history')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setHistoryData(d.sessions || []))
      .catch(() => {
        // Offline / GitHub Pages — load from localStorage
        const stored = localStorage.getItem('gsb_history');
        let sessions: typeof historyData = [];
        if (stored) {
          try { sessions = JSON.parse(stored); } catch {}
        }
        // Merge seed history (avoid duplicates by date+sessionType)
        const existingKeys = new Set(sessions.map(s => s.date + '|' + s.sessionType));
        for (const seed of seedHistory) {
          if (!existingKeys.has(seed.date + '|' + seed.sessionType)) {
            sessions.push(seed);
          }
        }
        // Sort by date descending
        sessions.sort((a, b) => b.date.localeCompare(a.date));
        setHistoryData(sessions);
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

      // Compute ghost weights for all weighted exercises
      const ghosts: Record<string, number | null> = {};
      const coaching = loadCoachingState();
      exercises.forEach(ex => {
        if (ex.type === 'weight') {
          ghosts[ex.name] = getRecommendedWeights(
            ex.name,
            ex,
            historyData,
            coaching.acceptedAdjustments
          );
        }
      });
      setRecommendedWeights(ghosts);
    }

    setIsTimerRunning(true);
    setScreen('workout');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    setIsTimerRunning(false);
    localStorage.removeItem('liftoff_session');
    setScreen('feedback');
  };

  const handleFeedbackSubmit = async (feedback: PostSessionFeedback | null) => {
    // Build updated feedback history
    const updatedFeedbackHistory = feedback
      ? [...coachingState.feedbackHistory, feedback]
      : coachingState.feedbackHistory;

    // Run coaching evaluation
    if (currentSessionKey) {
      try {
        const evaluation = evaluateSession(
          currentSessionKey,
          setData,
          skipped,
          historyData,
          programme,
          updatedFeedbackHistory,
          coachingState.acceptedAdjustments
        );
        setCurrentEvaluation(evaluation);

        // Update coaching state
        const newState: CoachingState = {
          ...coachingState,
          feedbackHistory: updatedFeedbackHistory,
          evaluations: [...coachingState.evaluations, evaluation],
          athleteState: {
            ...coachingState.athleteState,
            fatigue_7day: ['fresh', 'normal', 'accumulating', 'deload_recommended'].indexOf(evaluation.fatigue_level)
          }
        };
        setCoachingState(newState);
        saveCoachingState(newState);
      } catch (e) {
        console.error('Coaching evaluation failed:', e);
        setCurrentEvaluation(null);
      }
    }

    setPendingFeedback(feedback);

    if (feedback) {
      setScreen('coach_review');
    } else {
      // Skipped feedback — go straight to summary
      await saveToICloud();
      setScreen('summary');
    }
  };

  const handleCoachReviewDone = async (acceptedWeights: Record<string, number>) => {
    // Merge accepted weights into coaching state
    const newAccepted = { ...coachingState.acceptedAdjustments, ...acceptedWeights };
    const newState: CoachingState = {
      ...coachingState,
      acceptedAdjustments: newAccepted
    };
    setCoachingState(newState);
    saveCoachingState(newState);

    await saveToICloud();
    setScreen('summary');
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

  const getCSVFilename = () => {
    if (!currentSessionKey) return 'GSB_workout.csv';
    const session = programme.sessions[currentSessionKey];
    const sessionType = (session.label.split(' — ')[1] || session.label)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return `GSB_${sessionType}_${dateStr}.csv`;
  };

  const shareCSV = async () => {
    const csv = generateCSV();
    if (!csv || csv.split('\n').length <= 1) return;

    const filename = getCSVFilename();
    const file = new File([csv], filename, { type: 'text/csv' });

    // Try Web Share API with file sharing (iOS Safari share sheet)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to download
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }

    // Fallback: trigger a file download via anchor click
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                  ghostWeight={recommendedWeights[ex.name] ?? null}
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

        {screen === 'feedback' && (
          <FeedbackScreen
            onSubmit={handleFeedbackSubmit}
            onSkip={() => handleFeedbackSubmit(null)}
          />
        )}

        {screen === 'coach_review' && currentEvaluation && (
          <CoachReviewScreen
            evaluation={currentEvaluation}
            onDone={handleCoachReviewDone}
          />
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
                  {Object.values(setData).flat().filter((s: any) => s.weight !== '' || s.reps !== '').length}
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
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={shareCSV}
                className="w-full flex items-center justify-center gap-3 glass-pink text-pink-300 font-bold py-4 rounded-2xl hover:bg-pink-500/20 transition-all active:scale-[0.97]"
              >
                {navigator.share && typeof navigator.canShare === 'function'
                  ? <><Share2 className="w-5 h-5" />Save to Files</>
                  : <><Download className="w-5 h-5" />Download CSV</>
                }
              </motion.button>
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
  ghostWeight,
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
  ghostWeight: number | null;
  onUpdateSet: (si: number, field: keyof SetEntry, val: any) => void;
  onToggleSkip: () => void;
  onAddSet: () => void;
  onAddDropSet: () => void;
  onStartRest: (secs: number) => void;
  [key: string]: any;
}) {
  const [isOpen, setIsOpen] = useState(idx === 0);
  const isComplete = sets.every(s => s.weight !== '' && s.reps !== '');

  const weightPlaceholder = ghostWeight !== null && ghostWeight > 0
    ? String(ghostWeight)
    : 'kg';

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
                    placeholder={weightPlaceholder}
                    value={set.weight}
                    onChange={(e) => onUpdateSet(si, 'weight', e.target.value)}
                    className={cn(
                      "w-full glass-input rounded-xl py-2 px-1 text-center text-sm font-bold text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all",
                      ghostWeight !== null && ghostWeight > 0 && set.weight === ''
                        ? "placeholder:text-emerald-400/50"
                        : "placeholder:text-white/20"
                    )}
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

function HistoryCard({ session, ...rest }: { session: { date: string; sessionType: string; exercises: { exercise: string; weight: string; sets: string; reps: string; notes: string }[] }; [key: string]: any }) {
  return (
    <div className="glass-pink rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center justify-between text-left">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-sm font-bold text-white">{session.date}</span>
          </div>
          <span className="text-xs font-semibold text-pink-400">{session.sessionType}</span>
        </div>
        <span className="text-[10px] font-bold text-white/40">{session.exercises.length} exercises</span>
      </div>
    </div>
  );
}

// ─── Feedback Screen ──────────────────────────────────────────────────────────

function ScorePicker({
  label,
  icon,
  value,
  onChange,
  lowLabel,
  highLabel,
  color = 'violet'
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  color?: 'violet' | 'emerald' | 'amber' | 'pink';
}) {
  const colorMap = {
    violet: {
      active: 'bg-violet-500 text-white border-violet-500',
      hover: 'hover:bg-violet-500/20 hover:border-violet-500/50'
    },
    emerald: {
      active: 'bg-emerald-500 text-white border-emerald-500',
      hover: 'hover:bg-emerald-500/20 hover:border-emerald-500/50'
    },
    amber: {
      active: 'bg-amber-500 text-white border-amber-500',
      hover: 'hover:bg-amber-500/20 hover:border-amber-500/50'
    },
    pink: {
      active: 'bg-pink-500 text-white border-pink-500',
      hover: 'hover:bg-pink-500/20 hover:border-pink-500/50'
    }
  };
  const c = colorMap[color];

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/50">{icon}</span>
        <span className="text-sm font-bold text-white">{label}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95",
              value === n
                ? c.active
                : `bg-white/5 border-white/10 text-white/40 ${c.hover}`
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[10px] text-white/30 font-medium">{lowLabel}</span>
        <span className="text-[10px] text-white/30 font-medium">{highLabel}</span>
      </div>
    </div>
  );
}

function FeedbackScreen({
  onSubmit,
  onSkip
}: {
  onSubmit: (f: PostSessionFeedback) => void;
  onSkip: () => void;
}) {
  const [soreness, setSoreness] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [sleep, setSleep] = useState<string>('7');
  const [rating, setRating] = useState<number>(3);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      soreness_score: soreness as 1 | 2 | 3 | 4 | 5,
      energy_score: energy as 1 | 2 | 3 | 4 | 5,
      sleep_hours: Math.max(0, Math.min(24, parseFloat(sleep) || 7)),
      session_rating: rating as 1 | 2 | 3 | 4 | 5,
      notes: notes.trim() || undefined
    });
  };

  return (
    <motion.div
      key="feedback"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="max-w-2xl mx-auto px-5 py-10"
    >
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Post-Session</p>
        <h1 className="text-3xl font-extrabold text-white">How was that?</h1>
      </header>

      <div className="glass rounded-3xl p-6 mb-4">
        <ScorePicker
          label="Body Soreness going in"
          icon={<Activity className="w-4 h-4" />}
          value={soreness}
          onChange={setSoreness}
          lowLabel="None"
          highLabel="Very Sore"
          color="amber"
        />
        <ScorePicker
          label="Energy Level"
          icon={<Zap className="w-4 h-4" />}
          value={energy}
          onChange={setEnergy}
          lowLabel="Drained"
          highLabel="Energised"
          color="emerald"
        />
        <ScorePicker
          label="Session Rating"
          icon={<Star className="w-4 h-4" />}
          value={rating}
          onChange={setRating}
          lowLabel="Terrible"
          highLabel="Amazing"
          color="violet"
        />

        <div className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-white/50" />
            <span className="text-sm font-bold text-white">Sleep Last Night</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              value={sleep}
              onChange={e => setSleep(e.target.value)}
              min={0}
              max={24}
              step={0.5}
              className="w-24 glass-input rounded-xl py-2.5 px-3 text-center text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <span className="text-sm text-white/40 font-medium">hours</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-4 mb-6">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any notes? (optional — pain, PRs, conditions...)"
          rows={2}
          className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 glass text-white/50 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all active:scale-[0.98]"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          className="flex-[2] bg-violet-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-600/25 hover:bg-violet-500 transition-all active:scale-[0.98]"
        >
          Get Coach Review
        </button>
      </div>
    </motion.div>
  );
}

// ─── Coach Review Screen ──────────────────────────────────────────────────────

function fatigueBadge(level: FatigueLevel): { label: string; className: string } {
  switch (level) {
    case 'fresh': return { label: 'Fresh', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'normal': return { label: 'Normal', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'accumulating': return { label: 'Accumulating Fatigue', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'deload_recommended': return { label: 'Deload Recommended', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
}

function flagBadge(flag: ExerciseFlag): { label: string; className: string } {
  switch (flag) {
    case 'strong_session': return { label: 'Strong Session', className: 'bg-emerald-500/15 text-emerald-400' };
    case 'rpe_spike': return { label: 'RPE Spike', className: 'bg-amber-500/15 text-amber-400' };
    case 'form_breakdown': return { label: 'Form Breakdown', className: 'bg-red-500/15 text-red-400' };
    case 'pain': return { label: 'Pain Flagged', className: 'bg-red-500/20 text-red-400' };
    case 'incomplete': return { label: 'Incomplete', className: 'bg-white/10 text-white/50' };
    case 'weight_increase_due': return { label: 'Ready to Progress', className: 'bg-violet-500/15 text-violet-400' };
  }
}

function adjustmentIcon(type: string) {
  switch (type) {
    case 'weight_increase': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case 'weight_reduction': return <TrendingDown className="w-4 h-4 text-red-400" />;
    case 'deload': return <Minus className="w-4 h-4 text-amber-400" />;
    case 'volume_reduction': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    default: return <Activity className="w-4 h-4 text-white/50" />;
  }
}

function CoachReviewScreen({
  evaluation,
  onDone
}: {
  evaluation: SessionEvaluation;
  onDone: (acceptedWeights: Record<string, number>) => void;
}) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<number, boolean>>({});

  const toggleAccept = (exerciseName: string) => {
    setAccepted(prev => ({ ...prev, [exerciseName]: !prev[exerciseName] }));
  };

  const toggleExercise = (i: number) => {
    setExpandedExercises(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const handleContinue = () => {
    const acceptedWeights: Record<string, number> = {};
    for (const adj of evaluation.adjustments) {
      if (accepted[adj.exercise_name]) {
        acceptedWeights[adj.exercise_name] = adj.recommended_value;
      }
    }
    onDone(acceptedWeights);
  };

  const fb = fatigueBadge(evaluation.fatigue_level);
  const completedCount = evaluation.exercise_evaluations.filter(e => e.completion_rate >= 0.8).length;
  const totalCount = evaluation.exercise_evaluations.length;

  return (
    <motion.div
      key="coach_review"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="max-w-2xl mx-auto px-5 py-10 pb-32"
    >
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-6 h-6 text-violet-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Coach Review</p>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Session Analysis</h1>
      </header>

      {/* Section 1: Overview */}
      <div className="glass rounded-3xl p-5 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Overview</p>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-black text-white">{Math.round(evaluation.completion_rate * 100)}%</span>
            <span className="text-white/40 text-sm ml-2">{completedCount}/{totalCount} exercises</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-full border",
            fb.className
          )}>
            {fb.label}
          </span>
        </div>
        {/* Completion bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${evaluation.completion_rate * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </div>

      {/* Section 2: Exercise Breakdown */}
      {evaluation.exercise_evaluations.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Exercise Breakdown</p>
          <div className="space-y-2">
            {evaluation.exercise_evaluations.map((ex, i) => {
              const isExpanded = expandedExercises[i];
              const adjForEx = evaluation.adjustments.find(a => a.exercise_name === ex.exercise_name);
              return (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleExercise(i)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-bold text-white truncate">{ex.exercise_name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {ex.avg_weight > 0 ? `${ex.avg_weight.toFixed(1)}kg` : '—'}
                        {ex.avg_reps > 0 ? ` × ${Math.round(ex.avg_reps)} reps` : ''}
                        {' · '}{Math.round(ex.completion_rate * 100)}% complete
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ex.flags.length > 0 && (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          flagBadge(ex.flags[0]).className
                        )}>
                          {flagBadge(ex.flags[0]).label}
                        </span>
                      )}
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="text-white/30 uppercase tracking-wider text-[10px]">Prescribed</span>
                              <p className="text-white/70 font-semibold mt-0.5">
                                {ex.prescribed_reps_min}–{ex.prescribed_reps_max} reps @ RPE {ex.prescribed_rpe_min}–{ex.prescribed_rpe_max}
                              </p>
                            </div>
                            <div>
                              <span className="text-white/30 uppercase tracking-wider text-[10px]">Achieved</span>
                              <p className="text-white/70 font-semibold mt-0.5">
                                {ex.avg_reps > 0 ? `~${Math.round(ex.avg_reps)} reps` : '—'}
                                {ex.avg_weight > 0 ? ` @ ${ex.avg_weight.toFixed(1)}kg` : ''}
                              </p>
                            </div>
                          </div>
                          {ex.flags.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {ex.flags.slice(1).map(f => (
                                <span key={f} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", flagBadge(f).className)}>
                                  {flagBadge(f).label}
                                </span>
                              ))}
                            </div>
                          )}
                          {adjForEx && adjForEx.type !== 'informational' && (
                            <div className="mt-2 p-2.5 bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2">
                                {adjustmentIcon(adjForEx.type)}
                                <span className="text-xs font-semibold text-white/80">
                                  {adjForEx.type === 'weight_increase'
                                    ? `Increase to ${adjForEx.recommended_value}kg`
                                    : adjForEx.type === 'weight_reduction' || adjForEx.type === 'deload'
                                    ? `Reduce to ${adjForEx.recommended_value}kg`
                                    : adjForEx.reason}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Recommendations */}
      {evaluation.adjustments.filter(a => a.type !== 'informational').length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Recommendations</p>
          <div className="space-y-2">
            {evaluation.adjustments
              .filter(a => a.type !== 'informational')
              .map((adj, i) => (
                <div key={i} className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{adjustmentIcon(adj.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {adj.type === 'weight_increase'
                          ? `${adj.exercise_name} → ${adj.recommended_value}kg`
                          : adj.type === 'weight_reduction' || adj.type === 'deload'
                          ? `${adj.exercise_name} → ${adj.recommended_value}kg`
                          : adj.exercise_name}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">{adj.reason}</p>
                      {adj.evidence.length > 0 && (
                        <p className="text-[11px] text-white/30 mt-1">{adj.evidence[0]}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAccept(adj.exercise_name)}
                      className={cn(
                        "shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
                        accepted[adj.exercise_name]
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10"
                      )}
                    >
                      {accepted[adj.exercise_name] ? 'Accepted' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Section 4: Projections */}
      {evaluation.projections.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Week 8 Targets</p>
          <div className="space-y-2">
            {evaluation.projections.map((proj, i) => {
              const pct = Math.min(1, proj.current_weight / proj.target_weight);
              const statusColors: Record<string, string> = {
                on_track: 'text-emerald-400',
                ahead: 'text-violet-400',
                behind: 'text-amber-400'
              };
              const statusLabels: Record<string, string> = {
                on_track: 'On Track',
                ahead: 'Ahead',
                behind: 'Behind'
              };
              return (
                <div key={i} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-white truncate mr-3">{proj.exercise_name}</p>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest shrink-0", statusColors[proj.status])}>
                      {statusLabels[proj.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-lg font-black text-white">{proj.current_weight}kg</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn("h-full rounded-full", proj.status === 'behind' ? 'bg-amber-500' : proj.status === 'ahead' ? 'bg-violet-500' : 'bg-emerald-500')}
                        />
                      </div>
                    </div>
                    <span className="text-lg font-black text-white/40">{proj.target_weight}kg</span>
                  </div>
                  <p className="text-[11px] text-white/30">
                    {proj.weeks_remaining}w remaining · Need +{proj.required_per_week.toFixed(1)}kg/wk · Actual +{proj.actual_per_week.toFixed(1)}kg/wk
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bottom-fade pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={handleContinue}
            className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all active:scale-[0.98]"
          >
            Continue to Summary
          </button>
        </div>
      </div>
    </motion.div>
  );
}
