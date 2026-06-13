// js/ui-workoutsets.js
// Workout Sets / Custom Training Combinations UI
// Extracted as part of A (architecture refactor)

function renderWorkoutSetsBar() {
    const bar = document.getElementById('workout-sets-bar');
    if (!bar) {
        return;
    }
    bar.innerHTML = '';

    const isFs = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;
    const panel = document.getElementById('live-log-panel');
    const panelHidden = !!(panel && panel.classList.contains('hidden'));

    if (!currentUser) {
        // Show hint only when logged in context (training requires login anyway)
        const hint = document.createElement('span');
        hint.className = 'text-[10px] text-[#a8a29e] px-2';
        hint.textContent = '登入後可使用自訂 Workout Sets';
        bar.appendChild(hint);
        return;
    }

    // === 固定預設 Training Day（永遠顯示，frontend only，不可修改） ===
    // 使用 TRAINING_DAYS 作為唯一來源，確保與主訓練日 UI 一致。
    const fixedPresets = (typeof TRAINING_DAYS !== 'undefined' ? TRAINING_DAYS : []).map(day => ({
        name: day.fullName,
        exercises: day.exercises,
        isPreset: true
    }));

    // 先渲染三個固定預設 (text only, no images to avoid any placeholder)
    fixedPresets.forEach(preset => {
        const btn = document.createElement('button');
        // 固定預設用不同顏色（藍色系）以區分，並標示不可編輯
        let cls = 'text-xs px-3 py-1 bg-sky-700 hover:bg-sky-600 active:bg-sky-800 rounded-2xl transition flex items-center';
        btn.className = cls;
        btn.title = '固定預設訓練日（不可編輯 / 不可刪除）';
        btn.innerHTML = `<span class="font-medium">${preset.name}</span> <span class="text-[9px] opacity-70">🔒</span>`;
        btn.onclick = (e) => {
            loadWorkoutSet(preset);  // 直接用前端 preset 物件載入
        };
        bar.appendChild(btn);
    });

    // 然後渲染用戶自訂 Set（只來自後端，workoutSets 變數只存 custom, text only）
    (workoutSets || []).forEach(set => {
        const btn = document.createElement('button');
        let cls = 'text-xs px-3 py-1 bg-[#166534] hover:bg-emerald-800 active:bg-emerald-900 rounded-2xl transition flex items-center';
        const isLast = lastWorkoutSetName && set.name === lastWorkoutSetName;
        if (isLast) {
            cls += ' ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#1c1917]';
            btn.title = '上次使用的訓練組合（下次開始新訓練會自動接續）';
        } else {
            btn.title = '載入此自訂訓練組合到目前訓練';
        }
        btn.className = cls;
        btn.innerHTML = `<span class="font-medium">${set.name}</span>`;
        if (isLast) {
            btn.innerHTML += ` <span class="text-[10px] opacity-70">✓</span>`;
        }
        btn.onclick = (e) => {
            loadWorkoutSet(set);
        };
        bar.appendChild(btn);
    });

    // Prominent + button for managing (add/edit/delete) **custom** Workout Sets only
    const plus = document.createElement('button');
    plus.className = 'text-xs px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 active:bg-amber-700 text-white rounded-2xl font-bold flex items-center gap-1 border border-emerald-500/60';
    plus.title = '新增、編輯或刪除自訂 Workout Set（訓練組合）';
    plus.innerHTML = `<i class="fa-solid fa-plus"></i> <span class="font-semibold">+ 新增自訂 Set</span>`;
    plus.onclick = (e) => {
        showWorkoutSetModal();
    };
    bar.appendChild(plus);

    // Small help text only if user has no custom sets yet (presets are always shown above)
    if ((workoutSets || []).length === 0) {
        const empty = document.createElement('span');
        empty.className = 'text-[10px] text-[#a8a29e] ml-1';
        empty.textContent = '點 + 建立你的第一個自訂 Set';
        bar.appendChild(empty);
    }

    // Log at the end so we see the final state after populating.
    // Note: barVisible may be false if parent #live-log-panel is still hidden (pre-load or not in training yet).
    // We ensure content is ready so when panel is shown, bar is stable.
    // In fullscreen-training the ancestor is position:fixed, so offsetParent can legitimately be null even when the bar is visible and interactive inside the immersive panel.
    // Force-correct the visibility flag for fs so logs accurately reflect that the bar should be shown.
    let finalVisible = bar.offsetParent !== null;
    if (!finalVisible && (isFs || document.body.classList.contains('fullscreen-training') || isInFullScreenTraining)) {
        finalVisible = true;
    }

    // Robustness: explicitly ensure the bar (and its container) is visible and interactive in fullscreen.
    // Some layout/timing in fixed positioning can make offsetParent report false or CSS glitches hide children.
    if (isFs || document.body.classList.contains('fullscreen-training') || isInFullScreenTraining) {
        bar.style.display = 'flex';
        bar.style.visibility = 'visible';
        bar.style.opacity = '1';
        // Also ensure direct parent flex row (the justify-between container) is not accidentally collapsed
        const parentFlex = bar.parentElement;
        if (parentFlex && parentFlex.classList.contains('flex')) {
            parentFlex.style.display = 'flex';
            parentFlex.style.visibility = 'visible';
        }
    }
}

