// js/api.js
// API and backend sync layer extracted as part of architecture refactor (Option A)

async function callAppsScript(action, data = {}, options = {}) {
    try {
        if (action === "getLogs" && currentUser) {
            const url = new URL(APPS_SCRIPT_URL);
            url.searchParams.append("action", "getLogs");
            url.searchParams.append("user", currentUser);
            const res = await fetch(url, options.keepalive ? { keepalive: true } : undefined);
            return await res.json();
        }
        if (action === "getWorkoutSets" && currentUser) {
            // Use query GET for getWorkoutSets (consistent with getLogs; backend should handle ?action=getWorkoutSets&user=xxx)
            const url = new URL(APPS_SCRIPT_URL);
            url.searchParams.append("action", "getWorkoutSets");
            url.searchParams.append("user", currentUser);
            const res = await fetch(url, options.keepalive ? { keepalive: true } : undefined);
            return await res.json();
        }
        const fetchOpts = {
            method: "POST",
            body: JSON.stringify({ action, ...data })
        };
        if (options.keepalive) fetchOpts.keepalive = true;
        const response = await fetch(APPS_SCRIPT_URL, fetchOpts);
        return await response.json();
    } catch (error) {
        console.error('[callAppsScript] POST error:', error);
        // Do not hard alert (was disruptive on mobile during save); return error object for graceful handling in callers (finish/edit/delete)
        return { status: "error", message: "連接 Apps Script 失敗" };
    }
}

// Background sync helpers (extracted)
async function backgroundSyncNewSet(exerciseName, setObj, sessionId) {
    if (!currentUser || !currentWorkout) return;

    activeBackgroundSyncs = Math.max(0, activeBackgroundSyncs) + 1;
    updateSyncStatus('syncing');

    // Ensure we have a client ID for tracking synced log ID
    if (!setObj._clientLogId) {
        setObj._clientLogId = 'inc_' + Date.now() + Math.random().toString(36).slice(2, 10);
    }

    const logPayload = {
        id: setObj._clientLogId,
        session_id: sessionId,
        date: (currentWorkout && currentWorkout.date) || getTodayStr(),
        exercise: exerciseName,
        weight: setObj.weight || 0,
        reps: setObj.reps || 0,
        notes: setObj.notes || '',
        volume: setObj.volume || ((setObj.weight || 0) * (setObj.reps || 0))
    };

    // Fire-and-forget: non-blocking, local UI already updated
    callAppsScript("addLog", { user: currentUser, log: logPayload })
        .then(res => {
            activeBackgroundSyncs = Math.max(0, activeBackgroundSyncs - 1);
            if (res && res.status === 'success') {
                setObj.id = logPayload.id;           // store backend log ID for future delete
                setObj._clientLogId = logPayload.id; // for compatibility with deleteSet
                setObj._lastSynced = Date.now(); // optional marker
                if (activeBackgroundSyncs === 0) {
                    updateSyncStatus('synced');
                }
            } else {
                if (activeBackgroundSyncs === 0) updateSyncStatus('error');
            }
        })
        .catch(err => {
            activeBackgroundSyncs = Math.max(0, activeBackgroundSyncs - 1);
            if (activeBackgroundSyncs === 0) updateSyncStatus('error');
        });
}

async function backgroundDeleteLog(logId) {
    if (!currentUser || !logId) return;

    globalPendingSyncs = Math.max(0, globalPendingSyncs) + 1; // reuse for status
    updateGlobalSyncIndicator('syncing');

    callAppsScript("deleteLog", { user: currentUser, logId: logId })
        .then(res => {
            globalPendingSyncs = Math.max(0, globalPendingSyncs - 1);
            if (res && res.status === 'success') {
                if (globalPendingSyncs === 0) updateGlobalSyncIndicator('synced');
            } else {
                if (globalPendingSyncs === 0) updateGlobalSyncIndicator('error');
            }
        })
        .catch(err => {
            globalPendingSyncs = Math.max(0, globalPendingSyncs - 1);
            if (globalPendingSyncs === 0) updateGlobalSyncIndicator('error');
        });
}

