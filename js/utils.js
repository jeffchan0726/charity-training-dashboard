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

function getLastBodyWeightKg() {
    const v = parseFloat(lastBodyWeightKg);
    return v > 0 ? v : 0;
}

function rememberBodyWeightKg(value) {
    const bw = parseFloat(value) || 0;
    if (bw > 0) {
        lastBodyWeightKg = bw;
        try { saveWorkoutData(); } catch (_) {}
    }
    return bw;
}

function isValidUnfinishedWorkout(workout) {
    if (!workout || !workout.exercises || workout.exercises.length === 0) return false;

    let hasRealVolume = false;
    for (const ex of workout.exercises) {
        for (const s of (ex.sets || [])) {
            const vol = typeof calculateSetVolume === 'function'
                ? calculateSetVolume(s, ex.name)
                : ((s.weight || 0) * (s.reps || 0));
            if (vol > 0) {
                hasRealVolume = true;
                break;
            }
            if ((s.duration || 0) > 0 && (s.reps || 0) > 0) {
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
            lastBodyWeightKg: lastBodyWeightKg || null,
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
            if (typeof refreshWorkoutTotals === 'function') {
                workoutHistory.forEach(w => refreshWorkoutTotals(w));
            }
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
            lastBodyWeightKg = data.lastBodyWeightKg != null ? parseFloat(data.lastBodyWeightKg) : null;
            // Smarter restore: only restore currentWorkout from storage if it's a valid recent unfinished workout with real volume.
            // This prevents stale/old sessions from being treated as active on fresh loads.
            if (data.currentWorkout && data.currentWorkout.exercises) {
                if (isValidUnfinishedWorkout(data.currentWorkout)) {
                    currentWorkout = data.currentWorkout;
                    // Strip any legacy rpe from sets (RPE feature removed)
                    currentWorkout.exercises.forEach(ex => {
                        if (ex.sets) ex.sets.forEach(s => { if ('rpe' in s) delete s.rpe; });
                    });
                    if (currentWorkout.isContinuedFromToday && typeof markWorkoutSetsAsSyncedFromCloud === 'function') {
                        markWorkoutSetsAsSyncedFromCloud(currentWorkout);
                    }
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

function calculateTreadmillDistanceKm(set) {
    if (!set) return 0;
    const speed = parseFloat(set.speed) || 0;
    const mins = parseInt(set.duration) || 0;
    if (speed <= 0 || mins <= 0) return 0;
    return Math.round(speed * (mins / 60) * 100) / 100;
}

function isTreadmillSet(set, exName) {
    if (typeof isTreadmillExercise === 'function' && exName && isTreadmillExercise(exName)) return true;
    return !!(set && set.speed != null && set.incline != null && parseFloat(set.speed) > 0);
}

function calculateSetVolume(set, exName) {
    if (!set) return 0;
    if (isTreadmillSet(set, exName)) {
        return calculateTreadmillDistanceKm(set);
    }
    const bw = parseFloat(set.body_weight) || 0;
    const r = parseInt(set.reps) || 0;
    const d = parseInt(set.duration) || 0;
    const isBw = typeof isBodyweightExercise === 'function' && exName && isBodyweightExercise(exName);
    if (isBw && bw > 0 && r > 0) {
        return Math.round(bw * r);
    }
    if (set.duration != null && d > 0 && r > 0) return 0;
    const w = parseFloat(set.weight) || 0;
    return w * r;
}

function calculateWorkoutTotals(workout) {
    let weightKg = 0;
    let distanceKm = 0;
    let totalSets = 0;
    (workout?.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
            totalSets++;
            if (isTreadmillSet(set, ex.name)) {
                const km = calculateTreadmillDistanceKm(set);
                set.volume = km;
                distanceKm += km;
            } else {
                weightKg += calculateSetVolume(set, ex.name);
            }
        });
    });
    return {
        weightKg: Math.round(weightKg),
        distanceKm: Math.round(distanceKm * 100) / 100,
        totalSets
    };
}

function formatWorkoutVolumeDisplay(workout) {
    const t = calculateWorkoutTotals(workout);
    if (t.distanceKm > 0 && t.weightKg === 0) {
        return { value: t.distanceKm.toFixed(2), unit: 'km', sub: `${t.distanceKm.toFixed(2)} 公里` };
    }
    if (t.distanceKm > 0 && t.weightKg > 0) {
        return {
            value: t.weightKg.toLocaleString(),
            unit: 'kg',
            sub: `${t.weightKg.toLocaleString()} kg + ${t.distanceKm.toFixed(2)} km`
        };
    }
    return {
        value: t.weightKg.toLocaleString(),
        unit: 'kg',
        sub: (t.weightKg / 1000).toFixed(2) + ' t'
    };
}

function getLifetimeWeightKg() {
    let total = 0;
    (workoutHistory || []).forEach(w => {
        total += calculateWorkoutTotals(w).weightKg;
    });
    return total;
}

function getLifetimeTonnes() {
    return getLifetimeWeightKg() / 1000;
}

function formatSetDisplay(exName, set) {
    if (!set) return '';
    if (typeof isTreadmillExercise === 'function' && isTreadmillExercise(exName)) {
        const d = parseInt(set.duration) || 0;
        const incline = parseFloat(set.incline) || 0;
        const speed = parseFloat(set.speed) || 0;
        const km = calculateTreadmillDistanceKm(set);
        return `${d}分 · 坡度${incline}% · ${speed} km/h · ${km}km`;
    }
    if (typeof isHoldExercise === 'function' && isHoldExercise(exName)) {
        const d = parseInt(set.duration) || 0;
        const r = parseInt(set.reps) || 0;
        const bw = parseFloat(set.body_weight) || 0;
        if (bw > 0) return `${bw}kg 體重 · ${d}秒 × ${r}次`;
        return `${d}秒 × ${r}次`;
    }
    if (typeof isBodyweightExercise === 'function' && isBodyweightExercise(exName)) {
        const bw = parseFloat(set.body_weight) || 0;
        const r = parseInt(set.reps) || 0;
        return `${bw}kg 體重 × ${r}次`;
    }
    return `${set.weight || 0}kg × ${set.reps || 0}`;
}

function createDefaultSetForExercise(exName) {
    if (typeof isTreadmillExercise === 'function' && isTreadmillExercise(exName)) {
        return { duration: 0, incline: 0, speed: 0, weight: 0, reps: 0, notes: '', volume: 0 };
    }
    if (typeof isHoldExercise === 'function' && isHoldExercise(exName)) {
        const base = { duration: 0, reps: 1, weight: 0, notes: '', volume: 0 };
        if (typeof isBodyweightExercise === 'function' && isBodyweightExercise(exName)) {
            base.body_weight = getLastBodyWeightKg();
        }
        return base;
    }
    if (typeof isBodyweightExercise === 'function' && isBodyweightExercise(exName)) {
        const bw = getLastBodyWeightKg();
        return { weight: 0, reps: 0, body_weight: bw, notes: '', volume: 0 };
    }
    return { weight: 0, reps: 0, notes: '', volume: 0 };
}

function calculateWorkoutVolume(workout) {
    return calculateWorkoutTotals(workout).weightKg;
}

function calculateWorkoutDistanceKm(workout) {
    return calculateWorkoutTotals(workout).distanceKm;
}

function rebuildSetFromLogRow(row, exName) {
    const set = {
        weight: parseFloat(row.weight) || 0,
        body_weight: row.body_weight != null ? parseFloat(row.body_weight) : 0,
        reps: parseInt(row.reps) || 0,
        duration: row.duration != null ? parseInt(row.duration) : 0,
        incline: row.incline != null ? parseFloat(row.incline) : 0,
        speed: row.speed != null ? parseFloat(row.speed) : 0,
        notes: row.notes || '',
        id: row.id || undefined
    };
    set.volume = calculateSetVolume(set, exName);
    return set;
}

function normalizeHistorySetForCompare(set) {
    return {
        weight: parseFloat(set.weight) || 0,
        body_weight: set.body_weight != null ? parseFloat(set.body_weight) || 0 : 0,
        reps: parseInt(set.reps) || 0,
        duration: parseInt(set.duration) || 0,
        incline: parseFloat(set.incline) || 0,
        speed: parseFloat(set.speed) || 0,
        notes: (set.notes || '').trim()
    };
}

function normalizeHistoryWorkoutForCompare(workout) {
    return {
        notes: (workout.notes || '').trim(),
        exercises: (workout.exercises || []).map(ex => ({
            name: (ex.name || '').trim(),
            sets: (ex.sets || []).map(normalizeHistorySetForCompare)
        }))
    };
}

function isHistoryWorkoutUnchanged(beforeWorkout, afterWorkout) {
    if (!beforeWorkout || !afterWorkout) return false;
    const before = JSON.stringify(normalizeHistoryWorkoutForCompare(beforeWorkout));
    const after = JSON.stringify(normalizeHistoryWorkoutForCompare(afterWorkout));
    return before === after;
}

function getSetCloudLogId(set) {
    return set && (set.id || set._clientLogId) ? String(set.id || set._clientLogId) : null;
}

function workoutAllSetsHaveCloudIds(workout) {
    for (const ex of (workout?.exercises || [])) {
        for (const set of (ex.sets || [])) {
            if (!getSetCloudLogId(set)) return false;
        }
    }
    return true;
}

function groupHistorySetsByExercise(workout) {
    const map = {};
    (workout?.exercises || []).forEach(ex => {
        const name = (ex.name || '').trim();
        if (!map[name]) map[name] = [];
        (ex.sets || []).forEach((set, idx) => {
            map[name].push({
                id: getSetCloudLogId(set),
                raw: set,
                norm: normalizeHistorySetForCompare(set),
                idx
            });
        });
    });
    return map;
}

/**
 * Diff two history workout snapshots for incremental cloud sync.
 * Returns { updates, deletes, adds, hasChanges, requiresFullSync }
 */
function buildHistoryEditDelta(beforeWorkout, afterWorkout) {
    const updates = [];
    const deletes = [];
    const adds = [];
    let requiresFullSync = false;

    const beforeByEx = groupHistorySetsByExercise(beforeWorkout);
    const afterByEx = groupHistorySetsByExercise(afterWorkout);
    const allExercises = new Set([
        ...Object.keys(beforeByEx),
        ...Object.keys(afterByEx)
    ]);

    allExercises.forEach(exName => {
        const bList = beforeByEx[exName] || [];
        const aList = afterByEx[exName] || [];

        if (bList.length > 0 && aList.length === 0) {
            bList.forEach(b => {
                if (b.id) deletes.push(b.id);
                else requiresFullSync = true;
            });
            return;
        }

        if (bList.length === 0 && aList.length > 0) {
            aList.forEach(a => adds.push({ exercise: exName, raw: a.raw }));
            return;
        }

        const bById = new Map();
        bList.forEach(b => {
            if (b.id) bById.set(b.id, b);
        });
        const matchedBeforeIds = new Set();

        aList.forEach(a => {
            if (a.id && bById.has(a.id)) {
                matchedBeforeIds.add(a.id);
                const b = bById.get(a.id);
                if (JSON.stringify(b.norm) !== JSON.stringify(a.norm)) {
                    updates.push({ id: a.id, exercise: exName, raw: a.raw });
                }
                return;
            }
            adds.push({ exercise: exName, raw: a.raw });
        });

        bList.forEach(b => {
            if (b.id) {
                if (!matchedBeforeIds.has(b.id)) deletes.push(b.id);
            } else {
                requiresFullSync = true;
            }
        });
    });

    const notesChanged = (beforeWorkout?.notes || '').trim() !== (afterWorkout?.notes || '').trim();

    return {
        updates,
        deletes,
        adds,
        notesChanged,
        requiresFullSync,
        hasChanges: updates.length > 0 || deletes.length > 0 || adds.length > 0 || notesChanged
    };
}

function buildSetLogPayload(set, exName, meta = {}) {
    const payload = { ...meta };
    payload.weight = parseFloat(set.weight) || 0;
    payload.body_weight = set.body_weight != null ? parseFloat(set.body_weight) || 0 : 0;
    payload.reps = parseInt(set.reps) || 0;
    payload.duration = parseInt(set.duration) || 0;
    payload.incline = parseFloat(set.incline) || 0;
    payload.speed = parseFloat(set.speed) || 0;
    payload.notes = set.notes || '';
    if (typeof calculateSetVolume === 'function') {
        payload.volume = calculateSetVolume(set, exName);
    }
    return payload;
}

function markSetSyncedSnapshot(set) {
    if (!set) return;
    set._syncSnapshot = normalizeHistorySetForCompare(set);
    set._syncDirty = false;
    delete set._syncInFlight;
}

function isSetCloudSynced(set) {
    return !!(set && set._lastSynced && getSetCloudLogId(set) && !set._syncInFlight);
}

function isSetSyncDirty(set, exName) {
    if (!set || !set._lastSynced) return false;
    if (set._syncDirty) return true;
    if (!set._syncSnapshot) return true;
    return JSON.stringify(normalizeHistorySetForCompare(set)) !== JSON.stringify(set._syncSnapshot);
}

function createContinueWorkoutSnapshot(workout) {
    if (!workout) return null;
    return {
        date: workout.date,
        notes: workout.notes || '',
        exercises: JSON.parse(JSON.stringify(workout.exercises || []))
    };
}

/**
 * 計算雲端仍需推送的變更（新增 / 修改 / 刪除），排除已成功背景同步的部分
 */
function buildWorkoutCloudDelta(workout, beforeSnapshot = null) {
    if (beforeSnapshot) {
        const raw = buildHistoryEditDelta(beforeSnapshot, workout);
        if (raw.requiresFullSync) {
            return {
                adds: [],
                updates: [],
                deletes: [],
                hasChanges: false,
                requiresFullSync: true,
                needsFullPush: true
            };
        }

        const adds = raw.adds.filter(a => !isSetCloudSynced(a.raw));
        const updates = raw.updates.filter(u =>
            isSetSyncDirty(u.raw, u.exercise) || !isSetCloudSynced(u.raw)
        );
        const deletes = raw.deletes.filter(id => {
            if (typeof sessionCloudDeletedIds !== 'undefined' && sessionCloudDeletedIds.has(id)) {
                return false;
            }
            return true;
        });

        return {
            adds,
            updates,
            deletes,
            hasChanges: adds.length > 0 || updates.length > 0 || deletes.length > 0,
            requiresFullSync: false,
            needsFullPush: false
        };
    }

    const pending = collectPendingWorkoutSyncOps(workout);
    return {
        adds: pending.adds.map(a => ({ exercise: a.exercise, raw: a.set })),
        updates: pending.updates.map(u => ({ id: u.id, exercise: u.exercise, raw: u.set })),
        deletes: [],
        hasChanges: !pending.allSynced && pending.totalSets > 0,
        requiresFullSync: false,
        needsFullPush: pending.needsFullPush
    };
}

/**
 * 掃描進行中訓練，找出未同步或已修改的組數（供完成訓練 / 切換動作時增量推送）
 */
function collectPendingWorkoutSyncOps(workout) {
    const adds = [];
    const updates = [];
    let syncedCount = 0;
    let totalSets = 0;

    (workout?.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
            totalSets++;
            if (isSetCloudSynced(set)) {
                syncedCount++;
                if (isSetSyncDirty(set, ex.name)) {
                    updates.push({
                        exercise: ex.name,
                        set,
                        id: getSetCloudLogId(set)
                    });
                }
            } else {
                adds.push({ exercise: ex.name, set });
            }
        });
    });

    return {
        adds,
        updates,
        syncedCount,
        totalSets,
        pendingCount: adds.length,
        hasDirty: updates.length > 0,
        allSynced: adds.length === 0 && updates.length === 0,
        needsFullPush: syncedCount === 0 && totalSets > 0
    };
}

