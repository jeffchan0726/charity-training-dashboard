// js/ui-log.js
// Workout Log UI rendering and editing functions
// Extracted as part of A (architecture refactor) to reduce monolithic index.html

function addSetToExercise(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    const recordType = typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(ex.name) : 'weight';

    let newSet;

    if (recordType === 'treadmill') {
        const durationInput = document.getElementById(`set-duration-${exIdx}`);
        const inclineInput = document.getElementById(`set-incline-${exIdx}`);
        const speedInput = document.getElementById(`set-speed-${exIdx}`);
        const duration = parseInt(durationInput?.value) || 0;
        const incline = parseFloat(inclineInput?.value) || 0;
        const speed = parseFloat(speedInput?.value) || 0;

        if (duration <= 0) {
            alert('請輸入時間（分鐘）');
            return;
        }
        if (speed <= 0) {
            alert('請輸入速度（km/h）');
            return;
        }

        newSet = {
            duration,
            incline,
            speed,
            weight: 0,
            reps: 0,
            notes: '',
            volume: typeof calculateTreadmillDistanceKm === 'function'
                ? calculateTreadmillDistanceKm({ duration, incline, speed }) : 0,
            _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
    } else if (recordType === 'time_reps') {
        const durationInput = document.getElementById(`set-duration-${exIdx}`);
        const repsInput = document.getElementById(`set-reps-hold-${exIdx}`);
        const bodyWeightInput = document.getElementById(`set-body-weight-${exIdx}`);
        const duration = parseInt(durationInput?.value) || 0;
        const reps = parseInt(repsInput?.value) || 0;
        const bodyWeight = typeof rememberBodyWeightKg === 'function'
            ? rememberBodyWeightKg(bodyWeightInput?.value)
            : (parseFloat(bodyWeightInput?.value) || 0);

        if (duration <= 0) {
            alert('請輸入時間（秒）');
            return;
        }
        if (reps <= 0) {
            alert('請輸入次數');
            return;
        }
        if (typeof isBodyweightExercise === 'function' && isBodyweightExercise(ex.name) && bodyWeight <= 0) {
            alert('請輸入體重（kg）');
            return;
        }

        newSet = {
            duration,
            reps,
            weight: 0,
            body_weight: bodyWeight,
            notes: '',
            volume: typeof calculateSetVolume === 'function'
                ? calculateSetVolume({ duration, reps, body_weight: bodyWeight, weight: 0 }, ex.name) : 0,
            _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
    } else if (recordType === 'bodyweight') {
        const bodyWeightInput = document.getElementById(`set-body-weight-${exIdx}`);
        const repsInput = document.getElementById(`set-reps-${exIdx}`);
        const bodyWeight = typeof rememberBodyWeightKg === 'function'
            ? rememberBodyWeightKg(bodyWeightInput?.value)
            : (parseFloat(bodyWeightInput?.value) || 0);
        const reps = parseInt(repsInput?.value) || 0;

        if (bodyWeight <= 0) {
            alert('請輸入體重（kg）');
            return;
        }
        if (reps <= 0) {
            alert('請輸入次數');
            return;
        }

        const vol = typeof calculateSetVolume === 'function'
            ? calculateSetVolume({ body_weight: bodyWeight, reps, weight: 0 }, ex.name)
            : bodyWeight * reps;
        newSet = {
            weight: 0,
            body_weight: bodyWeight,
            reps,
            notes: '',
            volume: vol,
            _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
    } else {
        const weightInput = document.getElementById(`set-weight-${exIdx}`);
        const repsInput = document.getElementById(`set-reps-${exIdx}`);

        const weight = parseFloat(weightInput?.value) || 0;
        const reps = parseInt(repsInput?.value) || 0;

        if (reps <= 0) {
            alert('請輸入次數');
            return;
        }

        const vol = typeof calculateSetVolume === 'function'
            ? calculateSetVolume({ weight, reps }, ex.name)
            : weight * reps;
        newSet = { 
            weight, 
            reps, 
            notes: '', 
            volume: vol,
            _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
    }

    ex.sets.push(newSet);

    if (recordType === 'treadmill') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const iEl = document.getElementById(`set-incline-${exIdx}`);
        const sEl = document.getElementById(`set-speed-${exIdx}`);
        if (dEl) dEl.value = newSet.duration || '';
        if (iEl) iEl.value = newSet.incline ?? '';
        if (sEl) sEl.value = newSet.speed || '';
    } else if (recordType === 'time_reps') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const rEl = document.getElementById(`set-reps-hold-${exIdx}`);
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        if (dEl) dEl.value = newSet.duration || '';
        if (rEl) rEl.value = newSet.reps || '';
        if (bwEl && newSet.body_weight) bwEl.value = newSet.body_weight;
    } else if (recordType === 'bodyweight') {
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        const repsInput = document.getElementById(`set-reps-${exIdx}`);
        if (bwEl) bwEl.value = newSet.body_weight || '';
        if (repsInput) repsInput.value = newSet.reps || '';
    } else {
        const weightInput = document.getElementById(`set-weight-${exIdx}`);
        const repsInput = document.getElementById(`set-reps-${exIdx}`);
        if (weightInput) weightInput.value = newSet.weight || '';
        if (repsInput) repsInput.value = newSet.reps || '';
    }

    renderCurrentWorkout();
    updateSessionSummary();
    saveWorkoutData();

    if (currentUser && currentWorkout && currentWorkout.id) {
        backgroundSyncNewSet(ex.name, newSet, currentWorkout.id);
    }
}

function deleteSet(exIdx, setIdx) {
    if (!currentWorkout) {
        return;
    }

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

    const deletedSet = ex.sets[setIdx];
    ex.sets.splice(setIdx, 1);

    const logId = deletedSet && (deletedSet.id || deletedSet._clientLogId);
    if (currentUser && logId) {
        backgroundDeleteLog(logId);
    }

    renderCurrentWorkout();
    updateSessionSummary();
    saveWorkoutData();
}

function updateSetField(exIdx, setIdx, field, value) {
    if (!currentWorkout) return;
    const set = currentWorkout.exercises[exIdx].sets[setIdx];
    if (field === 'weight' || field === 'duration' || field === 'incline' || field === 'speed' || field === 'body_weight') {
        set[field] = parseFloat(value) || 0;
        if (field === 'body_weight' && typeof rememberBodyWeightKg === 'function') {
            rememberBodyWeightKg(set[field]);
        }
    } else if (field === 'reps') {
        set[field] = parseInt(value) || 0;
    } else {
        set[field] = value;
    }
    if (field === 'weight' || field === 'reps' || field === 'duration' || field === 'incline' || field === 'speed' || field === 'body_weight') {
        const ex = currentWorkout.exercises[exIdx];
        set.volume = calculateSetVolume(set, ex?.name);
        if (set._lastSynced) set._syncDirty = true;
    } else if (set._lastSynced) {
        set._syncDirty = true;
    }
    updateSessionSummary();
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
        const recordType = typeof getExerciseRecordType === 'function'
            ? getExerciseRecordType(ex.name) : 'weight';
        const isHold = recordType === 'time_reps';
        const isTreadmill = recordType === 'treadmill';
        const isBodyweight = recordType === 'bodyweight';
        const needsBodyWeight = (isHold || isBodyweight) && typeof isBodyweightExercise === 'function' && isBodyweightExercise(ex.name);
        let lastHtml = '';
        if (lastPerf && lastPerf.sets && lastPerf.sets.length) {
            lastHtml = '<div>Last:</div>';
            lastPerf.sets.forEach((s, i) => {
                const display = typeof formatSetDisplay === 'function'
                    ? formatSetDisplay(ex.name, s)
                    : (isHold ? `${s.duration || 0}秒 × ${s.reps || 0}次` : `${s.weight}kg × ${s.reps}`);
                lastHtml += `<div>set ${i+1} : ${display}</div>`;
            });
        }

        let imgSrc = getExerciseImage(ex.name);
        const muscle = getMuscleGroup(ex.name);

        let setsListHtml = '';
        if (ex.sets.length > 0) {
            ex.sets.forEach((set, sIdx) => {
                const setText = typeof formatSetDisplay === 'function'
                    ? formatSetDisplay(ex.name, set)
                    : `${set.weight || 0}kg × ${set.reps || 0}`;
                setsListHtml += `
                    <div class="flex items-center justify-between px-2 py-1 text-xs bg-[#1f1c1a] rounded-xl mt-1">
                        <span class="font-medium">set ${sIdx+1} : ${setText}</span>
                        <button onclick="deleteSet(${exIdx}, ${sIdx})" class="text-red-400 px-2 py-1 active:bg-red-900/30 rounded" title="刪除此組"><i class="fa-solid fa-times"></i></button>
                    </div>`;
            });
            setsListHtml = `<div class="mt-2 space-y-0.5">${setsListHtml}</div>`;
        } else {
            setsListHtml = `<div class="mt-1 px-1 text-[10px] text-[#a8a29e]">尚未有組數</div>`;
        }

        html += `
            <div class="exercise-log-card bg-[#252321] rounded-2xl p-2 border border-[#57534e] relative" data-ex-idx="${exIdx}">
                <div class="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                    <button type="button"
                            class="exercise-drag-handle"
                            data-ex-idx="${exIdx}"
                            onpointerdown="onExerciseDragHandlePointerDown(event, ${exIdx})"
                            onpointermove="onExerciseDragHandlePointerMove(event)"
                            onpointerup="onExerciseDragHandlePointerUp(event)"
                            onpointercancel="onExerciseDragHandlePointerCancel(event)"
                            title="按住 ↕ 拖動調整順序">
                        ↕
                    </button>
                    <button onclick="removeExerciseFromCurrent(${exIdx})" 
                            class="text-red-400 hover:text-red-300 px-1.5 py-0.5 text-base leading-none active:bg-red-900/30 rounded"
                            title="刪除此動作">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="flex gap-2 items-start">
                    <img src="${imgSrc}" 
                         class="w-14 h-14 object-contain bg-white rounded-xl flex-shrink-0 border border-[#3f3a36] cursor-pointer"
                         onerror="this.style.display='none';"
                         onclick="event.stopImmediatePropagation(); showExerciseDetail('${ex.name}');">
                    
                    <div class="flex-1 min-w-0 pr-14">
                        <div class="font-semibold text-sm leading-tight cursor-pointer" onclick="showExerciseDetail('${ex.name}');">${ex.name}</div>
                        <div class="flex items-center gap-1 mt-0.5">
                            <span class="muscle-chip text-[9px] px-1.5">${muscle}</span>
                            ${isTreadmill ? '<span class="text-[9px] px-1.5 py-0.5 bg-sky-900/50 text-sky-300 rounded-full">時間+坡度+速度</span>' : ''}
                            ${isHold ? '<span class="text-[9px] px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded-full">時間+次數</span>' : ''}
                            ${isBodyweight ? '<span class="text-[9px] px-1.5 py-0.5 bg-violet-900/50 text-violet-300 rounded-full">體重+次數</span>' : ''}
                        </div>
                        ${lastHtml ? `<div class="text-[10px] text-emerald-300/80 mt-0.5">${lastHtml}</div>` : ''}
                        <button onclick="copyLastToExercise(${exIdx})" 
                                class="mt-1 text-[10px] px-2 py-0.5 bg-[#166534]/70 hover:bg-emerald-800 active:bg-emerald-900 rounded text-white">使用上次</button>
                    </div>
                </div>

                <div class="mb-0.5 flex justify-end">
                    <button onclick="copyPrevSetToExercise(${exIdx})" 
                            class="text-[10px] px-2 py-0.5 bg-[#166534]/70 hover:bg-emerald-800 active:bg-emerald-900 rounded text-white">使用上組</button>
                </div>

                ${isTreadmill ? `
                <div class="mt-2 grid grid-cols-12 gap-1.5 items-end">
                    <div class="col-span-3">
                        <label class="text-[9px] text-[#a8a29e] mb-0.5 block">時間 (分)</label>
                        <input id="set-duration-${exIdx}" type="number" placeholder="20"
                               class="log-input w-full px-2 py-1.5 rounded-2xl text-sm text-center">
                    </div>
                    <div class="col-span-3">
                        <label class="text-[9px] text-[#a8a29e] mb-0.5 block">坡度 (%)</label>
                        <input id="set-incline-${exIdx}" type="number" step="0.5" placeholder="5"
                               class="log-input w-full px-2 py-1.5 rounded-2xl text-sm text-center">
                    </div>
                    <div class="col-span-3">
                        <label class="text-[9px] text-[#a8a29e] mb-0.5 block">速度 (km/h)</label>
                        <input id="set-speed-${exIdx}" type="number" step="0.1" placeholder="8.5"
                               class="log-input w-full px-2 py-1.5 rounded-2xl text-sm text-center">
                    </div>
                    <div class="col-span-3">
                        <button onclick="addSetToExercise(${exIdx})"
                                class="quick-add-btn w-full text-white px-2 py-1.5 text-sm font-semibold rounded-2xl flex items-center justify-center gap-x-1 min-h-[38px]">
                            <i class="fa-solid fa-plus"></i> <span>加組</span>
                        </button>
                    </div>
                </div>
                ` : isHold ? `
                <div class="mt-2 p-2 bg-[#1c1917] rounded-2xl border border-[#57534e]">
                    <div class="grid ${needsBodyWeight ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-1.5">
                        ${needsBodyWeight ? `
                        <div>
                            <label class="text-[9px] text-[#a8a29e] mb-0.5 block">體重 (kg)</label>
                            <input id="set-body-weight-${exIdx}" type="number" step="0.1" placeholder="kg"
                                   class="log-input w-full px-2 py-1 text-sm text-center rounded-2xl">
                        </div>` : ''}
                        <div>
                            <label class="text-[9px] text-[#a8a29e] mb-0.5 block">時間 (秒)</label>
                            <input id="set-duration-${exIdx}" type="number" placeholder="45" 
                                   class="log-input w-full px-2 py-1 text-sm text-center rounded-2xl">
                        </div>
                        <div>
                            <label class="text-[9px] text-[#a8a29e] mb-0.5 block">次數</label>
                            <input id="set-reps-hold-${exIdx}" type="number" placeholder="1" value="1"
                                   class="log-input w-full px-2 py-1 text-sm text-center rounded-2xl">
                        </div>
                    </div>
                    <button onclick="addSetToExercise(${exIdx})" 
                            class="w-full text-xs px-3 py-1.5 mb-2 bg-emerald-900 hover:bg-emerald-800 rounded-xl">手動記錄</button>

                    <div class="flex items-center gap-2">
                        <button onclick="startHoldTimer(${exIdx})" 
                                class="text-xs px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-2xl flex-1 min-h-[34px]">
                            <i class="fa-solid fa-play mr-1"></i> 開始計時
                        </button>
                        <button onclick="stopHoldTimer(${exIdx})" 
                                class="text-xs px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-2xl flex-1 min-h-[34px]">
                            <i class="fa-solid fa-stop mr-1"></i> 停止並記錄
                        </button>
                    </div>
                    <div id="hold-timer-display-${exIdx}" 
                         class="mt-1.5 text-center font-mono text-lg font-bold text-emerald-400 tabular-nums">
                        --:--
                    </div>

                    <div class="mt-2 text-[9px] flex flex-wrap gap-x-3 gap-y-0.5 text-[#a8a29e]">
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" ${holdTimerSettings.keepCountingOnScreenOff ? 'checked' : ''} 
                                   onchange="holdTimerSettings.keepCountingOnScreenOff = this.checked; saveWorkoutData();">
                            <span>keep counting even screen off</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" ${holdTimerSettings.disableAutoSleep ? 'checked' : ''} 
                                   onchange="holdTimerSettings.disableAutoSleep = this.checked; saveWorkoutData();">
                            <span>disable auto sleep</span>
                        </label>
                    </div>
                </div>
                ` : isBodyweight ? `
                <div class="mt-2 grid grid-cols-12 gap-1.5 items-end">
                    <div class="col-span-5">
                        <label for="set-body-weight-${exIdx}" class="text-[9px] text-[#a8a29e] mb-0.5 block">體重 (kg)</label>
                        <input id="set-body-weight-${exIdx}" type="number" step="0.1" placeholder="kg"
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
                ` : `
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
                `}

                <div class="sets-list mt-1">
                    ${setsListHtml}
                </div>
            </div>`;
    });
    container.innerHTML = html;

    updateSessionSummary();

    currentWorkout.exercises.forEach((ex, idx) => {
        const recordType = typeof getExerciseRecordType === 'function'
            ? getExerciseRecordType(ex.name) : 'weight';
        if (recordType === 'treadmill') {
            const dEl = document.getElementById(`set-duration-${idx}`);
            const iEl = document.getElementById(`set-incline-${idx}`);
            const sEl = document.getElementById(`set-speed-${idx}`);
            if (!dEl) return;
            const source = (ex.sets && ex.sets.length > 0) ? ex.sets[ex.sets.length - 1]
                : (lastPerformed[ex.name] && lastPerformed[ex.name].sets
                    ? lastPerformed[ex.name].sets.slice(-1)[0] : null);
            if (!source) return;
            if (!dEl.value && source.duration != null) dEl.value = source.duration;
            if (iEl && !iEl.value && source.incline != null) iEl.value = source.incline;
            if (sEl && !sEl.value && source.speed != null) sEl.value = source.speed;
        } else if (recordType === 'time_reps') {
            const dEl = document.getElementById(`set-duration-${idx}`);
            const rEl = document.getElementById(`set-reps-hold-${idx}`);
            const bwEl = document.getElementById(`set-body-weight-${idx}`);
            if (!dEl) return;
            const source = (ex.sets && ex.sets.length > 0) ? ex.sets[ex.sets.length-1]
                          : (lastPerformed[ex.name] && lastPerformed[ex.name].sets ? lastPerformed[ex.name].sets.slice(-1)[0] : null);
            if (source) {
                if (dEl && !dEl.value && source.duration != null) dEl.value = source.duration;
                if (rEl && !rEl.value && source.reps != null) rEl.value = source.reps;
                if (bwEl && !bwEl.value && source.body_weight != null) bwEl.value = source.body_weight;
            } else if (bwEl && !bwEl.value && typeof getLastBodyWeightKg === 'function') {
                const bw = getLastBodyWeightKg();
                if (bw > 0) bwEl.value = bw;
            }
        } else if (recordType === 'bodyweight') {
            const bwEl = document.getElementById(`set-body-weight-${idx}`);
            const rEl = document.getElementById(`set-reps-${idx}`);
            if (!bwEl || !rEl || (bwEl.value && rEl.value)) return;
            const source = (ex.sets && ex.sets.length > 0) ? ex.sets[ex.sets.length - 1]
                : (lastPerformed[ex.name] && lastPerformed[ex.name].sets
                    ? lastPerformed[ex.name].sets.slice(-1)[0] : null);
            if (source) {
                if (!bwEl.value) bwEl.value = source.body_weight || '';
                if (!rEl.value) rEl.value = source.reps || '';
            } else {
                const bw = typeof getLastBodyWeightKg === 'function' ? getLastBodyWeightKg() : 0;
                if (!bwEl.value && bw > 0) bwEl.value = bw;
            }
        } else {
            const wEl = document.getElementById(`set-weight-${idx}`);
            const rEl = document.getElementById(`set-reps-${idx}`);
            if (!wEl || !rEl || (wEl.value && rEl.value)) return;

            let source = null;
            if (ex.sets && ex.sets.length > 0) {
                source = ex.sets[ex.sets.length - 1];
            } else {
                const perf = lastPerformed[ex.name];
                if (perf && perf.sets && perf.sets.length > 0) source = perf.sets[perf.sets.length - 1];
            }
            if (source) {
                if (!wEl.value) wEl.value = source.weight || '';
                if (!rEl.value) rEl.value = source.reps || '';
            }
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
    const lastSet = lastPerf.sets[lastPerf.sets.length - 1];
    const recordType = typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(ex.name) : 'weight';
    if (recordType === 'treadmill') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const iEl = document.getElementById(`set-incline-${exIdx}`);
        const sEl = document.getElementById(`set-speed-${exIdx}`);
        if (dEl) dEl.value = lastSet.duration || '';
        if (iEl) iEl.value = lastSet.incline ?? '';
        if (sEl) sEl.value = lastSet.speed || '';
    } else if (recordType === 'time_reps') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const rEl = document.getElementById(`set-reps-hold-${exIdx}`);
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        if (dEl) dEl.value = lastSet.duration || '';
        if (rEl) rEl.value = lastSet.reps || 1;
        if (bwEl) bwEl.value = lastSet.body_weight || '';
    } else if (recordType === 'bodyweight') {
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        const rEl = document.getElementById(`set-reps-${exIdx}`);
        if (bwEl) bwEl.value = lastSet.body_weight || '';
        if (rEl) rEl.value = lastSet.reps || '';
    } else {
        const wEl = document.getElementById(`set-weight-${exIdx}`);
        const rEl = document.getElementById(`set-reps-${exIdx}`);
        if (wEl) wEl.value = lastSet.weight || '';
        if (rEl) rEl.value = lastSet.reps || '';
    }
}

function copyPrevSetToExercise(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    let source = null;
    if (ex.sets && ex.sets.length > 0) {
        source = ex.sets[ex.sets.length - 1];
    } else {
        const perf = lastPerformed[ex.name];
        if (perf && perf.sets && perf.sets.length > 0) {
            source = perf.sets[perf.sets.length - 1];
        }
    }
    if (!source) {
        return alert('沒有 ' + ex.name + ' 的上組數據');
    }
    const recordType = typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(ex.name) : 'weight';
    if (recordType === 'treadmill') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const iEl = document.getElementById(`set-incline-${exIdx}`);
        const sEl = document.getElementById(`set-speed-${exIdx}`);
        if (dEl) dEl.value = source.duration || '';
        if (iEl) iEl.value = source.incline ?? '';
        if (sEl) sEl.value = source.speed || '';
    } else if (recordType === 'time_reps') {
        const dEl = document.getElementById(`set-duration-${exIdx}`);
        const rEl = document.getElementById(`set-reps-hold-${exIdx}`);
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        if (dEl) dEl.value = source.duration || '';
        if (rEl) rEl.value = source.reps || 1;
        if (bwEl) bwEl.value = source.body_weight || '';
    } else if (recordType === 'bodyweight') {
        const bwEl = document.getElementById(`set-body-weight-${exIdx}`);
        const rEl = document.getElementById(`set-reps-${exIdx}`);
        if (bwEl) bwEl.value = source.body_weight || '';
        if (rEl) rEl.value = source.reps || '';
    } else {
        const wEl = document.getElementById(`set-weight-${exIdx}`);
        const rEl = document.getElementById(`set-reps-${exIdx}`);
        if (wEl) wEl.value = source.weight || '';
        if (rEl) rEl.value = source.reps || '';
    }
}

