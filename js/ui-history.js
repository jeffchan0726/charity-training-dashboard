// js/ui-history.js
// History rendering, grouping, detail view, and edit modal logic
// Extracted as part of A (architecture refactor) to modularize the monolithic script.

function renderWorkoutHistory() {
    const container = document.getElementById('workout-history-list');
    container.innerHTML = '';
    if (workoutHistory.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-6 text-sm text-[#a8a29e]">尚未記錄任何訓練。請在上方開始！</div>`;
        return;
    }

    // 使用共用 grouping 函數，確保與 renderCalendar() 邏輯完全一致
    const grouped = groupWorkoutsByDate();
    // 由新到舊排序
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    dates.forEach((d) => {
        const g = grouped[d];
        const vol = g.totalVolume;
        // 總動作數量：使用不重複的動作名稱（跨多場訓練）
        const exCount = [...new Set((g.exercises || []).map(e => e && e.name).filter(Boolean))].length;
        const setsCount = g.totalSets;
        const cleanDate = d;

        const card = document.createElement('div');
        card.className = 'workout-history-card log-card rounded-2xl p-3.5 cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between">
                <div class="font-semibold">${cleanDate}</div>
                <div class="text-emerald-400 text-sm tabular-nums">${vol.toLocaleString()}kg</div>
            </div>
            <div class="text-xs text-[#a8a29e]">${exCount} 動作 • ${setsCount} 組 • ${vol.toLocaleString()}kg</div>
            ${g.notes ? `<div class="text-[10px] italic text-[#a8a29e] mt-1 line-clamp-1">"${g.notes}"</div>` : ''}
        `;

        // 統一使用 showWorkoutDetailForDate，與日曆點擊行為一致
        card.onclick = () => showWorkoutDetailForDate(d);

        container.appendChild(card);
    });
}

function showWorkoutDetail(workout, historyIndex) {
    // 改為打開專屬的歷史記錄查看/編輯 Modal
    // 完全獨立於新訓練流程 (currentWorkout / live-log-panel / rest timer)
    openHistoryEditModal(workout, historyIndex);
}

/**
 * 共用日期 grouping 函數
 * 將 workoutHistory 按 YYYY-MM-DD 分組，同一日多場訓練會合併。
 * renderWorkoutHistory() 及 renderCalendar() 都應使用此函數，確保邏輯一致。
 */
function groupWorkoutsByDate(workouts = workoutHistory) {
    const grouped = {};
    (workouts || []).forEach(w => {
        const d = normalizeDateToLocal(w.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
        if (!grouped[d]) {
            grouped[d] = {
                date: d,
                workouts: [],
                exercises: [],
                totalSets: 0,
                totalVolume: 0,
                notes: ''
            };
        }
        const g = grouped[d];
        g.workouts.push(w);
        g.exercises.push(...(w.exercises || []));
        g.totalSets += (w.exercises || []).reduce((a, e) => a + (e.sets ? e.sets.length : 0), 0);
        g.totalVolume += (w.totalVolume || calculateWorkoutVolume(w));
        if (w.notes && !g.notes) g.notes = w.notes; // 第一條非空 notes
    });
    return grouped;
}

/**
 * 統一的日期詳情入口
 * 訓練歷史卡片 + 訓練日曆點擊 都應呼叫此函數。
 * 內部使用 groupWorkoutsByDate 取得該日數據，組成 merged 虛擬物件（支援 _isDayGroup），
 * 然後交給 showWorkoutDetail / openHistoryEditModal 處理顯示 + 編輯 + 儲存/刪除。
 */
function showWorkoutDetailForDate(dateStr) {
    const grouped = groupWorkoutsByDate();
    const g = grouped[dateStr];
    if (!g || !g.workouts || g.workouts.length === 0) {
        alert(`此日期 ${dateStr} 沒有訓練記錄`);
        return;
    }

    // 組成與 renderWorkoutHistory 點擊時相同的 merged 物件
    // 同時附帶 _sessionIds，方便 save/delete 時精準 sync backend（deleteSession + re-push）
    const sessionIds = (g.workouts || [])
        .map(w => w.id || w.session_id || w.sessionId)
        .filter(Boolean);
    const merged = {
        date: g.date,
        exercises: g.exercises ? [...g.exercises] : [],
        totalVolume: g.totalVolume,
        notes: g.notes || '',
        _isDayGroup: true,
        _originalCount: g.workouts.length,
        _sessionIds: sessionIds
    };

    showWorkoutDetail(merged, -1);
}

// ============ 歷史記錄專用編輯 Modal 相關函數 ============
// 這些函數只操作 currentViewingHistory clone，絕不影響 currentWorkout 及開始新訓練流程

function openHistoryEditModal(original, historyIndex) {
    if (!original) return;

    // 深層 clone，避免直接修改原物件直到「儲存」
    currentViewingHistory = JSON.parse(JSON.stringify(original));
    currentViewingHistoryIndex = (typeof historyIndex === 'number') ? historyIndex : -1;

    const modal = document.getElementById('historyEditModal');
    if (!modal) {
        console.error('#historyEditModal not found — falling back to legacy behaviour');
        // 極少數 fallback（保留舊行為以防萬一）
        const cleanDate = normalizeDateToLocal(original.date);
        if (confirm(`日期: ${cleanDate}\n\n確定刪除這次訓練？`)) {
            workoutHistory.splice(currentViewingHistoryIndex, 1);
            saveWorkoutData();
            renderWorkoutHistory();
            renderOverallStats();
            renderCalendar();
        }
        return;
    }

    // 設定標題日期
    const dateEl = document.getElementById('history-edit-date');
    if (dateEl) dateEl.textContent = normalizeDateToLocal(currentViewingHistory.date) || '未知日期';

    // 顯示 modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Backdrop click to close (不影響內部點擊)
    modal.onclick = (e) => {
        if (e.target === modal) closeHistoryEditModal();
    };

    // 渲染可編輯內容
    renderHistoryEditContent();
}

function closeHistoryEditModal() {
    const modal = document.getElementById('historyEditModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
    currentViewingHistory = null;
    currentViewingHistoryIndex = -1;
}

function renderHistoryEditContent() {
    const container = document.getElementById('history-edit-exercises');
    const volEl = document.getElementById('history-edit-volume');
    if (!container || !currentViewingHistory) return;

    // 計算並顯示即時總量
    const vol = calculateWorkoutVolume(currentViewingHistory);
    currentViewingHistory.totalVolume = vol;
    if (volEl) volEl.textContent = vol.toLocaleString();

    if (!currentViewingHistory.exercises || currentViewingHistory.exercises.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-sm text-[#a8a29e]">此記錄沒有動作資料。</div>`;
        return;
    }

    let html = '';
    currentViewingHistory.exercises.forEach((ex, exIdx) => {
        let setsHtml = '';
        (ex.sets || []).forEach((set, sIdx) => {
            const w = set.weight != null ? set.weight : 0;
            const r = set.reps != null ? set.reps : 0;
            const n = set.notes || '';
            setsHtml += `
                <div class="flex items-center gap-2 bg-[#1f1c1a] rounded-xl px-2 py-1.5 mb-1 text-sm">
                    <div class="flex-1 grid grid-cols-3 gap-2">
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">重量 (kg)</label>
                            <input type="number" step="0.5" value="${w}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'weight', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">次數</label>
                            <input type="number" value="${r}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'reps', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">備註</label>
                            <input type="text" value="${n}"
                                   class="log-input w-full px-2 py-1 text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'notes', this.value)">
                        </div>
                    </div>
                    <button onclick="deleteHistorySet(${exIdx}, ${sIdx})"
                            class="text-red-400 hover:text-red-300 px-2 py-1 text-xs rounded active:bg-red-900/30" title="刪除此組">✕</button>
                </div>
            `;
        });

        if (!setsHtml) {
            setsHtml = `<div class="text-xs text-[#a8a29e] px-1 py-1">尚未有組數</div>`;
        }

        html += `
            <div class="exercise-log-card bg-[#252321] rounded-2xl p-3 border border-[#57534e]">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <div class="font-semibold text-sm">${ex.name}</div>
                        <div class="text-[10px] text-[#a8a29e]">${getMuscleGroup ? getMuscleGroup(ex.name) : ''}</div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="addSetToHistoryExercise(${exIdx})"
                                class="px-2.5 py-1 text-xs bg-emerald-900/60 hover:bg-emerald-800 active:bg-emerald-900 rounded-2xl flex items-center gap-1">
                            <i class="fa-solid fa-plus text-[10px]"></i> <span>加組</span>
                        </button>
                        <button onclick="deleteHistoryExercise(${exIdx})"
                                class="px-1.5 py-1 text-xs text-red-400 hover:text-red-300 active:bg-red-900/30 rounded"
                                title="刪除此動作">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-0.5">
                    ${setsHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateHistorySetField(exIdx, setIdx, field, value) {
    if (!currentViewingHistory || !currentViewingHistory.exercises) return;
    const ex = currentViewingHistory.exercises[exIdx];
    if (!ex || !ex.sets || !ex.sets[setIdx]) return;

    const set = ex.sets[setIdx];
    if (field === 'weight' || field === 'reps') {
        const num = (field === 'weight') ? parseFloat(value) : parseInt(value);
        set[field] = isNaN(num) ? 0 : num;
        set.volume = calculateSetVolume(set);
    } else {
        set[field] = (value || '').trim();
    }

    // 即時更新 header 總量（不需要全量 re-render 整個列表，體驗更好）
    const volEl = document.getElementById('history-edit-volume');
    const newVol = calculateWorkoutVolume(currentViewingHistory);
    currentViewingHistory.totalVolume = newVol;
    if (volEl) volEl.textContent = newVol.toLocaleString();
}

function addSetToHistoryExercise(exIdx) {
    if (!currentViewingHistory || !currentViewingHistory.exercises) return;
    const ex = currentViewingHistory.exercises[exIdx];
    if (!ex) return;

    // 新增一組（預設 0）
    ex.sets = ex.sets || [];
    ex.sets.push({ weight: 0, reps: 0, notes: '', volume: 0 });

    // 重新渲染（簡單直接）
    renderHistoryEditContent();
}

function deleteHistorySet(exIdx, setIdx) {
    if (!currentViewingHistory || !currentViewingHistory.exercises) return;
    const ex = currentViewingHistory.exercises[exIdx];
    if (!ex || !ex.sets || setIdx < 0 || setIdx >= ex.sets.length) return;

    ex.sets.splice(setIdx, 1);
    renderHistoryEditContent();
}

/**
 * 刪除整個動作（exercise-log-card）
 * 從 currentViewingHistory.exercises 移除，並重新計算總量 + re-render
 */
function deleteHistoryExercise(exIdx) {
    if (!currentViewingHistory || !currentViewingHistory.exercises) return;
    if (exIdx < 0 || exIdx >= currentViewingHistory.exercises.length) return;

    currentViewingHistory.exercises.splice(exIdx, 1);
    renderHistoryEditContent();  // 會自動更新總量和 DOM
}

async function saveHistoryEdit() {
    if (!currentViewingHistory) {
        closeHistoryEditModal();
        return;
    }

    if (isSavingHistory) return;
    isSavingHistory = true;

    // Use ids for reliable targeting + immediate disable
    const saveBtn = document.getElementById('save-history-btn');
    const deleteBtn = document.getElementById('delete-history-btn');
    const origSaveHtml = saveBtn ? saveBtn.innerHTML : '';
    const origDeleteHtml = deleteBtn ? deleteBtn.innerHTML : '';

    try {
        // Disable both buttons during save (prevents double tap on mobile)
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-70', 'cursor-wait');
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 儲存中...`;
        }
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-wait');
        }

        const isDayGroup = !!currentViewingHistory._isDayGroup;
        const d = normalizeDateToLocal(currentViewingHistory.date);

        // === Priority 2: 先 sync backend，再更新本地（失敗即 revert）===
        if (currentUser) {
            // 準備要刪除的舊 session(s)
            let oldSessionIds = [];
            if (isDayGroup) {
                oldSessionIds = (currentViewingHistory._sessionIds || []).slice();
            } else {
                const sid = currentViewingHistory.id || currentViewingHistory.session_id || currentViewingHistory.sessionId;
                if (sid) oldSessionIds = [sid];
            }

            // 清理 dayGroup 標記，準備推送版本（保持 exercises 為合併後狀態）
            const toPush = JSON.parse(JSON.stringify(currentViewingHistory));
            delete toPush._isDayGroup;
            delete toPush._originalCount;
            delete toPush._sessionIds;
            if (!toPush.id) toPush.id = Date.now().toString();

            try {
                updateGlobalSyncIndicator('syncing');
                // 1. 刪除舊 session（支援 dayGroup 多個） + C. 刪除操作也更新狀態
                for (const sid of oldSessionIds) {
                    const delRes = await callAppsScript("deleteSession", { user: currentUser, sessionId: sid });
                    if (delRes && delRes.status === 'error') {
                        throw new Error(delRes.message || 'deleteSession failed');
                    }
                }
                // 2. 用單一 addWorkout 重推更新後版本（bulk）
                const pushRes = await pushCurrentWorkoutToBackend(toPush);
                if (!pushRes || pushRes.status !== 'success') {
                    throw new Error(pushRes && pushRes.message ? pushRes.message : 'addWorkout push failed');
                }
                // 成功後同步 id 回 clone
                currentViewingHistory.id = toPush.id;
                if (globalPendingSyncs === 0) updateGlobalSyncIndicator('synced');
            } catch (err) {
                console.error('[saveHistoryEdit] backend sync failed, revert:', err);
                updateGlobalSyncIndicator('error');
                showToast('❌ 同步後端失敗，修改未保存。請檢查網絡後重試。', 5500);
                closeHistoryEditModal();
                return; // 不執行本地 mutation
            }
        }

        // Backend 成功（或無登入），才執行本地更新
        if (isDayGroup) {
            // 日期群組虛擬物件：刪除該日所有舊記錄，然後用編輯後的合併版本替換（合併為單一記錄）
            workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== d);

            // 清理特殊標記
            delete currentViewingHistory._isDayGroup;
            delete currentViewingHistory._originalCount;
            delete currentViewingHistory._sessionIds;

            // 重新計算 volume 確保正確
            currentViewingHistory.totalVolume = calculateWorkoutVolume(currentViewingHistory);

            // 插入合併後的單一記錄（置頂）
            workoutHistory.unshift(currentViewingHistory);
        } else {
            // 單一記錄正常處理
            let targetIdx = currentViewingHistoryIndex;
            if (targetIdx < 0 || targetIdx >= workoutHistory.length ||
                (workoutHistory[targetIdx] && normalizeDateToLocal(workoutHistory[targetIdx].date) !== d)) {
                targetIdx = workoutHistory.findIndex(w => normalizeDateToLocal(w.date) === d);
            }
            if (targetIdx >= 0) {
                workoutHistory[targetIdx] = currentViewingHistory;
            } else {
                workoutHistory.unshift(currentViewingHistory);
            }
        }

        saveWorkoutData();
        renderWorkoutHistory();
        renderOverallStats();
        renderCalendar();
        updateExerciseSelectForAnalysis();

        closeHistoryEditModal();
        showToast('歷史記錄已更新', 2200);

    } finally {
        isSavingHistory = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-70', 'cursor-wait');
            saveBtn.innerHTML = origSaveHtml || '儲存';
        }
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.classList.remove('opacity-50', 'cursor-wait');
            deleteBtn.innerHTML = origDeleteHtml || '刪除';
        }
    }
}

