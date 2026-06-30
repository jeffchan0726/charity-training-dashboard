// js/api.js
// API and backend sync layer extracted as part of architecture refactor (Option A)
// APPS_SCRIPT_URL is set in index.html (global var + window.APPS_SCRIPT_URL)

function getAppsScriptUrl() {
    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL) return APPS_SCRIPT_URL;
    if (typeof window !== 'undefined' && window.APPS_SCRIPT_URL) return window.APPS_SCRIPT_URL;
    return '';
}

function isBackendSuccess(res) {
    if (res == null) return false;
    if (Array.isArray(res)) return res.length > 0 && isBackendSuccess(res[0]);
    if (typeof res !== 'object') return false;

    const s = String(res.status || '').toLowerCase().trim();
    if (s === 'success' || s === 'ok') return true;
    if (s === 'error' || s === 'failed' || s === 'failure') return false;

    // GAS replaceSession / addWorkout 有時只回傳 session_id + added/deleted
    if (res.session_id != null && (res.added != null || res.deleted != null)) return true;
    if (res.added != null && res.added >= 0 && !s) return true;

    return false;
}

function parseAppsScriptResponse(raw) {
    if (raw == null) return { status: 'error', message: '空回應' };
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (_) { return { status: 'error', message: raw }; }
    }
    return raw;
}

async function callAppsScript(action, data = {}, options = {}) {
    try {
        if (action === "getLogs" && currentUser) {
            const url = new URL(getAppsScriptUrl());
            url.searchParams.append("action", "getLogs");
            url.searchParams.append("user", currentUser);
            const res = await fetch(url, options.keepalive ? { keepalive: true } : undefined);
            return parseAppsScriptResponse(await res.json());
        }
        if (action === "getWorkoutSets" && currentUser) {
            // Use query GET for getWorkoutSets (consistent with getLogs; backend should handle ?action=getWorkoutSets&user=xxx)
            const url = new URL(getAppsScriptUrl());
            url.searchParams.append("action", "getWorkoutSets");
            url.searchParams.append("user", currentUser);
            const res = await fetch(url, options.keepalive ? { keepalive: true } : undefined);
            return parseAppsScriptResponse(await res.json());
        }
        const scriptUrl = getAppsScriptUrl();
        if (!scriptUrl) {
            return { status: 'error', message: 'APPS_SCRIPT_URL 未設定' };
        }

        const payload = JSON.stringify({ action, ...data });
        // 必須用 text/plain，避免瀏覽器 CORS preflight（application/json 會令 GAS POST 失敗）
        const fetchOpts = {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload
        };
        if (options.keepalive) fetchOpts.keepalive = true;
        const response = await fetch(scriptUrl, fetchOpts);
        const text = await response.text();
        let parsed = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch (parseErr) {
            console.warn('[callAppsScript] JSON parse failed:', text ? text.slice(0, 300) : '(empty)');
            return { status: 'error', message: '後端回應格式錯誤' };
        }
        const result = parseAppsScriptResponse(parsed);
        // 部份 GAS 部署在寫入成功時回傳空 body + HTTP 200
        if ((!parsed || (parsed.status == null && parsed.message == null)) && response.ok) {
            return { status: 'success', message: 'HTTP OK (empty body)' };
        }
        return result;
    } catch (error) {
        console.error('[callAppsScript] POST error:', action, error);
        const detail = (error && error.message) ? error.message : String(error);
        return { status: 'error', message: `連接 Apps Script 失敗：${detail}` };
    }
}

function workoutHasInFlightSetSync(workout) {
    return (workout?.exercises || []).some(ex =>
        (ex.sets || []).some(set => set._syncInFlight)
    );
}

function waitForActiveBackgroundSyncs(maxMs = 6000) {
    const start = Date.now();
    return new Promise(resolve => {
        const tick = () => {
            if (activeBackgroundSyncs <= 0 || Date.now() - start >= maxMs) {
                resolve();
                return;
            }
            setTimeout(tick, 80);
        };
        tick();
    });
}