async function startHoldTimer(exIdx) {
    if (!currentWorkout) return;
    const ex = currentWorkout.exercises[exIdx];
    if (!ex) return;

    const durationInput = document.getElementById(`set-duration-${exIdx}`);
    const target = parseInt(durationInput?.value) || 0;
    if (target <= 0) {
        alert('請先輸入目標時間（秒）');
        return;
    }

    cancelHoldTimer(exIdx);

    const displayEl = document.getElementById(`hold-timer-display-${exIdx}`);
    if (!displayEl) return;

    const now = Date.now();
    activeHoldTimer = {
        exIdx,
        targetSeconds: target,
        startTimestamp: now,
        remaining: target,
        intervalId: null,
        wakeLock: null
    };

    if (holdTimerSettings.disableAutoSleep && 'wakeLock' in navigator) {
        try {
            activeHoldTimer.wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
            console.warn('Wake Lock request failed (non-fatal):', e);
        }
    }

    activeHoldTimer.intervalId = setInterval(() => {
        if (!activeHoldTimer) return;

        const elapsed = Math.floor((Date.now() - activeHoldTimer.startTimestamp) / 1000);
        let remaining = Math.max(0, activeHoldTimer.targetSeconds - elapsed);

        activeHoldTimer.remaining = remaining;

        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        displayEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            stopHoldTimer(exIdx, true);
        }
    }, 250);

    const visHandler = () => {
        if (!activeHoldTimer || document.visibilityState !== 'visible') return;
        if (!holdTimerSettings.keepCountingOnScreenOff) return;

        const elapsed = Math.floor((Date.now() - activeHoldTimer.startTimestamp) / 1000);
        let remaining = Math.max(0, activeHoldTimer.targetSeconds - elapsed);
        activeHoldTimer.remaining = remaining;

        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (displayEl) displayEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            stopHoldTimer(exIdx, true);
        }
    };
    document.addEventListener('visibilitychange', visHandler, { once: false });
    activeHoldTimer._visHandler = visHandler;

    displayEl.textContent = `${Math.floor(target/60)}:${(target%60).toString().padStart(2,'0')}`;
}

