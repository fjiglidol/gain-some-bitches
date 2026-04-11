/**
 * Pose analysis utilities for form checking and rep counting.
 * Works with MediaPipe 33-landmark format as sent by iKeleton OSC.
 *
 * Landmark indices (MediaPipe):
 *   11/12 = left/right shoulder
 *   13/14 = left/right elbow
 *   15/16 = left/right wrist
 *   23/24 = left/right hip
 *   25/26 = left/right knee
 */

export interface Landmark {
  x: number; // 0..1 normalised
  y: number; // 0..1 normalised (0 = top)
  z: number;
  visibility: number; // 0..1
}

export type Pose = Landmark[]; // 33 landmarks

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Angle (degrees) at the middle joint B, given three landmark positions */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ax = a.x - b.x, ay = a.y - b.y;
  const cx = c.x - b.x, cy = c.y - b.y;
  const dot = ax * cx + ay * cy;
  const mag = Math.sqrt(ax * ax + ay * ay) * Math.sqrt(cx * cx + cy * cy);
  if (mag === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

/** Average of two landmarks (e.g. mid-shoulder, mid-hip) */
function mid(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, visibility: Math.min(a.visibility, b.visibility) };
}

// ─── Rep Counter State Machine ───────────────────────────────────────────────

export type RepPhase = 'idle' | 'eccentric' | 'concentric';

export interface RepCounter {
  reps: number;
  phase: RepPhase;
  /** Current primary angle driving the count */
  angle: number;
  /** 0..1 range-of-motion progress within current rep */
  progress: number;
}

/**
 * Update the rep counter given the current primary angle.
 * Works for any exercise where the angle dips low then returns high.
 *
 * @param counter  existing counter state (mutated copy returned)
 * @param angle    current measured angle (degrees)
 * @param hi       angle considered "top" / rest position  (e.g. 160)
 * @param lo       angle considered "bottom" / contracted  (e.g. 60)
 */
export function updateRepCounter(
  counter: RepCounter,
  angle: number,
  hi = 155,
  lo = 70
): RepCounter {
  const c = { ...counter, angle };
  const range = hi - lo;
  c.progress = range > 0 ? Math.min(1, Math.max(0, (hi - angle) / range)) : 0;

  if (c.phase === 'idle' || c.phase === 'concentric') {
    if (angle < lo + REP_PHASE_TRANSITION_BUFFER_DEG) {
      c.phase = 'eccentric'; // reached contracted position
    }
  } else if (c.phase === 'eccentric') {
    if (angle > hi - REP_PHASE_TRANSITION_BUFFER_DEG) {
      c.reps += 1;
      c.phase = 'concentric'; // returned to extended position → rep counted
    }
  }
  return c;
}

export function newRepCounter(): RepCounter {
  return { reps: 0, phase: 'idle', angle: 0, progress: 0 };
}

// ─── Form Check Thresholds ───────────────────────────────────────────────────

/** Minimum landmark visibility (0–1) required before a form check is run */
const MIN_LANDMARK_VISIBILITY = 0.5;

/**
 * Max elbow forward drift relative to torso width before a correction cue fires.
 * 0 = elbow perfectly over hip; 1 = elbow one full torso-width in front.
 */
const ELBOW_FORWARD_DRIFT_MAX = 0.35;

/** Body sway detection: if the shoulder y-offset from hip exceeds this, flag swing */
const BODY_SWAY_Y_THRESHOLD = -0.05;

/** Elbow height below shoulder (normalised y) before a "drive elbows down" cue fires */
const ELBOW_DROP_FROM_SHOULDER = 0.02;

/** Wrist spread must exceed elbow spread by at least this to confirm external rotation */
const EXTERNAL_ROTATION_SPREAD_MIN = 0.05;

/** For rear-delt fly: elbows more than this below shoulder → cue to raise them */
const REAR_DELT_ELBOW_SAG_MAX = 0.08;

/** For face pull: elbows more than this below shoulder → cue to raise them */
const FACE_PULL_ELBOW_SAG_MAX = 0.03;

/** Angle buffer around phase transition points (degrees) — prevents rapid toggling */
const REP_PHASE_TRANSITION_BUFFER_DEG = 15;

// ─── Form Checks ─────────────────────────────────────────────────────────────

export interface FormCue {
  severity: 'ok' | 'warn' | 'error';
  message: string;
}

/** Choose the side with better visibility */
function bestSide(pose: Pose, leftIdx: number, rightIdx: number): Landmark {
  const l = pose[leftIdx], r = pose[rightIdx];
  return l.visibility >= r.visibility ? l : r;
}

/**
 * Returns form cues for the given exercise using the current pose.
 * Returns [] if landmark confidence is too low.
 */
