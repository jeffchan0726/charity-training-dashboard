// js/utils.js
// Utility functions extracted for architecture refactor (Option A)

// Date utilities (centralized to avoid duplication and timezone bugs)
function getLocalDateString(date = new Date()) {
    // 統一本地日期字串（YYYY-MM-DD），使用本地時間（香港 UTC+8）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeDateToLocal(dateValue) {
    if (!dateValue) return '';
    const str = String(dateValue);
    if (str.includes('T')) {
        // ISO 格式（例如 2026-06-12T16:00:00.000Z），用本地時間解析
        const d = new Date(str);
        return getLocalDateString(d);
    }
    // 已經是 YYYY-MM-DD 或有其他格式
    return str.split('T')[0];
}

// 取得今天日期字串 YYYY-MM-DD（統一使用本地時間）
function getTodayStr() {
    return getLocalDateString();
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '未知日期';
    try {
        // Handle possible malformed like "2026- -12"
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const m = (parts[1] || '').padStart(2, '0');
            const d = (parts[2] || '').padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const dt = new Date(dateStr);
        if (isNaN(dt.getTime())) return dateStr;
        return dt.toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    } catch (e) {
        return dateStr;
    }
}

function isValidUnfinishedWorkout(workout) {
    if (!workout || !workout.exercises || workout.exercises.length === 0) return false;

    // Must have at least one set with actual volume (weight * reps > 0)
    let hasRealVolume = false;
    for (const ex of workout.exercises) {
        for (const s of (ex.sets || [])) {
            if ((s.weight || 0) * (s.reps || 0) > 0) {
                hasRealVolume = true;
                break;
            }
        }
        if (hasRealVolume) break;
    }
    if (!hasRealVolume) return false;

    // Only today or within last 2 hours (use startTime if available for precision)
    if (!workout.date) return false;
    const todayStr = getTodayStr();
    if (workout.date !== todayStr) return false;

    if (workout.startTime) {
        const ageHrs = (Date.now() - workout.startTime) / (1000 * 60 * 60);
        if (ageHrs > 2) return false;
    }

    return true;
}

// Storage helpers
function getUserStorageKey() {
    return `charityWorkoutData_${currentUser || 'guest'}`;
}

function saveWorkoutData() {
    try {
        const data = {
            history: workoutHistory,
            library: exerciseLibrary,
            routines: routines,
            lastPerformed: lastPerformed,
            lastWorkoutSetName: lastWorkoutSetName || null,  // for auto "接埋" last chosen training set
            currentWorkout: currentWorkout || null   // persist in-progress training for resume
        };
        localStorage.setItem(getUserStorageKey(), JSON.stringify(data));
    } catch (e) { console.warn('Local storage save failed', e); }
}

function loadWorkoutData() {
    try {
        const raw = localStorage.getItem(getUserStorageKey());
        if (raw) {
            const data = JSON.parse(raw);
            workoutHistory = data.history || [];
            // Strip legacy rpe from history sets (RPE feature removed)
            workoutHistory.forEach(w => {
                if (w.exercises) w.exercises.forEach(ex => {
                    if (ex.sets) ex.sets.forEach(s => { if ('rpe' in s) delete s.rpe; });
                });
            });
            // Use EXERCISES as the source of truth for library (bilingual)
            // Keep any custom if stored, but default to EXERCISES
            exerciseLibrary = (data.library && data.library.length) ? data.library : EXERCISES.map(e => ({name: e.name, category: e.muscle_group}));
            routines = data.routines || [];
            lastPerformed = data.lastPerformed || {};
            lastWorkoutSetName = data.lastWorkoutSetName || null;  // restore remembered training set for auto-continue ("接埋")
            // Smarter restore: only restore currentWorkout from storage if it's a valid recent unfinished workout with real volume.
            // This prevents stale/old sessions from being treated as active on fresh loads.
            if (data.currentWorkout && data.currentWorkout.exercises) {
                if (isValidUnfinishedWorkout(data.currentWorkout)) {
                    currentWorkout = data.currentWorkout;
                    // Strip any legacy rpe from sets (RPE feature removed)
                    currentWorkout.exercises.forEach(ex => {
                        if (ex.sets) ex.sets.forEach(s => { if ('rpe' in s) delete s.rpe; });
                    });
                } else {
                    currentWorkout = null;
                    // Clean the stale entry from storage immediately on load
                    saveWorkoutData();
                }
            }
            // Strip legacy rpe from lastPerformed sets
            Object.keys(lastPerformed).forEach(name => {
                const p = lastPerformed[name];
                if (p && p.sets) p.sets.forEach(s => { if ('rpe' in s) delete s.rpe; });
            });
        } else {
            // Initialize with unified bilingual display names from EXERCISES
            exerciseLibrary = EXERCISES.map(e => ({name: e.name, category: e.muscle_group}));
            workoutHistory = [];
            routines = [];
            lastPerformed = {};
        }
    } catch (e) {
        exerciseLibrary = EXERCISES.map(e => ({name: e.name, category: e.muscle_group}));
        workoutHistory = [];
    }
}

// Other small utils can be added here later
// seedSampleDataIfNeeded disabled during A refactor (no-op for guest demo data).

function calculateSetVolume(set) {
    const w = parseFloat(set.weight) || 0;
    const r = parseInt(set.reps) || 0;
    return w * r;
}

function calculateWorkoutVolume(workout) {
    let total = 0;
    (workout.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
            total += calculateSetVolume(set);
        });
    });
    return Math.round(total);
}

function estimate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    return Math.round(w * (1 + 0.0333 * r) * 10) / 10;
}

function getAllExercisesFromHistory() {
    const set = new Set();
    workoutHistory.forEach(w => w.exercises.forEach(ex => set.add(ex.name)));
    return Array.from(set).sort();
}