function cancelHoldTimer(exIdx) {
    if (!activeHoldTimer || activeHoldTimer.exIdx !== exIdx) return;

    const displayEl = document.getElementById(`hold-timer-display-${exIdx}`);

    clearInterval(activeHoldTimer.intervalId);

    if (activeHoldTimer._visHandler) {
        document.removeEventListener('visibilitychange', activeHoldTimer._visHandler);
    }

    if (activeHoldTimer.wakeLock) {
        activeHoldTimer.wakeLock.release().catch(() => {});
    }

    activeHoldTimer = null;

    if (displayEl) displayEl.textContent = '--:--';
}

function stopHoldTimer(exIdx, autoRecord = true) {
    if (!activeHoldTimer || activeHoldTimer.exIdx !== exIdx) return;

    const displayEl = document.getElementById(`hold-timer-display-${exIdx}`);
    const ex = currentWorkout && currentWorkout.exercises[exIdx];

    clearInterval(activeHoldTimer.intervalId);

    if (activeHoldTimer._visHandler) {
        document.removeEventListener('visibilitychange', activeHoldTimer._visHandler);
    }

    if (activeHoldTimer.wakeLock) {
        activeHoldTimer.wakeLock.release().catch(() => {});
    }

    const elapsed = Math.max(0, activeHoldTimer.targetSeconds - activeHoldTimer.remaining);
    const finalDuration = elapsed > 0 ? elapsed : activeHoldTimer.targetSeconds;

    activeHoldTimer = null;

    if (displayEl) displayEl.textContent = autoRecord ? '完成' : '--:--';

    if (autoRecord && finalDuration > 0) {
        if (ex) {
            const repsInput = document.getElementById(`set-reps-hold-${exIdx}`);
            const bodyWeightInput = document.getElementById(`set-body-weight-${exIdx}`);
            const reps = parseInt(repsInput?.value) || 1;
            const needsBw = typeof isBodyweightExercise === 'function' && isBodyweightExercise(ex.name);
            const bodyWeight = needsBw
                ? (typeof rememberBodyWeightKg === 'function'
                    ? rememberBodyWeightKg(bodyWeightInput?.value)
                    : (parseFloat(bodyWeightInput?.value) || 0))
                : 0;
            if (needsBw && bodyWeight <= 0 && autoRecord) {
                alert('請輸入體重（kg）');
                if (displayEl) displayEl.textContent = '--:--';
                return;
            }
            const newSet = {
                duration: Math.max(1, Math.round(finalDuration)),
                reps: reps > 0 ? reps : 1,
                weight: 0,
                body_weight: bodyWeight,
                notes: '',
                volume: typeof calculateSetVolume === 'function'
                    ? calculateSetVolume({
                        duration: Math.max(1, Math.round(finalDuration)),
                        reps: reps > 0 ? reps : 1,
                        body_weight: bodyWeight,
                        weight: 0
                    }, ex.name) : 0,
                _clientLogId: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };
            ex.sets.push(newSet);

            renderCurrentWorkout();
            updateSessionSummary();
            saveWorkoutData();

            if (currentUser && currentWorkout && currentWorkout.id) {
                backgroundSyncNewSet(ex.name, newSet, currentWorkout.id);
            }
        }
    }
}