function cloneWorkoutSet(set, exName) {
    const cloned = {
        weight: set.weight || 0,
        body_weight: set.body_weight != null ? parseFloat(set.body_weight) : 0,
        reps: set.reps != null ? parseInt(set.reps) : 0,
        duration: set.duration != null ? parseInt(set.duration) : 0,
        incline: set.incline != null ? parseFloat(set.incline) : 0,
        speed: set.speed != null ? parseFloat(set.speed) : 0,
        notes: set.notes || '',
        volume: 0,
        id: set.id,
        _clientLogId: set._clientLogId,
        _lastSynced: set._lastSynced,
        _syncSnapshot: set._syncSnapshot
    };
    cloned.volume = calculateSetVolume(cloned, exName);
    return cloned;
}

function countWorkoutSets(workout) {
    return (workout?.exercises || []).reduce((sum, ex) => sum + ((ex.sets || []).length), 0);
}

/** 從歷史載入繼續訓練時，已有 cloud id 的組視為已同步，避免完成時全量重推 */
function markWorkoutSetsAsSyncedFromCloud(workout) {
    (workout?.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
            if (!getSetCloudLogId(set)) return;
            if (!set._lastSynced) set._lastSynced = Date.now();
            if (typeof markSetSyncedSnapshot === 'function') markSetSyncedSnapshot(set);
        });
    });
}