async function deleteHistoryWorkout() {
    if (!currentViewingHistory) {
        closeHistoryEditModal();
        return;
    }

    if (isDeletingHistory) return;
    isDeletingHistory = true;

    const deleteBtn = document.getElementById('delete-history-btn');
    const origHtml = deleteBtn ? deleteBtn.innerHTML : '';

    try {
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-wait');
            deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 刪除中...`;
        }

        const isDayGroup = !!currentViewingHistory._isDayGroup;
        const d = normalizeDateToLocal(currentViewingHistory.date);

        if (currentUser) {
            let sessionIdsToDelete = [];
            if (isDayGroup) {
                sessionIdsToDelete = (currentViewingHistory._sessionIds || []).slice();
            } else {
                const sid = currentViewingHistory.id || currentViewingHistory.session_id || currentViewingHistory.sessionId;
                if (sid) sessionIdsToDelete = [sid];
            }

            updateGlobalSyncIndicator('syncing');
            for (const sid of sessionIdsToDelete) {
                try {
                    await callAppsScript("deleteSession", { user: currentUser, sessionId: sid });
                } catch (e) {
                    console.warn('[deleteHistoryWorkout] backend delete warning for sid', sid, e);
                }
            }
            if (globalPendingSyncs === 0) updateGlobalSyncIndicator('synced');
        }

        // 本地刪除
        if (isDayGroup) {
            workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== d);
        } else {
            let targetIdx = currentViewingHistoryIndex;
            if (targetIdx < 0 || targetIdx >= workoutHistory.length ||
                (workoutHistory[targetIdx] && normalizeDateToLocal(workoutHistory[targetIdx].date) !== d)) {
                targetIdx = workoutHistory.findIndex(w => normalizeDateToLocal(w.date) === d);
            }
            if (targetIdx >= 0) {
                workoutHistory.splice(targetIdx, 1);
            }
        }

        saveWorkoutData();
        renderWorkoutHistory();
        renderOverallStats();
        renderCalendar();
        updateExerciseSelectForAnalysis();

        closeHistoryEditModal();
        showToast('歷史記錄已刪除', 2200);

    } catch (err) {
        console.error('[deleteHistoryWorkout] error:', err);
        updateGlobalSyncIndicator('error');
        showToast('刪除失敗，請稍後再試', 3000);
    } finally {
        isDeletingHistory = false;
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.classList.remove('opacity-50', 'cursor-wait');
            deleteBtn.innerHTML = origHtml || '刪除';
        }
    }
}