function applySetSyncSuccess(setObj, logId) {
    setObj.id = logId;
    setObj._clientLogId = logId;
    setObj._lastSynced = Date.now();
    if (typeof markSetSyncedSnapshot === 'function') markSetSyncedSnapshot(setObj);
}

// Background sync helpers (extracted)
async function backgroundSyncNewSet(exerciseName, setObj, sessionId) {
    if (!currentUser || !currentWorkout) return;

    activeBackgroundSyncs = Math.max(0, activeBackgroundSyncs) + 1;
    setObj._syncInFlight = true;
    updateSyncStatus('syncing');

    if (!setObj._clientLogId) {
        setObj._clientLogId = 'inc_' + Date.now() + Math.random().toString(36).slice(2, 10);
    }

    const logPayload = typeof buildSetLogPayload === 'function'
        ? buildSetLogPayload(setObj, exerciseName, {
            id: setObj._clientLogId,
            session_id: sessionId,
            date: (currentWorkout && currentWorkout.date) || getTodayStr(),
            exercise: exerciseName
        })
        : {
            id: setObj._clientLogId,
            session_id: sessionId,
            date: (currentWorkout && currentWorkout.date) || getTodayStr(),
            exercise: exerciseName,
            weight: setObj.weight || 0,
            body_weight: setObj.body_weight != null ? parseFloat(setObj.body_weight) : 0,
            reps: setObj.reps || 0,
            duration: setObj.duration != null ? parseInt(setObj.duration) : 0,
            incline: setObj.incline != null ? parseFloat(setObj.incline) : 0,
            speed: setObj.speed != null ? parseFloat(setObj.speed) : 0,
            notes: setObj.notes || '',
            volume: setObj.volume != null ? setObj.volume : calculateSetVolume(setObj, exerciseName)
        };

    const finishBackgroundSync = (outcome) => {
        activeBackgroundSyncs = Math.max(0, activeBackgroundSyncs - 1);
        delete setObj._syncInFlight;
        if (activeBackgroundSyncs === 0) updateSyncStatus(outcome);
        if (typeof updateInteractionLock === 'function') updateInteractionLock();
    };

    const syncTimeout = setTimeout(() => {
        if (setObj._syncInFlight) finishBackgroundSync('error');
    }, 45000);

    callAppsScript('addLog', { user: currentUser, log: logPayload })
        .then(res => {
            clearTimeout(syncTimeout);
            if (isBackendSuccess(res)) {
                applySetSyncSuccess(setObj, logPayload.id);
                try { saveWorkoutData(); } catch (_) {}
                finishBackgroundSync('synced');
            } else {
                finishBackgroundSync('error');
            }
        })
        .catch(() => {
            clearTimeout(syncTimeout);
            finishBackgroundSync('error');
        });
}

/**
 * 只推送未同步 / 已修改的組數（updateLog / addLog / deleteLog）
 */
async function syncPendingWorkoutSets(workout, options = {}) {
    if (!currentUser || !workout) {
        return { status: 'skipped', message: 'no user or workout' };
    }

    const beforeSnap = workout._continueSnapshot || null;
    const delta = typeof buildWorkoutCloudDelta === 'function'
        ? buildWorkoutCloudDelta(workout, beforeSnap)
        : null;
    if (!delta || !delta.hasChanges) {
        return { status: 'success', incremental: true, added: 0, updated: 0, deleted: 0, skipped: true };
    }

    return syncWorkoutCloudDelta(delta, workout, options);
}

/**
 * 切換動作時：背景補同步未推送的組數（唔會 replaceSession 全量重寫）
 */
