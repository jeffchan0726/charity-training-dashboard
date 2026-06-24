// js/data.js
// Core static data extracted as part of architecture refactor (Option A)
// This allows better separation, easier maintenance, and future testing.

// Exercise categories used for filtering in library
const EXERCISE_CATEGORIES = ['胸部', '背部', '腿部', '肩膀', '手臂', '核心', '全身', '有氧'];

// Unified Exercise Database - Clean deduplicated, all names in "中文 (English)" format
// muscle_group, image (local /images/ only - no fallback)
// All UI (history, analysis, selectors, cards) MUST use this unified bilingual name
const EXERCISES = [
    // 胸部 (香港gym常用「推胸」講法)
    { id: "incline_dumbbell_press", name: "上斜啞鈴推胸 (Incline Dumbbell Press)", muscle_group: "胸部", image: "images/incline_dumbbell_press.jpg" },
    { id: "flat_dumbbell_press", name: "平板啞鈴推胸 (Flat Dumbbell Press)", muscle_group: "胸部", image: "images/flat_dumbbell_press.jpg" },
    { id: "barbell_bench_press", name: "槓鈴臥推 (Barbell Bench Press)", muscle_group: "胸部", image: "images/barbell_bench_press.jpg" },
    { id: "lower_chest_cable_fly", name: "下胸繩索飛鳥 (Lower Chest Cable Fly)", muscle_group: "胸部", image: "images/lower_chest_cable_fly.jpg" },
    { id: "cable_crossover", name: "繩索夾胸 (Cable Crossover)", muscle_group: "胸部", image: "images/cable_crossover.jpg" },
    { id: "chest_dips", name: "雙槓胸推 (Chest Dips)", muscle_group: "胸部", image: "images/chest_dips.jpg", is_bodyweight: true },
    { id: "machine_chest_press", name: "機器胸推 (Machine Chest Press)", muscle_group: "胸部", image: "images/machine_chest_press.jpg" },

    // 背部 (香港常用「拉背」「划船」)
    { id: "pull_ups", name: "引體向上 (Pull-ups)", muscle_group: "背部", image: "images/pull_ups.jpg", is_bodyweight: true },
    { id: "deadlift", name: "硬拉 (Deadlift)", muscle_group: "背部", image: "images/deadlift.jpg" },
    { id: "seated_cable_row", name: "坐姿繩索拉背 (Seated Cable Row)", muscle_group: "背部", image: "images/seated_cable_row.jpg" },
    { id: "barbell_row", name: "槓鈴划船 (Barbell Bent Over Row)", muscle_group: "背部", image: "images/barbell_row.jpg" },
    { id: "lat_pulldown", name: "寬握下拉 (Lat Pulldown)", muscle_group: "背部", image: "images/lat_pulldown.jpg" },
    { id: "dumbbell_row", name: "單臂啞鈴拉 (Single Arm Dumbbell Row)", muscle_group: "背部", image: "images/dumbbell_row.jpg" },
    { id: "incline_bench_row", name: "上斜啞鈴划船 (Incline Dumbbell Row)", muscle_group: "背部", image: "images/incline_bench_row.jpg" },
    { id: "t_bar_row", name: "T槓划船 (T-Bar Row)", muscle_group: "背部", image: "images/t_bar_row.jpg" },
    { id: "face_pulls", name: "臉部拉 (Face Pulls)", muscle_group: "背部", image: "images/face_pulls.jpg" },

    // 腿部 (香港常用「深蹲」「弓步」「保加利亞蹲」)
    { id: "barbell_back_squat", name: "槓鈴深蹲 (Barbell Back Squat)", muscle_group: "腿部", image: "images/barbell_back_squat.jpg" },
    { id: "zercher_squats", name: "澤奇深蹲 (Zercher Squats)", muscle_group: "腿部", image: "images/zercher_squats.jpg" },
    { id: "goblet_squat", name: "高腳杯深蹲 (Goblet Squat)", muscle_group: "腿部", image: "images/goblet_squat.jpg" },
    { id: "romanian_deadlift", name: "羅馬尼亞硬拉 (Romanian Deadlift)", muscle_group: "腿部", image: "images/romanian_deadlift.jpg" },
    { id: "walking_lunges", name: "行走弓步 (Walking Lunges)", muscle_group: "腿部", image: "images/walking_lunges.jpg" },
    { id: "bulgarian_split_squat", name: "保加利亞蹲 (Bulgarian Split Squat)", muscle_group: "腿部", image: "images/bulgarian_split_squat.jpg" },
    { id: "leg_press", name: "腿推機 (Leg Press)", muscle_group: "腿部", image: "images/leg_press.jpg" },
    { id: "leg_curl", name: "腿彎舉 (Leg Curl)", muscle_group: "腿部", image: "images/leg_curl.jpg" },
    { id: "leg_extension", name: "腿伸展 (Leg Extension)", muscle_group: "腿部", image: "images/leg_extension.jpg" },
    { id: "hip_thrust", name: "臀推 (Hip Thrust)", muscle_group: "腿部", image: "images/hip_thrust.jpg" },
    { id: "standing_calf_raise", name: "站姿小腿提踵 (Standing Calf Raise)", muscle_group: "腿部", image: "images/standing_calf_raise.jpg" },

    // 手臂 (香港常用「彎」「下壓」「牧師椅」)
    { id: "barbell_curl", name: "槓鈴彎舉 (Barbell Curl)", muscle_group: "手臂", image: "images/barbell_curl.jpg" },
    { id: "preacher_curls", name: "牧師椅彎舉 (Preacher Curls)", muscle_group: "手臂", image: "images/preacher_curls.jpg" },
    { id: "bayesian_cable_curls", name: "貝葉斯繩索彎舉 (Bayesian Cable Curls)", muscle_group: "手臂", image: "images/bayesian_cable_curls.jpg" },
    { id: "hammer_curls", name: "錘式彎舉 (Hammer Curls)", muscle_group: "手臂", image: "images/hammer_curls.jpg" },
    { id: "tricep_rope_pushdown", name: "繩索三頭下壓 (Tricep Rope Pushdown)", muscle_group: "手臂", image: "images/tricep_rope_pushdown.jpg" },
    { id: "cable_overhead_triceps", name: "繩索過頭三頭伸展 (Cable Overhead Triceps Extension)", muscle_group: "手臂", image: "images/cable_overhead_triceps.jpg" },
    { id: "skull_crushers", name: "仰臥三頭伸展 (Skull Crushers)", muscle_group: "手臂", image: "images/skull_crushers.jpg" },
    { id: "reverse_forearm_curl", name: "反向腕彎舉 (Reverse Forearm Curl)", muscle_group: "手臂", image: "images/reverse_forearm_curl.jpg" },
    { id: "finger_curls", name: "指力彎舉 (Finger Curls)", muscle_group: "手臂", image: "images/finger_curls.jpg" },

    // 肩膀 (香港超常用「側舉」「後飛」「肩推」)
    { id: "overhead_press", name: "肩推 (Overhead Press)", muscle_group: "肩膀", image: "images/overhead_press.jpg" },
    { id: "seated_dumbbell_press", name: "坐姿啞鈴肩推 (Seated Dumbbell Shoulder Press)", muscle_group: "肩膀", image: "images/seated_dumbbell_press.jpg" },
    { id: "arnold_press", name: "阿諾肩推 (Arnold Press)", muscle_group: "肩膀", image: "images/arnold_press.jpg" },
    { id: "lateral_raises", name: "側舉 (Lateral Raises)", muscle_group: "肩膀", image: "images/lateral_raises.jpg" },
    { id: "cable_lateral_raise", name: "繩索側舉 (Cable Lateral Raise)", muscle_group: "肩膀", image: "images/cable_lateral_raise.jpg" },
    { id: "rear_delt_raises", name: "後飛 (Rear Delt Raises)", muscle_group: "肩膀", image: "images/rear_delt_raises.jpg" },
    { id: "barbell_shrugs", name: "槓鈴聳肩 (Barbell Shrugs)", muscle_group: "肩膀", image: "images/barbell_shrugs.jpg" },

    // 核心 (香港常用「腹輪」「平板撐」「斬木」)
    { id: "ab_wheel_rollout", name: "腹輪 (Ab Wheel Rollout)", muscle_group: "核心", image: "images/ab_wheel_rollout.jpg", is_bodyweight: true },
    { id: "dragon_flag", name: "龍旗 (Dragon Flag)", muscle_group: "核心", image: "images/dragon_flag.jpg", is_bodyweight: true },
    { id: "hanging_leg_raise", name: "懸垂舉腿 (Hanging Leg Raise)", muscle_group: "核心", image: "images/hanging_leg_raise.jpg", is_bodyweight: true },
    { id: "plank", name: "平板支撐 (Plank)", muscle_group: "核心", image: "images/plank.jpg", is_hold: true, is_bodyweight: true },
    { id: "cable_wood_chopper", name: "斬木 (Wood Chopper)", muscle_group: "核心", image: "images/wood_chopper.jpg" },
    { id: "cable_crunch", name: "繩索捲腹 (Cable Crunch)", muscle_group: "核心", image: "images/cable_crunch.jpg" },
    { id: "decline_crunch", name: "下斜捲腹 (Decline Crunch)", muscle_group: "核心", image: "images/cable_crunch.jpg", is_bodyweight: true },

    // 全身 / 有氧 — is_hold = 時間+次數記錄（唔用重量）
    { id: "farmer_carry", name: "農夫行走 (Farmer's Carry)", muscle_group: "全身", image: "images/farmer_carry.jpg" },
    { id: "battle_ropes", name: "戰繩 (Battle Ropes)", muscle_group: "全身", image: "images/battle_ropes.jpg", is_hold: true },
    { id: "burpees", name: "波比跳 (Burpees)", muscle_group: "全身", image: "images/burpees.jpg", is_bodyweight: true },
    { id: "rowing_machine", name: "划船機 (Rowing Machine)", muscle_group: "有氧", image: "images/rowing_machine.jpg", is_hold: true },
    { id: "jump_rope", name: "跳繩 (Jump Rope)", muscle_group: "有氧", image: "images/jump_rope.jpg", is_hold: true },
    { id: "treadmill", name: "跑步機 (Treadmill)", muscle_group: "有氧", image: "images/treadmill.jpg", record_type: "treadmill" },
];