/** 繼續訓練完成/放棄：合併取代今日歷史，避免重複卡片 */
function applyContinueWorkoutFinishToLocalHistory(workout) {
    if (!workout) return;
    const today = normalizeDateToLocal(workout.date);
    const record = JSON.parse(JSON.stringify(workout));
    delete record.isContinuedFromToday;
    delete record._originalSessionIds;
    delete record._continueSnapshot;
    delete record.startTime;

    workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== today);
    if (typeof refreshWorkoutTotals === 'function') refreshWorkoutTotals(record);
    workoutHistory.unshift(record);
    return record;
}

function refreshWorkoutTotals(workout) {
    const t = calculateWorkoutTotals(workout || { exercises: [] });
    if (workout) {
        workout.totalVolume = t.weightKg;
        workout.totalDistanceKm = t.distanceKm;
    }
    return t;
}

/** 日曆熱力圖用：kg 與 km 唔可以直加，用可比分數 */
function getWorkoutIntensityScore(workout) {
    const t = calculateWorkoutTotals(workout || { exercises: [] });
    return t.weightKg + t.distanceKm * 50;
}

function getSetCategoryVolume(exName, set) {
    if (isTreadmillSet(set, exName)) {
        return { weightKg: 0, distanceKm: calculateTreadmillDistanceKm(set) };
    }
    return { weightKg: calculateSetVolume(set, exName), distanceKm: 0 };
}