export function analyzeForm(pose: Pose, exerciseName: string): FormCue[] {
  if (!pose || pose.length < 33) return [];

  const lShoulder = pose[11], rShoulder = pose[12];
  const lElbow = pose[13], rElbow = pose[14];
  const lWrist = pose[15], rWrist = pose[16];
  const lHip = pose[23], rHip = pose[24];

  const cues: FormCue[] = [];

  const name = exerciseName.toLowerCase();

  // ── Curl family ────────────────────────────────────────────────────────────
  if (name.includes('curl')) {
    const elbow = bestSide(pose, 13, 14);
    const shoulder = bestSide(pose, 11, 12);
    const wrist = bestSide(pose, 15, 16);
    if (elbow.visibility < MIN_LANDMARK_VISIBILITY) return [];

    // Elbow drift: elbow should stay close to the hip line during the curl
    const hipX = (lHip.x + rHip.x) / 2;
    const shoulderX = (lShoulder.x + rShoulder.x) / 2;
    const torsoWidth = Math.abs(shoulderX - hipX) + 0.001;
    const elbowForwardDrift = Math.abs(elbow.x - hipX) / torsoWidth;

    if (elbowForwardDrift > ELBOW_FORWARD_DRIFT_MAX) {
      cues.push({ severity: 'warn', message: 'Keep elbow pinned — it\'s drifting forward' });
    } else {
      cues.push({ severity: 'ok', message: 'Elbow position good' });
    }

    // Body sway: shoulder should stay well above hip (not leaning back for momentum)
    const shoulderHipOffsetY = lShoulder.y - lHip.y;
    if (shoulderHipOffsetY > BODY_SWAY_Y_THRESHOLD) {
      cues.push({ severity: 'warn', message: 'Reduce body swing — brace your core' });
    }

    return cues;
  }

  // ── Lat Pulldown / Cable Row ────────────────────────────────────────────────
  if (name.includes('pulldown') || name.includes('cable row') || name.includes('row')) {
    const shoulder = bestSide(pose, 11, 12);
    const elbow = bestSide(pose, 13, 14);
    const wrist = bestSide(pose, 15, 16);
    if (shoulder.visibility < MIN_LANDMARK_VISIBILITY || elbow.visibility < MIN_LANDMARK_VISIBILITY) return [];

    // Back lean: mid-shoulder vs mid-hip angle from vertical
    const midShoulder = mid(lShoulder, rShoulder);
    const midHip = mid(lHip, rHip);
    const vertical: Landmark = { x: midHip.x, y: midHip.y - 1, z: 0, visibility: 1 };
    const leanAngle = jointAngle(midShoulder, midHip, vertical);

    if (leanAngle > 30) {
      cues.push({ severity: 'warn', message: 'Too much back lean — sit upright' });
    } else if (leanAngle > 20) {
      cues.push({ severity: 'warn', message: 'Slight back lean — keep it controlled' });
    } else {
      cues.push({ severity: 'ok', message: 'Back angle good' });
    }

    // Elbow path: elbows should drive down/back, not flare wide
    const elbowAngle = jointAngle(shoulder, elbow, wrist);
    if (elbowAngle > 150 && shoulder.y - elbow.y < ELBOW_DROP_FROM_SHOULDER) {
      cues.push({ severity: 'warn', message: 'Drive elbows down toward hips, not back' });
    }

    return cues;
  }

  // ── Face Pull ──────────────────────────────────────────────────────────────
  if (name.includes('face pull')) {
    const lEl = pose[13], rEl = pose[14];
    const lSh = pose[11], rSh = pose[12];
    if (lEl.visibility < MIN_LANDMARK_VISIBILITY || rEl.visibility < MIN_LANDMARK_VISIBILITY) return [];

    // Elbows should be at or above shoulder height
    const elbowAvgY = (lEl.y + rEl.y) / 2;
    const shoulderAvgY = (lSh.y + rSh.y) / 2;

    // In normalised coords y increases downward, so lower y = higher up
    if (elbowAvgY > shoulderAvgY + FACE_PULL_ELBOW_SAG_MAX) {
      cues.push({ severity: 'warn', message: 'Raise elbows to shoulder height or above' });
    } else {
      cues.push({ severity: 'ok', message: 'Elbow height good' });
    }

    // Wrist position: wrists should be outside elbows (external rotation)
    const wristSpread = Math.abs(lWrist.x - rWrist.x);
    const elbowSpread = Math.abs(lElbow.x - rElbow.x);
    if (wristSpread < elbowSpread - EXTERNAL_ROTATION_SPREAD_MIN) {
      cues.push({ severity: 'warn', message: 'Rotate hands out — thumbs back' });
    } else {
      cues.push({ severity: 'ok', message: 'External rotation good' });
    }

    return cues;
  }

  // ── Rear Delt Fly ──────────────────────────────────────────────────────────
  if (name.includes('rear delt') || name.includes('fly')) {
    const lEl = pose[13], rEl = pose[14];
    const lSh = pose[11], rSh = pose[12];
    if (lEl.visibility < MIN_LANDMARK_VISIBILITY) return [];

    const elbowAvgY = (lEl.y + rEl.y) / 2;
    const shoulderAvgY = (lSh.y + rSh.y) / 2;

    if (elbowAvgY > shoulderAvgY + REAR_DELT_ELBOW_SAG_MAX) {
      cues.push({ severity: 'warn', message: 'Keep elbows parallel to the floor' });
    } else {
      cues.push({ severity: 'ok', message: 'Elbow level good' });
    }

    return cues;
  }

  return [];
}

