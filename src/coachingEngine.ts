/**
 * GSB Coaching Engine
 * Pure logic module — no React, no DOM, no side effects.
 * All functions are deterministic given the same inputs.
 */

import { Programme, Session, Exercise, SetEntry } from './types';

// ─── Public Interfaces ────────────────────────────────────────────────────────

export interface PostSessionFeedback {
  soreness_score: 1 | 2 | 3 | 4 | 5;
  energy_score: 1 | 2 | 3 | 4 | 5;
  sleep_hours: number;
  session_rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface CompletedSet {
  weight_kg: number;
  reps: number;
  rpe?: number;
  form_flag?: boolean;
  pain_flag?: boolean;
}

export type ExerciseFlag =
  | 'strong_session'
  | 'rpe_spike'
  | 'form_breakdown'
  | 'pain'
  | 'incomplete'
  | 'weight_increase_due';

export interface ExerciseEvaluation {
  exercise_name: string;
  completion_rate: number;
  avg_weight: number;
  avg_reps: number;
  prescribed_weight: number | null;
  prescribed_reps_min: number;
  prescribed_reps_max: number;
  prescribed_rpe_min: number;
  prescribed_rpe_max: number;
  rpe_delta: number;
  progression_met: boolean;
  consecutive_progression_sessions: number;
  stall_detected: boolean;
  flags: ExerciseFlag[];
}

export type AdjustmentType =
  | 'weight_increase'
  | 'weight_reduction'
  | 'volume_reduction'
  | 'deload'
  | 'exercise_substitution'
  | 'informational';

export interface Adjustment {
  type: AdjustmentType;
  priority: 1 | 2 | 3 | 4 | 5;
  exercise_name: string;
  current_value: number;
  recommended_value: number;
  reason: string;
  evidence: string[];
}

export type LiftStatus = 'behind' | 'on_track' | 'ahead';

export interface LiftProjection {
  exercise_name: string;
  current_weight: number;
  target_weight: number;
  weeks_remaining: number;
  required_per_week: number;
  actual_per_week: number;
  status: LiftStatus;
}

export type FatigueLevel = 'fresh' | 'normal' | 'accumulating' | 'deload_recommended';

export interface SessionEvaluation {
  date: string;
  session_type: string;
  completion_rate: number;
  exercise_evaluations: ExerciseEvaluation[];
  fatigue_level: FatigueLevel;
  adjustments: Adjustment[];
  projections: LiftProjection[];
  next_session_weights: Record<string, number>;
}

export interface CoachingState {
  evaluations: SessionEvaluation[];
  acceptedAdjustments: Record<string, number>;
  feedbackHistory: PostSessionFeedback[];
  athleteState: {
    fatigue_7day: number;
    progression_streaks: Record<string, number>;
    current_week: number;
  };
}

// ─── History Row Type (mirrors App.tsx shape) ─────────────────────────────────

export interface HistorySession {
  date: string;
  sessionType: string;
  exercises: {
    exercise: string;
    weight: string;
    sets: string;
    reps: string;
    notes: string;
  }[];
}

// ─── Exercise Name Normalisation ─────────────────────────────────────────────

const NAME_NORMALISATION_MAP: Record<string, string> = {
  'bench press': 'Barbell Bench Press',
  'bench press (warm-up ramp)': 'Barbell Bench Press',
  'barbell bench press': 'Barbell Bench Press',
  'incline dumbbell press': 'Incline Dumbbell Bench Press',
  'incline dumbbell bench press': 'Incline Dumbbell Bench Press',
  'seated shoulder press (machine)': 'Seated Shoulder Press',
  'seated shoulder press': 'Seated Shoulder Press',
};

/**
 * Returns the canonical exercise name for history lookups.
 * Falls back to the original if no mapping exists.
 */
export function normaliseExerciseName(name: string): string {
  const key = name.toLowerCase().trim();
  return NAME_NORMALISATION_MAP[key] ?? name;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAMME_START = new Date('2026-03-25');
const PROGRAMME_END = new Date('2026-05-20');
const DELOAD_WEEK = 7;
const OBSERVATION_WEEKS = 2;

// Key lifts and their week-8 targets
const KEY_LIFT_TARGETS: Record<string, number> = {
  'Barbell Bench Press': 97.5,
  'Barbell Back Squat': 97.5,
  'Assisted Pull-Up (Machine or Band)': 0, // special case — target is unassisted
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentWeek(): number {
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const week = Math.floor((now.getTime() - PROGRAMME_START.getTime()) / msPerWeek) + 1;
  return Math.max(1, Math.min(8, week));
}

function isDeloadWeek(): boolean {
  return getCurrentWeek() === DELOAD_WEEK;
}

function isObservationMode(): boolean {
  return getCurrentWeek() <= OBSERVATION_WEEKS;
}

function parseWeight(w: string): number {
  const n = parseFloat(w);
  return isNaN(n) ? 0 : n;
}

function parseReps(r: string): number {
  // Handle "10 each leg", "8-12", "12", etc.
  const match = r.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function parseRpeRange(rpe: string | number | undefined): [number, number] {
  if (rpe === undefined || rpe === null) return [7, 8];
  const s = String(rpe);
  const parts = s.split('-').map(Number);
  if (parts.length === 2) return [parts[0], parts[1]];
  const n = Number(s);
  return isNaN(n) ? [7, 8] : [n, n];
}

function parseRepRange(reps: string | number | undefined): [number, number] {
  if (reps === undefined || reps === null) return [6, 10];
  const s = String(reps);
  // "10 each leg" → [10, 10]
  const match = s.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return [6, 10];
  const lo = parseInt(match[1]);
  const hi = match[2] ? parseInt(match[2]) : lo;
  return [lo, hi];
}

function roundToNearest2_5(n: number): number {
  return Math.round(n / 2.5) * 2.5;
}

/** Returns the increment size for an exercise based on programme type */
function progressionIncrement(exercise: Exercise): number {
  const name = exercise.name.toLowerCase();
  // Dumbbell exercises: +2kg per side
  if (name.includes('dumbbell') || name.includes('db ')) return 2;
  // Barbell compounds: +2.5kg
  if (name.includes('barbell') || name.includes('squat') || name.includes('deadlift') || name.includes('rdl') || name.includes('ohp') || name.includes('overhead press')) return 2.5;
  // Default (isolation/cable)
  return 2.5;
}

/**
 * Get all logged sets for a specific exercise from history.
 * Returns the most recent N sessions (default: all).
 */
function getExerciseHistory(
  exerciseName: string,
  history: HistorySession[],
  limit?: number
): { date: string; weight: number; reps: number; sets: number }[] {
  const result: { date: string; weight: number; reps: number; sets: number }[] = [];
  const canonicalName = normaliseExerciseName(exerciseName).toLowerCase();

  for (const session of history) {
    const match = session.exercises.find(
      e => normaliseExerciseName(e.exercise).toLowerCase() === canonicalName
    );
    if (!match) continue;

    // Parse weight (handle "90/90/90" or "90")
    const weights = match.weight.split('/').map(parseWeight).filter(w => w > 0);
    const repsArr = match.reps.split('/').map(parseReps).filter(r => r > 0);
    if (weights.length === 0) continue;

    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const avgReps = repsArr.length > 0 ? repsArr.reduce((a, b) => a + b, 0) / repsArr.length : 0;

    result.push({
      date: session.date,
      weight: avgWeight,
      reps: avgReps,
      sets: parseInt(match.sets) || weights.length
    });
  }

  // History comes in descending order — reverse to get chronological for analysis
  result.reverse();

  if (limit) return result.slice(-limit);
  return result;
}

// ─── Core Functions ────────────────────────────────────────────────────────────

/**
 * Detect if an exercise has stalled:
 * 3+ sessions at the same weight+reps without improvement.
 */
export function detectStall(
  exerciseHistory: { date: string; weight: number; reps: number; sets: number }[]
): boolean {
  if (exerciseHistory.length < 3) return false;
  const last3 = exerciseHistory.slice(-3);
  const firstWeight = last3[0].weight;
  const firstReps = last3[0].reps;
  return last3.every(s => Math.abs(s.weight - firstWeight) < 0.1 && Math.abs(s.reps - firstReps) < 0.5);
}

/**
 * Count consecutive sessions where progression criteria was met
 * (reps at or above top of prescribed range).
 */
export function countConsecutiveProgressions(
  exerciseHistory: { date: string; weight: number; reps: number; sets: number }[],
  exercise: Exercise
): number {
  if (exerciseHistory.length === 0) return 0;
  const [, repMax] = parseRepRange(exercise.reps);
  let count = 0;
  for (let i = exerciseHistory.length - 1; i >= 0; i--) {
    if (exerciseHistory[i].reps >= repMax) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Compute the recommended weight for an exercise's next session.
 * Returns null if insufficient data.
 */
export function getRecommendedWeights(
  exerciseName: string,
  exercise: Exercise,
  history: HistorySession[],
  acceptedAdjustments: Record<string, number> = {}
): number | null {
  // If the coach has a previously accepted adjustment, use it
  if (acceptedAdjustments[exerciseName] !== undefined) {
    return acceptedAdjustments[exerciseName];
  }

  const exHistory = getExerciseHistory(exerciseName, history);
  if (exHistory.length === 0) return null;

  const lastSession = exHistory[exHistory.length - 1];
  const currentWeight = lastSession.weight;
  if (currentWeight <= 0) return null;

  // Deload: recommend 80% of current
  if (isDeloadWeek()) {
    return roundToNearest2_5(currentWeight * 0.8);
  }

  // Observation mode: use same weight as last session
  if (isObservationMode()) {
    return currentWeight;
  }

  const [, repMax] = parseRepRange(exercise.reps);
  const consecutive = countConsecutiveProgressions(exHistory, exercise);
  const stall = detectStall(exHistory);

  // Stall response: drop 10%
  if (stall) {
    return roundToNearest2_5(currentWeight * 0.9);
  }

  // Progress: hit reps for 1+ consecutive sessions → increase
  if (consecutive >= 1 && lastSession.reps >= repMax) {
    return roundToNearest2_5(currentWeight + progressionIncrement(exercise));
  }

  // Otherwise: same weight
  return currentWeight;
}

/**
 * Compute fatigue level from recent feedback.
 */
export function computeFatigueScore(recentFeedback: PostSessionFeedback[]): FatigueLevel {
  if (recentFeedback.length === 0) return 'normal';

  const last = recentFeedback.slice(-4);
  const avgSoreness = last.reduce((a, b) => a + b.soreness_score, 0) / last.length;
  const avgEnergy = last.reduce((a, b) => a + b.energy_score, 0) / last.length;
  const avgSleep = last.reduce((a, b) => a + b.sleep_hours, 0) / last.length;
  const avgRating = last.reduce((a, b) => a + b.session_rating, 0) / last.length;

  // Score: soreness and low energy push toward fatigue; good sleep and high rating pull toward fresh
  const fatigueScore =
    (avgSoreness - 1) / 4 * 0.35 +
    (5 - avgEnergy) / 4 * 0.30 +
    (8 - Math.min(avgSleep, 8)) / 6 * 0.20 +
    (3 - avgRating) / 4 * 0.15;

  if (fatigueScore >= 0.65) return 'deload_recommended';
  if (fatigueScore >= 0.45) return 'accumulating';
  if (fatigueScore >= 0.25) return 'normal';
  return 'fresh';
}

/**
 * Compute week-8 projections for key lifts.
 */
export function computeProjections(
  history: HistorySession[],
  programme: Programme
): LiftProjection[] {
  const projections: LiftProjection[] = [];
  const weeksRemaining = Math.max(0, 8 - getCurrentWeek());
  const totalWeeks = getCurrentWeek() - 1; // weeks elapsed

  for (const [exName, target] of Object.entries(KEY_LIFT_TARGETS)) {
    if (target === 0) continue; // skip pull-ups (different metric)

    const exHistory = getExerciseHistory(exName, history);
    if (exHistory.length === 0) continue;

    const currentWeight = exHistory[exHistory.length - 1].weight;

    // Find exercise def to get increment
    let exerciseDef: Exercise | null = null;
    for (const session of Object.values(programme.sessions)) {
      const found = session.exercises?.find(e => e.name === exName);
      if (found) { exerciseDef = found; break; }
    }
    const increment = exerciseDef ? progressionIncrement(exerciseDef) : 2.5;

    // Actual weekly progression rate
    let actualPerWeek = 0;
    if (exHistory.length >= 2 && totalWeeks > 0) {
      const earliest = exHistory[0].weight;
      actualPerWeek = (currentWeight - earliest) / totalWeeks;
    } else {
      actualPerWeek = increment * 0.5; // conservative estimate if insufficient data
    }

    const requiredPerWeek = weeksRemaining > 0 ? (target - currentWeight) / weeksRemaining : 0;

    let status: LiftStatus;
    if (actualPerWeek >= requiredPerWeek * 0.9) {
      status = 'on_track';
    } else if (actualPerWeek >= requiredPerWeek * 1.1) {
      status = 'ahead';
    } else {
      status = 'behind';
    }

    projections.push({
      exercise_name: exName,
      current_weight: currentWeight,
      target_weight: target,
      weeks_remaining: weeksRemaining,
      required_per_week: Math.max(0, requiredPerWeek),
      actual_per_week: actualPerWeek,
      status
    });
  }

  return projections;
}

/**
 * Core session evaluation function.
 * Takes the current session's logged data and history, returns a full SessionEvaluation.
 */
export function evaluateSession(
  sessionKey: string,
  currentSetData: { [exIdx: number]: SetEntry[] },
  currentSkipped: { [exIdx: number]: boolean },
  history: HistorySession[],
  programme: Programme,
  feedbackHistory: PostSessionFeedback[],
  acceptedAdjustments: Record<string, number>
): SessionEvaluation {
  const session = programme.sessions[sessionKey];
  if (!session) {
    throw new Error(`Session not found: ${sessionKey}`);
  }

  const exercises = session.exercises || [];
  const date = new Date().toISOString().split('T')[0];
  const currentWeek = getCurrentWeek();
  const deload = isDeloadWeek();

  // ── Exercise Evaluations ──────────────────────────────────────────────────

  const exerciseEvaluations: ExerciseEvaluation[] = [];
  const adjustments: Adjustment[] = [];
  const nextSessionWeights: Record<string, number> = {};

  let totalExercises = 0;
  let completedExercises = 0;

  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    if (ex.type === 'timed' || ex.type === 'bodyweight' || ex.type === 'cardio') continue;
    if (currentSkipped[idx]) continue;

    totalExercises++;

    const sets = (currentSetData[idx] || []).filter(s => s.weight !== '' && s.reps !== '');
    const prescribedSets = ex.sets || 1;

    const completionRate = sets.length > 0 ? Math.min(1, sets.length / prescribedSets) : 0;
    if (completionRate >= 0.8) completedExercises++;

    const weights = sets.map(s => parseWeight(s.weight));
    const repsArr = sets.map(s => parseReps(s.reps));
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const avgReps = repsArr.length > 0 ? repsArr.reduce((a, b) => a + b, 0) / repsArr.length : 0;

    const [repMin, repMax] = parseRepRange(ex.reps);
    const [rpeMin, rpeMax] = parseRpeRange(ex.rpe);

    // Try to find last logged weight from history
    const exHistory = getExerciseHistory(ex.name, history);
    const prescribedWeight = exHistory.length > 0 ? exHistory[exHistory.length - 1].weight : null;

    // Estimate RPE from completion and reps
    // If hit top of rep range → likely at prescribed RPE
    // If exceeded rep range → possibly lower RPE (easier)
    // If below rep range → possibly higher RPE
    let estimatedRpe = (rpeMin + rpeMax) / 2;
    if (avgReps > 0) {
      if (avgReps >= repMax + 2) estimatedRpe = Math.max(6, estimatedRpe - 1);
      else if (avgReps < repMin) estimatedRpe = Math.min(10, estimatedRpe + 1.5);
    }
    const rpeDelta = estimatedRpe - (rpeMin + rpeMax) / 2;

    // Progression criteria
    const progressionMet = avgReps >= repMax && avgWeight > 0;
    const consecutive = countConsecutiveProgressions(exHistory, ex);
    const stall = detectStall(exHistory);

    // Pain / form flags from notes
    const allNotes = (currentSetData[idx] || []).map(s => s.note.toLowerCase()).join(' ');
    const hasPainFlag = allNotes.includes('pain') || allNotes.includes('hurt') || allNotes.includes('ache') || allNotes.includes('injury');
    const hasFormFlag = allNotes.includes('form') || allNotes.includes('broke') || allNotes.includes('cheated');

    // Compute flags
    const flags: ExerciseFlag[] = [];
    if (completionRate < 0.7) flags.push('incomplete');
    if (hasPainFlag) flags.push('pain');
    if (hasFormFlag) flags.push('form_breakdown');
    if (rpeDelta > 1.5) flags.push('rpe_spike');
    if (progressionMet && (consecutive >= 1) && !deload && !isObservationMode()) flags.push('weight_increase_due');
    if (avgReps >= repMax && rpeDelta <= 0 && !hasPainFlag && !hasFormFlag) flags.push('strong_session');

    exerciseEvaluations.push({
      exercise_name: ex.name,
      completion_rate: completionRate,
      avg_weight: avgWeight,
      avg_reps: avgReps,
      prescribed_weight: prescribedWeight,
      prescribed_reps_min: repMin,
      prescribed_reps_max: repMax,
      prescribed_rpe_min: rpeMin,
      prescribed_rpe_max: rpeMax,
      rpe_delta: rpeDelta,
      progression_met: progressionMet,
      consecutive_progression_sessions: consecutive,
      stall_detected: stall,
      flags
    });

    // ── Generate Adjustments ────────────────────────────────────────────────

    if (deload) {
      // Deload week: suppress progression, recommend volume reduction
      if (avgWeight > 0) {
        const deloadWeight = roundToNearest2_5(avgWeight * 0.8);
        adjustments.push({
          type: 'deload',
          priority: 1,
          exercise_name: ex.name,
          current_value: avgWeight,
          recommended_value: deloadWeight,
          reason: `Week ${DELOAD_WEEK} deload — drop to 80% across the board`,
          evidence: [`Current weight: ${avgWeight}kg`]
        });
        nextSessionWeights[ex.name] = deloadWeight;
      }
      continue;
    }

    if (hasPainFlag) {
      const reducedWeight = roundToNearest2_5(avgWeight * 0.85);
      adjustments.push({
        type: 'weight_reduction',
        priority: 1,
        exercise_name: ex.name,
        current_value: avgWeight,
        recommended_value: reducedWeight,
        reason: 'Pain flag detected in session notes — reduce load and monitor',
        evidence: ['Pain/discomfort noted during session']
      });
      nextSessionWeights[ex.name] = reducedWeight;
      continue;
    }

    if (stall && !isObservationMode()) {
      const deloadedWeight = roundToNearest2_5(avgWeight * 0.9);
      adjustments.push({
        type: 'weight_reduction',
        priority: 2,
        exercise_name: ex.name,
        current_value: avgWeight,
        recommended_value: deloadedWeight,
        reason: 'Stall detected across 3+ sessions — drop 10% to reset progression',
        evidence: exHistory.slice(-3).map(h => `${h.date}: ${h.weight}kg × ${Math.round(h.reps)} reps`)
      });
      nextSessionWeights[ex.name] = deloadedWeight;
      continue;
    }

    if (rpeDelta > 2 && !isObservationMode()) {
      const reducedWeight = roundToNearest2_5(avgWeight * 0.95);
      adjustments.push({
        type: 'weight_reduction',
        priority: 2,
        exercise_name: ex.name,
        current_value: avgWeight,
        recommended_value: reducedWeight,
        reason: 'RPE significantly higher than prescribed — reduce load by 5%',
        evidence: [`Estimated RPE: ${estimatedRpe.toFixed(1)} vs prescribed ${rpeMin}-${rpeMax}`]
      });
      nextSessionWeights[ex.name] = reducedWeight;
      continue;
    }

    if (progressionMet && consecutive >= 1 && !isObservationMode()) {
      const newWeight = roundToNearest2_5(avgWeight + progressionIncrement(ex));
      const evidence = [`Hit ${Math.round(avgReps)} reps at ~RPE ${estimatedRpe.toFixed(1)}`];
      if (consecutive > 1) evidence.push(`${consecutive} consecutive sessions at this performance level`);
      adjustments.push({
        type: 'weight_increase',
        priority: 3,
        exercise_name: ex.name,
        current_value: avgWeight,
        recommended_value: newWeight,
        reason: `Hit top of rep range — ready to progress`,
        evidence
      });
      nextSessionWeights[ex.name] = newWeight;
      continue;
    }

    if (isObservationMode() && avgWeight > 0) {
      adjustments.push({
        type: 'informational',
        priority: 5,
        exercise_name: ex.name,
        current_value: avgWeight,
        recommended_value: avgWeight,
        reason: `Weeks 1-2 are observation mode — logging baselines only`,
        evidence: [`Week ${currentWeek} of ${OBSERVATION_WEEKS} observation weeks`]
      });
      nextSessionWeights[ex.name] = avgWeight;
    } else if (avgWeight > 0) {
      // No change — maintain weight
      nextSessionWeights[ex.name] = avgWeight;
    }
  }

  // ── Session Completion Rate ───────────────────────────────────────────────

  const completionRate = totalExercises > 0 ? completedExercises / totalExercises : 1;

  // ── Fatigue ───────────────────────────────────────────────────────────────

  const fatigueLevel = computeFatigueScore(feedbackHistory);

  // ── Projections ───────────────────────────────────────────────────────────

  const projections = computeProjections(history, programme);

  // Sort adjustments by priority (lower = more urgent)
  adjustments.sort((a, b) => a.priority - b.priority);

  return {
    date,
    session_type: session.label,
    completion_rate: completionRate,
    exercise_evaluations: exerciseEvaluations,
    fatigue_level: fatigueLevel,
    adjustments,
    projections,
    next_session_weights: nextSessionWeights
  };
}

// ─── PR Detection ─────────────────────────────────────────────────────────────

export interface PRRecord {
  weight: number;
  reps: number;
  date: string;
}

/**
 * Computes all-time PR (max top-set weight) for every exercise in history.
 * Returns a map of canonical exercise name → PR record.
 */
export function computePRs(history: HistorySession[]): Record<string, PRRecord> {
  const prs: Record<string, PRRecord> = {};

  for (const session of history) {
    for (const ex of session.exercises) {
      const canonical = normaliseExerciseName(ex.exercise);
      const weights = ex.weight.split('/').map(parseWeight).filter(w => w > 0);
      const repsArr = ex.reps.split('/').map(parseReps).filter(r => r > 0);
      if (weights.length === 0) continue;

      const topWeight = Math.max(...weights);
      const topIdx = weights.lastIndexOf(topWeight);
      const topReps = repsArr[topIdx] ?? (repsArr.length > 0 ? Math.max(...repsArr) : 0);

      const existing = prs[canonical];
      if (!existing || topWeight > existing.weight) {
        prs[canonical] = { weight: topWeight, reps: topReps, date: session.date };
      }
    }
  }

  return prs;
}

// ─── Milestone Proximity Alert ────────────────────────────────────────────────

export interface MilestoneAlert {
  exercise: string;
  milestone: number;
  sessionsAway: number;
  currentWeight: number;
}

const MILESTONE_MAP: Record<string, number[]> = {
  'Barbell Bench Press': [92.5, 95, 97.5, 100],
  'Barbell Back Squat': [92.5, 95, 97.5, 100],
  'Romanian Deadlift': [100, 110, 120, 130],
};

/**
 * Computes the next milestone alert for key compounds.
 * Returns the most imminent milestone across all key lifts, or null if none.
 */
export function computeMilestoneAlert(
  history: HistorySession[]
): MilestoneAlert | null {
  let best: MilestoneAlert | null = null;

  for (const [exName, milestones] of Object.entries(MILESTONE_MAP)) {
    const exHistory = getExerciseHistory(exName, history);
    if (exHistory.length < 3) continue;

    const currentWeight = exHistory[exHistory.length - 1].weight;
    if (currentWeight <= 0) continue;

    // Stall check — don't fire if stalled
    if (detectStall(exHistory)) continue;

    // Average increment per session (only sessions with weight increases)
    let totalInc = 0;
    let incCount = 0;
    for (let i = 1; i < exHistory.length; i++) {
      const delta = exHistory[i].weight - exHistory[i - 1].weight;
      if (delta > 0) { totalInc += delta; incCount++; }
    }
    const avgIncPerSession = incCount > 0 ? totalInc / incCount : 2.5;

    // Find the next milestone within 10kg
    const nextMilestone = milestones.find(m => m > currentWeight && m - currentWeight <= 10);
    if (!nextMilestone) continue;

    const gap = nextMilestone - currentWeight;
    const sessionsAway = Math.ceil(gap / avgIncPerSession);

    // Keep the closest one
    if (!best || sessionsAway < best.sessionsAway) {
      best = { exercise: exName, milestone: nextMilestone, sessionsAway, currentWeight };
    }
  }

  return best;
}

/**
 * Load coaching state from localStorage.
 */
export function loadCoachingState(): CoachingState {
  const stored = localStorage.getItem('liftoff_coaching');
  if (stored) {
    try {
      return JSON.parse(stored) as CoachingState;
    } catch {}
  }
  return {
    evaluations: [],
    acceptedAdjustments: {},
    feedbackHistory: [],
    athleteState: {
      fatigue_7day: 0,
      progression_streaks: {},
      current_week: getCurrentWeek()
    }
  };
}

/**
 * Persist coaching state to localStorage.
 */
export function saveCoachingState(state: CoachingState): void {
  localStorage.setItem('liftoff_coaching', JSON.stringify(state));
}
