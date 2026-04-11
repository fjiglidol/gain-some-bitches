export interface Exercise {
  name: string;
  type: 'weight' | 'timed' | 'cardio' | 'bodyweight';
  sets?: number;
  reps?: string | number;
  duration_seconds?: number;
  rest_seconds?: number;
  notes?: string;
  form_cues?: string[];
  superset_group?: string;
  rpe?: string | number;
  progression?: string;
}

export interface PostWorkoutCardio {
  type?: string;
  exercise: string;
  duration_minutes: number;
  intensity?: string;
  notes?: string;
}

export interface CardioBlock {
  duration_minutes: number;
  description?: string;
  notes?: string;
  outdoor_option?: {
    exercise: string;
    type: string;
    protocol?: string;
    intensity?: string;
    weekly_progression?: string;
    notes?: string;
  };
  gym_option?: {
    exercise: string;
    type: string;
    protocol?: string;
    intensity?: string;
    notes?: string;
  };
  exercises?: Exercise[];
}

export interface CardioStructure {
  warm_up: CardioBlock;
  block_1_intervals: CardioBlock;
  block_2_steady_state: CardioBlock;
  block_3_core_circuit: CardioBlock;
  cool_down: CardioBlock;
  [key: string]: CardioBlock;
}

export interface Day7Option {
  option: string;
  type?: string;
  exercise?: string;
  duration_minutes?: number;
  intensity?: string;
  notes?: string;
}

export interface Session {
  label: string;
  focus?: string;
  estimated_duration_minutes: number;
  rep_range?: string;
  rest_between_sets_seconds?: string;
  notes?: string;
  exercises?: Exercise[];
  structure?: CardioStructure;
  options?: Day7Option[];
  post_workout_cardio?: PostWorkoutCardio | null;
}

export interface Programme {
  programme_name?: string;
  phase?: string;
  start_date?: string;
  end_date?: string;
  duration_weeks?: number;
  deload_week?: number;
  target_frequency?: string;
  minimum_priority_order?: string[];
  athlete?: any;
  week_8_targets?: any;
  weekly_template?: any;
  nutrition?: any;
  sessions: {
    [key: string]: Session;
  };
  progression_scheme?: any;
  key_lift_progression_notes?: any;
  tracking?: any;
  recovery_guidelines?: any;
  programme_metadata?: any;
}

export interface SetEntry {
  weight: string;
  reps: string;
  note: string;
  logged: boolean;
  isDropSet?: boolean;
}

export interface SessionProgress {
  sessionKey: string;
  workoutSets: { [exerciseIndex: number]: SetEntry[] };
  skipped: { [exerciseIndex: number]: boolean };
  elapsed: number;
  savedAt: number;
}
