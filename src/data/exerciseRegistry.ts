/**
 * Exercise Registry — parsed from exercise_dataset.csv at build time.
 * 168 exercises with muscle group, body part, and equipment metadata.
 */

export interface RegistryExercise {
  name: string;
  target: string;   // e.g. "calves", "forearms", "abs"
  bodyPart: string; // e.g. "lower legs", "upper arms", "back"
  equipment: string;
}

export const exerciseRegistry: RegistryExercise[] = [
  { name: 'lever seated hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'side hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'straight leg outer hip abductor', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side bridge hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: '3/4 sit-up', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: '45° side bend', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'air bike', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'alternate heel touchers', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'barbell press sit-up', target: 'abs', bodyPart: 'waist', equipment: 'barbell' },
  { name: 'cable hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'cable' },
  { name: 'lever seated hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'butterfly yoga pose', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side plank hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side lying hip adduction (male)', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'barbell alternate biceps curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell drag curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell prone incline curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell reverse curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell reverse preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell seated close-grip concentration curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell standing close grip curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell seated calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'barbell' },
  { name: 'barbell standing leg calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'barbell' },
  { name: 'barbell standing rocking leg calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'barbell' },
  { name: 'circles knee stretch', target: 'calves', bodyPart: 'lower legs', equipment: 'body weight' },
  { name: 'donkey calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'body weight' },
  { name: 'dumbbell seated one leg calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'dumbbell' },
  { name: 'dumbbell single leg calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'dumbbell' },
  { name: 'dumbbell standing calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'dumbbell' },
  { name: 'lever seated calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'leverage machine' },
  { name: 'lever standing calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'leverage machine' },
  { name: 'jack burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'mountain climber', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'run', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'dumbbell burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'dumbbell' },
  { name: 'barbell front raise', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell one arm snatch', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell rear delt raise', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell rear delt row', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell seated behind head military press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell seated bradford rocky press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell seated overhead press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell skier', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell standing bradford press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell standing front raise over head', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'barbell reverse wrist curl v. 2', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },
  { name: 'barbell reverse wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },
  { name: 'barbell standing back wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },
  { name: 'barbell wrist curl v. 2', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },
  { name: 'barbell wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },
  { name: 'cable reverse wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'cable' },
  { name: 'cable standing back wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'cable' },
  { name: 'cable wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'cable' },
  { name: 'dumbbell lying pronation', target: 'forearms', bodyPart: 'lower arms', equipment: 'dumbbell' },
  { name: 'dumbbell lying supination', target: 'forearms', bodyPart: 'lower arms', equipment: 'dumbbell' },
  { name: 'barbell clean-grip front squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell deadlift', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell front chest squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell front squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell full squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell hack squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell jefferson squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell jump squat', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell lunge', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell lying lifting (on hip)', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell good morning', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell straight leg deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'dumbbell lying femoral', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'dumbbell' },
  { name: 'inverse leg curl (bench support)', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'kettlebell hang clean', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'kettlebell' },
  { name: 'kick out sit', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'lever kneeling leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'lever lying leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'lever seated leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'alternate lateral pulldown', target: 'lats', bodyPart: 'back', equipment: 'cable' },
  { name: 'assisted parallel close grip pull-up', target: 'lats', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'assisted pull-up', target: 'lats', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'barbell pullover to press', target: 'lats', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell decline bent arm pullover', target: 'lats', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell decline wide-grip pullover', target: 'lats', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell pullover', target: 'lats', bodyPart: 'back', equipment: 'barbell' },
  { name: 'cable bar lateral pulldown', target: 'lats', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable cross-over lateral pulldown', target: 'lats', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable incline pushdown', target: 'lats', bodyPart: 'back', equipment: 'cable' },
  { name: 'side push neck stretch', target: 'levator scapulae', bodyPart: 'neck', equipment: 'body weight' },
  { name: 'neck side stretch', target: 'levator scapulae', bodyPart: 'neck', equipment: 'body weight' },
  { name: 'assisted chest dip (kneeling)', target: 'pectorals', bodyPart: 'chest', equipment: 'leverage machine' },
  { name: 'barbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell decline bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell decline wide-grip press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell front raise and pullover', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell guillotine bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell incline bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'barbell wide bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'cable bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'cable' },
  { name: 'cable cross-over variation', target: 'pectorals', bodyPart: 'chest', equipment: 'cable' },
  { name: 'balance board', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'barbell bench front squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell bench squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell clean and press', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell one leg squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell overhead squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell side split squat v. 2', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell side split squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell single leg split squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell squat (on knees)', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell incline shoulder raise', target: 'serratus anterior', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'dumbbell incline shoulder raise', target: 'serratus anterior', bodyPart: 'chest', equipment: 'dumbbell' },
  { name: 'incline scapula push up', target: 'serratus anterior', bodyPart: 'chest', equipment: 'body weight' },
  { name: 'scapula push-up', target: 'serratus anterior', bodyPart: 'chest', equipment: 'body weight' },
  { name: 'hyperextension (on bench)', target: 'spine', bodyPart: 'back', equipment: 'body weight' },
  { name: 'hyperextension', target: 'spine', bodyPart: 'back', equipment: 'body weight' },
  { name: 'lever back extension', target: 'spine', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'barbell shrug', target: 'traps', bodyPart: 'back', equipment: 'barbell' },
  { name: 'cable shrug', target: 'traps', bodyPart: 'back', equipment: 'cable' },
  { name: 'dumbbell decline shrug v. 2', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell decline shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell incline shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'kettlebell sumo high pull', target: 'traps', bodyPart: 'back', equipment: 'kettlebell' },
  { name: 'lever gripless shrug', target: 'traps', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'lever shrug', target: 'traps', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'scapular pull-up', target: 'traps', bodyPart: 'back', equipment: 'body weight' },
  { name: 'assisted triceps dip (kneeling)', target: 'triceps', bodyPart: 'upper arms', equipment: 'leverage machine' },
  { name: 'barbell close-grip bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell decline close grip to skull press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell incline reverse-grip press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell jm bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying close-grip press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying close-grip triceps extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying triceps extension skull crusher', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell bent over row', target: 'upper back', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell incline row', target: 'upper back', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell one arm bent over row', target: 'upper back', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell reverse grip bent over row', target: 'upper back', bodyPart: 'back', equipment: 'barbell' },
  { name: 'cable decline seated wide-grip row', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable floor seated wide-grip row', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable high row (kneeling)', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable low seated row', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable one arm bent over row', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
  { name: 'cable one arm straight back high row (kneeling)', target: 'upper back', bodyPart: 'back', equipment: 'cable' },
];

// ─── Equipment allow-list (available at uni gym) ─────────────────────────────

export const ALLOWED_EQUIPMENT = new Set([
  'body weight',
  'barbell',
  'dumbbell',
  'cable',
  'leverage machine',
  'kettlebell',
]);

// ─── Synergist maps per session key ──────────────────────────────────────────
// Rule: never include the PRIMARY muscles of the session.
// Push primary: pectorals, triceps, delts
// Pull primary: lats, biceps, upper back
// Legs primary: quads, glutes, hamstrings

export const SYNERGIST_MAP: Record<string, string[]> = {
  push_a:    ['calves', 'forearms', 'abs', 'traps', 'serratus anterior'],
  push_b:    ['calves', 'forearms', 'abs', 'traps', 'serratus anterior'],
  pull_a:    ['calves', 'forearms', 'abs', 'delts', 'serratus anterior'],
  pull_b:    ['calves', 'forearms', 'abs', 'delts', 'serratus anterior'],
  legs_core: ['forearms', 'traps', 'biceps', 'triceps', 'delts'],
  cardio_day:['calves', 'abs', 'forearms'],
};

// Muscles each session type trains (used to infer "last trained" date from history)
export const SESSION_MUSCLES: Record<string, string[]> = {
  // session type strings that appear in historyData.sessionType
  'push a (heavy)':  ['pectorals', 'triceps', 'delts', 'serratus anterior'],
  'push a':          ['pectorals', 'triceps', 'delts', 'serratus anterior'],
  'push b':          ['pectorals', 'triceps', 'delts', 'serratus anterior'],
  'push':            ['pectorals', 'triceps', 'delts', 'serratus anterior'],
  'pull a':          ['lats', 'biceps', 'upper back', 'traps'],
  'pull b':          ['lats', 'biceps', 'upper back', 'traps'],
  'pull':            ['lats', 'biceps', 'upper back', 'traps'],
  'legs + core':     ['quads', 'glutes', 'hamstrings', 'abs', 'spine'],
  'legs':            ['quads', 'glutes', 'hamstrings', 'abs', 'spine'],
  'legs_core':       ['quads', 'glutes', 'hamstrings', 'abs', 'spine'],
  'cardio day':      ['cardiovascular system', 'abs'],
  'cardio':          ['cardiovascular system', 'abs'],
};

// ─── Frequency tracker ────────────────────────────────────────────────────────

/**
 * Returns the most-neglected muscle groups from allowedGroups, sorted by
 * "days since last trained" descending (longest gap = most neglected = first).
 * Groups never trained come first.
 */
export function getMostNeglectedMuscles(
  historyData: { date: string; sessionType: string }[],
  allowedGroups: string[]
): string[] {
  const today = new Date();
  const daysSinceTrained: Record<string, number> = {};

  // For each muscle in allowedGroups, find the most recent session that trained it
  for (const muscle of allowedGroups) {
    let minDays = Infinity;
    for (const session of historyData) {
      const key = session.sessionType.toLowerCase();
      const trainedMuscles = SESSION_MUSCLES[key] ?? [];
      if (trainedMuscles.includes(muscle)) {
        // Parse date — handles "2026-03-25 (Thu)" and "2026-03-25"
        const dateStr = session.date.split(' ')[0];
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const days = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (days < minDays) minDays = days;
        }
      }
    }
    daysSinceTrained[muscle] = minDays; // Infinity if never trained
  }

  return [...allowedGroups].sort((a, b) => daysSinceTrained[b] - daysSinceTrained[a]);
}

/**
 * Returns a human-readable label for how recently a muscle was trained.
 * e.g. "5 days ago", "today", "never"
 */
export function getLastTrainedLabel(
  muscle: string,
  historyData: { date: string; sessionType: string }[]
): string {
  const today = new Date();
  let minDays = Infinity;

  for (const session of historyData) {
    const key = session.sessionType.toLowerCase();
    const trainedMuscles = SESSION_MUSCLES[key] ?? [];
    if (trainedMuscles.includes(muscle)) {
      const dateStr = session.date.split(' ')[0];
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const days = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (days < minDays) minDays = days;
      }
    }
  }

  if (minDays === Infinity) return 'never';
  if (minDays === 0) return 'today';
  if (minDays === 1) return 'yesterday';
  return `${minDays}d ago`;
}

// ─── Suggestion engine ────────────────────────────────────────────────────────

export interface SynergistSuggestion {
  exercise: RegistryExercise;
  muscleGroup: string;
  lastTrainedLabel: string;
}

/**
 * Returns a suggested synergist exercise for the given session.
 * Picks the most-neglected eligible muscle group, then a random exercise from it.
 * excludeExercise lets you avoid repeating the same suggestion (for Shuffle).
 */
export function getSynergistSuggestion(
  sessionKey: string,
  historyData: { date: string; sessionType: string }[],
  registry: RegistryExercise[],
  excludeExerciseName?: string
): SynergistSuggestion | null {
  const synergistGroups = SYNERGIST_MAP[sessionKey];
  if (!synergistGroups || synergistGroups.length === 0) return null;

  // Sort groups by neglect
  const ranked = getMostNeglectedMuscles(historyData, synergistGroups);

  // Filter registry to allowed equipment
  const eligible = registry.filter(e => ALLOWED_EQUIPMENT.has(e.equipment));

  // Try each group from most neglected, pick a random exercise
  for (const muscle of ranked) {
    const candidates = eligible.filter(
      e => e.target === muscle && e.name !== excludeExerciseName
    );
    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      exercise: pick,
      muscleGroup: muscle,
      lastTrainedLabel: getLastTrainedLabel(muscle, historyData),
    };
  }

  return null;
}
