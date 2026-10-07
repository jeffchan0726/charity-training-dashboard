// js/data.js
// Core static data extracted as part of architecture refactor (Option A)
// This allows better separation, easier maintenance, and future testing.

// Exercise categories used for filtering in library
const EXERCISE_CATEGORIES = ['胸部', '背部', '腿部', '肩膀', '手臂', '核心', '全身', '有氧'];

// 單一動作分析 — 分類篩選（訓練日 + 肌群 + 細分部位）
const ANALYSIS_EXERCISE_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'day1', label: '訓練日 1', dayId: 1 },
    { key: 'day2', label: '訓練日 2', dayId: 2 },
    { key: 'day3', label: '訓練日 3', dayId: 3 },
    { key: 'k1', label: '廚房 1', dayId: 4 },
    { key: 'k2', label: '廚房 2', dayId: 5 },
    { key: 'chest', label: '胸肌', muscle: '胸部' },
    { key: 'back', label: '背肌', muscle: '背部' },
    { key: 'legs', label: '大腿', muscle: '腿部', excludeIds: ['standing_calf_raise'] },
    { key: 'calves', label: '小腿', exerciseIds: ['standing_calf_raise', 'seated_calf_raise'] },
    { key: 'glutes', label: '臀部', exerciseIds: ['hip_thrust', 'romanian_deadlift', 'romanian_dumbbell_deadlift', 'bulgarian_split_squat', 'booty_builder', 'glute_kickback', 'hip_abduction', 'cable_hip_abduction'] },
    { key: 'shoulders', label: '肩膀', muscle: '肩膀' },
    { key: 'biceps', label: '二頭', exerciseIds: ['barbell_curl', 'dumbbell_curl', 'preacher_curls', 'bayesian_cable_curls', 'hammer_curls', 'arm_curl_machine'] },
    { key: 'triceps', label: '三頭', exerciseIds: ['tricep_rope_pushdown', 'cable_overhead_triceps', 'skull_crushers', 'chest_dips'] },
    { key: 'forearms', label: '前臂', exerciseIds: ['reverse_forearm_curl', 'finger_curls'] },
    { key: 'arms', label: '手臂', muscle: '手臂' },
    { key: 'core', label: '核心', muscle: '核心' },
    { key: 'fullbody', label: '全身', muscle: '全身' },
    { key: 'cardio', label: '有氧', muscle: '有氧' },
    { key: 'other', label: '其他', other: true }
];