// ─── Per-Exercise config ─────────────────────────────────────────────────────

interface ExerciseRepConfig {
  /** Which side to prefer: 'left' | 'right' | 'avg' */
  side: 'left' | 'right' | 'avg';
  /** Joint triplet [proximal, joint, distal] */
  joints: [number, number, number];
  hi: number; // resting angle
  lo: number; // contracted angle
}

const REP_CONFIGS: Record<string, ExerciseRepConfig> = {
  'lat pulldown':           { side: 'avg', joints: [11, 13, 15], hi: 160, lo: 60 },
  'cable straight-arm':     { side: 'avg', joints: [11, 13, 15], hi: 160, lo: 90 },
  'seated cable row':       { side: 'avg', joints: [11, 13, 15], hi: 160, lo: 55 },
  'face pull':              { side: 'avg', joints: [11, 13, 15], hi: 165, lo: 65 },
  'dumbbell hammer curl':   { side: 'left', joints: [11, 13, 15], hi: 160, lo: 55 },
  'incline dumbbell curl':  { side: 'left', joints: [11, 13, 15], hi: 165, lo: 50 },
  'reverse curl':           { side: 'left', joints: [11, 13, 15], hi: 160, lo: 60 },
  'concentration curl':     { side: 'left', joints: [11, 13, 15], hi: 155, lo: 45 },
  'rear delt fly':          { side: 'avg', joints: [23, 11, 13], hi: 20, lo: 80 },
  'band pull-apart':        { side: 'avg', joints: [13, 11, 12], hi: 60, lo: 150 },
};

/** Returns the best-match rep config for an exercise name, or null */
export function getRepConfig(exerciseName: string): ExerciseRepConfig | null {
  const lower = exerciseName.toLowerCase();
  for (const [key, cfg] of Object.entries(REP_CONFIGS)) {
    if (lower.includes(key)) return cfg;
  }
  return null;
}

/** Extract the primary rep-counting angle from a pose using a config */
export function getPrimaryAngle(pose: Pose, cfg: ExerciseRepConfig): number | null {
  if (!pose || pose.length < 33) return null;
  const [pIdx, jIdx, dIdx] = cfg.joints;

  if (cfg.side === 'avg') {
    // Average left and right side (offset by 1 for right side)
    const aL = jointAngle(pose[pIdx], pose[jIdx], pose[dIdx]);
    const aR = jointAngle(pose[pIdx + 1], pose[jIdx + 1], pose[dIdx + 1]);
    const visL = pose[jIdx].visibility;
    const visR = pose[jIdx + 1].visibility;
    if (visL < 0.3 && visR < 0.3) return null;
    if (visL < 0.3) return aR;
    if (visR < 0.3) return aL;
    return (aL + visL + aR * visR) / (visL + visR);
  } else {
    const offset = cfg.side === 'right' ? 1 : 0;
    const p = pose[pIdx + offset], j = pose[jIdx + offset], d = pose[dIdx + offset];
    if (j.visibility < 0.3) return null;
    return jointAngle(p, j, d);
  }
}

/** Parse a raw iKeleton OSC float array into a 33-element Pose */
export function parsePoseFromOSC(args: number[]): Pose | null {
  // iKeleton format: [count, x0, y0, z0, v0, x1, y1, z1, v1, ...]
  // Some versions omit `count` and start straight with x0
  let offset = 0;
  if (args.length === 1 + 33 * 4) offset = 1; // has leading count
  if (args.length < 33 * 4) return null;

  const pose: Pose = [];
  for (let i = 0; i < 33; i++) {
    const base = offset + i * 4;
    pose.push({
      x: args[base] ?? 0,
      y: args[base + 1] ?? 0,
      z: args[base + 2] ?? 0,
      visibility: args[base + 3] ?? 0,
    });
  }
  return pose;
}