function updateSyncStatus(status) {
    const el = document.getElementById('sync-status');
    if (el) {
        if (status === 'syncing') {
            el.innerHTML = '↻ 同步中...';
            el.style.color = '#fbbf24';
        } else if (status === 'synced') {
            el.innerHTML = '✓ 已備份';
            el.style.color = '#4ade80';
            setTimeout(() => {
                if (el && el.innerHTML.includes('已備份')) el.innerHTML = '';
            }, 2500);
        } else if (status === 'error') {
            el.innerHTML = '⚠ 稍後同步';
            el.style.color = '#f87171';
            setTimeout(() => {
                if (el && el.innerHTML.includes('稍後')) el.innerHTML = '';
            }, 4500);
        } else {
            el.innerHTML = '';
        }
    }

    // Global top-right indicator (A. requirement)
    updateGlobalSyncIndicator(status);
}

function updateGlobalSyncIndicator(status) {
    const container = document.getElementById('global-sync-indicator');
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    if (!container || !icon) return;

    // Manage pending count for multiple concurrent ops
    if (status === 'syncing') {
        globalPendingSyncs = Math.max(0, globalPendingSyncs) + 1;
    } else if (status === 'synced' || status === 'error') {
        globalPendingSyncs = Math.max(0, globalPendingSyncs) - 1;
    }

    container.classList.remove('hidden', 'syncing', 'success', 'error');
    container.classList.add('flex');
    text.classList.add('hidden');

    if (globalPendingSyncs > 0 || status === 'syncing') {
        container.classList.add('syncing');
        icon.className = 'fa-solid fa-sync fa-spin text-[9px] sm:text-[10px]';
        text.classList.remove('hidden');
        text.textContent = '同步中';
        container.title = '正在上傳數據到 Google...';
    } else if (status === 'synced' || globalPendingSyncs === 0) {
        container.classList.add('success');
        icon.className = 'fa-solid fa-check text-[9px] sm:text-[10px]';
        text.classList.remove('hidden');
        text.textContent = '已同步';
        container.title = '數據已同步到雲端';
        setTimeout(() => {
            if (container && container.classList.contains('success')) {
                container.classList.remove('flex', 'success');
                container.classList.add('hidden');
            }
        }, 2000);
    } else if (status === 'error') {
        container.classList.add('error');
        icon.className = 'fa-solid fa-exclamation-triangle text-[9px] sm:text-[10px]';
        text.classList.remove('hidden');
        text.textContent = '同步失敗';
        container.title = '同步失敗，點擊重試';
        container.onclick = () => {
            // simple retry hook - caller should handle actual retry
            container.onclick = null;
            updateGlobalSyncIndicator('syncing');
        };
    }
}

// More API helpers can be added here (loadUserLogs, etc.) in subsequent steps.

// Workout Sets data loading (moved from main for A refactor)
async function loadWorkoutSets(forceRefresh = false) {
    if (!currentUser) {
        workoutSets = [];
        if (typeof renderWorkoutSetsBar === 'function') renderWorkoutSetsBar();
        return;
    }

    // Only load *user-created custom* Workout Sets from the backend.
    // The 3 fixed Training Days (訓練日 1/2/3) are frontend-only (from TRAINING_DAYS).
    // They are always prepended in renderWorkoutSetsBar() and never stored in the sheet.

    const now = Date.now();

    if (!forceRefresh && workoutSetsCache && (now - workoutSetsCacheTimestamp < WORKOUT_SETS_CACHE_TTL)) {
        workoutSets = JSON.parse(JSON.stringify(workoutSetsCache));
        if (typeof renderWorkoutSetsBar === 'function') renderWorkoutSetsBar();
        return;
    }

    try {
        const res = await callAppsScript("getWorkoutSets", { user: currentUser });
        const backendSets = (res && res.sets) ? res.sets : (Array.isArray(res) ? res : []);

        // workoutSets now contains ONLY what the user has explicitly saved as custom Sets.
        workoutSets = backendSets || [];

        workoutSetsCache = JSON.parse(JSON.stringify(workoutSets));
        workoutSetsCacheTimestamp = now;

        if (typeof renderWorkoutSetsBar === 'function') renderWorkoutSetsBar();
    } catch (e) {
        console.warn('loadWorkoutSets fetch failed:', e);
        workoutSets = workoutSets || [];
        if (typeof renderWorkoutSetsBar === 'function') renderWorkoutSetsBar();
    }

    // Refresh exercise suggestions after custom sets are loaded
    if (typeof updateExerciseSuggestions === 'function') {
        try { updateExerciseSuggestions(''); } catch (_) {}
    }
}