function flushWorkoutPendingCloudSync(workout) {
    if (!currentUser || !workout) return;

    (async () => {
        let syncOutcome = 'synced';
        try {
            await waitForActiveBackgroundSyncs();
            if (workoutHasInFlightSetSync(workout)) {
                await waitForActiveBackgroundSyncs(3000);
            }
            const beforeSnap = workout._continueSnapshot || null;
            const delta = typeof buildWorkoutCloudDelta === 'function'
                ? buildWorkoutCloudDelta(workout, beforeSnap)
                : null;
            if (!delta || !delta.hasChanges || delta.needsFullPush) return;

            updateGlobalSyncIndicator('syncing');
            const res = await syncPendingWorkoutSets(workout, { keepalive: true });
            if (isBackendSuccess(res)) updateGlobalSyncIndicator('synced');
            else {
                syncOutcome = 'error';
                updateGlobalSyncIndicator('error');
            }
        } catch (_) {
            syncOutcome = 'error';
            updateGlobalSyncIndicator('error');
        } finally {
            if (globalPendingSyncs > 0) forceReleaseGlobalSyncLock(syncOutcome);
        }
    })();
}

async function backgroundDeleteLog(logId) {
    if (!currentUser || !logId) return;

    updateGlobalSyncIndicator('syncing');
    try {
        const res = await callAppsScript('deleteLog', { user: currentUser, logId });
        if (isBackendSuccess(res)) {
            if (typeof sessionCloudDeletedIds !== 'undefined') sessionCloudDeletedIds.add(String(logId));
            updateGlobalSyncIndicator('synced');
        } else {
            updateGlobalSyncIndicator('error');
        }
    } catch (_) {
        updateGlobalSyncIndicator('error');
    }
}

/**
 * 統一增量雲端同步：deleteLog / updateLog / addLog
 */