let _exerciseDragState = null;

function _getExerciseDragContainerSel(context) {
    return context === 'history' ? '#history-edit-exercises' : '#current-workout-exercises';
}

function _moveExerciseByContext(context, fromIdx, toIdx) {
    if (context === 'history') {
        if (typeof moveExerciseInHistory === 'function') moveExerciseInHistory(fromIdx, toIdx);
    } else {
        moveExerciseInCurrent(fromIdx, toIdx);
    }
}

function moveExerciseInCurrent(fromIdx, toIdx) {
    if (!currentWorkout || fromIdx === toIdx) return;
    const exercises = currentWorkout.exercises;
    if (fromIdx < 0 || fromIdx >= exercises.length || toIdx < 0 || toIdx >= exercises.length) return;

    if (typeof activeHoldTimer !== 'undefined' && activeHoldTimer) {
        const timerIdx = activeHoldTimer.exIdx;
        if (timerIdx === fromIdx) {
            if (typeof cancelHoldTimer === 'function') cancelHoldTimer(fromIdx);
        } else if (fromIdx < toIdx && timerIdx > fromIdx && timerIdx <= toIdx) {
            activeHoldTimer.exIdx = timerIdx - 1;
        } else if (fromIdx > toIdx && timerIdx >= toIdx && timerIdx < fromIdx) {
            activeHoldTimer.exIdx = timerIdx + 1;
        }
    }

    const [item] = exercises.splice(fromIdx, 1);
    exercises.splice(toIdx, 0, item);
    renderCurrentWorkout();
    saveWorkoutData();
}

