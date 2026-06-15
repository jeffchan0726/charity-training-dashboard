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
        const volDisplay = typeof formatWorkoutVolumeDisplay === 'function'
            ? formatWorkoutVolumeDisplay({ exercises: g.exercises || [] })
            : { value: String(g.totalVolume || 0), unit: 'kg', sub: '' };
        const volLabel = volDisplay.unit === 'km'
            ? `${volDisplay.value}km`
            : (volDisplay.sub && volDisplay.sub.includes('km')
                ? volDisplay.sub
                : `${volDisplay.value}kg`);
        // 總動作數量：使用不重複的動作名稱（跨多場訓練）
        const exCount = [...new Set((g.exercises || []).map(e => e && e.name).filter(Boolean))].length;
        const setsCount = g.totalSets;
        const cleanDate = d;

        const card = document.createElement('div');
        card.className = 'workout-history-card log-card rounded-2xl p-3.5 cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between">
                <div class="font-semibold">${cleanDate}</div>
                <div class="text-emerald-400 text-sm tabular-nums">${volLabel}</div>
            </div>
            <div class="text-xs text-[#a8a29e]">${exCount} 動作 • ${setsCount} 組 • ${volLabel}</div>
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
        if (w.notes && !g.notes) g.notes = w.notes; // 第一條非空 notes
    });

    Object.values(grouped).forEach(g => {
        const t = typeof calculateWorkoutTotals === 'function'
            ? calculateWorkoutTotals({ exercises: g.exercises || [] })
            : { weightKg: 0, distanceKm: 0 };
        g.totalWeightKg = t.weightKg;
        g.totalDistanceKm = t.distanceKm;
        g.totalVolume = t.weightKg;
        g.intensityScore = typeof getWorkoutIntensityScore === 'function'
            ? getWorkoutIntensityScore({ exercises: g.exercises || [] })
            : t.weightKg;
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
    if (guardServerSyncing('同步中，請稍候再查看或編輯歷史紀錄')) return;
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
        id: sessionIds.length === 1 ? sessionIds[0] : (sessionIds[0] || String(Date.now())),
        exercises: g.exercises ? [...g.exercises] : [],
        totalVolume: g.totalWeightKg != null ? g.totalWeightKg : g.totalVolume,
        totalDistanceKm: g.totalDistanceKm || 0,
        notes: g.notes || '',
        _isDayGroup: g.workouts.length > 1 || sessionIds.length > 1,
        _originalCount: g.workouts.length,
        _sessionIds: sessionIds
    };

    showWorkoutDetail(merged, -1);
}

// ============ 歷史記錄專用編輯 Modal 相關函數 ============
// 這些函數只操作 currentViewingHistory clone，絕不影響 currentWorkout 及開始新訓練流程

function openHistoryEditModal(original, historyIndex) {
    if (guardServerSyncing('同步中，請稍候再查看或編輯歷史紀錄')) return;
    if (!original) return;

    // 深層 clone，避免直接修改原物件直到「儲存」
    currentViewingHistory = JSON.parse(JSON.stringify(original));
    historyEditOriginalSnapshot = JSON.parse(JSON.stringify(original));
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

    // 綁定加入動作輸入建議
    const histInput = document.getElementById('history-add-exercise-input');
    if (histInput) {
        histInput.value = '';
        const suggestHandler = () => {
            if (typeof updateExerciseSuggestions === 'function') {
                updateExerciseSuggestions(histInput.value);
            }
        };
        histInput.oninput = suggestHandler;
        histInput.onfocus = suggestHandler;
    }

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
    historyEditOriginalSnapshot = null;
    window._libraryAddToHistory = false;
}

function isHistoryEditUnchanged() {
    return typeof isHistoryWorkoutUnchanged === 'function'
        && isHistoryWorkoutUnchanged(historyEditOriginalSnapshot, currentViewingHistory);
}

