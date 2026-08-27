// js/ui-app.js
// App shell: 5-tab IA, 千年任務, 今日總覽, 日行千里, 身體日誌, 打卡, 組間休息

const APP_TAB_ALIAS = {
    yugong: 'millennium',
    rixing: 'millennium',
    schedule: 'schedule',
    supplement: 'supplement',
    training: 'training'
};
const APP_MAIN_NAV = {
    overview: 'overview',
    log: 'log',
    calories: 'calories',
    millennium: 'millennium',
    me: 'me',
    yugong: 'millennium',
    rixing: 'millennium',
    schedule: 'me',
    supplement: 'me',
    training: 'me'
};

let restTimerInterval = null;
let restTimerEndsAt = 0;
let calorieDailyProteinGoal = 150;

function getAppStorageKey(suffix) {
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
    return suffix + '_' + user;
}

function showMillenniumPanel(panel) {
    const yugong = document.getElementById('content-yugong');
    const rixing = document.getElementById('content-rixing');
    const btnY = document.getElementById('mill-sub-yugong');
    const btnR = document.getElementById('mill-sub-rixing');
    if (yugong) yugong.classList.toggle('hidden', panel !== 'yugong');
    if (rixing) rixing.classList.toggle('hidden', panel !== 'rixing');
    [btnY, btnR].forEach(function (btn) {
        if (!btn) return;
        btn.classList.remove('bg-[#166534]', 'text-white');
        btn.classList.add('bg-[#292524]', 'border', 'border-[#44403c]');
    });
    const active = panel === 'rixing' ? btnR : btnY;
    if (active) {
        active.classList.add('bg-[#166534]', 'text-white');
        active.classList.remove('bg-[#292524]', 'border', 'border-[#44403c]');
    }
    if (panel === 'yugong' && typeof initYugongTab === 'function') initYugongTab();
    if (panel === 'rixing') renderRixingTab();
}

function startTrainingDay(dayId) {
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    const day = (typeof TRAINING_DAYS !== 'undefined' ? TRAINING_DAYS : []).find(function (d) {
        return Number(d.id) === Number(dayId);
    });
    if (!day) return;
    if (typeof switchTab === 'function') switchTab('log');
    if (typeof loadWorkoutSet === 'function') {
        loadWorkoutSet({ name: day.fullName, exercises: day.exercises, isPreset: true });
    }
}

function startCardioFromRixing() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    if (typeof switchTab === 'function') switchTab('log');
    if (typeof startNewWorkout === 'function' && !currentWorkout) startNewWorkout();
    const name = '跑步機 (Treadmill)';
    if (currentWorkout && !(currentWorkout.exercises || []).some(function (e) { return e.name === name; })) {
        currentWorkout.exercises.push({ name: name, sets: [] });
        if (typeof renderCurrentWorkout === 'function') renderCurrentWorkout();
        if (typeof saveWorkoutData === 'function') saveWorkoutData();
    }
}

function getWeekStart(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? 6 : day - 1;
    x.setDate(x.getDate() - diff);
    return x;
}

function localDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function renderOverviewDashboard() {
    const todayStr = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
    const history = Array.isArray(workoutHistory) ? workoutHistory : [];
    const trainedToday = history.some(function (w) { return w && w.date === todayStr; });
    const weekStart = getWeekStart(new Date());
    const weekWorkouts = history.filter(function (w) {
        if (!w || !w.date) return false;
        const d = new Date(w.date + 'T00:00:00');
        return d >= weekStart;
    }).length;

    const kcalToday = (typeof getTodayCalorieEntries === 'function' ? getTodayCalorieEntries() : [])
        .reduce(function (s, e) { return s + (Number(e.calories) || 0); }, 0);
    const goal = typeof calorieDailyGoalKcal === 'number' ? calorieDailyGoalKcal : 2000;

    const body = getBodyLog();
    const latest = body[0];
    const weightEl = document.getElementById('overview-weight');
    if (weightEl) {
        const w = (latest && latest.weight) || (typeof lastBodyWeightKg === 'number' ? lastBodyWeightKg : null);
        weightEl.innerHTML = w ? (w + ' <span class="text-base font-medium text-[#a8a29e]">kg</span>') : '<span class="text-xl text-[#a8a29e]">未有</span>';
    }
    const kcalEl = document.getElementById('overview-kcal');
    if (kcalEl) kcalEl.innerHTML = Math.round(kcalToday) + ' <span class="text-base font-medium text-[#a8a29e]">/ ' + goal + '</span>';
    const weekEl = document.getElementById('overview-week-workouts');
    if (weekEl) weekEl.innerHTML = weekWorkouts + ' <span class="text-base font-medium text-[#a8a29e]">日</span>';
    const yugongEl = document.getElementById('overview-yugong');
    if (yugongEl && typeof getYugongStats === 'function') {
        const st = getYugongStats();
        yugongEl.textContent = (st.progressPct || 0).toFixed(1) + '%';
    } else if (yugongEl) yugongEl.innerHTML = '<span class="text-xl text-[#a8a29e]">0%</span>';

    const statusEl = document.getElementById('overview-today-status');
    const subEl = document.getElementById('overview-today-sub');
    const rest = isRestDayToday();
    if (statusEl) {
        if (!currentUser) statusEl.textContent = '登入開始今日訓練';
        else if (trainedToday) statusEl.textContent = '今日已完成訓練';
        else if (rest) statusEl.textContent = '今日休息日';
        else statusEl.textContent = '今日未訓練';
    }
    if (subEl) {
        if (!currentUser) subEl.textContent = '登入之後就可以記訓練同飲食。';
        else if (rest) subEl.textContent = '恢復日。可以行下、伸展，或者記一餐。';
        else subEl.textContent = '蛋白質目標 ' + calorieDailyProteinGoal + ' g · 熱量目標 ' + goal + ' kcal';
    }
    markTrainingRestDay();
}

function isRestDayToday() {
    const day = new Date().getDay();
    return day === 0 || day === 2 || day === 4 || day === 6;
}

function markTrainingRestDay() {
    const cells = document.querySelectorAll('#content-training .grid-cols-7 > div');
    if (!cells.length) return;
    const idx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    cells.forEach(function (el, i) {
        el.classList.toggle('ring-2', i === idx);
        el.classList.toggle('ring-emerald-400', i === idx);
    });
}

function renderRixingTab() {
    const todayStr = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
    const sessions = [];
    (workoutHistory || []).forEach(function (w) {
        (w.exercises || []).forEach(function (ex) {
            const rt = typeof getExerciseRecordType === 'function' ? getExerciseRecordType(ex.name) : '';
            if (rt !== 'treadmill') return;
            const km = (ex.sets || []).reduce(function (s, set) { return s + (Number(set.volume) || 0); }, 0);
            if (km > 0) sessions.push({ date: w.date, km: km, name: ex.name });
        });
    });
    const todayKm = sessions.filter(function (s) { return s.date === todayStr; })
        .reduce(function (s, x) { return s + x.km; }, 0);
    const weekKm = sessions.filter(function (s) {
        const d = new Date(s.date + 'T00:00:00');
        return d >= new Date(Date.now() - 6 * 86400000);
    }).reduce(function (s, x) { return s + x.km; }, 0);
    const todayEl = document.getElementById('rixing-today-km');
    const weekEl = document.getElementById('rixing-week-km');
    if (todayEl) todayEl.textContent = todayKm.toFixed(2) + ' km';
    if (weekEl) weekEl.textContent = weekKm.toFixed(2) + ' km';

    const bars = document.getElementById('rixing-week-bars');
    if (bars) {
        const labels = ['一', '二', '三', '四', '五', '六', '日'];
        const start = getWeekStart(new Date());
        const max = Math.max(1, ...Array.from({ length: 7 }, function (_, i) {
            const ds = new Date(start); ds.setDate(start.getDate() + i);
            const key = localDateStr(ds);
            return sessions.filter(function (s) { return s.date === key; }).reduce(function (a, b) { return a + b.km; }, 0);
        }));
        bars.innerHTML = labels.map(function (lab, i) {
            const ds = new Date(start); ds.setDate(start.getDate() + i);
            const key = localDateStr(ds);
            const km = sessions.filter(function (s) { return s.date === key; }).reduce(function (a, b) { return a + b.km; }, 0);
            const h = Math.round((km / max) * 64);
            return '<div class="flex flex-col items-center justify-end gap-1"><div class="w-full bg-emerald-500 rounded-t" style="height:' + h + 'px"></div><span class="text-[9px] text-[#a8a29e]">' + lab + '</span></div>';
        }).join('');
    }
    const list = document.getElementById('rixing-recent-list');
    if (list) {
        const recent = sessions.slice(0, 8);
        list.innerHTML = recent.length
            ? recent.map(function (s) {
                return '<li class="flex justify-between bg-[#292524] rounded-xl px-3 py-2"><span>' + s.date + '</span><span class="text-emerald-300">' + s.km.toFixed(2) + ' km</span></li>';
            }).join('')
            : '<li>未有跑步機紀錄。去訓練頁加入跑步機。</li>';
    }
}

