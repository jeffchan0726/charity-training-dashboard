// js/ui-library.js
// Library / 動作庫 UI and related
// Extracted as part of A (architecture refactor)

// --- Library ---
// currentLibraryFilter moved to js/state.js (A refactor)

function showLibraryModal(addToCurrent = false) {
    const modal = document.getElementById('libraryModal');
    if (!modal) {
        console.error('#libraryModal not found in DOM');
        alert('動作庫視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
        return;
    }
    const isFs = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    window._libraryAddToCurrent = addToCurrent;

    // In full-screen immersive mode, the live-log-panel is forced to z-60.
    // Boost library modal above it so it can open and be interactive.
    if (isFs) {
        modal.style.zIndex = '90';

    } else {
        modal.style.zIndex = '';
    }

    renderLibraryList();
    renderCategoryFilters();
}

function hideLibraryModal() {
    const lib = document.getElementById('libraryModal');
    if (lib) {
        lib.classList.add('hidden');
        lib.classList.remove('flex');
        lib.style.zIndex = ''; // reset any fullscreen boost
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('library-categories');
    container.innerHTML = '';
    EXERCISE_CATEGORIES.forEach(cat => {
        const chip = document.createElement('button');
        chip.className = `px-2.5 py-0.5 text-xs rounded-2xl border ${currentLibraryFilter === cat ? 'bg-emerald-900 border-emerald-600' : 'border-[#57534e] hover:bg-[#292524]'}`;
        chip.textContent = cat;
        chip.onclick = () => {
            currentLibraryFilter = (currentLibraryFilter === cat) ? null : cat;
            renderCategoryFilters();
            renderLibraryList();
        };
        container.appendChild(chip);
    });
    const all = document.createElement('button');
    all.className = 'px-2.5 py-0.5 text-xs rounded-2xl border border-[#57534e]';
    all.textContent = '全部';
    all.onclick = () => { currentLibraryFilter = null; renderCategoryFilters(); renderLibraryList(); };
    container.appendChild(all);
}

function filterLibrary() {
    renderLibraryList();
}

function renderLibraryList() {
    const container = document.getElementById('library-list');
    const searchVal = (document.getElementById('library-search')?.value || '').toLowerCase().trim();
    container.innerHTML = '';

    let filtered = EXERCISES;
    if (currentLibraryFilter) filtered = filtered.filter(e => e.muscle_group === currentLibraryFilter);
    if (searchVal) {
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(searchVal)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-sm text-[#a8a29e] py-4">沒有符合的項目。試試在動作庫新增自訂。</div>`;
        return;
    }

    filtered.forEach(ex => {
        const display = getExerciseDisplay(ex);
        const id = ex.id || display.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const div = document.createElement('div');
        div.className = 'exercise-card bg-[#292524] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.985] transition flex flex-col';
        div.onclick = () => showExerciseDetail(ex.name);
        div.innerHTML = `
            <div class="relative bg-[#1c1917]">
                <img src="${ex.image}" class="w-full h-32 object-contain" loading="lazy" onerror="this.style.display='none';">
                <div class="absolute top-1 right-1 bg-black/50 text-[9px] px-1 rounded">${ex.muscle_group}</div>
            </div>
            <div class="p-2 flex-1">
                <div class="font-medium text-sm leading-tight truncate">${display}</div>
            </div>
            <div class="px-2 pb-2">
                <button onclick="event.stopImmediatePropagation(); useExerciseFromLibrary('${ex.name}');" class="text-xs px-2.5 py-1 bg-emerald-900/70 hover:bg-emerald-800 rounded w-full">加入</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function showExerciseDetail(nameOrObj) {
    const modal = document.getElementById('exerciseDetailModal');
    if (!modal) return;

    let ex = typeof nameOrObj === 'string' ? getExerciseByName(nameOrObj) : nameOrObj;
    if (!ex && typeof nameOrObj === 'string') {
        ex = { name: nameOrObj, muscle_group: '全身' };
    }
    if (!ex) return;

    const displayName = getExerciseDisplay(ex);
    const id = (ex.id || nameOrObj || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const gifEl = document.getElementById('detail-gif');
    // Use original image path for detail (no GIF, no placeholder)
    gifEl.src = ex.image || '';
    gifEl.onerror = () => { gifEl.style.display = 'none'; };

    document.getElementById('detail-name').textContent = displayName;
    document.getElementById('detail-muscle').textContent = ex.muscle_group || '全身';

    const diagram = document.getElementById('detail-muscle-diagram');
    diagram.innerHTML = '';
    const muscles = (ex.muscle_group || '全身').split('+').map(m => m.trim());
    muscles.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'px-2 py-0.5 text-[10px] bg-emerald-900/70 text-emerald-300 rounded-full';
        chip.textContent = m;
        diagram.appendChild(chip);
    });

    const tipsEl = document.getElementById('detail-tips');
    tipsEl.innerHTML = '';
    const tips = getExpertTips(displayName);
    tips.forEach(tip => {
        const li = document.createElement('li');
        li.className = 'flex gap-2';
        li.innerHTML = `<span class="text-emerald-400">•</span> <span>${tip}</span>`;
        tipsEl.appendChild(li);
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideExerciseDetail() {
    const modal = document.getElementById('exerciseDetailModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function getExpertTips(name) {
    const map = {
        "上斜啞鈴推胸 (Incline Dumbbell Press)": [
            "肩胛骨下壓後縮，胸大肌上部發力（Muscle & Fitness）",
            "手肘 45° 角，避免肩關節過度前移",
            "頂點停 1 秒擠壓，避免借力",
            "下降時手肘低於肩線，保護肩袖"
        ],
        "平板啞鈴推胸 (Flat Dumbbell Press)": [
            "背部自然拱起，腳穩穩踩地（Athlean-X）",
            "啞鈴軌跡呈弧線而非直線",
            "頂點鎖死手肘會增加肩壓，保持微屈",
            "組間休息 90-120 秒"
        ],
        "腹輪 (Ab Wheel Rollout)": [
            "從跪姿開始，核心全程收緊（Jeff Nippard）",
            "臀部不要塌，保持身體成一直線",
            "範圍由小到大，別一開始就全伸",
            "吸氣時滾出，呼氣時收回"
        ],
        "硬拉 (Deadlift)": [
            "髖部先啟動，然後膝蓋，保持背部中立（Athlean-X）",
            "槓鈴貼近小腿，肩胛骨下壓",
            "頂點臀部夾緊，但不要過度伸展",
            "下降時控制，別讓槓鈴彈起"
        ],
        "引體向上 (Pull-ups)": [
            "肩胛骨先下壓後縮，胸部向槓靠近（Jeff Nippard）",
            "避免甩動或借力，全程控制",
            "下巴過槓為完成",
            "如果做不到，用彈力帶輔助或負重引體"
        ],
        "澤奇深蹲 (Zercher Squats)": [
            "槓鈴放在肘彎，胸部挺起，核心緊（Muscle & Fitness）",
            "膝蓋與腳趾同向，臀部向後坐",
            "深度到大腿平行或更低",
            "站起時髖部先推"
        ],
        "側舉 (Lateral Raises)": [
            "手肘微屈，帶動小臂而非甩手（Athlean-X）",
            "頂點手肘與肩同高",
            "下降慢 3 秒",
            "避免聳肩，保持肩胛穩定"
        ],
        "龍旗 (Dragon Flag)": [
            "從肩胛骨開始，核心全程收緊（Jeff Nippard）",
            "身體成一直線，臀部不要塌",
            "從小範圍開始，漸進增加",
            "吸氣準備，呼氣控制下降"
        ],
        "default": [
            "保持核心穩定，動作全程控制",
            "頂點充分收縮目標肌肉",
            "下降階段慢而受控（3 秒）",
            "呼吸配合：用力時吐氣"
        ]
    };
    return map[name] || map["default"];
}

function useExerciseFromLibrary(name) {
    const addToCurrent = window._libraryAddToCurrent;
    const setModal = document.getElementById('workoutSetModal');
    const isEditingSet = setModal && !setModal.classList.contains('hidden');
    const ex = getExerciseByName(name) || {name: name};
    const displayName = getExerciseDisplay(ex);

    if (isEditingSet) {
        // Special: adding to the Workout Set editor instead of current workout
        if (!editingSetExercises.find(n => n.toLowerCase() === displayName.toLowerCase())) {
            editingSetExercises.push(displayName);
        }
        renderEditingSetExercises();
        hideLibraryModal();
        return;
    }

    hideLibraryModal();
    if (addToCurrent && currentWorkout) {
        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
            currentWorkout.exercises.push({name: displayName, sets: []});
            renderCurrentWorkout();
        }
    } else {
        if (!currentWorkout) startNewWorkout();
        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
            currentWorkout.exercises.push({name: displayName, sets: []});
            renderCurrentWorkout();
        }
    }
}

function showAddCustomExercise() {
    hideLibraryModal();
    const modal = document.getElementById('customExerciseModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    const nameInput = document.getElementById('custom-name');
    if (nameInput) nameInput.focus();
}

function hideCustomExerciseModal() {
    const modal = document.getElementById('customExerciseModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    // Reopen library if needed
    setTimeout(() => {
        const lib = document.getElementById('libraryModal');
        if (lib && !lib.classList.contains('hidden')) return;
    }, 10);
}

function saveCustomExercise() {
    let name = document.getElementById('custom-name').value.trim();
    const category = document.getElementById('custom-category').value;
    if (!name) return;
    const ex = getExerciseByName(name);
    if (ex) name = ex.name; // normalize to canonical bilingual if matches
    if (exerciseLibrary.find(e => e.name.toLowerCase() === name.toLowerCase())) {
        alert('動作已存在');
        return;
    }
    exerciseLibrary.push({name, category});
    saveWorkoutData();
    hideCustomExerciseModal();
    showLibraryModal(window._libraryAddToCurrent);
}