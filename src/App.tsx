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
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  CloudUpload,
  Shuffle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import programmeData from './data/programme.json';
import { seedHistory, mergeHistory, type HistorySession } from './data/seedHistory';
import { Programme, Session, Exercise, SetEntry, SessionProgress } from './types';
import {
  evaluateSession,
  getRecommendedWeights,
  computeFatigueScore,
  loadCoachingState,
  saveCoachingState,
  computePRs,
  computeMilestoneAlert,
  normaliseExerciseName,
  PostSessionFeedback,
  SessionEvaluation,
  CoachingState,
  PRRecord,
  MilestoneAlert,
} from './coachingEngine';
import {
  exerciseRegistry,
  getSynergistSuggestion,
  type SynergistSuggestion,
} from './data/exerciseRegistry';

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
  const [screen, setScreen] = useState<'select' | 'workout' | 'feedback' | 'report'>('select');
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

  const [exerciseRpe, setExerciseRpe] = useState<{ [exIdx: number]: number }>({});
  const [historyData, setHistoryData] = useState<HistorySession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Coaching state
  const [coachingState, setCoachingState] = useState<CoachingState>(() => loadCoachingState());
  const [pendingFeedback, setPendingFeedback] = useState<PostSessionFeedback | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<SessionEvaluation | null>(null);
  const [recommendedWeights, setRecommendedWeights] = useState<Record<string, number | null>>({});

  // Synergist suggestion state
  const [synergistSuggestion, setSynergistSuggestion] = useState<SynergistSuggestion | null>(null);
  const [suggestionHidden, setSuggestionHidden] = useState(false);

  // PR detection state
  const [prMap, setPrMap] = useState<Record<string, PRRecord>>({});
  const [newPRBanner, setNewPRBanner] = useState<{ exercise: string; weight: number; oldPR: number } | null>(null);

  // Last-session data per exercise (keyed by exercise index)
  const [lastSessionByEx, setLastSessionByEx] = useState<Record<number, { weight: number; reps: number } | null>>({});

  // Sparkline data per exercise (keyed by exercise index)
  const [sparklinesByEx, setSparklinesByEx] = useState<Record<number, number[]>>({});

  // Milestone alert
  const [milestoneAlert, setMilestoneAlert] = useState<MilestoneAlert | null>(null);
  const [milestoneAlertDismissed, setMilestoneAlertDismissed] = useState(false);

  // Rest timer coaching cue
  const [showCoachingCue, setShowCoachingCue] = useState(false);
  const [coachingCueText, setCoachingCueText] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual log form state
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logFormDate, setLogFormDate] = useState('');
  const [logFormSessionType, setLogFormSessionType] = useState('Push A (Heavy)');
  const [logFormText, setLogFormText] = useState('');
  const [logFormError, setLogFormError] = useState('');

  // Load history on mount — try API first, fall back to localStorage + seed
  useEffect(() => {
    fetch('/api/history')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setHistoryData(d.sessions || []))
      .catch(() => {
        const stored = localStorage.getItem('gsb_history');
        let local: HistorySession[] = [];
        if (stored) {
          try { local = JSON.parse(stored); } catch {}
        }
        setHistoryData(mergeHistory(local));
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
      // Vibrate if supported
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      // Show coaching cue for 3s then dismiss
      setShowCoachingCue(true);
      setTimeout(() => {
        setShowCoachingCue(false);
        setRestTimer(prev => ({ ...prev, active: false }));
      }, 3000);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restTimer.active, restTimer.remaining]);

  // Generate synergist suggestion + coaching cue whenever rest timer starts
  useEffect(() => {
    if (restTimer.active && currentSessionKey) {
      const suggestion = getSynergistSuggestion(
        currentSessionKey,
        historyData,
        exerciseRegistry
      );
      setSynergistSuggestion(suggestion);
      setSuggestionHidden(false);
      setShowCoachingCue(false);

      // Pre-compute coaching cue for when timer hits 0
      const exName = restTimer.exName;
      const lastData = Object.values(lastSessionByEx).find((_, i) => {
        // find by matching exName to current exercises
        if (!currentSessionKey) return false;
        const exercises = getSessionExercises(programme.sessions[currentSessionKey]);
        return exercises[i]?.name === exName || normaliseExerciseName(exercises[i]?.name ?? '') === normaliseExerciseName(exName);
      });
      // Look up from lastSessionByEx by exercise name
      if (currentSessionKey) {
        const exercises = getSessionExercises(programme.sessions[currentSessionKey]);
        const exIdx = exercises.findIndex(e =>
          normaliseExerciseName(e.name) === normaliseExerciseName(exName)
        );
        const last = exIdx >= 0 ? lastSessionByEx[exIdx] : null;
        if (last && last.weight > 0) {
          setCoachingCueText(`Last time: ${last.weight}kg × ${last.reps}. Go.`);
        } else {
          setCoachingCueText('Focus on form. Controlled reps.');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer.active]);

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
      const initialRpe: { [idx: number]: number } = {};
      const exercises = getSessionExercises(session);
      exercises.forEach((ex, idx) => {
        initialSetData[idx] = Array.from({ length: ex.sets || 1 }, () => ({
          weight: '',
          reps: '',
          note: '',
          logged: false
        }));
        if (ex.type === 'weight') {
          initialRpe[idx] = 7; // default RPE
        }
      });
      setSetData(initialSetData);
      setExerciseRpe(initialRpe);
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

      // Compute PRs
      const prs = computePRs(historyData);
      setPrMap(prs);

      // Compute last-session data per exercise (for beat-last-session + sparklines)
      const lastByEx: Record<number, { weight: number; reps: number } | null> = {};
      const sparklines: Record<number, number[]> = {};
      exercises.forEach((ex, idx) => {
        if (ex.type !== 'weight') { lastByEx[idx] = null; return; }
        const canonical = normaliseExerciseName(ex.name);
        // Find all history entries for this exercise, sorted oldest→newest
        const entries: { weight: number; reps: number; date: string }[] = [];
        for (const sess of [...historyData].reverse()) {
          for (const he of sess.exercises) {
            if (normaliseExerciseName(he.exercise) !== canonical) continue;
            const weights = he.weight.split('/').map(w => parseFloat(w)).filter(w => !isNaN(w) && w > 0);
            const repsArr = he.reps.split('/').map(r => parseInt(r)).filter(r => !isNaN(r) && r > 0);
            if (weights.length === 0) continue;
            const topWeight = Math.max(...weights);
            const topIdx = weights.lastIndexOf(topWeight);
            const topReps = repsArr[topIdx] ?? (repsArr.length > 0 ? Math.max(...repsArr) : 0);
            entries.push({ weight: topWeight, reps: topReps, date: sess.date });
          }
        }
        // Most recent entry = last session
        const last = entries.length > 0 ? entries[entries.length - 1] : null;
        lastByEx[idx] = last ? { weight: last.weight, reps: last.reps } : null;

        // Sparkline: last 6 top-set weights
        const allWeights = entries.map(e => e.weight);
        sparklines[idx] = allWeights.slice(-6);
      });
      setLastSessionByEx(lastByEx);
      setSparklinesByEx(sparklines);

      // Compute milestone alert
      const alert = computeMilestoneAlert(historyData);
      setMilestoneAlert(alert);
      setMilestoneAlertDismissed(false);
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

    // Always go to report (handles both feedback and skip paths)
    await saveToICloud();
    setScreen('report');
  };

  const handleReportDone = (acceptedWeights: Record<string, number>) => {
    // Merge accepted weights into coaching state
    const newAccepted = { ...coachingState.acceptedAdjustments, ...acceptedWeights };
    const newState: CoachingState = {
      ...coachingState,
      acceptedAdjustments: newAccepted
    };
    setCoachingState(newState);
    saveCoachingState(newState);
    setScreen('select');
  };

  const generateCSV = () => {
    if (!currentSessionKey) return '';
    const session = programme.sessions[currentSessionKey];
    const header = 'Date,Session_Type,Exercise,Weight_kg,Sets,Reps,RPE,Notes';
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
      const rpeVal = ex.type === 'weight' ? (exerciseRpe[idx] ?? 7) : '';
      const notes = loggedSets.map(s => s.note).filter(Boolean).join('; ');

      lines.push(`"${dateStr}","${sessionType}","${ex.name}","${weights}",${loggedSets.length},"${reps}",${rpeVal},"${notes}"`);
    });

    return lines.join('\n');
  };

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [iCloudStatus, setICloudStatus] = useState<'idle' | 'saving' | 'saved' | 'share'>('idle');

  const saveToICloud = async () => {
    if (!currentSessionKey) return;

    // Always save to localStorage regardless of whether sets have data
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

    const newSession: HistorySession = { date: dateStr, sessionType, exercises: loggedExercises };
    const stored = localStorage.getItem('gsb_history');
    let local: HistorySession[] = [];
    try { local = stored ? JSON.parse(stored) : []; } catch {}
    // Prepend new session, persist only the user-logged sessions (not seed)
    local.unshift(newSession);
    localStorage.setItem('gsb_history', JSON.stringify(local));

    // Merge with seed for in-memory display
    setHistoryData(mergeHistory(local));

    // Attempt CSV save to API (only if there's actual set data)
    const csv = generateCSV();
    if (!csv || csv.split('\n').length <= 1) {
      setSavingStatus('saved');
      return;
    }

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

  const handleICloudSave = async () => {
    const csv = generateCSV();
    if (!csv || csv.split('\n').length <= 1) return;

    setICloudStatus('saving');

    // Try API endpoint first
    try {
      const res = await fetch('/api/save-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv })
      });
      if (res.ok) {
        setICloudStatus('saved');
        return;
      }
    } catch {
      // API unavailable — fall through to Web Share
    }

    // API failed (PWA/GitHub Pages) — use Web Share API for iOS Files/iCloud
    const filename = getCSVFilename();
    const file = new File([csv], filename, { type: 'text/csv' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        setICloudStatus('saved');
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          setICloudStatus('idle');
          return;
        }
      }
    }

    // Final fallback: show share prompt state
    setICloudStatus('share');
  };

  /**
   * Parses and saves a manually entered past workout.
   * Format: one exercise per line — "Exercise Name: weight x reps, weight x reps"
   * or just "Exercise Name: notes"
   */
  const handleLogPastWorkout = () => {
    setLogFormError('');
    if (!logFormDate) { setLogFormError('Pick a date.'); return; }
    if (!logFormText.trim()) { setLogFormError('Enter at least one exercise.'); return; }

    // Format date as "yyyy-MM-dd (EEE)"
    const parsed = new Date(logFormDate + 'T12:00:00');
    const dateStr = format(parsed, 'yyyy-MM-dd (EEE)');

    const exercises: HistorySession['exercises'] = [];
    for (const raw of logFormText.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        // No colon — treat entire line as exercise name with no data
        exercises.push({ exercise: line, weight: '', sets: '', reps: '', notes: '' });
        continue;
      }
      const name = line.slice(0, colonIdx).trim();
      const rest = line.slice(colonIdx + 1).trim();
      // Each comma-separated chunk is a set: "80 x 8" or "80x8" or just "80"
      const setChunks = rest.split(',').map(s => s.trim()).filter(Boolean);
      const weights: string[] = [];
      const reps: string[] = [];
      let notes = '';
      for (const chunk of setChunks) {
        // Match "80 x 8", "80x8", "80kg x 8", "bw x 10" etc.
        const m = chunk.match(/^([^\s]+?)\s*[xX]\s*(\S+)/);
        if (m) {
          weights.push(m[1].replace(/kg$/i, ''));
          reps.push(m[2]);
        } else if (/^\d/.test(chunk) || /^bw/i.test(chunk)) {
          // Just a weight with no reps
          weights.push(chunk.replace(/kg$/i, ''));
        } else {
          // Treat as a note
          notes = notes ? `${notes}; ${chunk}` : chunk;
        }
      }
      exercises.push({
        exercise: name,
        weight: weights.join('/'),
        sets: weights.length > 0 ? String(weights.length) : '',
        reps: reps.join('/'),
        notes,
      });
    }

    if (exercises.length === 0) { setLogFormError('Could not parse any exercises.'); return; }

    const newSession: HistorySession = { date: dateStr, sessionType: logFormSessionType, exercises };
    const stored = localStorage.getItem('gsb_history');
    let local: HistorySession[] = [];
    try { local = stored ? JSON.parse(stored) : []; } catch {}
    // Check for duplicate
    const key = `${dateStr}|${logFormSessionType}`;
    if (local.some(s => `${s.date}|${s.sessionType}` === key)) {
      setLogFormError('A session with this date and type already exists.');
      return;
    }
    local.unshift(newSession);
    localStorage.setItem('gsb_history', JSON.stringify(local));
    setHistoryData(mergeHistory(local));

    // Reset form
    setLogFormOpen(false);
    setLogFormDate('');
    setLogFormText('');
    setHistoryOpen(true);
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-violet-500/30 selection:text-white relative">
      <div className="app-bg" />

      <div className="relative z-10">
      <AnimatePresence mode="wait">
        {screen === 'select' && (() => {
          // Default day-of-week schedule (0=Sun, 1=Mon, ..., 6=Sat)
          const DAY_TO_SESSION: Record<number, string> = {
            1: 'push_b',     // Mon — Pump Push
            2: 'pull_b',     // Tue — Pump Pull
            3: 'cardio_day', // Wed — Cardio
            4: 'day_7',      // Thu — Rest / Recovery
            5: 'legs_core',  // Fri — Legs + Core
            6: 'push_a',     // Sat — Heavy Push
            0: 'pull_a',     // Sun — Heavy Pull
          };

          // Muscle group conflict detection — check what was trained recently
          const MUSCLE_GROUPS: Record<string, string> = {
            push_a: 'push', push_b: 'push',
            pull_a: 'pull', pull_b: 'pull',
            legs_core: 'legs', cardio_day: 'cardio', day_7: 'rest',
          };

          // Find the most recent session from history (within last 48h)
          const recentSession = historyData.length > 0 ? historyData[0] : null;
          const recentType = recentSession?.sessionType?.toLowerCase() || '';
          const recentDateStr = recentSession?.date?.replace(/\s*\(.*\)/, '') || '';
          const recentDate = recentDateStr ? new Date(recentDateStr) : null;
          const hoursSinceLast = recentDate ? (Date.now() - recentDate.getTime()) / (1000 * 60 * 60) : 999;

          const recentGroup = recentType.includes('push') ? 'push'
            : recentType.includes('pull') ? 'pull'
            : recentType.includes('leg') ? 'legs' : '';

          const todayDow = new Date().getDay();
          let todaySessionKey = DAY_TO_SESSION[todayDow];

          // If same muscle group was trained within 36 hours, swap to next different session
          if (hoursSinceLast < 36 && recentGroup && MUSCLE_GROUPS[todaySessionKey] === recentGroup) {
            // Find the next session in the week that uses a different muscle group
            const SWAP_ORDER: Record<string, string> = {
              push_b: 'pull_b', push_a: 'pull_a',  // push conflict → do pull
              pull_b: 'push_b', pull_a: 'push_a',  // pull conflict → do push (rare)
            };
            todaySessionKey = SWAP_ORDER[todaySessionKey] || todaySessionKey;
          }

          const todaySession = programme.sessions[todaySessionKey];

          // Priority order: today removed, then upcoming days in order from tomorrow
          const priorityOrder: string[] = [];
          for (let i = 1; i <= 6; i++) {
            const dow = (todayDow + i) % 7;
            const key = DAY_TO_SESSION[dow];
            if (key !== todaySessionKey) priorityOrder.push(key);
          }
          const otherSessions = priorityOrder
            .filter((key, idx, arr) => arr.indexOf(key) === idx)
            .map(key => [key, programme.sessions[key]] as [string, typeof programme.sessions[typeof key]]);

          // Weekly completion dots
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
          const WEEK_SCHEDULE: { day: string; dow: number; sessionKey: string; label: string }[] = [
            { day: 'Mon', dow: 1, sessionKey: 'push_b', label: 'Push B' },
            { day: 'Tue', dow: 2, sessionKey: 'pull_b', label: 'Pull B' },
            { day: 'Wed', dow: 3, sessionKey: 'cardio_day', label: 'Cardio' },
            { day: 'Thu', dow: 4, sessionKey: 'day_7', label: 'Rest' },
            { day: 'Fri', dow: 5, sessionKey: 'legs_core', label: 'Legs' },
            { day: 'Sat', dow: 6, sessionKey: 'push_a', label: 'Push A' },
            { day: 'Sun', dow: 0, sessionKey: 'pull_a', label: 'Pull A' },
          ];
          const completedThisWeek = new Set<number>();
          for (const sess of historyData) {
            const dateStr = sess.date.split(' ')[0];
            const d = new Date(dateStr + 'T12:00:00');
            if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
              // mark by dow
              completedThisWeek.add(d.getDay());
            }
          }
          // Thu (rest) always counts as done
          completedThisWeek.add(4);
          const todayDow2 = new Date().getDay();
          // Count non-rest sessions completed
          const totalScheduled = 6; // 7 days - 1 rest
          const completedCount = WEEK_SCHEDULE.filter(s => s.dow !== 4 && completedThisWeek.has(s.dow)).length;

          return (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto px-5 py-10"
          >
            <header className="mb-6">
              <p className="text-2xl font-bold text-white">{format(new Date(), 'EEEE, MMMM do')}</p>
            </header>

            {/* Weekly completion dots */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 glass rounded-2xl px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">This Week</span>
                <span className="text-[10px] font-semibold text-white/30">{completedCount}/{totalScheduled} sessions</span>
              </div>
              <div className="flex justify-between">
                {WEEK_SCHEDULE.map(({ day, dow, sessionKey: _sk, label: _lb }) => {
                  const isToday = dow === todayDow2;
                  const isDone = completedThisWeek.has(dow);
                  const isRest = dow === 4;
                  return (
                    <div key={dow} className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        isToday ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-transparent" : "",
                        isDone && isRest ? "bg-white/10" :
                        isDone ? "bg-emerald-500" :
                        "border border-white/20"
                      )}>
                        {isDone && !isRest && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {isRest && <Moon className="w-3 h-3 text-white/30" />}
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-tight",
                        isToday ? "text-violet-400" : "text-white/30"
                      )}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Today's Session — Hero Card */}
            {todaySession && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Today's Session</p>
                <div className="glass rounded-3xl overflow-hidden">
                  <div className="p-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 block">{todaySession.focus}</span>
                    <h2 className="text-2xl font-extrabold text-white mb-1 leading-tight">
                      {todaySession.label.split(' — ')[1] || todaySession.label}
                    </h2>
                    <p className="text-sm text-white/40 mb-5">{todaySession.label.split(' — ')[0]}</p>
                    <div className="flex gap-2 mb-6">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-[12px] font-semibold text-white/60">
                        <Timer className="w-3.5 h-3.5 mr-1.5" />
                        {todaySession.estimated_duration_minutes}m
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-[12px] font-semibold text-white/60">
                        <Dumbbell className="w-3.5 h-3.5 mr-1.5" />
                        {isCardioDay(todaySession)
                          ? 'Cardio'
                          : isRestDay(todaySession)
                          ? 'Rest Day'
                          : `${getSessionExercises(todaySession).length} Exercises`}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => startSession(todaySessionKey)}
                      className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl transition-all"
                    >
                      Start Today's Workout
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Milestone proximity alert */}
            <AnimatePresence>
              {milestoneAlert && !milestoneAlertDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 glass rounded-2xl px-4 py-3 border border-amber-500/20 bg-amber-500/5 flex items-center gap-3"
                >
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="flex-1 text-[12px] text-white/70 leading-snug">
                    At this pace, <span className="text-amber-400 font-bold">{milestoneAlert.milestone}kg {milestoneAlert.exercise.replace('Barbell ', '')}</span> is ~{milestoneAlert.sessionsAway} session{milestoneAlert.sessionsAway !== 1 ? 's' : ''} away
                  </p>
                  <button
                    onClick={() => setMilestoneAlertDismissed(true)}
                    className="text-white/30 hover:text-white/60 transition-colors shrink-0 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Other Sessions — compact grid, ordered by upcoming day */}
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">Upcoming</p>
              <div className="grid grid-cols-2 gap-2.5">
                {otherSessions.map(([key, session]) => {
                  const SESSION_TO_DAY: Record<string, string> = {
                    push_b: 'Mon', pull_b: 'Tue', cardio_day: 'Wed',
                    day_7: 'Thu', legs_core: 'Fri', push_a: 'Sat', pull_a: 'Sun'
                  };
                  return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startSession(key)}
                    className="group relative flex flex-col items-start p-4 glass rounded-2xl hover:bg-white/10 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">{SESSION_TO_DAY[key] || ''} — {session.focus}</span>
                    <h3 className="text-sm font-bold text-white mb-2.5 leading-snug pr-5">
                      {session.label.split(' — ')[1] || session.label}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/60">
                        <Timer className="w-2.5 h-2.5 mr-1" />
                        {session.estimated_duration_minutes}m
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/60">
                        <Dumbbell className="w-2.5 h-2.5 mr-1" />
                        {isCardioDay(session)
                          ? 'Cardio'
                          : isRestDay(session)
                          ? 'Rest'
                          : `${getSessionExercises(session).length}ex`}
                      </span>
                    </div>
                  </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Past Workouts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2"
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

              {/* Log past workout button */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => { setLogFormOpen(o => !o); setLogFormError(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-[11px] font-bold uppercase tracking-widest transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Past Workout
                </button>
              </div>

              {/* Manual log form */}
              <AnimatePresence>
                {logFormOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 glass-pink rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">Log Past Workout</p>

                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Date</label>
                        <input
                          type="date"
                          value={logFormDate}
                          onChange={e => setLogFormDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>

                      {/* Session type */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Session Type</label>
                        <select
                          value={logFormSessionType}
                          onChange={e => setLogFormSessionType(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                        >
                          {['Push A (Heavy)', 'Push B (Pump)', 'Pull A (Heavy)', 'Pull B (Pump)', 'Legs + Core', 'Cardio', 'Push', 'Pull', 'Other'].map(t => (
                            <option key={t} value={t} className="bg-zinc-900">{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Exercises */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Exercises</label>
                        <p className="text-[10px] text-white/30 mb-1.5">One per line — <span className="font-mono">Exercise: 80 x 8, 85 x 6</span></p>
                        <textarea
                          value={logFormText}
                          onChange={e => setLogFormText(e.target.value)}
                          placeholder={"Bench Press: 70 x 10, 80 x 8, 90 x 6\nOHP: 40 x 10, 40 x 8\nLateral Raise: 8 x 10, 8 x 10"}
                          rows={5}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 font-mono resize-none"
                        />
                      </div>

                      {logFormError && (
                        <p className="text-[11px] text-red-400 font-semibold">{logFormError}</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { setLogFormOpen(false); setLogFormError(''); }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-semibold hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleLogPastWorkout}
                          className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
          );
        })()}

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
                  rpe={exerciseRpe[idx] ?? 7}
                  lastSession={lastSessionByEx[idx] ?? null}
                  sparklineData={sparklinesByEx[idx] ?? []}
                  onUpdateSet={(si, field, val) => {
                    const newData = { ...setData };
                    newData[idx][si] = { ...newData[idx][si], [field]: val };
                    setSetData(newData);
                    saveProgress(currentSessionKey, newData, skipped, elapsed);

                    // PR detection — only when both weight and reps are filled
                    if (ex.type === 'weight') {
                      const updatedSet = { ...newData[idx][si], [field]: val };
                      const w = parseFloat(updatedSet.weight);
                      const r = parseInt(updatedSet.reps);
                      if (!isNaN(w) && w > 0 && !isNaN(r) && r > 0) {
                        const canonical = normaliseExerciseName(ex.name);
                        const currentPR = prMap[canonical];
                        if (!currentPR || w > currentPR.weight) {
                          const oldWeight = currentPR?.weight ?? 0;
                          setNewPRBanner({ exercise: ex.name, weight: w, oldPR: oldWeight });
                          // Update prMap so it doesn't re-fire for same exercise this session
                          setPrMap(prev => ({
                            ...prev,
                            [canonical]: { weight: w, reps: r, date: new Date().toISOString().split('T')[0] }
                          }));
                          // Auto-dismiss after 3s
                          setTimeout(() => setNewPRBanner(null), 3000);
                        }
                      }
                    }
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
                  onRpeChange={(val) => {
                    setExerciseRpe(prev => ({ ...prev, [idx]: val }));
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

        {screen === 'report' && currentSessionKey && (
          <ReportScreen
            sessionKey={currentSessionKey}
            setData={setData}
            skipped={skipped}
            elapsed={elapsed}
            evaluation={currentEvaluation}
            savingStatus={savingStatus}
            iCloudStatus={iCloudStatus}
            onICloudSave={handleICloudSave}
            onShareCSV={shareCSV}
            onDone={handleReportDone}
          />
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
            <h3 className="text-xl font-bold text-white mb-8 text-center">{restTimer.exName}</h3>

            <div className="relative w-48 h-48 mb-6">
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
                <span className="text-5xl font-black tabular-nums text-white">{restTimer.remaining}</span>
                <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">Seconds</span>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-xs mb-6">
              <button
                onClick={() => setRestTimer(prev => ({ ...prev, active: false }))}
                className="flex-1 glass text-white/70 font-bold py-3 rounded-2xl hover:bg-white/15 transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => setRestTimer(prev => ({ ...prev, remaining: prev.remaining + 30, total: prev.total + 30 }))}
                className="flex-1 bg-violet-600 text-white font-bold py-3 rounded-2xl hover:bg-violet-500 transition-all"
              >
                +30s
              </button>
            </div>

            {/* Synergist suggestion — only during countdown (not at 0) */}
            {!showCoachingCue && synergistSuggestion && !suggestionHidden && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">While you wait</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentSessionKey) {
                          const next = getSynergistSuggestion(
                            currentSessionKey,
                            historyData,
                            exerciseRegistry,
                            synergistSuggestion.exercise.name
                          );
                          setSynergistSuggestion(next);
                        }
                      }}
                      className="text-white/40 hover:text-white/80 transition-colors p-1"
                      title="Shuffle"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSuggestionHidden(true)}
                      className="text-white/30 hover:text-white/60 transition-colors p-1"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-white capitalize">{synergistSuggestion.muscleGroup}</span>
                  <span className="text-[10px] text-white/35">last trained: {synergistSuggestion.lastTrainedLabel}</span>
                </div>
                <p className="text-xs text-white/70 leading-snug capitalize">{synergistSuggestion.exercise.name}</p>
                <span className="mt-1 inline-block text-[10px] text-white/30 capitalize">{synergistSuggestion.exercise.equipment}</span>
              </motion.div>
            )}

            {/* Coaching cue — shown at timer end, replaces synergist */}
            <AnimatePresence>
              {showCoachingCue && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-white/60 text-center mt-2"
                >
                  {coachingCueText}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR Banner Overlay */}
      <AnimatePresence>
        {newPRBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2.5rem)] max-w-sm"
            onClick={() => setNewPRBanner(null)}
          >
            <div className="glass rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">NEW PR</p>
                <p className="text-sm font-bold text-white leading-tight">
                  {newPRBanner.exercise.replace(/^Barbell /, '')} — {newPRBanner.weight}kg
                </p>
                {newPRBanner.oldPR > 0 && (
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    +{(newPRBanner.weight - newPRBanner.oldPR).toFixed(1)}kg above previous best
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

/** Inline SVG sparkline — 70×24px polyline of weight trend */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 70, H = 24, PAD = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = data.map(v => H - PAD - ((v - min) / range) * (H - PAD * 2));
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const fillPts = `${xs[0]},${H} ${pts} ${xs[xs.length - 1]},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id="spk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#spk-fill)" />
      <polyline points={pts} fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* last point dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

function ExerciseCard({
  idx,
  exercise,
  sets,
  isSkipped,
  ghostWeight,
  rpe,
  lastSession,
  sparklineData,
  onUpdateSet,
  onToggleSkip,
  onAddSet,
  onAddDropSet,
  onStartRest,
  onRpeChange
}: {
  idx: number;
  exercise: Exercise;
  sets: SetEntry[];
  isSkipped: boolean;
  ghostWeight: number | null;
  rpe: number;
  lastSession: { weight: number; reps: number } | null;
  sparklineData: number[];
  onUpdateSet: (si: number, field: keyof SetEntry, val: any) => void;
  onToggleSkip: () => void;
  onAddSet: () => void;
  onAddDropSet: () => void;
  onStartRest: (secs: number) => void;
  onRpeChange: (val: number) => void;
  [key: string]: unknown;
}) {
  const [isOpen, setIsOpen] = useState(idx === 0);
  const isComplete = sets.every(s => s.weight !== '' && s.reps !== '');

  // Beat-last-session: find the best set logged so far this session
  const bestCurrentWeight = sets.reduce((best, s) => {
    const w = parseFloat(s.weight);
    return !isNaN(w) && w > best ? w : best;
  }, 0);
  const beatDelta = lastSession && bestCurrentWeight > 0 && lastSession.weight > 0
    ? bestCurrentWeight - lastSession.weight
    : null;

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
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-white/40">
              {exercise.sets ? `${exercise.sets} sets • ` : ''}{exercise.reps || (exercise.duration_seconds ? `${exercise.duration_seconds}s` : '')}{exercise.rest_seconds ? ` • ${exercise.rest_seconds}s rest` : ''}
            </p>
            {/* Beat-last-session delta badge */}
            {beatDelta !== null && beatDelta > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">+{beatDelta % 1 === 0 ? beatDelta : beatDelta.toFixed(1)}kg ↑</span>
            )}
            {beatDelta !== null && beatDelta === 0 && (
              <span className="text-[10px] font-bold text-white/40">✓</span>
            )}
          </div>
          {/* Beat-last-session banner */}
          {lastSession && lastSession.weight > 0 && (
            <p className="text-[11px] text-white/40 mt-1">
              Last: {lastSession.weight}kg × {lastSession.reps} — match or beat it
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Sparkline */}
          {sparklineData.length >= 2 && (
            <div className="shrink-0 opacity-60">
              <Sparkline data={sparklineData} />
            </div>
          )}
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

            {/* RPE picker — only for weighted exercises */}
            {exercise.type === 'weight' && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Effort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => onRpeChange(n)}
                        className={cn(
                          "w-9 h-9 rounded-xl text-sm font-black border transition-all active:scale-90",
                          rpe === n
                            ? "bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-600/30"
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-[9px] text-white/20 font-medium">6 Easy</span>
                  <span className="text-[9px] text-white/20 font-medium">10 Max</span>
                </div>
              </div>
            )}

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

function FeedbackScreen({
  onSubmit,
  onSkip
}: {
  onSubmit: (f: PostSessionFeedback) => void;
  onSkip: () => void;
}) {
  // session rating: rough=2, solid=3, great=5
  const SESSION_OPTS: { label: string; emoji: string; value: 1 | 2 | 3 | 4 | 5 }[] = [
    { label: 'Rough', emoji: '👎', value: 2 },
    { label: 'Solid', emoji: '👊', value: 3 },
    { label: 'Great', emoji: '💪', value: 5 },
  ];
  // body/soreness: fresh=1, normal=3, beat_up=5
  const BODY_OPTS: { label: string; value: 1 | 2 | 3 | 4 | 5 }[] = [
    { label: 'Fresh', value: 1 },
    { label: 'Normal', value: 3 },
    { label: 'Beat Up', value: 5 },
  ];

  const [sessionRating, setSessionRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [bodyScore, setBodyScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // energy_score: mirror session rating (rough=2 → drained, great=5 → energised)
  const energyFromRating = (r: number): 1 | 2 | 3 | 4 | 5 => {
    if (r <= 2) return 2;
    if (r === 3) return 3;
    return 5;
  };

  const handleSubmit = () => {
    onSubmit({
      soreness_score: bodyScore,
      energy_score: energyFromRating(sessionRating),
      sleep_hours: sleepHours,
      session_rating: sessionRating,
      notes: notes.trim() || undefined
    });
  };

  const adjustSleep = (delta: number) => {
    setSleepHours(prev => {
      const next = Math.round((prev + delta) * 2) / 2;
      return Math.max(3, Math.min(12, next));
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

      <div className="space-y-4 mb-6">
        {/* Input 1: Session feel */}
        <div className="glass rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">How was the session?</p>
          <div className="grid grid-cols-3 gap-3">
            {SESSION_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSessionRating(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold transition-all active:scale-[0.96]",
                  sessionRating === opt.value
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/25"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input 2: Body feel */}
        <div className="glass rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">How's your body?</p>
          <div className="flex gap-2">
            {BODY_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBodyScore(opt.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-[0.96]",
                  bodyScore === opt.value
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input 3: Sleep stepper */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-white/50" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Sleep last night</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustSleep(-0.5)}
                className="w-9 h-9 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all active:scale-90 font-black text-lg"
              >
                −
              </button>
              <span className="text-xl font-black text-white w-14 text-center tabular-nums">
                {sleepHours % 1 === 0 ? `${sleepHours}h` : `${sleepHours}h`}
              </span>
              <button
                onClick={() => adjustSleep(0.5)}
                className="w-9 h-9 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all active:scale-90 font-black text-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Optional note */}
        <div className="glass rounded-3xl overflow-hidden">
          <button
            onClick={() => setNoteOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white/40 hover:text-white/60 transition-colors"
          >
            <span>Add a note (optional)</span>
            <motion.div animate={{ rotate: noteOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
          <AnimatePresence>
            {noteOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 border-t border-white/5">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Pain, PRs, conditions, anything else..."
                    rows={3}
                    autoFocus
                    className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none resize-none mt-3"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          See My Report
        </button>
      </div>
    </motion.div>
  );
}

// ─── Report Screen ────────────────────────────────────────────────────────────

// Compound lifts that get 1.5x weight in scoring
const COMPOUND_NAMES = [
  'barbell bench press',
  'barbell back squat',
  'romanian deadlift',
  'rdl',
  'overhead press',
  'ohp',
  'pull-up',
  'assisted pull-up',
];

// Week-8 targets and starting weights for progress bars
const PROGRESS_TARGETS: Record<string, { start: number; target: number; short: string }> = {
  'Barbell Bench Press': { start: 80, target: 97.5, short: 'Bench' },
  'Barbell Back Squat': { start: 90, target: 97.5, short: 'Squat' },
  'Assisted Pull-Up (Machine or Band)': { start: 0, target: 0, short: 'Pull-Up' }, // handled specially
};

function parseRepsUpper(reps: string | number | undefined): number {
  if (reps === undefined || reps === null) return 8;
  const s = String(reps);
  // "5-6" → 6, "8-12" → 12, "10 each leg" → 10, "12" → 12
  const match = s.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return 8;
  return match[2] ? parseInt(match[2]) : parseInt(match[1]);
}

function isCompound(name: string): boolean {
  const lower = name.toLowerCase();
  return COMPOUND_NAMES.some(c => lower.includes(c));
}

interface ExerciseScore {
  name: string;
  prescribedWeight: number | null;
  prescribedReps: number;
  prescribedSets: number;
  actualWeight: number;
  actualReps: number;
  actualSets: number;
  rpe: number;
  loadRatio: number;
  repRatio: number;
  setRatio: number;
  score: number;
  isCompound: boolean;
  status: 'exceeded' | 'on_target' | 'missed' | 'no_data';
  weightDelta: number; // kg above/below
  repsDelta: number;
}

function computeSessionScore(
  sessionKey: string,
  setData: { [exIdx: number]: SetEntry[] },
  skipped: { [exIdx: number]: boolean },
  exerciseRpe: { [exIdx: number]: number }
): { score: number; label: string; exerciseScores: ExerciseScore[] } {
  const session = programme.sessions[sessionKey];
  if (!session) return { score: 0, label: 'Off day', exerciseScores: [] };
  const exercises = getSessionExercises(session);

  const exerciseScores: ExerciseScore[] = [];

  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    if (ex.type !== 'weight') continue;
    if (skipped[idx]) continue;

    const sets = (setData[idx] || []).filter(s => s.weight !== '' && s.reps !== '');
    if (sets.length === 0) continue;

    const prescribedReps = parseRepsUpper(ex.reps);
    const prescribedSets = ex.sets || 1;

    // Best weight = highest weight across all sets
    const weights = sets.map(s => parseFloat(s.weight) || 0);
    const repsBySet = sets.map(s => parseInt(s.reps) || 0);
    const bestWeight = Math.max(...weights);
    // Reps at best weight (if multiple sets at that weight, use max reps)
    const topSetIdx = weights.indexOf(bestWeight);
    const topSetReps = repsBySet[topSetIdx] ?? Math.max(...repsBySet);

    // Get prescribed weight from last history entry
    // We don't have history here, so use the coaching engine evaluation if available
    // For the report we'll look it up from the evaluation passed in
    const prescribedWeight = null; // will be enriched by caller

    const loadRatio = prescribedWeight !== null && prescribedWeight > 0
      ? Math.min(1.2, bestWeight / prescribedWeight)
      : 1.0; // no target available
    const repRatio = Math.min(1.2, topSetReps / prescribedReps);
    const setRatio = Math.min(1.2, sets.length / prescribedSets);

    const rawScore = (loadRatio + repRatio + setRatio) / 3;
    const score = Math.min(1.0, rawScore);
    const rpe = exerciseRpe[idx] ?? 7;

    // Determine status based on rep ratio (primary metric since weight target is often unknown)
    let status: ExerciseScore['status'];
    if (topSetReps >= prescribedReps + 1) status = 'exceeded';
    else if (topSetReps >= prescribedReps) status = 'on_target';
    else if (topSetReps >= prescribedReps - 2) status = 'on_target';
    else status = 'missed';

    exerciseScores.push({
      name: ex.name,
      prescribedWeight,
      prescribedReps,
      prescribedSets,
      actualWeight: bestWeight,
      actualReps: topSetReps,
      actualSets: sets.length,
      rpe,
      loadRatio,
      repRatio,
      setRatio,
      score,
      isCompound: isCompound(ex.name),
      status,
      weightDelta: prescribedWeight !== null ? bestWeight - prescribedWeight : 0,
      repsDelta: topSetReps - prescribedReps,
    });
  }

  // Weighted average: compounds 1.5x
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const es of exerciseScores) {
    const w = es.isCompound ? 1.5 : 1.0;
    totalWeighted += es.score * w;
    totalWeight += w;
  }
  const sessionScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;

  // Determine label
  const avgRpe = exerciseScores.length > 0
    ? exerciseScores.reduce((a, b) => a + b.rpe, 0) / exerciseScores.length
    : 0;
  const compoundsMissed = exerciseScores.filter(e => e.isCompound && e.status === 'missed').length;
  const highRpe = exerciseScores.some(e => e.rpe >= 9.5);

  let label: string;
  if (sessionScore >= 95 && !highRpe) {
    label = 'Crushed it';
  } else if (sessionScore >= 80) {
    label = 'Solid session';
  } else if (sessionScore >= 65 || avgRpe >= 9) {
    label = 'Grinding';
  } else if (sessionScore < 65 || compoundsMissed >= 2) {
    label = 'Off day';
  } else {
    label = 'Grinding';
  }

  return { score: sessionScore, label, exerciseScores };
}

function rpeNote(status: ExerciseScore['status'], rpe: number): string | null {
  if (status === 'exceeded' && rpe <= 8) return 'Green light — programme up';
  if ((status === 'on_target' || status === 'exceeded') && rpe <= 7) return 'Underloaded — increase next session';
  if (status === 'on_target' && rpe >= 7.5 && rpe <= 8.5) return 'Perfectly calibrated';
  if ((status === 'on_target' || status === 'exceeded') && rpe >= 9) return 'Hit it, but costly';
  if (status === 'missed' && rpe <= 7) return 'Left reps in the tank';
  if (status === 'missed' && rpe >= 9) return 'Genuinely hard — recover and retest';
  return null;
}

function ReportScreen({
  sessionKey,
  setData,
  skipped,
  elapsed,
  evaluation,
  savingStatus,
  iCloudStatus,
  onICloudSave,
  onShareCSV,
  onDone,
}: {
  sessionKey: string;
  setData: { [exIdx: number]: SetEntry[] };
  skipped: { [exIdx: number]: boolean };
  elapsed: number;
  evaluation: SessionEvaluation | null;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
  iCloudStatus: 'idle' | 'saving' | 'saved' | 'share';
  onICloudSave: () => void;
  onShareCSV: () => void;
  onDone: (acceptedWeights: Record<string, number>) => void;
}) {
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [acceptedWeights, setAcceptedWeights] = useState<Record<string, number>>({});
  const [ringAnimated, setRingAnimated] = useState(false);

  useEffect(() => {
    // Trigger ring animation after mount
    const t = setTimeout(() => setRingAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Pull exercise RPE values from the evaluation's exercise evaluations as a proxy
  // We need them indexed by exercise name
  const evalRpeByName: Record<string, number> = {};
  if (evaluation) {
    for (const ee of evaluation.exercise_evaluations) {
      // Use the midpoint of prescribed RPE as a reference; we'll use the rpe_delta to infer actual
      const midRpe = (ee.prescribed_rpe_min + ee.prescribed_rpe_max) / 2;
      evalRpeByName[ee.exercise_name] = Math.min(10, Math.max(1, midRpe + ee.rpe_delta));
    }
  }

  // Build exercise RPE map indexed by exercise index
  const session = programme.sessions[sessionKey];
  const exercises = getSessionExercises(session);
  const exerciseRpeByIdx: { [exIdx: number]: number } = {};
  exercises.forEach((ex, idx) => {
    if (evalRpeByName[ex.name] !== undefined) {
      exerciseRpeByIdx[idx] = evalRpeByName[ex.name];
    }
  });

  const { score, label, exerciseScores } = computeSessionScore(
    sessionKey, setData, skipped, exerciseRpeByIdx
  );

  // Enrich exercise scores with prescribed weight from evaluation
  if (evaluation) {
    for (const es of exerciseScores) {
      const ee = evaluation.exercise_evaluations.find(e => e.exercise_name === es.name);
      if (ee && ee.prescribed_weight !== null) {
        es.prescribedWeight = ee.prescribed_weight;
        es.weightDelta = es.actualWeight - ee.prescribed_weight;
        // Re-compute load ratio and status with actual prescribed weight
        es.loadRatio = Math.min(1.2, es.actualWeight / ee.prescribed_weight);
        if (es.weightDelta > 1) es.status = 'exceeded';
        else if (es.weightDelta >= -2.5) es.status = 'on_target';
        else es.status = 'missed';
      }
      // Also update RPE from eval
      const ee2 = evaluation.exercise_evaluations.find(e => e.exercise_name === es.name);
      if (ee2) {
        const midRpe = (ee2.prescribed_rpe_min + ee2.prescribed_rpe_max) / 2;
        es.rpe = Math.min(10, Math.max(1, midRpe + ee2.rpe_delta));
      }
    }
  }

  // Key callouts: exceeded compounds, missed compounds, anything notable
  const callouts = exerciseScores.filter(es => {
    if (es.status === 'exceeded') return true;
    if (es.isCompound && es.status === 'missed') return true;
    // Also flag compounds hit at very high RPE
    if (es.isCompound && es.status === 'on_target' && es.rpe >= 9) return true;
    return false;
  }).slice(0, 3);

  // Adj summary lines
  const adjLines: string[] = [];
  if (evaluation) {
    for (const adj of evaluation.adjustments.filter(a => a.type !== 'informational').slice(0, 3)) {
      const shortName = adj.exercise_name.replace(/^Barbell /, '').replace(/^Assisted /, '').split(' ')[0];
      if (adj.type === 'weight_increase') {
        adjLines.push(`${shortName} increases to ${adj.recommended_value}kg next session`);
      } else if (adj.type === 'weight_reduction') {
        adjLines.push(`${shortName} drops to ${adj.recommended_value}kg — RPE was high`);
      } else if (adj.type === 'deload') {
        adjLines.push(`${shortName} deload: ${adj.recommended_value}kg`);
      }
    }
  }

  // Progress bar data — key compounds toward week-8
  const progressBars = exerciseScores
    .filter(es => PROGRESS_TARGETS[es.name] && PROGRESS_TARGETS[es.name].target > 0)
    .map(es => {
      const tgt = PROGRESS_TARGETS[es.name];
      const progress = tgt.start >= tgt.target
        ? 1
        : Math.max(0, Math.min(1, (es.actualWeight - tgt.start) / (tgt.target - tgt.start)));
      // Status from evaluation projections
      let statusLabel = 'On track';
      let statusColor = 'text-emerald-400';
      if (evaluation) {
        const proj = evaluation.projections.find(p => p.exercise_name === es.name);
        if (proj) {
          if (proj.status === 'behind') { statusLabel = 'Behind'; statusColor = 'text-amber-400'; }
          else if (proj.status === 'ahead') { statusLabel = 'Ahead'; statusColor = 'text-violet-400'; }
        }
      }
      return { name: tgt.short, fullName: es.name, current: es.actualWeight, target: tgt.target, progress, statusLabel, statusColor };
    });

  // SVG ring constants (circumference for r=45)
  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference - (circumference * score) / 100;

  const labelColors: Record<string, string> = {
    'Crushed it': 'text-emerald-400',
    'Solid session': 'text-violet-400',
    'Grinding': 'text-amber-400',
    'Off day': 'text-red-400',
  };

  const handleDone = () => {
    // Auto-accept all weight adjustments from the evaluation
    const weights: Record<string, number> = {};
    if (evaluation) {
      for (const adj of evaluation.adjustments) {
        if (adj.type === 'weight_increase' || adj.type === 'weight_reduction' || adj.type === 'deload') {
          weights[adj.exercise_name] = adj.recommended_value;
        }
      }
    }
    onDone(weights);
  };

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="max-w-2xl mx-auto px-5 py-10 pb-52"
    >
      {/* Top: Score Ring */}
      <div className="flex flex-col items-center mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-5">Session Report</p>

        {/* Ring */}
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-white/8"
            />
            {/* Fill */}
            <motion.circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: ringAnimated ? dashoffset : circumference }}
              transition={{ duration: 1.2, ease: [0.34, 1.2, 0.64, 1] }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-black text-white tabular-nums leading-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {score}%
            </motion.span>
          </div>
        </div>

        <motion.h1
          className={cn("text-2xl font-extrabold", labelColors[label] ?? 'text-white')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {label}
        </motion.h1>

        {/* Quick stats row */}
        <motion.div
          className="flex gap-4 mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-center">
            <span className="block text-xl font-black text-white">{Math.round(elapsed / 60)}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">min</span>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <span className="block text-xl font-black text-white">
              {Object.values(setData).flat().filter((s: SetEntry) => s.weight !== '' || s.reps !== '').length}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">sets</span>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <span className="block text-xl font-black text-white">
              {exerciseScores.length}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">exercises</span>
          </div>
        </motion.div>
      </div>

      {/* Section 1: What Stood Out */}
      {callouts.length > 0 && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">What Stood Out</p>
          <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
            {callouts.map((es, i) => {
              const isExceeded = es.status === 'exceeded';
              const isMissed = es.status === 'missed';
              const note = rpeNote(es.status, es.rpe);
              // Short name (strip "Barbell " prefix)
              const shortName = es.name.replace(/^Barbell /, '').replace(/^Assisted /, '');

              return (
                <div key={i} className="p-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={cn(
                      "text-sm font-black",
                      isExceeded ? "text-emerald-400" : isMissed ? "text-amber-400" : "text-white"
                    )}>
                      {isExceeded ? '↑' : isMissed ? '↓' : '→'} {shortName}
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {es.actualWeight}kg x{es.actualReps}
                    </span>
                    {es.prescribedWeight !== null && (
                      <span className={cn(
                        "text-xs font-semibold",
                        isExceeded ? "text-emerald-400" : isMissed ? "text-amber-400" : "text-white/40"
                      )}>
                        {es.weightDelta > 0 ? `+${es.weightDelta.toFixed(1)}kg` : es.weightDelta < 0 ? `${es.weightDelta.toFixed(1)}kg` : 'on target'}
                        {es.prescribedWeight !== null && es.weightDelta !== 0 ? ' vs target' : ''}
                      </span>
                    )}
                    {es.prescribedWeight === null && es.repsDelta !== 0 && (
                      <span className={cn(
                        "text-xs font-semibold",
                        es.repsDelta > 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {es.repsDelta > 0 ? `+${es.repsDelta}` : `${es.repsDelta}`} reps vs target
                      </span>
                    )}
                    <span className="text-xs font-semibold text-white/30 ml-auto">RPE {es.rpe.toFixed(1)}</span>
                  </div>
                  {note && (
                    <p className="text-[11px] text-white/40 mt-1 italic">{note}</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Section 2: Next Session */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Next Session</p>
        <div className="glass rounded-3xl p-4 space-y-2.5">
          {adjLines.length > 0 ? (
            adjLines.map((line, i) => {
              const isIncrease = line.includes('increases');
              const isDecrease = line.includes('drops') || line.includes('deload');
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={cn(
                    "mt-0.5 shrink-0",
                    isIncrease ? "text-emerald-400" : isDecrease ? "text-amber-400" : "text-white/40"
                  )}>
                    {isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : isDecrease ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-sm text-white/80 font-medium">{line}</span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-white/50 font-medium">All loads stay the same — keep building.</p>
          )}
        </div>
      </motion.div>

      {/* Section 3: Big Picture — Progress Bars */}
      {progressBars.length > 0 && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Big Picture</p>
          <div className="glass rounded-3xl p-4 space-y-5">
            {progressBars.map((bar, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white">{bar.name}</span>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", bar.statusColor)}>
                    {bar.statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-white/60 tabular-nums w-12">{bar.current}kg</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.progress * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.9 + i * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                    />
                  </div>
                  <span className="text-xs font-bold text-white/30 tabular-nums w-14 text-right">{bar.target}kg</span>
                </div>
                <p className="text-[10px] text-white/30">
                  {bar.current >= bar.target
                    ? 'Week 8 target achieved'
                    : `${(bar.target - bar.current).toFixed(1)}kg to week 8 target`}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Expandable Full Details */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.95 }}
      >
        <button
          onClick={() => setShowAllExercises(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 glass rounded-2xl text-sm font-semibold text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
        >
          <span>{showAllExercises ? 'Hide details' : 'Show all exercises'}</span>
          <motion.div animate={{ rotate: showAllExercises ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showAllExercises && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {exerciseScores.map((es, i) => {
                  const statusColors = {
                    exceeded: 'text-emerald-400',
                    on_target: 'text-white/70',
                    missed: 'text-amber-400',
                    no_data: 'text-white/30',
                  };
                  const statusLabels = {
                    exceeded: 'EXCEEDED',
                    on_target: 'ON TARGET',
                    missed: 'MISSED',
                    no_data: 'NO DATA',
                  };
                  const badgeColors = {
                    exceeded: 'bg-emerald-500/15 text-emerald-400',
                    on_target: 'bg-white/10 text-white/50',
                    missed: 'bg-amber-500/15 text-amber-400',
                    no_data: 'bg-white/5 text-white/20',
                  };
                  return (
                    <div key={i} className="glass rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-bold text-white leading-snug">{es.name}</p>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest shrink-0 px-2 py-0.5 rounded-full", badgeColors[es.status])}>
                          {statusLabels[es.status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="block text-base font-black text-white">{es.actualWeight}kg</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">weight</span>
                        </div>
                        <div>
                          <span className="block text-base font-black text-white">{es.actualReps}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">reps</span>
                        </div>
                        <div>
                          <span className="block text-base font-black text-white">{es.actualSets}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">sets</span>
                        </div>
                        <div>
                          <span className={cn("block text-base font-black", statusColors[es.status])}>{es.rpe.toFixed(1)}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">rpe</span>
                        </div>
                      </div>
                      {es.prescribedWeight !== null && (
                        <p className="text-[10px] text-white/30 mt-2">
                          Target: {es.prescribedWeight}kg × {es.prescribedReps} reps × {es.prescribedSets} sets
                        </p>
                      )}
                    </div>
                  );
                })}
                {exerciseScores.length === 0 && (
                  <div className="text-center py-6 text-white/30 text-sm">No weighted exercises logged.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bottom-fade pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto space-y-3">

          {/* Save status */}
          <div className={cn(
            "w-full flex items-center justify-center gap-2.5 font-bold py-3 rounded-2xl text-sm transition-all",
            savingStatus === 'saving' && "glass text-white/40",
            savingStatus === 'saved' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
            savingStatus === 'error' && "bg-red-500/15 text-red-400 border border-red-500/20",
            savingStatus === 'idle' && "glass text-white/20"
          )}>
            {savingStatus === 'saving' && <><RotateCcw className="w-4 h-4 animate-spin" />Saving...</>}
            {savingStatus === 'saved' && <><CheckCircle2 className="w-4 h-4" />Saved to device</>}
            {savingStatus === 'error' && <span>Save failed</span>}
            {savingStatus === 'idle' && <span>Saving...</span>}
          </div>

          <div className="flex gap-3">
            {/* iCloud save */}
            <button
              onClick={onICloudSave}
              disabled={iCloudStatus === 'saving' || iCloudStatus === 'saved'}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-sm transition-all active:scale-[0.97]",
                iCloudStatus === 'idle' && "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25",
                iCloudStatus === 'saving' && "bg-sky-600/50 text-sky-200 cursor-not-allowed",
                iCloudStatus === 'saved' && "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                iCloudStatus === 'share' && "bg-sky-600/70 hover:bg-sky-600 text-white"
              )}
            >
              {iCloudStatus === 'idle' && <><CloudUpload className="w-4 h-4" />iCloud</>}
              {iCloudStatus === 'saving' && <><RotateCcw className="w-4 h-4 animate-spin" />Saving</>}
              {iCloudStatus === 'saved' && <><CheckCircle2 className="w-4 h-4" />Saved</>}
              {iCloudStatus === 'share' && <><Share2 className="w-4 h-4" />Share</>}
            </button>

            {/* Share / Download CSV */}
            <button
              onClick={onShareCSV}
              className="flex-1 flex items-center justify-center gap-2 glass-pink text-pink-300 font-bold py-4 rounded-2xl text-sm hover:bg-pink-500/20 transition-all active:scale-[0.97]"
            >
              {typeof navigator !== 'undefined' && navigator.share
                ? <><Share2 className="w-4 h-4" />CSV</>
                : <><Download className="w-4 h-4" />CSV</>
              }
            </button>

            {/* Done */}
            <button
              onClick={handleDone}
              className="flex-[2] bg-violet-600 text-white font-bold py-4 rounded-2xl hover:bg-violet-500 transition-all active:scale-[0.98] shadow-lg shadow-violet-600/25"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