function startRestTimer(seconds) {
    const sec = Number(seconds) || 90;
    restTimerEndsAt = Date.now() + sec * 1000;
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.classList.remove('hidden');
    if (restTimerInterval) clearInterval(restTimerInterval);
    tickRestTimer();
    restTimerInterval = setInterval(tickRestTimer, 250);
}

function tickRestTimer() {
    const left = Math.max(0, Math.ceil((restTimerEndsAt - Date.now()) / 1000));
    const el = document.getElementById('rest-timer-display');
    if (el) {
        const m = Math.floor(left / 60);
        const s = left % 60;
        el.textContent = m + ':' + String(s).padStart(2, '0');
    }
    if (left <= 0) {
        skipRestTimer();
        if (typeof showToast === 'function') showToast('休息完，下一組');
    }
}

function skipRestTimer() {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = null;
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.classList.add('hidden');
}

function getBodyLog() {
    try {
        const raw = localStorage.getItem(getAppStorageKey('bodyLog'));
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }) : [];
    } catch (e) { return []; }
}

function saveBodyLogEntry() {
    const todayStr = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
    const weight = parseFloat(document.getElementById('body-weight-input')?.value) || 0;
    const bf = parseFloat(document.getElementById('body-bf-input')?.value) || 0;
    const waist = parseFloat(document.getElementById('body-waist-input')?.value) || 0;
    if (!weight && !bf && !waist) {
        if (typeof showToast === 'function') showToast('請至少填一項');
        return;
    }
    const list = getBodyLog().filter(function (e) { return e.date !== todayStr; });
    list.unshift({ date: todayStr, weight: weight || null, bf: bf || null, waist: waist || null });
    localStorage.setItem(getAppStorageKey('bodyLog'), JSON.stringify(list.slice(0, 90)));
    if (weight && typeof rememberBodyWeightKg === 'function') rememberBodyWeightKg(weight);
    else if (weight) lastBodyWeightKg = weight;
    renderBodyLog();
    renderOverviewDashboard();
    if (typeof showToast === 'function') showToast('已儲存身體數據');
}

function renderBodyLog() {
    const list = document.getElementById('body-log-list');
    if (!list) return;
    const rows = getBodyLog().slice(0, 8);
    list.innerHTML = rows.length
        ? rows.map(function (e) {
            return '<li>' + e.date + ' · ' +
                (e.weight ? e.weight + 'kg ' : '') +
                (e.bf ? e.bf + '% ' : '') +
                (e.waist ? e.waist + 'cm' : '') + '</li>';
        }).join('')
        : '<li>未有紀錄</li>';
    const latest = rows[0];
    if (latest) {
        const w = document.getElementById('body-weight-input');
        const b = document.getElementById('body-bf-input');
        const wa = document.getElementById('body-waist-input');
        if (w && !w.value && latest.weight) w.value = latest.weight;
        if (b && !b.value && latest.bf) b.value = latest.bf;
        if (wa && !wa.value && latest.waist) wa.value = latest.waist;
    }
}

