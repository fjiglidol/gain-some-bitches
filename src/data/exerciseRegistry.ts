/**
 * Exercise Registry — parsed from exercise_dataset.csv at build time,
 * extended with PDF-extracted exercises and programme-specific movements.
 */

export interface RegistryExercise {
  name: string;
  target: string;   // e.g. "calves", "forearms", "abs"
  bodyPart: string; // e.g. "lower legs", "upper arms", "back"
  equipment: string;
  baseExercise?: string; // if this is a variant, points to the canonical name
  category?: 'training' | 'warmup' | 'protocol'; // defaults to 'training' if omitted
}

export const exerciseRegistry: RegistryExercise[] = [
  // ── Abductors ────────────────────────────────────────────────────────────────
  { name: 'lever seated hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'side hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'straight leg outer hip abductor', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side bridge hip abduction', target: 'abductors', bodyPart: 'upper legs', equipment: 'body weight' },

  // ── Abs / Core ───────────────────────────────────────────────────────────────
  { name: '3/4 sit-up', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: '45° side bend', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'air bike', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'alternate heel touchers', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'barbell press sit-up', target: 'abs', bodyPart: 'waist', equipment: 'barbell' },
  { name: 'sit up', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'plank', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'side plank', target: 'abs', bodyPart: 'waist', equipment: 'body weight', baseExercise: 'plank' },
  { name: 'mountain climber', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'jack knives', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'scissor kicks', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'knee bring-ins', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'inside leg raises', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'side bend', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'superman', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'hanging leg raise', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'dead bug', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'hollow body hold', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'reverse crunch', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },

  // ── Adductors ────────────────────────────────────────────────────────────────
  { name: 'cable hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'cable' },
  { name: 'lever seated hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'butterfly yoga pose', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side plank hip adduction', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side lying hip adduction (male)', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'side lunges', target: 'adductors', bodyPart: 'upper legs', equipment: 'body weight' },

  // ── Biceps ───────────────────────────────────────────────────────────────────
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
  { name: 'standing barbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell curl' },
  { name: 'dumbbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell' },
  { name: 'dumbbell hammer curls', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'hammer curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'incline dumbbell curls', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'concentration curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell' },
  { name: 'seated concentration curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'concentration curl' },
  { name: 'kneeling concentration curls', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'concentration curl' },
  { name: 'standing alternating dumbbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'incline elbows out dumbbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'ez bar curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'ez barbell' },
  { name: 'ez bar preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'ez barbell', baseExercise: 'barbell preacher curl' },
  { name: 'close grip preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell preacher curl' },
  { name: 'preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell preacher curl' },
  { name: 'machine preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'leverage machine', baseExercise: 'barbell preacher curl' },
  { name: '90 degree side barbell preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell preacher curl' },
  { name: 'cable rope hammer curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'hammer curl' },
  { name: 'band or cable curls', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'lying low cable curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'reverse grip low cable curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'straight bar low cable curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'reverse barbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell reverse curl' },
  { name: 'chin up', target: 'biceps', bodyPart: 'upper arms', equipment: 'body weight' },

  // ── Calves ───────────────────────────────────────────────────────────────────
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
  { name: 'calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'body weight' },
  { name: 'seated calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'leverage machine', baseExercise: 'calf raise' },
  { name: 'standing calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'body weight', baseExercise: 'calf raise' },

  // ── Cardiovascular ───────────────────────────────────────────────────────────
  { name: 'jack burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'run', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'dumbbell burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'dumbbell' },
  { name: 'jumping jacks', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'tuck jumps', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'broad jumps', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'alternating lunge jumps', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight' },
  { name: 'squat jump', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', baseExercise: 'squat' },
  { name: 'clap push ups', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', baseExercise: 'push ups' },

  // ── Delts / Shoulders ────────────────────────────────────────────────────────
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
  { name: 'dumbbell lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell' },
  { name: 'lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', baseExercise: 'dumbbell lateral raise' },
  { name: 'side lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', baseExercise: 'dumbbell lateral raise' },
  { name: 'dumbbell front raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell' },
  { name: 'dumbbell reverse fly', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell' },
  { name: 'bent over reverse flye', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', baseExercise: 'dumbbell reverse fly' },
  { name: 'rear lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', baseExercise: 'dumbbell reverse fly' },
  { name: 'seated dumbbell press', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell' },
  { name: 'seated overhead press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell', baseExercise: 'barbell seated overhead press' },
  { name: 'military press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell', baseExercise: 'barbell seated overhead press' },
  { name: 'machine shoulder press', target: 'delts', bodyPart: 'shoulders', equipment: 'leverage machine' },
  { name: 'smith machine shoulder press', target: 'delts', bodyPart: 'shoulders', equipment: 'smith machine', baseExercise: 'barbell seated overhead press' },
  { name: 'upright row', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell' },
  { name: 'face pull', target: 'delts', bodyPart: 'shoulders', equipment: 'cable' },

  // ── Forearms ─────────────────────────────────────────────────────────────────
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
  { name: 'standing wrist curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'barbell' },

  // ── Glutes ───────────────────────────────────────────────────────────────────
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
  { name: 'barbell hip thrust', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'hip thrusts', target: 'glutes', bodyPart: 'upper legs', equipment: 'body weight', baseExercise: 'barbell hip thrust' },
  { name: 'glute flexor', target: 'glutes', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'cable kickbacks', target: 'glutes', bodyPart: 'upper legs', equipment: 'cable' },
  { name: 'kick backs', target: 'glutes', bodyPart: 'upper legs', equipment: 'cable', baseExercise: 'cable kickbacks' },
  { name: 'leg kickbacks', target: 'glutes', bodyPart: 'upper legs', equipment: 'body weight', baseExercise: 'cable kickbacks' },
  { name: 'walking dumbbell lunge', target: 'glutes', bodyPart: 'upper legs', equipment: 'dumbbell', baseExercise: 'dumbbell lunges' },

  // ── Hamstrings ───────────────────────────────────────────────────────────────
  { name: 'barbell good morning', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'barbell straight leg deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'dumbbell lying femoral', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'dumbbell' },
  { name: 'inverse leg curl (bench support)', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'kettlebell hang clean', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'kettlebell' },
  { name: 'kick out sit', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'lever kneeling leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'lever lying leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'lever seated leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine', baseExercise: 'lever lying leg curl' },
  { name: 'romanian deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'stiff leg deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'romanian deadlift' },
  { name: 'good mornings', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'barbell good morning' },

  // ── Lats ─────────────────────────────────────────────────────────────────────
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
  { name: 'lat pull down', target: 'lats', bodyPart: 'back', equipment: 'cable' },
  { name: 'close grip lat pull down', target: 'lats', bodyPart: 'back', equipment: 'cable', baseExercise: 'lat pull down' },
  { name: 'pull up', target: 'lats', bodyPart: 'back', equipment: 'body weight' },
  { name: 'pullover', target: 'lats', bodyPart: 'back', equipment: 'dumbbell', baseExercise: 'barbell pullover' },
  { name: 'dumbbell pullover', target: 'lats', bodyPart: 'back', equipment: 'dumbbell', baseExercise: 'barbell pullover' },
  { name: 'cable straight arm pulldown', target: 'lats', bodyPart: 'back', equipment: 'cable' },

  // ── Neck ─────────────────────────────────────────────────────────────────────
  { name: 'side push neck stretch', target: 'levator scapulae', bodyPart: 'neck', equipment: 'body weight' },
  { name: 'neck side stretch', target: 'levator scapulae', bodyPart: 'neck', equipment: 'body weight' },

  // ── Pectorals ────────────────────────────────────────────────────────────────
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
  { name: 'bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell', baseExercise: 'barbell bench press' },
  { name: 'incline bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell', baseExercise: 'barbell bench press' },
  { name: 'decline bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell', baseExercise: 'barbell bench press' },
  { name: 'dumbbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell' },
  { name: 'incline dumbbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell bench press' },
  { name: 'incline dumbbell press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell bench press' },
  { name: 'decline dumbbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell bench press' },
  { name: 'swiss ball dumbbell press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell bench press' },
  { name: 'machine chest press', target: 'pectorals', bodyPart: 'chest', equipment: 'leverage machine' },
  { name: 'dumbbell flys', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell' },
  { name: 'flat dumbbell fly', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell flys' },
  { name: 'incline dumbbell flys', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell flys' },
  { name: 'low incline dumbbell fly', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', baseExercise: 'dumbbell flys' },
  { name: 'cable crossovers', target: 'pectorals', bodyPart: 'chest', equipment: 'cable' },
  { name: 'flat bench cable fly', target: 'pectorals', bodyPart: 'chest', equipment: 'cable', baseExercise: 'cable crossovers' },
  { name: 'bench cable flys', target: 'pectorals', bodyPart: 'chest', equipment: 'cable', baseExercise: 'cable crossovers' },
  { name: 'cable chest fly', target: 'pectorals', bodyPart: 'chest', equipment: 'cable', baseExercise: 'cable crossovers' },
  { name: 'incline cable push-outs', target: 'pectorals', bodyPart: 'chest', equipment: 'cable', baseExercise: 'cable crossovers' },
  { name: 'pec dec', target: 'pectorals', bodyPart: 'chest', equipment: 'leverage machine' },
  { name: 'push ups', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight' },
  { name: 'diamond push ups', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight', baseExercise: 'push ups' },
  { name: 'dips', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight' },
  { name: 'chest dips', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight', baseExercise: 'dips' },

  // ── Quads ────────────────────────────────────────────────────────────────────
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
  { name: 'squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell' },
  { name: 'free weight squats', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'squat' },
  { name: 'box squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'squat' },
  { name: 'hack squat', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', baseExercise: 'squat' },
  { name: 'leg press', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'leg press (feet high & close)', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', baseExercise: 'leg press' },
  { name: 'single-leg press', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', baseExercise: 'leg press' },
  { name: 'leg extension', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine' },
  { name: 'dumbbell leg extension', target: 'quads', bodyPart: 'upper legs', equipment: 'dumbbell', baseExercise: 'leg extension' },
  { name: 'lunge', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'lunges', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight', baseExercise: 'lunge' },
  { name: 'dumbbell lunges', target: 'quads', bodyPart: 'upper legs', equipment: 'dumbbell', baseExercise: 'lunge' },
  { name: 'walking lunges', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight', baseExercise: 'lunge' },
  { name: 'backward lunges on smith machine', target: 'quads', bodyPart: 'upper legs', equipment: 'smith machine', baseExercise: 'lunge' },
  { name: 'step ups', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'deadlift', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'barbell deadlift' },
  { name: 'pause deadlift', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'barbell deadlift' },
  { name: 'speed deadlift', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'barbell deadlift' },
  { name: 'deficit deadlift', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell', baseExercise: 'barbell deadlift' },
  { name: 'sled pull', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine' },

  // ── Serratus Anterior ────────────────────────────────────────────────────────
  { name: 'barbell incline shoulder raise', target: 'serratus anterior', bodyPart: 'chest', equipment: 'barbell' },
  { name: 'dumbbell incline shoulder raise', target: 'serratus anterior', bodyPart: 'chest', equipment: 'dumbbell' },
  { name: 'incline scapula push up', target: 'serratus anterior', bodyPart: 'chest', equipment: 'body weight' },
  { name: 'scapula push-up', target: 'serratus anterior', bodyPart: 'chest', equipment: 'body weight' },

  // ── Spine / Low Back ─────────────────────────────────────────────────────────
  { name: 'hyperextension (on bench)', target: 'spine', bodyPart: 'back', equipment: 'body weight' },
  { name: 'hyperextension', target: 'spine', bodyPart: 'back', equipment: 'body weight' },
  { name: 'lever back extension', target: 'spine', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'low back extension', target: 'spine', bodyPart: 'back', equipment: 'body weight', baseExercise: 'hyperextension' },

  // ── Traps ────────────────────────────────────────────────────────────────────
  { name: 'barbell shrug', target: 'traps', bodyPart: 'back', equipment: 'barbell' },
  { name: 'barbell shrugs', target: 'traps', bodyPart: 'back', equipment: 'barbell', baseExercise: 'barbell shrug' },
  { name: 'cable shrug', target: 'traps', bodyPart: 'back', equipment: 'cable' },
  { name: 'dumbbell decline shrug v. 2', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell decline shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell incline shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell shrug', target: 'traps', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dumbbell shrugs', target: 'traps', bodyPart: 'back', equipment: 'dumbbell', baseExercise: 'dumbbell shrug' },
  { name: 'kettlebell sumo high pull', target: 'traps', bodyPart: 'back', equipment: 'kettlebell' },
  { name: 'lever gripless shrug', target: 'traps', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'lever shrug', target: 'traps', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'scapular pull-up', target: 'traps', bodyPart: 'back', equipment: 'body weight' },

  // ── Triceps ──────────────────────────────────────────────────────────────────
  { name: 'assisted triceps dip (kneeling)', target: 'triceps', bodyPart: 'upper arms', equipment: 'leverage machine' },
  { name: 'barbell close-grip bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell decline close grip to skull press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell incline reverse-grip press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell jm bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying close-grip press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying close-grip triceps extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'barbell lying triceps extension skull crusher', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'close grip bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell bench press' },
  { name: 'skullcrushers', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell' },
  { name: 'dumbbell skullcrushers', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'skullcrushers' },
  { name: 'bodyweight skullcrushers', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', baseExercise: 'skullcrushers' },
  { name: 'tricep extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'overhead tricep extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'overhead tricep dumbbell extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'tricep extension' },
  { name: 'incline 2 arm overhead dumbbell extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'tricep extension' },
  { name: 'decline 2 arm dumbbell extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'tricep extension' },
  { name: 'seated one arm overhead dumbbell extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'tricep extension' },
  { name: 'seated elbows supported tricep extension machine', target: 'triceps', bodyPart: 'upper arms', equipment: 'leverage machine', baseExercise: 'tricep extension' },
  { name: 'bent overhead cable v-bar extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'cable tricep extensions', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'cable tricep pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'rope pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'straight bar pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'v bar pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'tricep pressdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'triceps pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'tricep press downs w/ bar', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'tricep press downs w/ rope', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'reverse grip pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', baseExercise: 'tricep extension' },
  { name: 'tricep dip', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight' },
  { name: 'weighted triceps dip', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', baseExercise: 'tricep dip' },
  { name: 'weighted dip', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', baseExercise: 'tricep dip' },
  { name: 'bench dip', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', baseExercise: 'tricep dip' },
  { name: 'tricep bench dip', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', baseExercise: 'tricep dip' },
  { name: '2 arm dumbbell kickback', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell' },
  { name: 'dumbbell kickback', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: '2 arm dumbbell kickback' },

  // ── Upper Back / Rows ────────────────────────────────────────────────────────
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
  { name: 'seated cable row', target: 'upper back', bodyPart: 'back', equipment: 'cable', baseExercise: 'cable low seated row' },
  { name: 'seated row', target: 'upper back', bodyPart: 'back', equipment: 'cable', baseExercise: 'cable low seated row' },
  { name: 'one arm dumbbell row', target: 'upper back', bodyPart: 'back', equipment: 'dumbbell' },
  { name: 'dead stop one arm row', target: 'upper back', bodyPart: 'back', equipment: 'dumbbell', baseExercise: 'one arm dumbbell row' },
  { name: 'one arm machine row', target: 'upper back', bodyPart: 'back', equipment: 'leverage machine' },
  { name: 'inverted rows', target: 'upper back', bodyPart: 'back', equipment: 'body weight' },
  { name: 'inverted underhand rows', target: 'upper back', bodyPart: 'back', equipment: 'body weight', baseExercise: 'inverted rows' },
  { name: 'pendlay rows', target: 'upper back', bodyPart: 'back', equipment: 'barbell', baseExercise: 'barbell bent over row' },
  { name: 't-bar row', target: 'upper back', bodyPart: 'back', equipment: 'barbell' },
  { name: 'chest supported dumbbell row', target: 'upper back', bodyPart: 'back', equipment: 'dumbbell', baseExercise: 'one arm dumbbell row' },

  // ── New: Variants (from PDF programmes) ─────────────────────────────────────
  { name: 'chest dips (weighted)', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight', baseExercise: 'dips' },
  { name: 'dumbbell 1/4 curls', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: 'dumbbell curl' },
  { name: 'seated 1/2 rep barbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', baseExercise: 'barbell curl' },
  { name: 'overhead lat pull down curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'upper cable curl (double biceps)', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable' },
  { name: 'smith elbows out close grip bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'smith machine', baseExercise: 'barbell close-grip bench press' },
  { name: 'long lever plank', target: 'abs', bodyPart: 'waist', equipment: 'body weight', baseExercise: 'plank' },
  { name: 'plank walk outs', target: 'abs', bodyPart: 'waist', equipment: 'body weight', baseExercise: 'plank' },
  { name: 'plank (knee to opposite elbow)', target: 'abs', bodyPart: 'waist', equipment: 'body weight', baseExercise: 'plank' },
  { name: 'air squat jump complex', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', baseExercise: 'squat jump' },

  // ── New: Exercises (from PDF programmes) ────────────────────────────────────
  { name: 'zottman curl', target: 'forearms', bodyPart: 'lower arms', equipment: 'dumbbell' },
  { name: 'supine figure 8s', target: 'abs', bodyPart: 'waist', equipment: 'body weight' },
  { name: 'straight leg toe touch', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight' },
  { name: 'lateral power skips', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'bands' },
  { name: 'resisted jump throughs', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'bands' },

  // ── New: Protocol (from PDF programmes) ─────────────────────────────────────
  { name: 'skullcrusher gauntlet', target: 'triceps', bodyPart: 'upper arms', equipment: 'ez barbell', category: 'protocol' },
  { name: 'iso-kick backs', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', baseExercise: '2 arm dumbbell kickback' },
];

// ─── Equipment allow-list (available at uni gym) ─────────────────────────────

export const ALLOWED_EQUIPMENT = new Set([
  'body weight',
  'barbell',
  'dumbbell',
  'cable',
  'leverage machine',
  'kettlebell',
  'ez barbell',
  'smith machine',
  'bands',
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

  // Filter registry to allowed equipment + training exercises only (exclude warmup/protocol)
  const eligible = registry.filter(e => ALLOWED_EQUIPMENT.has(e.equipment) && (e.category ?? 'training') === 'training');

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