function loadWorkoutSet(set) {
    const isFullscreen = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;

    if (!set || !set.exercises || !set.exercises.length) return;

    const wasAlreadyTraining = !!currentWorkout;

    if (!currentWorkout) {
        // This will go through the guarded startNewWorkout (which will enter fullscreen only if not already in it)
        startNewWorkout();
    }

    // Append the set's exercises (deduped)
    set.exercises.forEach(name => {
        const ex = getExerciseByName(name);
        const displayName = ex ? getExerciseDisplay(ex) : name;
        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
            currentWorkout.exercises.push({ name: displayName, sets: [] });
        }
    });

    renderCurrentWorkout();
    updateSessionSummary();

    // Remember this choice so next time user starts a new workout, we can auto "接埋" it
    lastWorkoutSetName = set.name;
    saveWorkoutData();

    // Re-render the sets bar while in fullscreen so it stays fresh and interactive
    if (typeof renderWorkoutSetsBar === 'function') {
        renderWorkoutSetsBar();
    }

    // Auto-collapse the top sticky bar (header + timer hidden) after the user selects a training set.
    // Only the session-summary bar remains visible. This gives more room for the exercise list right after picking a 訓練組合.
    if (isFullscreen) {
        const topBar = document.getElementById('immersive-sticky-top');
        if (topBar && !topBar.classList.contains('collapsed')) {
            if (typeof toggleImmersiveTopCollapse === 'function') {
                toggleImmersiveTopCollapse();
            }
        }
    }

    // Explicit guarantee: we never want to exit full-screen just because user loaded a preset Set.
}