const HABIT_ITEMS = [
    { id: 'train', label: '完成訓練或主動休息' },
    { id: 'protein', label: '蛋白／早餐補充劑' },
    { id: 'water', label: '喝水達標' },
    { id: 'dinner_sup', label: '晚餐補充劑' },
    { id: 'sleep_sup', label: '睡前鎂／CoQ10' },
    { id: 'photo_meal', label: '至少記一餐' }
];

function getHabitsToday() {
    const todayStr = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
    try {
        const raw = localStorage.getItem(getAppStorageKey('habits_' + todayStr));
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function toggleHabit(id) {
    const todayStr = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
    const map = getHabitsToday();
    map[id] = !map[id];
    localStorage.setItem(getAppStorageKey('habits_' + todayStr), JSON.stringify(map));
    renderHabits();
}

function renderHabits() {
    const wrap = document.getElementById('habit-list');
    if (!wrap) return;
    const map = getHabitsToday();
    wrap.innerHTML = HABIT_ITEMS.map(function (h) {
        const on = !!map[h.id];
        return '<label class="flex items-center gap-2 text-sm bg-[#292524] rounded-xl px-3 py-2">' +
            '<input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="toggleHabit(\'' + h.id + '\')">' +
            '<span>' + h.label + '</span></label>';
    }).join('');
}

function renderDietWeekBars() {
    const el = document.getElementById('diet-week-bars');
    if (!el) return;
    const start = getWeekStart(new Date());
    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    const entries = Array.isArray(calorieLogEntries) ? calorieLogEntries : [];
    const goal = typeof calorieDailyGoalKcal === 'number' ? calorieDailyGoalKcal : 2000;
    const days = labels.map(function (lab, i) {
        const ds = new Date(start); ds.setDate(start.getDate() + i);
        const key = localDateStr(ds);
        const kcal = entries.filter(function (e) { return e && e.date === key; })
            .reduce(function (s, e) { return s + (Number(e.calories) || 0); }, 0);
        return { lab: lab, kcal: kcal };
    });
    const max = Math.max(goal, ...days.map(function (d) { return d.kcal; }), 1);
    el.innerHTML = days.map(function (d) {
        const h = Math.round((d.kcal / max) * 72);
        return '<div class="flex flex-col items-center justify-end gap-1"><div class="w-full bg-emerald-500/80 rounded-t" style="height:' + h + 'px"></div><span class="text-[9px] text-[#a8a29e]">' + d.lab + '</span></div>';
    }).join('');
    const pIn = document.getElementById('calorie-protein-goal-input');
    if (pIn) pIn.value = String(calorieDailyProteinGoal);
}

function saveProteinGoal() {
    const n = parseInt(document.getElementById('calorie-protein-goal-input')?.value, 10);
    if (n >= 40 && n <= 300) {
        calorieDailyProteinGoal = n;
        localStorage.setItem(getAppStorageKey('proteinGoal'), String(n));
        if (typeof showToast === 'function') showToast('蛋白質目標 ' + n + ' g');
    }
}

function copyLastCalorieMeal() {
    const list = Array.isArray(calorieLogEntries) ? calorieLogEntries : [];
    if (!list.length) {
        if (typeof showToast === 'function') showToast('未有上一餐');
        return;
    }
    const src = list[0];
    const now = new Date();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'cal_' + now.getTime();
    copy.date = typeof getTodayStr === 'function' ? getTodayStr() : now.toISOString().slice(0, 10);
    copy.time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    copy.createdAt = now.getTime();
    calorieLogEntries.unshift(copy);
    if (typeof saveCalorieLog === 'function') saveCalorieLog();
    if (typeof renderCalorieTodaySummary === 'function') renderCalorieTodaySummary();
    if (typeof renderCalorieTodayList === 'function') renderCalorieTodayList();
    renderDietWeekBars();
    if (typeof showToast === 'function') showToast('已複製上一餐到今日');
}

function updateCalorieItemGrams(idx, grams) {
    const g = Number(grams);
    if (!calorieLastResult || !calorieLastResult.items || !calorieLastResult.items[idx]) return;
    const item = calorieLastResult.items[idx];
    const oldG = Number(String(item.portion || '').replace(/[^\d.]/g, '')) || 0;
    const scale = oldG > 0 && g > 0 ? g / oldG : 1;
    item.portion = Math.round(g) + ' g';
    item.calories = Math.round((Number(item.calories) || 0) * scale);
    item.protein_g = Math.round((Number(item.protein_g) || 0) * scale * 10) / 10;
    item.carbs_g = Math.round((Number(item.carbs_g) || 0) * scale * 10) / 10;
    item.fat_g = Math.round((Number(item.fat_g) || 0) * scale * 10) / 10;
    calorieLastResult.calories = (calorieLastResult.items || []).reduce(function (s, it) { return s + (Number(it.calories) || 0); }, 0);
    calorieLastResult.protein_g = (calorieLastResult.items || []).reduce(function (s, it) { return s + (Number(it.protein_g) || 0); }, 0);
    calorieLastResult.carbs_g = (calorieLastResult.items || []).reduce(function (s, it) { return s + (Number(it.carbs_g) || 0); }, 0);
    calorieLastResult.fat_g = (calorieLastResult.items || []).reduce(function (s, it) { return s + (Number(it.fat_g) || 0); }, 0);
    const i = calorieLogEntries.findIndex(function (e) { return e.id === calorieLastResult.id; });
    if (i >= 0) calorieLogEntries[i] = calorieLastResult;
    if (typeof saveCalorieLog === 'function') saveCalorieLog();
    if (typeof renderCalorieResult === 'function') renderCalorieResult(calorieLastResult);
    if (typeof renderCalorieTodaySummary === 'function') renderCalorieTodaySummary();
    if (typeof renderCalorieTodayList === 'function') renderCalorieTodayList();
}

function suggestProgressiveOverload(exerciseName) {
    const perf = typeof lastPerformed !== 'undefined' ? lastPerformed[exerciseName] : null;
    const last = perf && perf.sets && perf.sets.length ? perf.sets[perf.sets.length - 1] : null;
    if (!last || !last.weight) return '';
    if ((last.reps || 0) >= 10) return '建議下一組 ' + (Number(last.weight) + 2.5) + ' kg';
    return '上次 ' + last.weight + ' kg × ' + (last.reps || 0);
}

function exportLocalBackup() {
    const payload = {
        exportedAt: new Date().toISOString(),
        user: currentUser || 'guest',
        workoutHistory: workoutHistory || [],
        calorieLogEntries: calorieLogEntries || [],
        bodyLog: getBodyLog()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recomp-backup-' + (payload.user) + '.json';
    a.click();
}

function onAppTabShown(tab) {
    if (tab === 'overview') renderOverviewDashboard();
    if (tab === 'millennium') showMillenniumPanel('yugong');
    if (tab === 'me') {
        renderBodyLog();
        renderHabits();
        renderDietWeekBars();
    }
    if (tab === 'yugong') {
        showMillenniumPanel('yugong');
    }
    if (tab === 'rixing') {
        showMillenniumPanel('rixing');
    }
}

function loadAppPrefs() {
    const n = parseInt(localStorage.getItem(getAppStorageKey('proteinGoal')), 10);
    if (n >= 40 && n <= 300) calorieDailyProteinGoal = n;
}

function refreshAppShell() {
    loadAppPrefs();
    renderOverviewDashboard();
    renderBodyLog();
    renderHabits();
    renderDietWeekBars();
}

loadAppPrefs();