function renderHistoryEditContent() {
    const container = document.getElementById('history-edit-exercises');
    const volEl = document.getElementById('history-edit-volume');
    if (!container || !currentViewingHistory) return;

    // 計算並顯示即時總量
    const volDisplay = typeof formatWorkoutVolumeDisplay === 'function'
        ? formatWorkoutVolumeDisplay(currentViewingHistory)
        : { value: String(calculateWorkoutVolume(currentViewingHistory)), unit: 'kg', sub: '' };
    currentViewingHistory.totalVolume = calculateWorkoutVolume(currentViewingHistory);
    currentViewingHistory.totalDistanceKm = typeof calculateWorkoutDistanceKm === 'function'
        ? calculateWorkoutDistanceKm(currentViewingHistory) : 0;
    if (volEl) {
        volEl.textContent = volDisplay.unit === 'km'
            ? volDisplay.value
            : volDisplay.value;
        const unitSpan = document.getElementById('history-edit-volume-unit');
        if (unitSpan) {
            unitSpan.textContent = volDisplay.unit === 'km' ? 'km' : 'kg';
        }
    }

    if (!currentViewingHistory.exercises) {
        currentViewingHistory.exercises = [];
    }

    if (currentViewingHistory.exercises.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-sm text-[#a8a29e]">此記錄沒有動作。請在上方加入動作。</div>`;
        return;
    }

    let html = '';
    currentViewingHistory.exercises.forEach((ex, exIdx) => {
        const recordType = typeof getExerciseRecordType === 'function'
            ? getExerciseRecordType(ex.name) : 'weight';
        const isHold = recordType === 'time_reps';
        const isTreadmill = recordType === 'treadmill';
        const isBodyweight = recordType === 'bodyweight';
        const needsBodyWeight = (isHold || isBodyweight) && typeof isBodyweightExercise === 'function' && isBodyweightExercise(ex.name);
        let setsHtml = '';
        (ex.sets || []).forEach((set, sIdx) => {
            const w = set.weight != null ? set.weight : 0;
            const bw = set.body_weight != null ? set.body_weight : 0;
            const r = set.reps != null ? set.reps : 0;
            const d = set.duration != null ? set.duration : 0;
            const incline = set.incline != null ? set.incline : 0;
            const speed = set.speed != null ? set.speed : 0;
            const n = set.notes || '';
            const fieldsHtml = isTreadmill ? `
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">時間 (分)</label>
                            <input type="number" value="${d}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'duration', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">坡度 (%)</label>
                            <input type="number" step="0.5" value="${incline}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'incline', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">速度 (km/h)</label>
                            <input type="number" step="0.1" value="${speed}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'speed', this.value)">
                        </div>
            ` : isHold ? `
                        ${needsBodyWeight ? `
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">體重 (kg)</label>
                            <input type="number" step="0.1" value="${bw}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'body_weight', this.value)">
                        </div>` : ''}
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">時間 (秒)</label>
                            <input type="number" value="${d}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'duration', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">次數</label>
                            <input type="number" value="${r}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'reps', this.value)">
                        </div>
            ` : isBodyweight ? `
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">體重 (kg)</label>
                            <input type="number" step="0.1" value="${bw}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'body_weight', this.value)">
                        </div>
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">次數</label>
                            <input type="number" value="${r}"
                                   class="log-input w-full px-2 py-1 text-center text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'reps', this.value)">
                        </div>
            ` : `
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
            `;
            const notesField = `
                        <div>
                            <label class="block text-[9px] text-[#a8a29e] mb-0.5">備註</label>
                            <input type="text" value="${n}"
                                   class="log-input w-full px-2 py-1 text-sm rounded-xl"
                                   onchange="updateHistorySetField(${exIdx}, ${sIdx}, 'notes', this.value)">
                        </div>`;
            setsHtml += `
                <div class="flex items-center gap-2 bg-[#1f1c1a] rounded-xl px-2 py-1.5 mb-1 text-sm">
                    <div class="flex-1 grid ${isTreadmill ? 'grid-cols-4' : (needsBodyWeight && isHold ? 'grid-cols-4' : 'grid-cols-3')} gap-2">
                        ${fieldsHtml}
                        ${notesField}
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
            <div class="exercise-log-card bg-[#252321] rounded-2xl p-3 border border-[#57534e] relative" data-ex-idx="${exIdx}">
                <div class="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                    <button type="button"
                            class="exercise-drag-handle"
                            data-ex-idx="${exIdx}"
                            onpointerdown="onExerciseDragHandlePointerDown(event, ${exIdx}, 'history')"
                            onpointermove="onExerciseDragHandlePointerMove(event)"
                            onpointerup="onExerciseDragHandlePointerUp(event)"
                            onpointercancel="onExerciseDragHandlePointerCancel(event)"
                            title="按住 ↕ 拖動調整順序">
                        ↕
                    </button>
                    <button onclick="deleteHistoryExercise(${exIdx})"
                            class="text-red-400 hover:text-red-300 px-1.5 py-0.5 text-base leading-none active:bg-red-900/30 rounded"
                            title="刪除此動作">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="flex items-center justify-between mb-2 pr-12">
                    <div>
                        <div class="font-semibold text-sm">${ex.name}</div>
                        <div class="text-[10px] text-[#a8a29e]">${getMuscleGroup ? getMuscleGroup(ex.name) : ''}${isTreadmill ? ' • 時間+坡度+速度' : ''}${isHold ? ' • 時間+次數' : ''}${isBodyweight ? ' • 體重+次數' : ''}</div>
                    </div>
                    <button onclick="addSetToHistoryExercise(${exIdx})"
                            class="px-2.5 py-1 text-xs bg-emerald-900/60 hover:bg-emerald-800 active:bg-emerald-900 rounded-2xl flex items-center gap-1">
                        <i class="fa-solid fa-plus text-[10px]"></i> <span>加組</span>
                    </button>
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
    if (field === 'weight' || field === 'reps' || field === 'duration' || field === 'incline' || field === 'speed' || field === 'body_weight') {
        const num = (field === 'reps') ? parseInt(value) : parseFloat(value);
        set[field] = isNaN(num) ? 0 : num;
        if (field === 'body_weight' && typeof rememberBodyWeightKg === 'function') {
            rememberBodyWeightKg(set[field]);
        }
        if (field === 'duration' && parseInt(set.duration) > 0) set.weight = 0;
        if (field === 'incline' || field === 'speed') {
            set.weight = 0;
            set.reps = 0;
        }
        set.volume = calculateSetVolume(set, ex.name);
    } else {
        set[field] = (value || '').trim();
    }

    // 即時更新 header 總量（不需要全量 re-render 整個列表，體驗更好）
    const volEl = document.getElementById('history-edit-volume');
    const volDisplay = typeof formatWorkoutVolumeDisplay === 'function'
        ? formatWorkoutVolumeDisplay(currentViewingHistory)
        : { value: String(calculateWorkoutVolume(currentViewingHistory)), unit: 'kg', sub: '' };
    currentViewingHistory.totalVolume = calculateWorkoutVolume(currentViewingHistory);
    currentViewingHistory.totalDistanceKm = typeof calculateWorkoutDistanceKm === 'function'
        ? calculateWorkoutDistanceKm(currentViewingHistory) : 0;
    if (volEl) volEl.textContent = volDisplay.value;
    const unitSpan = document.getElementById('history-edit-volume-unit');
    if (unitSpan) unitSpan.textContent = volDisplay.unit === 'km' ? 'km' : 'kg';
}

function addExerciseToHistory(nameFromInput = null) {
    if (!currentViewingHistory) return;

    let name = nameFromInput || (document.getElementById('history-add-exercise-input')?.value || '').trim();
    if (!name) return;

    const ex = getExerciseByName(name);
    const displayName = ex ? getExerciseDisplay(ex) : name;

    currentViewingHistory.exercises = currentViewingHistory.exercises || [];
    const existing = currentViewingHistory.exercises.find(
        e => e.name.toLowerCase() === displayName.toLowerCase()
    );
    if (existing) {
        alert('此動作已在記錄中。');
        return;
    }

    currentViewingHistory.exercises.push({ name: displayName, sets: [] });

    const input = document.getElementById('history-add-exercise-input');
    if (input) input.value = '';

    renderHistoryEditContent();
}

function showLibraryModalForHistory() {
    if (!currentViewingHistory) return;
    if (typeof showLibraryModal === 'function') {
        showLibraryModal(false, true);
    }
}

function addSetToHistoryExercise(exIdx) {
    if (!currentViewingHistory || !currentViewingHistory.exercises) return;
    const ex = currentViewingHistory.exercises[exIdx];
    if (!ex) return;

    // 新增一組（預設 0）
    ex.sets = ex.sets || [];
    ex.sets.push(typeof createDefaultSetForExercise === 'function'
        ? createDefaultSetForExercise(ex.name)
        : { weight: 0, reps: 0, notes: '', volume: 0 });

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

function moveExerciseInHistory(fromIdx, toIdx) {
    if (!currentViewingHistory || fromIdx === toIdx) return;
    const exercises = currentViewingHistory.exercises;
    if (!exercises || fromIdx < 0 || fromIdx >= exercises.length || toIdx < 0 || toIdx >= exercises.length) return;

    const [item] = exercises.splice(fromIdx, 1);
    exercises.splice(toIdx, 0, item);
    renderHistoryEditContent();
}

function applyHistoryEditLocally(viewing, historyIndex, isDayGroup, dateStr) {
    const d = normalizeDateToLocal(dateStr);
    const record = JSON.parse(JSON.stringify(viewing));

    if (isDayGroup) {
        workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== d);
        delete record._isDayGroup;
        delete record._originalCount;
        delete record._sessionIds;
        record.totalVolume = calculateWorkoutVolume(record);
        workoutHistory.unshift(record);
        return record;
    }

    let targetIdx = historyIndex;
    if (targetIdx < 0 || targetIdx >= workoutHistory.length ||
        (workoutHistory[targetIdx] && normalizeDateToLocal(workoutHistory[targetIdx].date) !== d)) {
        targetIdx = workoutHistory.findIndex(w => normalizeDateToLocal(w.date) === d);
    }
    delete record._isDayGroup;
    delete record._originalCount;
    delete record._sessionIds;
    if (targetIdx >= 0) {
        workoutHistory[targetIdx] = record;
    } else {
        workoutHistory.unshift(record);
    }
    return record;
}

async function saveHistoryEdit() {
    if (!currentViewingHistory) {
        closeHistoryEditModal();
        return;
    }

    if (isHistoryEditUnchanged()) {
        closeHistoryEditModal();
        if (typeof showToast === 'function') showToast('沒有變更，無需儲存', 1500);
        return;
    }

    if (isSavingHistory) return;
    isSavingHistory = true;
    if (typeof updateInteractionLock === 'function') updateInteractionLock();

    const saveBtn = document.getElementById('save-history-btn');
    const deleteBtn = document.getElementById('delete-history-btn');
    const origSaveHtml = saveBtn ? saveBtn.innerHTML : '';
    const origDeleteHtml = deleteBtn ? deleteBtn.innerHTML : '';

    const isDayGroup = !!currentViewingHistory._isDayGroup;
    const d = normalizeDateToLocal(currentViewingHistory.date);

    let oldSessionIds = [];
    if (isDayGroup) {
        oldSessionIds = (currentViewingHistory._sessionIds || []).slice();
    } else {
        const sid = currentViewingHistory.id || currentViewingHistory.session_id || currentViewingHistory.sessionId;
        if (sid) oldSessionIds = [sid];
    }

    const toPush = JSON.parse(JSON.stringify(currentViewingHistory));
    delete toPush._isDayGroup;
    delete toPush._originalCount;
    delete toPush._sessionIds;
    if (!toPush.id) toPush.id = Date.now().toString();

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-70', 'cursor-wait');
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 儲存中...`;
        }
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-wait');
        }

        // 1. 先更新本地（用戶即時見到結果）
        applyHistoryEditLocally(
            currentViewingHistory,
            currentViewingHistoryIndex,
            isDayGroup,
            d
        );

        const beforeSnapshot = historyEditOriginalSnapshot
            ? JSON.parse(JSON.stringify(historyEditOriginalSnapshot))
            : null;

        saveWorkoutData();
        closeHistoryEditModal();
        showToast('歷史記錄已更新', 1800);
        renderWorkoutHistory();

        // 非緊急 UI 延後渲染，令儲存體感更快
        setTimeout(() => {
            try { renderOverallStats(); } catch (_) {}
            try { renderCalendar(); } catch (_) {}
            try { updateExerciseSelectForAnalysis(); } catch (_) {}
        }, 0);

        // 雲端同步放背景：只推送有變更的組數（updateLog / deleteLog / addLog）
        if (currentUser) runHistoryCloudSync(toPush, oldSessionIds, d, beforeSnapshot);

    } finally {
        isSavingHistory = false;
        if (typeof updateInteractionLock === 'function') updateInteractionLock();
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

    if (!confirm('確定要刪除這次訓練記錄嗎？\n刪除後無法恢復。')) return;

    if (isDeletingHistory) return;
    isDeletingHistory = true;
    if (typeof updateInteractionLock === 'function') updateInteractionLock();

    const deleteBtn = document.getElementById('delete-history-btn');
    const saveBtn = document.getElementById('save-history-btn');
    const origHtml = deleteBtn ? deleteBtn.innerHTML : '';
    const origSaveHtml = saveBtn ? saveBtn.innerHTML : '';

    try {
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-wait');
            deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 刪除中...`;
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-wait');
        }

        const isDayGroup = !!currentViewingHistory._isDayGroup;
        const d = normalizeDateToLocal(currentViewingHistory.date);

        const sessionIdsToDelete = [];
        if (isDayGroup) {
            sessionIdsToDelete.push(...(currentViewingHistory._sessionIds || []));
        } else {
            const sid = currentViewingHistory.id || currentViewingHistory.session_id || currentViewingHistory.sessionId;
            if (sid) sessionIdsToDelete.push(String(sid));
        }
        const cloudSids = [...new Set(sessionIdsToDelete.map(s => String(s).trim()).filter(Boolean))];

        // 本地先刪（即時）
        if (isDayGroup) {
            workoutHistory = workoutHistory.filter(w => normalizeDateToLocal(w.date) !== d);
        } else {
            let targetIdx = currentViewingHistoryIndex;
            if (targetIdx < 0 || targetIdx >= workoutHistory.length ||
                (workoutHistory[targetIdx] && normalizeDateToLocal(workoutHistory[targetIdx].date) !== d)) {
                targetIdx = workoutHistory.findIndex(w => normalizeDateToLocal(w.date) === d);
            }
            if (targetIdx >= 0) workoutHistory.splice(targetIdx, 1);
        }

        saveWorkoutData();
        closeHistoryEditModal();
        showToast('歷史記錄已刪除', 1800);
        renderWorkoutHistory();
        setTimeout(() => {
            try { renderOverallStats(); } catch (_) {}
            try { renderCalendar(); } catch (_) {}
            try { updateExerciseSelectForAnalysis(); } catch (_) {}
        }, 0);

        // 雲端並行刪除（背景）
        if (currentUser && cloudSids.length > 0) {
            (async () => {
                let syncOutcome = 'synced';
                try {
                    updateGlobalSyncIndicator('syncing');
                    const del = await deleteSessionsParallel(cloudSids, { keepalive: true });
                    if (del.ok) updateGlobalSyncIndicator('synced');
                    else {
                        syncOutcome = 'error';
                        updateGlobalSyncIndicator('error');
                        showToast(`⚠️ 本地已刪除，雲端刪除未完成：${del.message || ''}`, 4000);
                    }
                } catch (err) {
                    syncOutcome = 'error';
                    console.error('[deleteHistoryWorkout] cloud delete error:', err);
                    updateGlobalSyncIndicator('error');
                    showToast('⚠️ 本地已刪除，雲端刪除失敗', 4000);
                } finally {
                    if (typeof forceReleaseGlobalSyncLock === 'function' && globalPendingSyncs > 0) {
                        forceReleaseGlobalSyncLock(syncOutcome);
                    }
                }
            })();
        }

    } catch (err) {
        console.error('[deleteHistoryWorkout] error:', err);
        updateGlobalSyncIndicator('error');
        showToast('刪除失敗，請稍後再試', 3000);
    } finally {
        isDeletingHistory = false;
        if (typeof updateInteractionLock === 'function') updateInteractionLock();
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.classList.remove('opacity-50', 'cursor-wait');
            deleteBtn.innerHTML = origHtml || '刪除';
        }
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-wait');
            saveBtn.innerHTML = origSaveHtml || '儲存';
        }
    }
}

window.moveExerciseInHistory = moveExerciseInHistory;