// Source of truth for the 3 fixed, non-modifiable Training Days.
// These are used to populate the static training day sections in the UI.
// IMPORTANT: These live ONLY in frontend. They are NEVER stored in the Workout_Sets sheet.
const TRAINING_DAYS = [
  {
    id: 1,
    label: "訓練日 1",
    subtitle: "Chest + Triceps + Shoulders",
    fullName: "訓練日 1（Chest + Triceps + Shoulders）",
    exercises: [
      "上斜啞鈴推胸 (Incline Dumbbell Press)",
      "平板啞鈴推胸 (Flat Dumbbell Press)",
      "下胸繩索飛鳥 (Lower Chest Cable Fly)",
      "繩索三頭下壓 (Tricep Rope Pushdown)",
      "繩索過頭三頭伸展 (Cable Overhead Triceps Extension)",
      "坐姿啞鈴肩推 (Seated Dumbbell Shoulder Press)",
      "下斜捲腹 (Decline Crunch)"
    ]
  },
  {
    id: 2,
    label: "訓練日 2",
    subtitle: "Back + Biceps + Shoulders + Core",
    fullName: "訓練日 2（Back + Biceps + Shoulders + Core）",
    exercises: [
      "引體向上 (Pull-ups)",
      "硬拉 (Deadlift)",
      "坐姿繩索拉背 (Seated Cable Row)",
      "貝葉斯繩索彎舉 (Bayesian Cable Curls)",
      "牧師椅彎舉 (Preacher Curls)",
      "後飛 (Rear Delt Raises)",
      "斬木 (Wood Chopper)"
    ]
  },
  {
    id: 3,
    label: "訓練日 3",
    subtitle: "Legs + Shoulders + Forearms + Core",
    fullName: "訓練日 3（Legs + Shoulders + Forearms + Core）",
    exercises: [
      "澤奇深蹲 (Zercher Squats)",
      "羅馬尼亞硬拉 (Romanian Deadlift)",
      "站姿小腿提踵 (Standing Calf Raise)",
      "指力彎舉 (Finger Curls)",
      "反向腕彎舉 (Reverse Forearm Curl)",
      "側舉 (Lateral Raises)",
      "龍旗 (Dragon Flag)"
    ]
  }
];