function showWorkoutSetModal(set = null) {
    const modal = document.getElementById('workoutSetModal');
    if (!modal) {
        console.error('#workoutSetModal not found in DOM');
        alert('Workout Set 視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
        return;
    }

    const isFs = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // When opened from inside full-screen training, the live-log-panel is forced to z-60.
    // Raise this modal above it so the Workout Set editor remains usable and interactive.
    if (isFs) {
        modal.style.zIndex = '85';
    } else {
        modal.style.zIndex = ''; // let the Tailwind z-50 apply in normal mode
    }

    currentEditingSet = set ? { ...set } : null;
    editingSetExercises = set && set.exercises ? [...set.exercises] : [];

    // Populate form
    const nameEl = document.getElementById('wset-name');
    if (nameEl) nameEl.value = currentEditingSet ? currentEditingSet.name : '';

    const delBtn = document.getElementById('wset-delete-btn');
    if (delBtn) delBtn.classList.toggle('hidden', !currentEditingSet);

    renderEditingSetExercises();
    renderExistingSetsList();

    // Focus name for new
    setTimeout(() => { if (nameEl && !currentEditingSet) nameEl.focus(); }, 50);
}

function hideWorkoutSetModal() {
    const modal = document.getElementById('workoutSetModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    // Reset any inline z-index we may have raised for full-screen
    modal.style.zIndex = '';

    currentEditingSet = null;
    editingSetExercises = [];

    // Refresh the bar (in case sets were added/edited/deleted while in training/fullscreen)
    if (typeof renderWorkoutSetsBar === 'function') {
        renderWorkoutSetsBar();
    }
}

function renderEditingSetExercises() {
    const container = document.getElementById('wset-exercises-list');
    if (!container) return;
    container.innerHTML = '';
    if (!editingSetExercises.length) {
        const empty = document.createElement('div');
        empty.className = 'text-xs text-[#a8a29e] italic';
        empty.textContent = '尚未加入任何動作。使用下方輸入或動作庫添加。';
        container.appendChild(empty);
        return;
    }
    editingSetExercises.forEach((name, idx) => {
        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-[#3f3a36] text-xs rounded-2xl border border-[#57534e]';
        chip.innerHTML = `
            <span class="max-w-[180px] truncate">${name}</span>
            <button class="text-red-400 hover:text-red-300 px-1" title="移除">×</button>
        `;
        chip.querySelector('button').onclick = () => {
            editingSetExercises.splice(idx, 1);
            renderEditingSetExercises();
        };
        container.appendChild(chip);
    });
}

function addExerciseToEditingSet(nameFromInput = null) {
    const input = document.getElementById('wset-add-exercise');
    let name = nameFromInput || (input ? input.value.trim() : '');
    if (!name) return;
    // Normalize to bilingual display name if possible
    const ex = getExerciseByName(name);
    const display = ex ? getExerciseDisplay(ex) : name;
    if (!editingSetExercises.find(n => n.toLowerCase() === display.toLowerCase())) {
        editingSetExercises.push(display);
    }
    if (input) input.value = '';
    renderEditingSetExercises();
}

// Helper: open library; for simplicity user can note name and paste, or we add to current workout if open.
// To keep non-intrusive we just open library (existing add-to-current is separate).
function showLibraryModalForSet() {
    // Open library. User can use search, then manually type the name in the set editor input.
    // (Advanced: could extend library to support "add to set" target, but out of scope for this change.)
    const libModal = document.getElementById('libraryModal');
    if (!libModal) {
        console.error('#libraryModal not found in DOM');
        alert('動作庫視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
        return;
    }
    if (typeof showLibraryModal === 'function') {
        const isFs = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;
        if (isFs) {
            libModal.style.zIndex = '90'; // ensure it sits above the immersive panel
        }
        showLibraryModal(false);
    }
}

async function saveCurrentWorkoutSet() {
    const nameEl = document.getElementById('wset-name');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) return alert('請輸入 Set 名稱');
    if (!editingSetExercises.length) return alert('請至少加入一個動作');

    const payload = {
        id: currentEditingSet && currentEditingSet.id ? currentEditingSet.id : undefined,
        name: name,
        exercises: [...editingSetExercises]
    };

    try {
        const res = await callAppsScript("saveWorkoutSet", { user: currentUser, set: payload });
        if (res && res.status === 'error') {
            alert('儲存失敗：' + (res.message || ''));
            return;
        }
        hideWorkoutSetModal();
        await loadWorkoutSets(true);  // force refresh after mutation to get latest from backend
        alert('Workout Set 已儲存！');
    } catch (e) {
        console.error(e);
        alert('儲存 Workout Set 時發生錯誤');
    }
}

async function deleteCurrentEditingSet() {
    if (!currentEditingSet || !currentEditingSet.id) {
        // For unsaved new, just clear form
        clearWorkoutSetForm();
        return;
    }
    if (!confirm('確定刪除此 Workout Set？')) return;
    try {
        await callAppsScript("deleteWorkoutSet", { user: currentUser, setId: currentEditingSet.id });
        hideWorkoutSetModal();
        await loadWorkoutSets(true);  // force refresh after mutation
    } catch (e) {
        alert('刪除失敗');
    }
}

function clearWorkoutSetForm() {
    currentEditingSet = null;
    editingSetExercises = [];
    const nameEl = document.getElementById('wset-name');
    if (nameEl) nameEl.value = '';
    const delBtn = document.getElementById('wset-delete-btn');
    if (delBtn) delBtn.classList.add('hidden');
    renderEditingSetExercises();
    // keep the existing list visible
}

async function renderExistingSetsList() {
    const container = document.getElementById('wset-existing-list');
    if (!container) return;
    container.innerHTML = '';
    if (!workoutSets || !workoutSets.length) {
        container.innerHTML = `<div class="text-xs text-[#a8a29e]">尚未有任何自訂 Workout Set。使用上方表單新增（固定預設訓練日已喺 Bar 上方顯示）。</div>`;
        return;
    }
    workoutSets.forEach(set => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center bg-[#292524] px-3 py-1.5 rounded-2xl text-sm';
        row.innerHTML = `
            <div class="flex-1 pr-2 truncate" title="${set.name}">${set.name} <span class="text-[10px] text-[#a8a29e]">(${set.exercises ? set.exercises.length : 0} 動作)</span></div>
            <div class="flex gap-1">
                <button class="text-emerald-400 text-xs px-2 py-0.5 hover:bg-emerald-900/30 rounded" title="載入到訓練">載入</button>
                <button class="text-[#a8a29e] text-xs px-2 py-0.5 hover:bg-[#3f3a36] rounded" title="編輯">編輯</button>
                <button class="text-red-400 text-xs px-2 py-0.5 hover:bg-red-900/30 rounded" title="刪除">刪</button>
            </div>
        `;
        // Bind
        const [loadBtn, editBtn, delBtn] = row.querySelectorAll('button');
        loadBtn.onclick = () => { hideWorkoutSetModal(); loadWorkoutSet(set); };
        editBtn.onclick = () => { showWorkoutSetModal(set); };  // re-open in edit mode (will reset list)
        delBtn.onclick = async () => {
            if (!confirm('確定刪除？')) return;
            if (!set.id) { alert('此 Set 暫無穩定 ID（請刷新頁面後再試，或等後端返回 id）。'); return; }
            try {
                await callAppsScript("deleteWorkoutSet", { user: currentUser, setId: set.id });
                await loadWorkoutSets(true);  // force refresh after mutation
                renderExistingSetsList();  // refresh inside modal too
            } catch (e) { alert('刪除失敗'); }
        };
        container.appendChild(row);
    });
}

// TRAINING_DAYS and DEFAULT_WORKOUT_SETS now come from js/data.js (A refactor)

function quickLoadFromPlan(day) {
    // LEGACY compatibility shim.
    // The 3 fixed Training Days are now rendered via static HTML + TRAINING_DAYS.
    // Custom sets are in the workout-sets-bar (only user-saved ones).

    const kwMap = {1: 'chest', 2: 'back', 3: 'leg'};
    const kw = kwMap[day] || '';
    const match = (workoutSets || []).find(s => (s.name || '').toLowerCase().includes(kw));
    if (match) {
        loadWorkoutSet(match);
        return;
    }
    if (!currentWorkout) startNewWorkout();
    alert('舊版快速載入已棄用。請使用訓練面板上的 Workout Sets 按鈕（或 + 自訂）。');
    renderCurrentWorkout();
}