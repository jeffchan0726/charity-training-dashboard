// js/exercise-gif-map.js
// Maps local exercise IDs to animation GIFs from the free Kaggle / GitHub dataset:
// https://github.com/omercotkd/exercises-gifs (Fitness Exercises with Animations)

const EXERCISE_GIF_BASE_URL =
    'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/';

/** @type {Record<string, string>} exercise.id → 4-digit GIF asset id */
const EXERCISE_GIF_MAP = {
    // 胸部
    incline_dumbbell_press: '0314',
    incline_barbell_press: '0047',
    flat_dumbbell_press: '0289',
    barbell_bench_press: '0025',
    lower_chest_cable_fly: '0158',
    cable_crossover: '1269',
    chest_dips: '1430',
    machine_chest_press: '0577',
    wide_chest_press: '0576',
    incline_chest_press_machine: '1299',
    decline_press_machine: '1300',
    pec_deck: '0596',
    upper_chest_fly: '0596',
    standing_fly_machine: '0227',
    assisted_dip: '0009',

    // 背部
    pull_ups: '0652',
    deadlift: '0032',
    deadlift_machine: '0578',
    seated_cable_row: '0861',
    low_row: '0180',
    barbell_row: '0027',
    lat_pulldown: '0579',
    straight_arm_pulldown: '0238',
    dumbbell_row: '0292',
    incline_bench_row: '0327',
    t_bar_row: '0606',
    face_pulls: '0233',
    high_row: '0581',
    assisted_pull_up: '0017',
    neutral_pulldown: '0818',
    pullover_machine: '2285',
    iso_lateral_row: '1313',

    // 腿部
    barbell_back_squat: '0043',
    zercher_squats: '0127',
    goblet_squat: '1760',
    romanian_deadlift: '0085',
    romanian_dumbbell_deadlift: '1459',
    walking_lunges: '1460',
    bulgarian_split_squat: '0410',
    leg_press: '0739',
    leg_curl: '0586',
    seated_leg_curl: '0599',
    prone_leg_curl: '0586',
    leg_extension: '0585',
    hip_thrust: '3562',
    cable_pull_through: '0196',
    standing_calf_raise: '1372',
    seated_calf_raise: '0594',
    hack_squat: '0743',
    v_squat: '0741',
    smith_squat: '0770',
    smith_bench_press: '0748',
    smith_incline_press: '0757',
    hip_abduction: '0597',
    cable_hip_abduction: '1427',
    hip_adduction: '0598',
    glute_kickback: '0860',
    hip_extension_machine: '2286',
    donkey_calf: '1253',
    kneeling_glute: '0860',

    // 手臂
    barbell_curl: '0031',
    preacher_curls: '0070',
    bayesian_cable_curls: '0868',
    hammer_curls: '0313',
    dumbbell_curl: '0294',
    arm_curl_machine: '0575',
    preacher_machine: '0592',
    tricep_rope_pushdown: '0200',
    seated_dip_machine: '1451',
    tricep_extension_machine: '0607',
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
    machine_shoulder_press: '0603',
    smith_shoulder_press: '0766',
    shrug_machine: '0604',
    viking_press: '2318',
    standing_lateral_machine: '0584',
    reverse_pec_deck: '0602',

    // 核心
    ab_wheel_rollout: '0857',
    hanging_leg_raise: '0472',
    plank: '2135',
    cable_wood_chopper: '0862',
    cable_crunch: '0175',
    decline_crunch: '0277',
    abdominal_crunch: '0595',
    rotary_torso: '0583',
    back_extension: '0573',
    reverse_hyper: '0593',

    // 全身 / 有氧
    farmer_carry: '2133',
    kettlebell_swing: '0549',
    battle_ropes: '0128',
    burpees: '1160',
    jump_rope: '2612',
    treadmill: '3666',
    exercise_bike: '2138',
    recumbent_bike: '0798',
    elliptical: '2141',
    arc_trainer: '2331',
    stair_climber: '2311',
    ski_erg: '2142'
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
    const v = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : '2.4.57';
    return EXERCISE_GIF_BASE_URL + gifId + '.gif?v=' + v;
}