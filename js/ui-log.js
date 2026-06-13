// js/ui-log.js
// Workout Log UI rendering and editing functions
// Extracted as part of A (architecture refactor) to reduce monolithic index.html

function addSetToExercise(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    const weightInput = document.getElementById(`set-weight-${exIdx}`);
    const repsInput = document.getElementById(`set-reps-${exIdx}`);

    const weight = parseFloat(weightInput?.value) || 0;
    const reps = parseInt(repsInput?.value) || 0;

    if (reps <= 0) {
        alert('請輸入次數');
        return;
    }

    const vol = weight * reps;
    const newSet = { 
        weight, 
        reps, 
        notes: '', 
        volume: vol,
        _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)  // for delete sync
    };

    ex.sets.push(newSet);

    // Do NOT overwrite lastPerformed here - it holds historical previous session full record for "Last" display.
    // Prefill for next set in current session comes from the just-added ex.sets in renderCurrentWorkout prefill logic.

    // Keep values in quick add for fast consecutive sets (common in FitNotes)
    if (weightInput) weightInput.value = weight || '';
    if (repsInput) repsInput.value = reps || '';

    renderCurrentWorkout();
    updateSessionSummary();
    saveWorkoutData();

    // === Background incremental upload (non-blocking) ===
    // Local is always instant; this is best-effort partial backup during training.
    // IMPORTANT: 訓練中 incremental sync 只係 best-effort。
    // Finish 流程（confirmFinishWorkout）會使用 finalizeAndSaveWorkout 做 deleteSession + addWorkout，
    // 確保最終只有一次乾淨、有正確 session_id 的完整 workout。
    if (currentUser && currentWorkout && currentWorkout.id) {
        backgroundSyncNewSet(ex.name, newSet, currentWorkout.id);
    }

    // (休息計時器已移除，無需自動啟動)
}

function deleteSet(exIdx, setIdx) {
    if (!currentWorkout) {
        return;
    }

    // Error handling: validate indexes
    if (typeof exIdx !== 'number' || exIdx < 0 || exIdx >= currentWorkout.exercises.length) {
        return;
    }

    const ex = currentWorkout.exercises[exIdx];
    if (!ex || !Array.isArray(ex.sets)) {
        return;
    }

    if (typeof setIdx !== 'number' || setIdx < 0 || setIdx >= ex.sets.length) {
        return;
    }

    // Perform deletion
    const deletedSet = ex.sets[setIdx];
    ex.sets.splice(setIdx, 1);

    // Background delete sync if we have the synced log id (id or _clientLogId for backward)
    const logId = deletedSet && (deletedSet.id || deletedSet._clientLogId);
    if (currentUser && logId) {
        backgroundDeleteLog(logId);
    }

    // Re-render everything for consistency (works in fullscreen + normal mode)
    renderCurrentWorkout();
    updateSessionSummary();
    saveWorkoutData();
}

function updateSetField(exIdx, setIdx, field, value) {
    if (!currentWorkout) return;
    const set = currentWorkout.exercises[exIdx].sets[setIdx];
    set[field] = (field === 'weight') ? parseFloat(value) || 0 : (field === 'reps' ? parseInt(value) || 0 : value);
    if (field === 'weight' || field === 'reps') {
        set.volume = calculateSetVolume(set);
    }
    updateSessionSummary();
    // Auto-save on field edits (debounce not strictly needed for localStorage)
    saveWorkoutData();
}