function estimate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    return Math.round(w * (1 + 0.0333 * r) * 10) / 10;
}

function getBestForExercise(exerciseName, historyArray = workoutHistory) {
    let bestWeight = 0;
    let bestE1RM = 0;
    let bestReps = 0;
    let bestHold = 0;
    let bestDistance = 0;
    let bestSpeed = 0;
    let bestBwVolume = 0;

    (historyArray || []).forEach(w => {
        (w.exercises || []).forEach(ex => {
            if (ex.name !== exerciseName) return;
            (ex.sets || []).forEach(s => {
                const recordType = typeof getExerciseRecordType === 'function'
                    ? getExerciseRecordType(exerciseName) : 'weight';
                if (recordType === 'treadmill') {
                    const km = calculateTreadmillDistanceKm(s);
                    const speed = parseFloat(s.speed) || 0;
                    if (km > bestDistance) bestDistance = km;
                    if (speed > bestSpeed) bestSpeed = speed;
                } else if (recordType === 'time_reps') {
                    const dur = parseInt(s.duration) || 0;
                    if (dur > bestHold) bestHold = dur;
                } else if (recordType === 'bodyweight') {
                    const reps = parseInt(s.reps) || 0;
                    const vol = calculateSetVolume(s, exerciseName);
                    if (reps > bestReps) bestReps = reps;
                    if (vol > bestBwVolume) bestBwVolume = vol;
                } else {
                    if ((s.weight || 0) > bestWeight) bestWeight = s.weight;
                    const e = estimate1RM(s.weight, s.reps);
                    if (e > bestE1RM) bestE1RM = e;
                }
            });
        });
    });

    return { bestWeight, bestE1RM, bestReps, bestHold, bestDistance, bestSpeed, bestBwVolume };
}

