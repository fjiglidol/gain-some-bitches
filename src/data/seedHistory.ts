/**
 * Seed history — parsed from data/Workout_History.csv at build time.
 * These sessions existed before the app used localStorage, and also include
 * any sessions logged outside the PWA (e.g. manually entered in the CSV).
 *
 * Format matches the gsb_history localStorage schema.
 */

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

export const seedHistory: HistorySession[] = [
  {
    date: '2026-03-21 (Sat)',
    sessionType: 'Push',
    exercises: [
      { exercise: 'Bench Press (warm-up ramp)', weight: '60', sets: '1', reps: '', notes: 'Comeback after 2-week break; ramped from 60 to 80' },
      { exercise: 'Bench Press', weight: '80', sets: '1', reps: 'n/a', notes: 'Felt tough; 2-week break caused strength drop from 90kg PR' },
      { exercise: 'Bench Press', weight: '70', sets: '1', reps: '6', notes: 'Felt ok/controlled' },
      { exercise: 'Incline Dumbbell Press', weight: '50', sets: '1', reps: 'n/a', notes: 'Started here but was too tough' },
      { exercise: 'Incline Dumbbell Press', weight: '40', sets: '3', reps: '8-12', notes: 'Dropped weight; slow and controlled reps' },
      { exercise: 'Seated Shoulder Press (machine)', weight: '12', sets: '1', reps: 'n/a', notes: 'Drop set: 12->10->8 kg' },
      { exercise: 'Seated Shoulder Press (machine)', weight: '10', sets: '1', reps: 'n/a', notes: 'Drop set continuation' },
      { exercise: 'Seated Shoulder Press (machine)', weight: '8', sets: '1', reps: 'n/a', notes: 'Drop set continuation' },
      { exercise: 'Cable Chest Fly', weight: '', sets: '3', reps: '12-15', notes: 'Added for inner chest contraction focus' },
      { exercise: 'Hanging Leg Raises', weight: '', sets: '3', reps: '8-15', notes: 'Ab finisher' },
      { exercise: 'Cable Crunch', weight: '', sets: '3', reps: '10-15', notes: 'Ab finisher' },
      { exercise: 'Plank', weight: '', sets: '2', reps: '30-45s', notes: 'Ab finisher' },
      { exercise: 'Incline Walk', weight: '', sets: '1', reps: '15 min', notes: 'Post-workout cardio' },
    ],
  },
  {
    date: '2026-03-23 (Mon)',
    sessionType: 'Push',
    exercises: [
      { exercise: 'Barbell Bench Press', weight: '90', sets: '1', reps: '8', notes: 'Hit pre-break PR. Strong momentum.' },
    ],
  },
  {
    date: '2026-03-26 (Thu)',
    sessionType: 'Push A (Heavy)',
    exercises: [
      { exercise: 'Barbell Bench Press', weight: '70/75/80/80/64', sets: '5', reps: '10/8/8/8/4', notes: 'drop set' },
      { exercise: 'Dumbbell Lateral Raise', weight: '12/12/12', sets: '3', reps: '10/12/10', notes: '' },
      { exercise: 'Overhead Tricep Extension (EZ Bar or Cable)', weight: '14/14/14', sets: '3', reps: '10/10/8', notes: '' },
      { exercise: 'Serratus Cable Crunch (or Serratus Push-Up)', weight: '20/20/20', sets: '3', reps: '8/7/8', notes: '' },
    ],
  },
  {
    date: '2026-03-29 (Sun)',
    sessionType: 'Push A (Heavy)',
    exercises: [
      { exercise: 'Barbell Bench Press', weight: '70/80/90/85', sets: '4', reps: '10/8/6/6', notes: '90kg failed at rep 6; dropped to 85kg + drop set' },
      { exercise: 'Barbell Overhead Press', weight: '40/40/40', sets: '3', reps: '10/8/8', notes: '' },
      { exercise: 'Incline Dumbbell Bench Press', weight: '18/16/16', sets: '3', reps: '8/6/8', notes: '' },
      { exercise: 'Dumbbell Lateral Raise', weight: '8/8/8', sets: '3', reps: '10/10/10', notes: '' },
    ],
  },
];

/**
 * Merges seed history with localStorage history.
 * - localStorage wins on duplicate date+sessionType (it's always more detailed)
 * - Result is sorted by date descending
 */
export function mergeHistory(
  localSessions: HistorySession[],
  seed: HistorySession[] = seedHistory
): HistorySession[] {
  const existingKeys = new Set(localSessions.map(s => `${s.date}|${s.sessionType}`));
  const merged = [...localSessions];
  for (const s of seed) {
    if (!existingKeys.has(`${s.date}|${s.sessionType}`)) {
      merged.push(s);
    }
  }
  // Sort by date descending — works because date strings start with yyyy-mm-dd
  merged.sort((a, b) => b.date.localeCompare(a.date));
  return merged;
}