function renderCurrentWorkout() {

    const container = document.getElementById('current-workout-exercises');
    const countEl = document.getElementById('current-workout-exercise-count');
    if (!currentWorkout || !container) return;

    countEl.textContent = `${currentWorkout.exercises.length} 個動作`;

    if (currentWorkout.exercises.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-xs text-[#a8a29e]">尚未加入動作。使用下方輸入或從動作庫選擇。</div>`;
        return;
    }

    let html = '';
    currentWorkout.exercises.forEach((ex, exIdx) => {
        const lastPerf = lastPerformed[ex.name];
        let lastHtml = '';
        if (lastPerf && lastPerf.sets && lastPerf.sets.length) {
            lastHtml = '<div>Last:</div>';
            lastPerf.sets.forEach((s, i) => {
                lastHtml += `<div>set ${i+1} : ${s.weight}kg × ${s.reps}</div>`;
            });
        }

        let imgSrc = getExerciseImage(ex.name);
        const muscle = getMuscleGroup(ex.name);

        // Build added sets list (display only, with delete) - "set 1 : 10kg × 10"
        // Always show a section so we can display "尚未有組數" when empty.
        let setsListHtml = '';
        if (ex.sets.length > 0) {
            ex.sets.forEach((set, sIdx) => {
                setsListHtml += `
                    <div class="flex items-center justify-between px-2 py-1 text-xs bg-[#1f1c1a] rounded-xl mt-1">
                        <span class="font-medium">set ${sIdx+1} : ${set.weight}kg × ${set.reps}</span>
                        <button onclick="deleteSet(${exIdx}, ${sIdx})" class="text-red-400 px-2 py-1 active:bg-red-900/30 rounded" title="刪除此組"><i class="fa-solid fa-times"></i></button>
                    </div>`;
            });
            setsListHtml = `<div class="mt-2 space-y-0.5">${setsListHtml}</div>`;
        } else {
            setsListHtml = `<div class="mt-1 px-1 text-[10px] text-[#a8a29e]">尚未有組數</div>`;
        }

        html += `
            <div class="exercise-log-card bg-[#252321] rounded-2xl p-2 border border-[#57534e] relative">
                <!-- Delete entire exercise button - top right, always visible even if 0 sets -->
                <button onclick="removeExerciseFromCurrent(${exIdx})" 
                        class="absolute top-1 right-1 text-red-400 hover:text-red-300 px-1.5 py-0.5 text-base leading-none z-10 active:bg-red-900/30 rounded"
                        title="刪除此動作">
                    <i class="fa-solid fa-times"></i>
                </button>
                <div class="flex gap-2 items-start">
                    <!-- Left: Image 56x56 rounded (clean path, no fallback) -->
                    <img src="${imgSrc}" 
                         class="w-14 h-14 object-contain bg-white rounded-xl flex-shrink-0 border border-[#3f3a36] cursor-pointer"
                         onerror="this.style.display='none';"
                         onclick="event.stopImmediatePropagation(); showExerciseDetail('${ex.name}');">
                    
                    <div class="flex-1 min-w-0">
                        <!-- Bilingual name -->
                        <div class="font-semibold text-sm leading-tight cursor-pointer" onclick="showExerciseDetail('${ex.name}');">${ex.name}</div>
                        <!-- Muscle chip -->
                        <div class="flex items-center gap-1 mt-0.5">
                            <span class="muscle-chip text-[9px] px-1.5">${muscle}</span>
                        </div>
                        <!-- Last line: multi-set format -->
                        ${lastHtml ? `<div class="text-[10px] text-emerald-300/80 mt-0.5">${lastHtml}</div>` : ''}
                        <!-- 使用上次 button -->
                        <button onclick="copyLastToExercise(${exIdx})" 
                                class="mt-1 text-[10px] px-2 py-0.5 bg-[#166534]/70 hover:bg-emerald-800 active:bg-emerald-900 rounded text-white">使用上次</button>
                    </div>
                </div>

                <!-- Quick Add: ONLY kg + reps  -->
                <!-- 小型「使用上組」方便按鈕：一鍵將目前 workout 該動作最後一組（或歷史上次）的 reps/weight 複製到 quick-add 輸入欄（供編輯中的 current input fields 使用）。嚴格跟隨現有樣式、內聯 onclick、zh-HK 標籤、Tailwind classes。 -->
                <div class="mb-0.5 flex justify-end">
                    <button onclick="copyPrevSetToExercise(${exIdx})" 
                            class="text-[10px] px-2 py-0.5 bg-[#166534]/70 hover:bg-emerald-800 active:bg-emerald-900 rounded text-white">使用上組</button>
                </div>
                <div class="mt-2 grid grid-cols-12 gap-1.5 items-end">
                    <div class="col-span-5">
                        <label for="set-weight-${exIdx}" class="text-[9px] text-[#a8a29e] mb-0.5 block">重量 (kg)</label>
                        <input id="set-weight-${exIdx}" type="number" step="0.5" placeholder="kg" 
                               class="log-input w-full px-2 py-1.5 rounded-2xl text-sm text-center">
                    </div>
                    <div class="col-span-4">
                        <label for="set-reps-${exIdx}" class="text-[9px] text-[#a8a29e] mb-0.5 block">次數</label>
                        <input id="set-reps-${exIdx}" type="number" placeholder="reps" 
                               class="log-input w-full px-2 py-1.5 rounded-2xl text-sm text-center">
                    </div>
                    <div class="col-span-3">
                        <button onclick="addSetToExercise(${exIdx})" 
                                class="quick-add-btn w-full text-white px-3 py-1.5 text-sm font-semibold rounded-2xl flex items-center justify-center gap-x-1 min-h-[38px]">
                            <i class="fa-solid fa-plus"></i> <span>加組</span>
                        </button>
                    </div>
                </div>

                <!-- Below: list of added sets "set 1 : 10kg × 10" with delete, or empty state prompt -->
                <!-- When no sets, show "尚未有組數" as requested -->
                <div class="sets-list mt-1">
                    ${setsListHtml}
                </div>
            </div>`;
    });
    container.innerHTML = html;

    // Ensure summary is up to date after full re-render (especially important in fullscreen)
    updateSessionSummary();

    // Pre-fill quick kg/reps:
    // Priority: last set logged in *this current workout* for the ex (for fast multi-set logging)
    // Fallback: last set from historical previous session (lastPerformed stores full sets for Last display)
    currentWorkout.exercises.forEach((ex, idx) => {
        const wEl = document.getElementById(`set-weight-${idx}`);
        const rEl = document.getElementById(`set-reps-${idx}`);
        if (!wEl || !rEl || (wEl.value && rEl.value)) return;

        let source = null;
        if (ex.sets && ex.sets.length > 0) {
            // live from current session
            source = ex.sets[ex.sets.length - 1];
        } else {
            // historical
            const perf = lastPerformed[ex.name];
            if (perf && perf.sets && perf.sets.length > 0) {
                source = perf.sets[perf.sets.length - 1];
            }
        }
        if (source) {
            if (!wEl.value) wEl.value = source.weight || '';
            if (!rEl.value) rEl.value = source.reps || '';
        }
    });
}

function copyLastToExercise(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    const lastPerf = lastPerformed[ex.name];
    if (!lastPerf || !lastPerf.sets || lastPerf.sets.length === 0) {
        return alert('沒有 ' + ex.name + ' 的上次數據');
    }
    // Copy the last set from the previous performance (for quick add prefill)
    const lastSet = lastPerf.sets[lastPerf.sets.length - 1];
    const wEl = document.getElementById(`set-weight-${exIdx}`);
    const rEl = document.getElementById(`set-reps-${exIdx}`);
    if (wEl) wEl.value = lastSet.weight || '';
    if (rEl) rEl.value = lastSet.reps || '';
}

function copyPrevSetToExercise(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    let source = null;
    if (ex.sets && ex.sets.length > 0) {
        // last completed set from current workout (previous sets in this session)
        source = ex.sets[ex.sets.length - 1];
    } else {
        // fallback to previous sets from history (lastPerformed), to match prefill + task requirement
        const perf = lastPerformed[ex.name];
        if (perf && perf.sets && perf.sets.length > 0) {
            source = perf.sets[perf.sets.length - 1];
        }
    }
    if (!source) {
        return alert('沒有 ' + ex.name + ' 的上組數據');
    }
    // Copy previous set values from last completed set (current workout's sets or lastPerformed previous) into quick-add inputs.
    // Exact same pattern as copyLastToExercise: direct value set, no save/render, inline JS, zh-HK alert/text.
    const wEl = document.getElementById(`set-weight-${exIdx}`);
    const rEl = document.getElementById(`set-reps-${exIdx}`);
    if (wEl) wEl.value = source.weight || '';
    if (rEl) rEl.value = source.reps || '';
}