// Kept for potential legacy quick-load compatibility only.
// The Workout Sets Bar (renderWorkoutSetsBar) now ONLY renders user custom sets
// loaded by loadWorkoutSets(). The 3 fixed days are shown via separate UI using TRAINING_DAYS directly.
const DEFAULT_WORKOUT_SETS = TRAINING_DAYS.map(day => ({
  name: day.fullName,
  exercises: [...day.exercises]
}));

// Unified helpers - all exercises use "中文 (English)" via .name
function getExerciseDisplay(ex) {
    if (typeof ex === 'string') {
        const lower = ex.toLowerCase();
        const found = EXERCISES.find(e =>
            e.name === ex ||
            e.name.toLowerCase() === lower ||
            e.name.toLowerCase().includes(lower)
        );
        return found ? found.name : ex;
    }
    return ex && ex.name ? ex.name : ex;
}

function getExerciseByName(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return EXERCISES.find(e =>
        e.name === name ||
        e.name.toLowerCase() === lower ||
        e.name.toLowerCase().includes(lower) ||
        e.id === name
    ) || null;
}

function getExerciseImage(name) {
    const ex = getExerciseByName(name);
    return ex ? ex.image : '';
}

function getMuscleGroup(name) {
    const ex = getExerciseByName(name);
    return ex ? ex.muscle_group : '其他';
}

// 時間+次數動作（唔用重量）：平板支撐、戰繩、跳繩等 → 顯示計時器 UI
function isHoldExercise(name) {
    const ex = getExerciseByName(name);
    return !!(ex && ex.is_hold);
}

function isTimeRepsExercise(name) {
    return isHoldExercise(name);
}

function isBodyweightExercise(name) {
    const ex = getExerciseByName(name);
    return !!(ex && ex.is_bodyweight);
}

function getExerciseRecordType(name) {
    const ex = getExerciseByName(name);
    if (!ex) return 'weight';
    if (ex.record_type) return ex.record_type;
    if (ex.is_hold) return 'time_reps';
    if (ex.is_bodyweight) return 'bodyweight';
    return 'weight';
}

function isTreadmillExercise(name) {
    return getExerciseRecordType(name) === 'treadmill';
}