function detectWorkoutPRs(workout, priorHistory = workoutHistory) {
    const newPRs = [];
    if (!workout || !workout.exercises) return newPRs;

    workout.exercises.forEach(ex => {
        const recordType = typeof getExerciseRecordType === 'function'
            ? getExerciseRecordType(ex.name) : 'weight';
        const prev = getBestForExercise(ex.name, priorHistory);

        (ex.sets || []).forEach(set => {
            if (recordType === 'treadmill') {
                const km = calculateTreadmillDistanceKm(set);
                const speed = parseFloat(set.speed) || 0;
                if (km > prev.bestDistance) {
                    newPRs.push(`${ex.name}：單組最遠 ${km}km`);
                    prev.bestDistance = km;
                }
                if (speed > prev.bestSpeed) {
                    newPRs.push(`${ex.name}：最高速度 ${speed} km/h`);
                    prev.bestSpeed = speed;
                }
            } else if (recordType === 'time_reps') {
                const dur = parseInt(set.duration) || 0;
                if (dur > prev.bestHold) {
                    newPRs.push(`${ex.name}：最長支撐 ${dur}秒`);
                    prev.bestHold = dur;
                }
            } else if (recordType === 'bodyweight') {
                const reps = parseInt(set.reps) || 0;
                const vol = calculateSetVolume(set, ex.name);
                if (reps > prev.bestReps) {
                    newPRs.push(`${ex.name}：最多 ${reps} 次`);
                    prev.bestReps = reps;
                }
                if (vol > prev.bestBwVolume) {
                    newPRs.push(`${ex.name}：訓練量 ${vol}kg（體重×次數）`);
                    prev.bestBwVolume = vol;
                }
            } else {
                const currentE1RM = estimate1RM(set.weight, set.reps);
                if (set.weight > prev.bestWeight) {
                    newPRs.push(`${ex.name}：新最大重量 ${set.weight}kg`);
                    prev.bestWeight = set.weight;
                }
                if (currentE1RM > prev.bestE1RM) {
                    newPRs.push(`${ex.name}：新預估1RM ${currentE1RM}kg（${set.reps} 次）`);
                    prev.bestE1RM = currentE1RM;
                }
            }
        });
    });

    return [...new Set(newPRs)];
}

function getAllExercisesFromHistory() {
    const set = new Set();
    workoutHistory.forEach(w => w.exercises.forEach(ex => set.add(ex.name)));
    return Array.from(set).sort();
}

function isServerSyncing() {
    return globalPendingSyncs > 0
        || activeBackgroundSyncs > 0
        || isFinishingWorkout
        || isSavingHistory
        || isDeletingHistory;
}

function guardServerSyncing(message) {
    if (!isServerSyncing()) return false;
    const msg = message || '同步中，請稍候...';
    if (typeof showToast === 'function') showToast(msg, 2800);
    return true;
}

function updateInteractionLock() {
    const locked = isServerSyncing();
    document.body.classList.toggle('server-syncing-lock', locked);

    const startBtn = document.getElementById('start-training-btn');
    if (startBtn) {
        startBtn.disabled = locked;
        startBtn.classList.toggle('opacity-55', locked);
        startBtn.classList.toggle('cursor-not-allowed', locked);
    }
}