// Unified Exercise Database - Clean deduplicated, all names in "中文 (English)" format
// muscle_group, image (local /images/ only - no fallback)
// All UI (history, analysis, selectors, cards) MUST use this unified bilingual name
const EXERCISES = [
    // 胸部 (香港gym常用「推胸」講法)
    { id: "incline_dumbbell_press", name: "上斜啞鈴推胸 (Incline Dumbbell Press)", muscle_group: "胸部", image: "images/incline_dumbbell_press.jpg" },
    { id: "incline_barbell_press", name: "上斜槓鈴臥推 (Incline Barbell Press)", muscle_group: "胸部", image: "images/incline_barbell_press.jpg" },
    { id: "smith_bench_press", name: "史密斯臥推 (Smith Bench Press)", muscle_group: "胸部", image: "images/smith_bench_press.jpg" },
    { id: "smith_incline_press", name: "史密斯上斜推 (Smith Incline Press)", muscle_group: "胸部", image: "images/smith_incline_press.jpg" },
    { id: "flat_dumbbell_press", name: "平板啞鈴推胸 (Flat Dumbbell Press)", muscle_group: "胸部", image: "images/flat_dumbbell_press.jpg" },
    { id: "barbell_bench_press", name: "槓鈴臥推 (Barbell Bench Press)", muscle_group: "胸部", image: "images/barbell_bench_press.jpg" },
    { id: "lower_chest_cable_fly", name: "下胸繩索飛鳥 (Lower Chest Cable Fly)", muscle_group: "胸部", image: "images/lower_chest_cable_fly.jpg" },
    { id: "cable_crossover", name: "繩索夾胸 (Cable Crossover)", muscle_group: "胸部", image: "images/cable_crossover.jpg" },
    { id: "chest_dips", name: "雙槓胸推 (Chest Dips)", muscle_group: "胸部", image: "images/chest_dips.jpg", is_bodyweight: true },
    { id: "machine_chest_press", name: "機器胸推 (Machine Chest Press)", muscle_group: "胸部", image: "images/machine_chest_press.jpg" },
    { id: "wide_chest_press", name: "寬距胸推機 (Wide Chest Press)", muscle_group: "胸部", image: "images/wide_chest_press.jpg" },
    { id: "incline_chest_press_machine", name: "上斜胸推機 (Incline Chest Press)", muscle_group: "胸部", image: "images/incline_chest_press_machine.jpg" },
    { id: "decline_press_machine", name: "下斜胸推機 (Decline Chest Press)", muscle_group: "胸部", image: "images/decline_press_machine.jpg" },
    { id: "pec_deck", name: "蝴蝶機夾胸 (Pec Deck)", muscle_group: "胸部", image: "images/pec_deck.jpg" },
    { id: "upper_chest_fly", name: "上胸飛鳥機 (Upper Chest Fly)", muscle_group: "胸部", image: "images/upper_chest_fly.jpg" },
    { id: "standing_fly_machine", name: "站姿飛鳥機 (Standing Fly)", muscle_group: "胸部", image: "images/standing_fly_machine.jpg" },
    { id: "assisted_dip", name: "輔助雙槓 (Assisted Dip)", muscle_group: "胸部", image: "images/assisted_dip.jpg" },

    // 背部 (香港常用「拉背」「划船」)
    { id: "pull_ups", name: "引體向上 (Pull-ups)", muscle_group: "背部", image: "images/pull_ups.jpg", is_bodyweight: true },
    { id: "deadlift", name: "硬拉 (Deadlift)", muscle_group: "背部", image: "images/deadlift.jpg" },
    { id: "deadlift_machine", name: "器械硬拉 (Deadlift Machine)", muscle_group: "背部", image: "images/deadlift_machine.jpg" },
    { id: "seated_cable_row", name: "坐姿繩索拉背 (Seated Cable Row)", muscle_group: "背部", image: "images/seated_cable_row.jpg" },
    { id: "low_row", name: "低位划船機 (Low Row)", muscle_group: "背部", image: "images/low_row.jpg" },
    { id: "barbell_row", name: "槓鈴划船 (Barbell Bent Over Row)", muscle_group: "背部", image: "images/barbell_row.jpg" },
    { id: "lat_pulldown", name: "寬握下拉 (Lat Pulldown)", muscle_group: "背部", image: "images/lat_pulldown.jpg" },
    { id: "straight_arm_pulldown", name: "直臂下拉 (Straight-Arm Pulldown)", muscle_group: "背部", image: "images/straight_arm_pulldown.jpg" },
    { id: "dumbbell_row", name: "單臂啞鈴拉 (Single Arm Dumbbell Row)", muscle_group: "背部", image: "images/dumbbell_row.jpg" },
    { id: "incline_bench_row", name: "上斜啞鈴划船 (Incline Dumbbell Row)", muscle_group: "背部", image: "images/incline_bench_row.jpg" },
    { id: "t_bar_row", name: "T槓划船 (T-Bar Row)", muscle_group: "背部", image: "images/t_bar_row.jpg" },
    { id: "face_pulls", name: "臉部拉 (Face Pulls)", muscle_group: "背部", image: "images/face_pulls.jpg" },
    { id: "high_row", name: "高位划船機 (High Row)", muscle_group: "背部", image: "images/high_row.jpg" },
    { id: "assisted_pull_up", name: "輔助引體向上 (Assisted Pull-up)", muscle_group: "背部", image: "images/assisted_pull_up.jpg" },
    { id: "neutral_pulldown", name: "平行握下拉 (Neutral Grip Pulldown)", muscle_group: "背部", image: "images/neutral_pulldown.jpg" },
    { id: "pullover_machine", name: "拉背機 (Pullover Machine)", muscle_group: "背部", image: "images/pullover_machine.jpg" },
    { id: "iso_lateral_row", name: "單側划船機 (Iso-Lateral Row)", muscle_group: "背部", image: "images/iso_lateral_row.jpg" },

    // 腿部 (香港常用「深蹲」「弓步」「保加利亞蹲」)
    { id: "barbell_back_squat", name: "槓鈴深蹲 (Barbell Back Squat)", muscle_group: "腿部", image: "images/barbell_back_squat.jpg" },
    { id: "zercher_squats", name: "澤奇深蹲 (Zercher Squats)", muscle_group: "腿部", image: "images/zercher_squats.jpg" },
    { id: "goblet_squat", name: "高腳杯深蹲 (Goblet Squat)", muscle_group: "腿部", image: "images/goblet_squat.jpg" },
    { id: "romanian_deadlift", name: "羅馬尼亞硬拉 (Romanian Deadlift)", muscle_group: "腿部", image: "images/romanian_deadlift.jpg" },
    { id: "romanian_dumbbell_deadlift", name: "羅馬尼亞啞鈴硬拉 (Romanian Dumbbell Deadlift)", muscle_group: "腿部", image: "images/romanian_dumbbell_deadlift.jpg" },
    { id: "walking_lunges", name: "行走弓步 (Walking Lunges)", muscle_group: "腿部", image: "images/walking_lunges.jpg" },
    { id: "bulgarian_split_squat", name: "保加利亞蹲 (Bulgarian Split Squat)", muscle_group: "腿部", image: "images/bulgarian_split_squat.jpg" },
    { id: "leg_press", name: "腿推機 (Leg Press)", muscle_group: "腿部", image: "images/leg_press.jpg" },
    { id: "leg_curl", name: "腿彎舉 (Leg Curl)", muscle_group: "腿部", image: "images/leg_curl.jpg" },
    { id: "seated_leg_curl", name: "坐姿腿彎舉 (Seated Leg Curl)", muscle_group: "腿部", image: "images/seated_leg_curl.jpg" },
    { id: "prone_leg_curl", name: "俯臥腿彎舉 (Prone Leg Curl)", muscle_group: "腿部", image: "images/prone_leg_curl.jpg" },
    { id: "leg_extension", name: "腿伸展 (Leg Extension)", muscle_group: "腿部", image: "images/leg_extension.jpg" },
    { id: "hip_thrust", name: "臀推 (Hip Thrust)", muscle_group: "腿部", image: "images/hip_thrust.jpg" },
    { id: "cable_pull_through", name: "繩索臀拉 (Cable Pull Through)", muscle_group: "腿部", image: "images/cable_pull_through.jpg" },
    { id: "standing_calf_raise", name: "站姿小腿提踵 (Standing Calf Raise)", muscle_group: "腿部", image: "images/standing_calf_raise.jpg" },
    { id: "seated_calf_raise", name: "坐姿小腿提踵 (Seated Calf Raise)", muscle_group: "腿部", image: "images/seated_calf_raise.jpg" },
    { id: "hack_squat", name: "哈克深蹲 (Hack Squat)", muscle_group: "腿部", image: "images/hack_squat.jpg" },
    { id: "v_squat", name: "V蹲機 (V-Squat)", muscle_group: "腿部", image: "images/v_squat.jpg" },
    { id: "power_squat", name: "力量深蹲機 (Power Squat)", muscle_group: "腿部", image: "images/power_squat.jpg" },
    { id: "smith_squat", name: "史密斯深蹲 (Smith Squat)", muscle_group: "腿部", image: "images/smith_squat.jpg" },
    { id: "hip_abduction", name: "髖外展機 (Hip Abduction)", muscle_group: "腿部", image: "images/hip_abduction.jpg" },
    { id: "cable_hip_abduction", name: "繩索髖外展 (Cable Hip Abduction)", muscle_group: "腿部", image: "images/cable_hip_abduction.jpg" },
    { id: "standing_abductor", name: "站姿外展機 (Standing Abductor)", muscle_group: "腿部", image: "images/standing_abductor.jpg" },
    { id: "hip_adduction", name: "髖內收機 (Hip Adduction)", muscle_group: "腿部", image: "images/hip_adduction.jpg" },
    { id: "glute_kickback", name: "臀後踢機 (Glute Kickback)", muscle_group: "腿部", image: "images/glute_kickback.jpg" },
    { id: "booty_builder", name: "臀推機 (Booty Builder)", muscle_group: "腿部", image: "images/booty_builder.jpg" },
    { id: "hip_extension_machine", name: "髖伸展機 (Hip Extension)", muscle_group: "腿部", image: "images/hip_extension_machine.jpg" },
    { id: "donkey_calf", name: "驢式提踵 (Donkey Calf Raise)", muscle_group: "腿部", image: "images/donkey_calf.jpg" },
    { id: "belt_squat", name: "腰帶深蹲 (Belt Squat)", muscle_group: "腿部", image: "images/belt_squat.jpg" },
    { id: "reverse_lunge_machine", name: "反向弓步機 (Reverse Lunge Machine)", muscle_group: "腿部", image: "images/reverse_lunge_machine.jpg" },
    { id: "abductor_3d", name: "3D外展機 (3D Abductor)", muscle_group: "腿部", image: "images/abductor_3d.jpg" },
    { id: "kneeling_glute", name: "跪姿臀踢機 (Kneeling Glute Kick)", muscle_group: "腿部", image: "images/kneeling_glute.jpg" },

    // 手臂 (香港常用「彎」「下壓」「牧師椅」)
    { id: "barbell_curl", name: "槓鈴彎舉 (Barbell Curl)", muscle_group: "手臂", image: "images/barbell_curl.jpg" },
    { id: "preacher_curls", name: "牧師椅彎舉 (Preacher Curls)", muscle_group: "手臂", image: "images/preacher_curls.jpg" },
    { id: "bayesian_cable_curls", name: "貝葉斯繩索彎舉 (Bayesian Cable Curls)", muscle_group: "手臂", image: "images/bayesian_cable_curls.jpg" },
    { id: "hammer_curls", name: "錘式彎舉 (Hammer Curls)", muscle_group: "手臂", image: "images/hammer_curls.jpg" },
    { id: "dumbbell_curl", name: "啞鈴彎舉 (Dumbbell Curl)", muscle_group: "手臂", image: "images/dumbbell_curl.jpg" },
    { id: "arm_curl_machine", name: "二頭彎舉機 (Arm Curl Machine)", muscle_group: "手臂", image: "images/arm_curl_machine.jpg" },
    { id: "preacher_machine", name: "牧師椅彎舉機 (Preacher Curl Machine)", muscle_group: "手臂", image: "images/preacher_machine.jpg" },
    { id: "tricep_rope_pushdown", name: "繩索三頭下壓 (Tricep Rope Pushdown)", muscle_group: "手臂", image: "images/tricep_rope_pushdown.jpg" },
    { id: "seated_dip_machine", name: "坐姿雙槓機 (Seated Dip)", muscle_group: "手臂", image: "images/seated_dip_machine.jpg" },
    { id: "tricep_extension_machine", name: "三頭伸展機 (Tricep Extension)", muscle_group: "手臂", image: "images/tricep_extension_machine.jpg" },
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
    { id: "machine_shoulder_press", name: "器械肩推 (Machine Shoulder Press)", muscle_group: "肩膀", image: "images/machine_shoulder_press.jpg" },
    { id: "smith_shoulder_press", name: "史密斯肩推 (Smith Shoulder Press)", muscle_group: "肩膀", image: "images/smith_shoulder_press.jpg" },
    { id: "shrug_machine", name: "聳肩機 (Shrug Machine)", muscle_group: "肩膀", image: "images/shrug_machine.jpg" },
    { id: "viking_press", name: "維京推 (Viking Press)", muscle_group: "肩膀", image: "images/viking_press.jpg" },
    { id: "standing_lateral_machine", name: "站姿側舉機 (Standing Lateral Raise)", muscle_group: "肩膀", image: "images/standing_lateral_machine.jpg" },
    { id: "reverse_pec_deck", name: "反向蝴蝶機 (Rear Delt Fly)", muscle_group: "肩膀", image: "images/reverse_pec_deck.jpg" },

    // 核心 (香港常用「腹輪」「平板撐」「斬木」)
    { id: "ab_wheel_rollout", name: "腹輪 (Ab Wheel Rollout)", muscle_group: "核心", image: "images/ab_wheel_rollout.jpg", is_bodyweight: true },
    { id: "dragon_flag", name: "龍旗 (Dragon Flag)", muscle_group: "核心", image: "images/dragon_flag.jpg", is_bodyweight: true },
    { id: "hanging_leg_raise", name: "懸垂舉腿 (Hanging Leg Raise)", muscle_group: "核心", image: "images/hanging_leg_raise.jpg", is_bodyweight: true },
    { id: "plank", name: "平板支撐 (Plank)", muscle_group: "核心", image: "images/plank.jpg", is_hold: true, is_bodyweight: true },
    { id: "cable_wood_chopper", name: "斬木 (Wood Chopper)", muscle_group: "核心", image: "images/cable_wood_chopper.jpg" },
    { id: "cable_crunch", name: "繩索捲腹 (Cable Crunch)", muscle_group: "核心", image: "images/cable_crunch.jpg" },
    { id: "decline_crunch", name: "下斜捲腹 (Decline Crunch)", muscle_group: "核心", image: "images/decline_crunch.jpg", is_bodyweight: true },
    { id: "abdominal_crunch", name: "器械捲腹 (Machine Abdominal Crunch)", muscle_group: "核心", image: "images/abdominal_crunch.jpg" },
    { id: "rotary_torso", name: "轉體機 (Rotary Torso)", muscle_group: "核心", image: "images/rotary_torso.jpg" },
    { id: "back_extension", name: "山羊挺身 (Back Extension)", muscle_group: "核心", image: "images/back_extension.jpg" },
    { id: "reverse_hyper", name: "反向超伸 (Reverse Hyperextension)", muscle_group: "核心", image: "images/reverse_hyper.jpg" },

    // 全身 / 有氧 — is_hold = 時間+次數記錄（唔用重量）
    { id: "farmer_carry", name: "農夫行走 (Farmer's Carry)", muscle_group: "全身", image: "images/farmer_carry.jpg" },
    { id: "kettlebell_swing", name: "壺鈴擺盪 (Kettlebell Swing)", muscle_group: "全身", image: "images/kettlebell_swing.jpg" },
    { id: "battle_ropes", name: "戰繩 (Battle Ropes)", muscle_group: "全身", image: "images/battle_ropes.jpg", is_hold: true },
    { id: "burpees", name: "波比跳 (Burpees)", muscle_group: "全身", image: "images/burpees.jpg", is_bodyweight: true },
    { id: "rowing_machine", name: "划船機 (Rowing Machine)", muscle_group: "有氧", image: "images/rowing_machine.jpg", is_hold: true },
    { id: "jump_rope", name: "跳繩 (Jump Rope)", muscle_group: "有氧", image: "images/jump_rope.jpg", is_hold: true },
    { id: "treadmill", name: "跑步機 (Treadmill)", muscle_group: "有氧", image: "images/treadmill.jpg", record_type: "treadmill" },
    { id: "exercise_bike", name: "健身單車 (Exercise Bike)", muscle_group: "有氧", image: "images/exercise_bike.jpg", is_hold: true },
    { id: "recumbent_bike", name: "靠背單車 (Recumbent Bike)", muscle_group: "有氧", image: "images/recumbent_bike.jpg", is_hold: true },
    { id: "elliptical", name: "橢圓機 (Elliptical)", muscle_group: "有氧", image: "images/elliptical.jpg", is_hold: true },
    { id: "arc_trainer", name: "弧形訓練機 (Arc Trainer)", muscle_group: "有氧", image: "images/arc_trainer.jpg", is_hold: true },
    { id: "stair_climber", name: "踏步機 (Stair Climber)", muscle_group: "有氧", image: "images/stair_climber.jpg", is_hold: true },
    { id: "jacobs_ladder", name: "雅各爬梯機 (Jacob's Ladder)", muscle_group: "有氧", image: "images/jacobs_ladder.jpg", is_hold: true },
    { id: "power_runner", name: "無動力跑機 (Power Runner)", muscle_group: "有氧", image: "images/power_runner.jpg", is_hold: true },
    { id: "ski_erg", name: "滑雪機 (SkiErg)", muscle_group: "有氧", image: "images/ski_erg.jpg", is_hold: true },
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
      "器械捲腹 (Machine Abdominal Crunch)"
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
      "懸垂舉腿 (Hanging Leg Raise)"
    ]
  },
  {
    id: 4,
    group: "廚房守護者",
    label: "廚房守護者 1",
    subtitle: "推・腿",
    fullName: "廚房守護者 1（推・腿）",
    exercises: [
      "平板啞鈴推胸 (Flat Dumbbell Press)",
      "繩索三頭下壓 (Tricep Rope Pushdown)",
      "羅馬尼亞啞鈴硬拉 (Romanian Dumbbell Deadlift)",
      "高腳杯深蹲 (Goblet Squat)",
      "側舉 (Lateral Raises)",
      "器械捲腹 (Machine Abdominal Crunch)",
      "跑步機 (Treadmill)"
    ]
  },
  {
    id: 5,
    group: "廚房守護者",
    label: "廚房守護者 2",
    subtitle: "拉・髋",
    fullName: "廚房守護者 2（拉・髋）",
    exercises: [
      "寬握下拉 (Lat Pulldown)",
      "啞鈴彎舉 (Dumbbell Curl)",
      "繩索髖外展 (Cable Hip Abduction)",
      "臀推 (Hip Thrust)",
      "後飛 (Rear Delt Raises)",
      "斬木 (Wood Chopper)",
      "懸垂舉腿 (Hanging Leg Raise)",
      "划船機 (Rowing Machine)"
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
        const found = getExerciseByName(ex);
        return found ? found.name : ex;
    }
    return ex && ex.name ? ex.name : ex;
}