function onExerciseDragHandlePointerDown(e, exIdx, context = 'current') {
    const isHistory = context === 'history';
    if (isHistory ? !currentViewingHistory : !currentWorkout) return;
    const handle = e.currentTarget;
    const card = handle.closest('.exercise-log-card');
    if (!card) return;

    e.preventDefault();
    _exerciseDragState = {
        fromIdx: exIdx,
        card,
        pointerId: e.pointerId,
        hoverCard: card,
        context
    };

    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    card.classList.add('exercise-dragging');
    document.body.classList.add('exercise-drag-active');
}

function onExerciseDragHandlePointerMove(e) {
    if (!_exerciseDragState || e.pointerId !== _exerciseDragState.pointerId) return;
    e.preventDefault();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const targetCard = el?.closest?.('.exercise-log-card');
    const containerSel = _getExerciseDragContainerSel(_exerciseDragState.context);

    document.querySelectorAll(`${containerSel} .exercise-log-card`).forEach(c => {
        c.classList.remove('exercise-drag-over');
    });

    if (targetCard && targetCard.dataset.exIdx != null) {
        targetCard.classList.add('exercise-drag-over');
        _exerciseDragState.hoverCard = targetCard;
    }
}

function onExerciseDragHandlePointerUp(e) {
    if (!_exerciseDragState || e.pointerId !== _exerciseDragState.pointerId) return;

    const { fromIdx, card, hoverCard, context } = _exerciseDragState;
    const containerSel = _getExerciseDragContainerSel(context);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}

    card?.classList.remove('exercise-dragging');
    document.querySelectorAll(`${containerSel} .exercise-log-card`).forEach(c => {
        c.classList.remove('exercise-drag-over');
    });
    document.body.classList.remove('exercise-drag-active');

    if (hoverCard && hoverCard.dataset.exIdx != null) {
        const toIdx = parseInt(hoverCard.dataset.exIdx, 10);
        if (!isNaN(toIdx)) _moveExerciseByContext(context, fromIdx, toIdx);
    }

    _exerciseDragState = null;
}

function onExerciseDragHandlePointerCancel(e) {
    onExerciseDragHandlePointerUp(e);
}

window.startHoldTimer = startHoldTimer;
window.stopHoldTimer = stopHoldTimer;
window.cancelHoldTimer = cancelHoldTimer;
window.moveExerciseInCurrent = moveExerciseInCurrent;
window.onExerciseDragHandlePointerDown = onExerciseDragHandlePointerDown;
window.onExerciseDragHandlePointerMove = onExerciseDragHandlePointerMove;
window.onExerciseDragHandlePointerUp = onExerciseDragHandlePointerUp;
window.onExerciseDragHandlePointerCancel = onExerciseDragHandlePointerCancel;