async function syncWorkoutCloudDelta(delta, workout, options = {}) {
    if (!currentUser || !workout || !delta || !delta.hasChanges) {
        return { status: 'success', incremental: true, updated: 0, deleted: 0, added: 0, skipped: true };
    }

    const sessionId = String(workout.id || workout.session_id || workout.sessionId || Date.now());
    workout.id = sessionId;
    const dateStr = normalizeDateToLocal(workout.date);
    const syncOpts = { keepalive: true, ...options };
    const tasks = [];

    (delta.deletes || []).forEach(logId => {
        tasks.push(
            callAppsScript('deleteLog', { user: currentUser, logId }, syncOpts)
                .then(res => ({ kind: 'delete', logId, res }))
        );
    });

    (delta.updates || []).forEach(u => {
        const log = typeof buildSetLogPayload === 'function'
            ? buildSetLogPayload(u.raw, u.exercise, { id: u.id })
            : { id: u.id, exercise: u.exercise, ...u.raw };
        tasks.push(
            callAppsScript('updateLog', { user: currentUser, log }, syncOpts)
                .then(res => ({ kind: 'update', u, res }))
        );
    });

    (delta.adds || []).forEach(a => {
        const logId = getSetCloudLogId(a.raw) || ('live_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
        const log = typeof buildSetLogPayload === 'function'
            ? buildSetLogPayload(a.raw, a.exercise, {
                id: logId,
                session_id: sessionId,
                date: dateStr,
                exercise: a.exercise
            })
            : {
                id: logId,
                session_id: sessionId,
                date: dateStr,
                exercise: a.exercise,
                ...a.raw
            };
        tasks.push(
            callAppsScript('addLog', { user: currentUser, log }, syncOpts)
                .then(res => ({ kind: 'add', a, logId, res }))
        );
    });

    try {
        const results = await Promise.all(tasks);
        const failed = results.find(r => r.res && !isBackendSuccess(r.res));
        if (failed) {
            if (/unknown action/i.test(String(failed.res?.message || ''))) return null;
            return failed.res;
        }

        results.forEach(r => {
            if (r.kind === 'add') {
                applySetSyncSuccess(r.a.raw, r.logId);
            } else if (r.kind === 'update') {
                r.u.raw._lastSynced = Date.now();
                if (typeof markSetSyncedSnapshot === 'function') markSetSyncedSnapshot(r.u.raw);
            } else if (r.kind === 'delete' && r.logId) {
                if (typeof sessionCloudDeletedIds !== 'undefined') {
                    sessionCloudDeletedIds.add(String(r.logId));
                }
            }
        });

        try { saveWorkoutData(); } catch (_) {}

        return {
            status: 'success',
            incremental: true,
            updated: (delta.updates || []).length,
            deleted: (delta.deletes || []).length,
            added: (delta.adds || []).length
        };
    } catch (err) {
        return { status: 'error', message: err && err.message ? err.message : String(err) };
    }
}

function forceReleaseGlobalSyncLock(outcome) {
    globalPendingSyncs = 0;
    lastGlobalSyncOutcome = outcome === 'error' ? 'error' : 'synced';
    renderGlobalSyncIndicatorState();
    if (typeof updateInteractionLock === 'function') updateInteractionLock();
}

function enqueuePendingWorkoutSync(workout, notes) {
    if (!workout) return;
    const sid = String(workout.id || workout.session_id || workout.sessionId || Date.now());
    const entry = {
        sessionId: sid,
        workout: JSON.parse(JSON.stringify(workout)),
        notes: notes || ''
    };
    pendingWorkoutSyncQueue = (pendingWorkoutSyncQueue || []).filter(e => e.sessionId !== sid);
    pendingWorkoutSyncQueue.push(entry);
}

function dequeuePendingWorkoutSync(sessionId) {
    const sid = String(sessionId || '').trim();
    if (!sid) return;
    pendingWorkoutSyncQueue = (pendingWorkoutSyncQueue || []).filter(e => e.sessionId !== sid);
}

async function retryFailedSyncs() {
    if (retryGlobalSyncInFlight) return;
    retryGlobalSyncInFlight = true;
    let anyError = false;

    try {
        updateGlobalSyncIndicator('syncing');

        const queue = [...(pendingWorkoutSyncQueue || [])];
        for (const entry of queue) {
            try {
                const res = await finalizeAndSaveWorkout(entry.workout, entry.notes || '');
                if (!isBackendSuccess(res)) anyError = true;
            } catch (err) {
                console.warn('[retryFailedSyncs] workout sync failed:', err);
                anyError = true;
            }
        }

        if (currentUser) {
            try {
                if (typeof bootstrapGoogleCloudData === 'function') {
                    await bootstrapGoogleCloudData({ force: true });
                } else if (typeof loadUserLogs === 'function') {
                    await loadUserLogs();
                }
            } catch (err) {
                console.warn('[retryFailedSyncs] cloud reload failed:', err);
                anyError = true;
            }
        }

        if (anyError || (pendingWorkoutSyncQueue && pendingWorkoutSyncQueue.length > 0)) {
            lastGlobalSyncOutcome = 'error';
        } else {
            lastGlobalSyncOutcome = 'synced';
        }
    } catch (err) {
        console.warn('[retryFailedSyncs] unexpected error:', err);
        lastGlobalSyncOutcome = 'error';
    } finally {
        retryGlobalSyncInFlight = false;
        forceReleaseGlobalSyncLock(lastGlobalSyncOutcome);
    }
}

function renderGlobalSyncIndicatorState() {
    const container = document.getElementById('global-sync-indicator');
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    if (!container || !icon || !text) return;

    container.classList.remove('hidden', 'syncing', 'success', 'error');
    container.classList.add('flex');
    text.classList.remove('hidden');

    if (globalPendingSyncs > 0) {
        container.classList.add('syncing');
        icon.className = 'fa-solid fa-sync fa-spin text-[9px] sm:text-[10px]';
        text.textContent = '同步中，請稍候';
        container.title = '正在上傳數據到 Google，請稍候...';
        return;
    }

    if (lastGlobalSyncOutcome === 'error') {
        container.classList.add('error');
        icon.className = 'fa-solid fa-exclamation-triangle text-[9px] sm:text-[10px]';
        text.textContent = '同步失敗';
        container.title = '同步失敗，點擊重試';
        container.style.cursor = 'pointer';
        container.onclick = () => {
            retryFailedSyncs().finally(() => renderGlobalSyncIndicatorState());
        };
        return;
    }

    container.classList.add('success');
    icon.className = 'fa-solid fa-check text-[9px] sm:text-[10px]';
    text.textContent = '已同步';
    container.title = '數據已同步到雲端';
    setTimeout(() => {
        if (container && container.classList.contains('success') && globalPendingSyncs === 0) {
            container.classList.remove('flex', 'success');
            container.classList.add('hidden');
        }
    }, 2000);
}

function updateSyncStatus(status) {
    const el = document.getElementById('sync-status');
    if (el) {
        if (status === 'syncing') {
            el.innerHTML = '↻ 同步中，請稍候...';
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
    if (typeof updateInteractionLock === 'function') updateInteractionLock();
}

function updateGlobalSyncIndicator(status) {
    if (status === 'syncing') {
        globalPendingSyncs++;
    } else if (status === 'synced' || status === 'error') {
        lastGlobalSyncOutcome = status;
        globalPendingSyncs = Math.max(0, globalPendingSyncs - 1);
    }

    renderGlobalSyncIndicatorState();
    if (typeof updateInteractionLock === 'function') updateInteractionLock();
}

function buildWorkoutApiPayload(workout, notesOverride) {
    const sessionId = String(workout.id || workout.session_id || workout.sessionId || Date.now());
    const exercises = (workout.exercises || []).map(ex => ({
        name: ex.name || '',
        sets: (ex.sets || []).map(set => {
            const row = {
                weight: parseFloat(set.weight) || 0,
                reps: parseInt(set.reps) || 0,
                notes: set.notes || ''
            };
            const bodyWeight = set.body_weight != null ? parseFloat(set.body_weight) : 0;
            if (bodyWeight) row.body_weight = bodyWeight;
            const dur = set.duration != null ? parseInt(set.duration) : 0;
            const incline = set.incline != null ? parseFloat(set.incline) : 0;
            const speed = set.speed != null ? parseFloat(set.speed) : 0;
            if (dur) row.duration = dur;
            if (incline) row.incline = incline;
            if (speed) row.speed = speed;
            return row;
        })
    }));

    return {
        session_id: sessionId,
        date: workout.date || getLocalDateString(),
        notes: notesOverride != null ? notesOverride : (workout.notes || ''),
        exercises
    };
}

function buildReplaceSessionPayload(workout, notesOverride) {
    const p = buildWorkoutApiPayload(workout, notesOverride);
    return { date: p.date, notes: p.notes, exercises: p.exercises };
}

async function deleteSessionsParallel(sids, options = {}) {
    if (!sids || !sids.length) return { ok: true };
    const results = await Promise.all(
        sids.map(sid => callAppsScript('deleteSession', { user: currentUser, sessionId: sid }, options))
    );
    const failed = results.find(r => r && !isBackendSuccess(r));
    if (failed) return { ok: false, message: (failed && failed.message) || 'deleteSession failed' };
    return { ok: true };
}

async function pushCurrentWorkoutToBackend(workout, options = {}) {
    if (!currentUser || !getAppsScriptUrl() || !workout) {
        return { status: 'skipped', message: 'no currentUser or invalid workout' };
    }
    try {
        const payload = buildWorkoutApiPayload(workout);
        workout.id = payload.session_id;
        const result = await callAppsScript('addWorkout', { user: currentUser, workout: payload }, options);
        if (isBackendSuccess(result)) return result;
        console.warn('[pushCurrentWorkoutToBackend] backend returned non-success:', result);
        return result || { status: 'error', message: 'Backend did not confirm success' };
    } catch (err) {
        console.error('[pushCurrentWorkoutToBackend] exception:', err);
        return { status: 'error', message: err && err.message ? err.message : String(err) };
    }
}

/**
 * 完成訓練 / 放棄繼續：
 * - 已逐組同步過 → 只推送未同步 / 已修改的組數
 * - 從未同步過（離線）→ 一次 replaceSession 全量推送
 */
async function finalizeAndSaveWorkout(workout, notes = '') {
    if (!currentUser || !workout) {
        return { status: 'skipped', message: 'no user or workout' };
    }

    try { updateGlobalSyncIndicator('syncing'); } catch (_) {}

    const sid = String(workout.id || workout.session_id || workout.sessionId || Date.now());
    workout.id = sid;
    const syncOpts = { keepalive: true };
    let syncOutcome = 'synced';
    let result = { status: 'error', message: 'sync not completed' };

    try {
        await waitForActiveBackgroundSyncs();
        if (workoutHasInFlightSetSync(workout)) {
            await waitForActiveBackgroundSyncs(4000);
        }

        const beforeSnap = workout._continueSnapshot || null;
        const isContinue = !!(workout.isContinuedFromToday || beforeSnap);

        if (isContinue) {
            const originalSids = [...new Set((workout._originalSessionIds || [])
                .map(s => String(s).trim())
                .filter(Boolean)
                .filter(id => id !== sid))];
            if (originalSids.length > 0) {
                const delRes = await deleteSessionsParallel(originalSids, syncOpts);
                if (!delRes.ok) {
                    console.warn('[finalizeAndSaveWorkout] delete original sessions failed:', delRes.message);
                }
            }
        }

        const delta = typeof buildWorkoutCloudDelta === 'function'
            ? buildWorkoutCloudDelta(workout, beforeSnap)
            : { hasChanges: true, needsFullPush: true, requiresFullSync: false };

        if (!delta.hasChanges) {
            try { updateGlobalSyncIndicator('synced'); } catch (_) {}
            result = { status: 'success', incremental: true, skipped: true };
            return result;
        }

        if (isContinue && !delta.requiresFullSync) {
            const incRes = await syncWorkoutCloudDelta(delta, workout, syncOpts);
            if (incRes === null) {
                syncOutcome = 'error';
                try { updateGlobalSyncIndicator('error'); } catch (_) {}
                result = { status: 'error', message: 'incremental sync unavailable' };
                return result;
            }
            if (isBackendSuccess(incRes)) {
                try { updateGlobalSyncIndicator('synced'); } catch (_) {}
                result = incRes;
                return result;
            }
            syncOutcome = 'error';
            try { updateGlobalSyncIndicator('error'); } catch (_) {}
            result = incRes;
            return result;
        }

        if (!delta.needsFullPush) {
            const incRes = await syncWorkoutCloudDelta(delta, workout, syncOpts);
            if (incRes === null) {
                syncOutcome = 'error';
                try { updateGlobalSyncIndicator('error'); } catch (_) {}
                result = { status: 'error', message: 'incremental sync unavailable' };
                return result;
            }
            if (isBackendSuccess(incRes)) {
                try { updateGlobalSyncIndicator('synced'); } catch (_) {}
                result = incRes;
                return result;
            }
            syncOutcome = 'error';
            try { updateGlobalSyncIndicator('error'); } catch (_) {}
            result = incRes;
            return result;
        }

        const res = await callAppsScript('replaceSession', {
            user: currentUser,
            sessionId: sid,
            workout: buildReplaceSessionPayload(workout, notes)
        }, syncOpts);

        if (isBackendSuccess(res)) {
            (workout.exercises || []).forEach(ex => {
                (ex.sets || []).forEach(set => {
                    if (typeof markSetSyncedSnapshot === 'function') {
                        set._lastSynced = Date.now();
                        markSetSyncedSnapshot(set);
                    }
                });
            });
            try { saveWorkoutData(); } catch (_) {}
            try { updateGlobalSyncIndicator('synced'); } catch (_) {}
            result = res;
            return result;
        }

        if (/unknown action/i.test(String(res?.message || ''))) {
            await deleteSessionsParallel([sid], syncOpts);
            const addRes = await pushCurrentWorkoutToBackend(workout, syncOpts);
            if (isBackendSuccess(addRes)) try { updateGlobalSyncIndicator('synced'); } catch (_) {}
            else try { updateGlobalSyncIndicator('error'); } catch (_) {}
            result = addRes;
            return result;
        }

        syncOutcome = 'error';
        try { updateGlobalSyncIndicator('error'); } catch (_) {}
        result = res;
        return result;
    } catch (err) {
        syncOutcome = 'error';
        try { updateGlobalSyncIndicator('error'); } catch (_) {}
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
        return result;
    } finally {
        if (isBackendSuccess(result)) {
            dequeuePendingWorkoutSync(sid);
        } else if (result.status !== 'skipped') {
            enqueuePendingWorkoutSync(workout, notes);
        }
        if (globalPendingSyncs > 0) forceReleaseGlobalSyncLock(syncOutcome);
        if (activeBackgroundSyncs > 0) {
            activeBackgroundSyncs = 0;
            if (typeof updateInteractionLock === 'function') updateInteractionLock();
        }
    }
}

/**
 * 歷史紀錄編輯：只同步有變更的組數（updateLog / deleteLog / addLog）。
 * 若舊資料缺少 log id 或無法 diff，回傳 null 讓 caller fallback 至 replaceSession。
 */
async function syncHistoryEditIncremental(beforeWorkout, afterWorkout, toPush, options = {}) {
    if (!currentUser || !getAppsScriptUrl() || !beforeWorkout || !afterWorkout) {
        return { status: 'skipped', message: 'no user or workout' };
    }

    if (typeof workoutAllSetsHaveCloudIds === 'function' && !workoutAllSetsHaveCloudIds(beforeWorkout)) {
        return null;
    }

    const delta = typeof buildWorkoutCloudDelta === 'function'
        ? buildWorkoutCloudDelta(afterWorkout, beforeWorkout)
        : null;
    if (!delta || delta.requiresFullSync) return null;
    if (!delta.hasChanges) {
        return { status: 'success', incremental: true, updated: 0, deleted: 0, added: 0 };
    }

    return syncWorkoutCloudDelta(delta, toPush, options);
}

/**
 * 歷史紀錄編輯：全量同步到後端（replaceSession；多 session 時並行刪除後重建）
 */
async function syncHistoryWorkoutToBackend(toPush, oldSessionIds) {
    const sids = [...new Set((oldSessionIds || []).map(s => String(s).trim()).filter(Boolean))];
    const targetSid = String(toPush.id || toPush.session_id || toPush.sessionId || Date.now());
    toPush.id = targetSid;
    const workoutPayload = buildReplaceSessionPayload(toPush);
    const syncOpts = { keepalive: true };

    if (sids.length === 1) {
        const sid = sids[0];
        const replaceRes = await callAppsScript('replaceSession', {
            user: currentUser,
            sessionId: sid,
            workout: workoutPayload
        }, syncOpts);
        if (isBackendSuccess(replaceRes)) {
            toPush.id = sid;
            return replaceRes;
        }
        if (/unknown action/i.test(String(replaceRes?.message || ''))) {
            const del = await deleteSessionsParallel([sid], syncOpts);
            if (!del.ok) return { status: 'error', message: del.message };
            toPush.id = sid;
            return await pushCurrentWorkoutToBackend(toPush, syncOpts);
        }
        return replaceRes;
    }

    if (sids.length > 1) {
        const del = await deleteSessionsParallel(sids, syncOpts);
        if (!del.ok) return { status: 'error', message: del.message };
        toPush.id = String(Date.now());
    }

    return await pushCurrentWorkoutToBackend(toPush, syncOpts);
}

function runHistoryCloudSync(toPush, oldSessionIds, dateStr, beforeSnapshot) {
    (async () => {
        let syncOutcome = 'synced';
        try {
            updateGlobalSyncIndicator('syncing');

            // 歷史編輯一律全量 replaceSession，避免 addLog 殘留行搞亂其他日期
            const syncRes = await syncHistoryWorkoutToBackend(toPush, oldSessionIds);

            if (isBackendSuccess(syncRes)) {
                updateGlobalSyncIndicator('synced');
                const d = normalizeDateToLocal(dateStr);
                const sid = String(toPush.id || toPush.session_id || toPush.sessionId || '').trim();
                if (sid) {
                    workoutHistory = workoutHistory.filter(w => getWorkoutSessionId(w) !== sid);
                }
                workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== d);
                const saved = JSON.parse(JSON.stringify(toPush));
                if (sid) saved.id = sid;
                workoutHistory.unshift(saved);
                workoutHistory = dedupeWorkoutHistoryBySessionId(workoutHistory);
                saveWorkoutData();
            } else {
                syncOutcome = 'error';
                console.warn('[runHistoryCloudSync] non-success:', syncRes);
                updateGlobalSyncIndicator('error');
                const detail = (syncRes && syncRes.message) ? syncRes.message : '';
                showToast(detail
                    ? `⚠️ 本地已保存，雲端同步未完成：${detail}`
                    : '⚠️ 本地已保存，雲端同步未完成，請稍後再試', 4000);
            }
        } catch (err) {
            syncOutcome = 'error';
            console.error('[runHistoryCloudSync] error:', err);
            updateGlobalSyncIndicator('error');
            showToast('⚠️ 本地已保存，雲端同步失敗，請稍後再試', 4000);
        } finally {
            if (globalPendingSyncs > 0) {
                console.warn('[runHistoryCloudSync] clearing stale sync lock, pending=', globalPendingSyncs);
                forceReleaseGlobalSyncLock(syncOutcome);
            }
            if (activeBackgroundSyncs > 0) {
                activeBackgroundSyncs = 0;
                if (typeof updateInteractionLock === 'function') updateInteractionLock();
            }
        }
    })();
}

// More API helpers can be added here (loadUserLogs, etc.) in subsequent steps.

let googleBootstrapPromise = null;
let googleBootstrapUserKey = null;

function resetGoogleBootstrapState() {
    googleBootstrapPromise = null;
    googleBootstrapUserKey = null;
}

/**
 * 登入或頁面載入時一次過背景拉取所有 Google 雲端數據，
 * 唔使等用戶撳入某個 tab 先開始載入。
 */
async function bootstrapGoogleCloudData(options = {}) {
    const force = options.force === true;
    const userKey = currentUser || '__guest__';

    if (!force && googleBootstrapPromise && googleBootstrapUserKey === userKey) {
        return googleBootstrapPromise;
    }

    googleBootstrapUserKey = userKey;
    googleBootstrapPromise = (async () => {
        const tasks = [];

        if (currentUser && typeof loadUserLogs === 'function') {
            tasks.push(
                loadUserLogs({ silent: true }).catch(err => {
                    console.warn('[bootstrapGoogleCloudData] loadUserLogs failed:', err);
                })
            );
        }

        if (currentUser && typeof loadWorkoutSets === 'function') {
            tasks.push(
                loadWorkoutSets(force).catch(err => {
                    console.warn('[bootstrapGoogleCloudData] loadWorkoutSets failed:', err);
                })
            );
        }

        if (typeof prefetchYugongLeaderboard === 'function') {
            tasks.push(
                prefetchYugongLeaderboard(force).catch(err => {
                    console.warn('[bootstrapGoogleCloudData] yugong prefetch failed:', err);
                })
            );
        }

        await Promise.all(tasks);

        if (typeof primeYugongTabFromPrefetch === 'function') {
            try { primeYugongTabFromPrefetch(); } catch (_) {}
        }
        if (typeof finalizeLogTabUiReady === 'function') {
            try { finalizeLogTabUiReady(); } catch (_) {}
        }
    })();

    return googleBootstrapPromise;
}

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