function getExerciseByName(name) {
    if (!name) return null;
    const raw = String(name).trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    return EXERCISES.find(e =>
        e.name === raw ||
        e.name.toLowerCase() === lower ||
        e.id === raw ||
        String(e.id).toLowerCase() === lower
    ) || null;
}

function resolveExerciseImage(src) {
    if (src && typeof src === 'string' && src.indexOf('images/') === 0) {
        if (src.indexOf('v=') === -1) return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=2.4.48';
        return src;
    }
    return 'images/icon.jpeg';
}

EXERCISES.forEach(function (ex) {
    ex.image = resolveExerciseImage(ex.image, ex.muscle_group);
});

function getExerciseImage(name) {
    const preview = getExercisePreview(name);
    return preview.primary;
}

function getExercisePreview(name) {
    const ex = getExerciseByName(name);
    const local = ex ? resolveExerciseImage(ex.image) : 'images/icon.jpeg';
    const gif = (ex && typeof getExerciseGifUrl === 'function') ? getExerciseGifUrl(ex) : null;
    return { primary: gif || local, fallback: local };
}

function getMuscleGroup(name) {
    const ex = getExerciseByName(name);
    if (ex) return ex.muscle_group;
    const lib = (typeof exerciseLibrary !== 'undefined' ? exerciseLibrary : []).find(e =>
        e && e.name && String(e.name).toLowerCase() === String(name || '').toLowerCase()
    );
    return (lib && (lib.category || lib.muscle_group)) || '其他';
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

/** 將動作名統一為 EXERCISES 嘅 display name，方便同訓練日 preset 比對 */
function normalizeExerciseNameForMatch(name) {
    if (!name) return '';
    const ex = getExerciseByName(name);
    return ex ? getExerciseDisplay(ex) : String(name).trim();
}

/** 訓練日 1/2/3 同自訂 Set 嘅定義清單 */
function getKnownWorkoutSetDefinitions() {
    const presets = (typeof TRAINING_DAYS !== 'undefined' ? TRAINING_DAYS : []).map(day => ({
        name: day.fullName,
        label: day.label,
        exercises: day.exercises || []
    }));
    const custom = (typeof workoutSets !== 'undefined' ? workoutSets : []).map(s => ({
        name: s.name,
        label: s.name,
        exercises: s.exercises || []
    }));
    return [...presets, ...custom];
}

/** 訓練日 1/2/3 顯示完整名稱；自訂 Set 顯示原名 */
function formatWorkoutSetDisplayLabel(setName) {
    if (!setName) return '';
    const trimmed = String(setName).trim();
    if (typeof TRAINING_DAYS !== 'undefined') {
        for (const day of TRAINING_DAYS) {
            if (trimmed === day.fullName || trimmed === day.label || trimmed.startsWith(day.label)) {
                return day.fullName;
            }
        }
    }
    return trimmed;
}

/** 從已做動作推斷最接近嘅訓練日／Set（舊紀錄冇存 set 名時用） */
function inferWorkoutSetNameFromExercises(exercises) {
    const performed = [];
    (exercises || []).forEach(ex => {
        const hasSet = (ex.sets || []).some(s => {
            const reps = parseInt(s.reps) || 0;
            const weight = parseFloat(s.weight) || 0;
            const vol = parseFloat(s.volume) || 0;
            const dur = parseInt(s.duration) || 0;
            return reps > 0 || weight > 0 || vol > 0 || dur > 0;
        });
        if (!hasSet) return;
        const norm = normalizeExerciseNameForMatch(ex.name);
        if (norm) performed.push(norm);
    });
    if (!performed.length) return '';

    const performedSet = new Set(performed);
    let best = { name: '', score: 0 };
    let secondScore = 0;

    getKnownWorkoutSetDefinitions().forEach(def => {
        let score = 0;
        (def.exercises || []).forEach(en => {
            const norm = normalizeExerciseNameForMatch(en);
            if (performedSet.has(norm)) score++;
        });
        if (score > best.score) {
            secondScore = best.score;
            best = { name: def.name, score };
        } else if (score > secondScore) {
            secondScore = score;
        }
    });

    const minScore = performedSet.size <= 2 ? 1 : 2;
    if (best.score >= minScore && best.score > secondScore) {
        return best.name;
    }
    return '';
}

function isExerciseInTrainingDay(name, dayId) {
    if (typeof TRAINING_DAYS === 'undefined') return false;
    const day = TRAINING_DAYS.find(d => d.id === dayId);
    if (!day) return false;
    const norm = normalizeExerciseNameForMatch(name);
    return (day.exercises || []).some(en => normalizeExerciseNameForMatch(en) === norm);
}

function getExerciseIdByName(name) {
    const ex = getExerciseByName(name);
    return ex ? ex.id : null;
}

function matchesAnalysisExerciseFilter(name, filterKey) {
    if (!filterKey || filterKey === 'all') return true;
    const filter = (typeof ANALYSIS_EXERCISE_FILTERS !== 'undefined' ? ANALYSIS_EXERCISE_FILTERS : [])
        .find(f => f.key === filterKey);
    if (!filter) return true;

    if (filter.dayId) return isExerciseInTrainingDay(name, filter.dayId);

    const exId = getExerciseIdByName(name);

    if (filter.other) {
        return !getExerciseByName(name) || getMuscleGroup(name) === '其他';
    }
    if (filter.exerciseIds) {
        return !!(exId && filter.exerciseIds.includes(exId));
    }
    if (filter.muscle) {
        if (getMuscleGroup(name) !== filter.muscle) return false;
        if (filter.excludeIds && exId && filter.excludeIds.includes(exId)) return false;
        return true;
    }
    return true;
}

function getAnalysisFiltersForExercises(exerciseNames) {
    const list = exerciseNames || [];
    return (typeof ANALYSIS_EXERCISE_FILTERS !== 'undefined' ? ANALYSIS_EXERCISE_FILTERS : [])
        .filter(f => f.key === 'all' || list.some(name => matchesAnalysisExerciseFilter(name, f.key)));
}

/** 取得單次訓練嘅訓練日／Set 顯示標籤 */
function resolveWorkoutSetLabel(workout) {
    if (!workout) return '';
    const stored = workout.workoutSetName || workout.trainingDay || '';
    if (stored) return formatWorkoutSetDisplayLabel(stored);
    return formatWorkoutSetDisplayLabel(
        inferWorkoutSetNameFromExercises(workout.exercises)
    );
}
