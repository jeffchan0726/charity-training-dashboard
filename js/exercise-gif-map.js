// js/exercise-gif-map.js
// Maps local exercise IDs to animation GIFs from the free Kaggle / GitHub dataset:
// https://github.com/omercotkd/exercises-gifs (Fitness Exercises with Animations)

const EXERCISE_GIF_BASE_URL =
    'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/';

/** @type {Record<string, string>} exercise.id → 4-digit GIF asset id */
const EXERCISE_GIF_MAP = {
    // 胸部
    incline_dumbbell_press: '0314',
    flat_dumbbell_press: '0289',
    barbell_bench_press: '0025',
    lower_chest_cable_fly: '0158',
    cable_crossover: '1269',
    chest_dips: '1430',
    machine_chest_press: '0577',

    // 背部
    pull_ups: '0652',
    deadlift: '0032',
    seated_cable_row: '0861',
    barbell_row: '0027',
    lat_pulldown: '0198',
    dumbbell_row: '0292',
    incline_bench_row: '0327',
    t_bar_row: '0606',
    face_pulls: '0233',

    // 腿部
    barbell_back_squat: '0043',
    zercher_squats: '0127',
    goblet_squat: '1760',
    romanian_deadlift: '0085',
    walking_lunges: '1460',
    bulgarian_split_squat: '0410',
    leg_press: '0739',
    leg_curl: '0586',
    leg_extension: '0585',
    hip_thrust: '1409',
    standing_calf_raise: '1372',

    // 手臂
    barbell_curl: '0031',
    preacher_curls: '0070',
    bayesian_cable_curls: '1636',
    hammer_curls: '0313',
    tricep_rope_pushdown: '0200',
    cable_overhead_triceps: '0194',
    skull_crushers: '0060',
    reverse_forearm_curl: '0082',
    finger_curls: '1437',

    // 肩膀
    overhead_press: '0091',
    seated_dumbbell_press: '0405',
    arnold_press: '2137',
    lateral_raises: '0334',
    cable_lateral_raise: '0178',
    rear_delt_raises: '2292',
    barbell_shrugs: '0095',

    // 核心
    ab_wheel_rollout: '0857',
    hanging_leg_raise: '0472',
    plank: '2135',
    cable_wood_chopper: '0862',
    cable_crunch: '0175',
    decline_crunch: '0277',

    // 全身 / 有氧
    farmer_carry: '2133',
    battle_ropes: '0128',
    burpees: '1160',
    rowing_machine: '1323',
    jump_rope: '2612',
    treadmill: '3666'
};

function getExerciseGifId(ex) {
    if (!ex) return null;
    const id = (ex.id || '').toLowerCase();
    if (id && EXERCISE_GIF_MAP[id]) return EXERCISE_GIF_MAP[id];
    return null;
}

function getExerciseGifUrl(ex) {
    const gifId = getExerciseGifId(ex);
    if (!gifId) return null;
    return EXERCISE_GIF_BASE_URL + gifId + '.gif';
}