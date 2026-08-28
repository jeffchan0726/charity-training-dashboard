// 朝早 checklist、補充劑剔位、訓練星期、習慣／飲水同步 Google Sheet

const DEFAULT_TRAIN_WEEKDAYS = [1, 3, 5];
const DEFAULT_WHEY_GRAMS = 30;
const WHEY_BASE_GRAMS = 30;
const WHEY_BASE = { calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5 };

const SUPPLEMENT_ITEMS = [
    { id: 'protein', name: 'Protein', slot: 'morning', when: '04:30', dose: '3 scoops' },
    { id: 'collagen', name: 'Collagen', slot: 'morning', when: '04:30', dose: '2 scoops' },
    { id: 'creatine', name: 'Creatine', slot: 'morning', when: '04:30', dose: '5g' },
    { id: 'vitd', name: 'Vitamin D3', slot: 'morning', when: '04:30', dose: '1粒' },
    { id: 'biotin', name: 'Biotin 生物素', slot: 'dinner', when: '晚餐隨餐', dose: '1粒' },
    { id: 'omega', name: 'Omega-3 Fish Oil', slot: 'dinner', when: '晚餐隨餐', dose: '3粒' },
    { id: 'dailyvits', name: 'NOW Daily Vits 多維', slot: 'dinner', when: '晚餐隨餐', dose: '1粒' },
    { id: 'zinc', name: 'Zinc Picolinate', slot: 'dinner', when: '晚餐隨餐', dose: '1粒' },
    { id: 'mag', name: 'Magnesium Glycinate', slot: 'night', when: '睡前', dose: '2粒' },
    { id: 'coq10', name: 'CoQ10 200mg', slot: 'night', when: '睡前', dose: '1粒' }
];

const WEEKDAY_LABELS_MON = [
    { jsDay: 1, short: '一' },
    { jsDay: 2, short: '二' },
    { jsDay: 3, short: '三' },
    { jsDay: 4, short: '四' },
    { jsDay: 5, short: '五' },
    { jsDay: 6, short: '六' },
    { jsDay: 0, short: '日' }
];

let habitPrefs = { trainingWeekdays: DEFAULT_TRAIN_WEEKDAYS.slice(), wheyGrams: DEFAULT_WHEY_GRAMS };
let habitDays = {};
let habitSaveTimer = null;
let recompTrendChart = null;

function habitsStorageKey() {
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
    return 'dailyHabits_' + user;
}

function habitsTodayKey() {
    return typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().slice(0, 10);
}

function loadHabitsLocal() {
    try {
        const raw = localStorage.getItem(habitsStorageKey());
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.prefs && typeof data.prefs === 'object') {
            habitPrefs.trainingWeekdays = normalizeTrainWeekdays(data.prefs.trainingWeekdays);
            const g = Number(data.prefs.wheyGrams);
            habitPrefs.wheyGrams = (g >= 15 && g <= 60) ? g : DEFAULT_WHEY_GRAMS;
        }
        if (data.days && typeof data.days === 'object') habitDays = data.days;
    } catch (e) {}
}

function saveHabitsLocal() {
    try {
        localStorage.setItem(habitsStorageKey(), JSON.stringify({
            prefs: habitPrefs,
            days: habitDays
        }));
    } catch (e) {}
}

function normalizeTrainWeekdays(arr) {
    const list = (Array.isArray(arr) ? arr : DEFAULT_TRAIN_WEEKDAYS)
        .map(function (n) { return Number(n); })
        .filter(function (n) { return n >= 0 && n <= 6; });
    const uniq = [];
    list.forEach(function (n) { if (uniq.indexOf(n) < 0) uniq.push(n); });
    return uniq.length ? uniq : DEFAULT_TRAIN_WEEKDAYS.slice();
}

function getTrainWeekdays() {
    return normalizeTrainWeekdays(habitPrefs.trainingWeekdays);
}

function getWheyGrams() {
    const g = Number(habitPrefs.wheyGrams);
    return (g >= 15 && g <= 60) ? g : DEFAULT_WHEY_GRAMS;
}

function getWheyQuickFood() {
    const g = getWheyGrams();
    const scale = g / WHEY_BASE_GRAMS;
    return {
        id: 'whey',
        name: '蛋白粉 ' + g + 'g',
        icon: '🥤',
        calories: Math.round(WHEY_BASE.calories * scale),
        protein_g: Math.round(WHEY_BASE.protein_g * scale * 10) / 10,
        carbs_g: Math.round(WHEY_BASE.carbs_g * scale * 10) / 10,
        fat_g: Math.round(WHEY_BASE.fat_g * scale * 10) / 10,
        portion: g + ' g'
    };
}

function ensureHabitDay(dateStr) {
    const key = dateStr || habitsTodayKey();
    if (!habitDays[key] || typeof habitDays[key] !== 'object') {
        habitDays[key] = { supp: {}, morningBundle: false };
    }
    if (!habitDays[key].supp) habitDays[key].supp = {};
    return habitDays[key];
}

function isSuppChecked(id, dateStr) {
    const day = ensureHabitDay(dateStr);
    return !!day.supp[id];
}

function morningSuppsDone(dateStr) {
    return SUPPLEMENT_ITEMS.filter(function (s) { return s.slot === 'morning'; })
        .every(function (s) { return isSuppChecked(s.id, dateStr); });
}

function setSuppChecked(id, on, dateStr) {
    const day = ensureHabitDay(dateStr);
    if (on) day.supp[id] = true;
    else delete day.supp[id];
    persistHabitsSoon();
    renderSupplementChecklist();
    renderMorningChecklist();
    renderOverviewDashboardSafe();
}

function toggleSuppChecked(id) {
    setSuppChecked(id, !isSuppChecked(id));
}

function setMorningSupps(on) {
    SUPPLEMENT_ITEMS.forEach(function (s) {
        if (s.slot === 'morning') {
            const day = ensureHabitDay();
            if (on) day.supp[s.id] = true;
            else delete day.supp[s.id];
        }
    });
    persistHabitsSoon();
    renderSupplementChecklist();
    renderMorningChecklist();
    renderOverviewDashboardSafe();
}

function persistHabitsSoon() {
    saveHabitsLocal();
    if (habitSaveTimer) clearTimeout(habitSaveTimer);
    habitSaveTimer = setTimeout(function () {
        habitSaveTimer = null;
        syncHabitsToSheet();
    }, 400);
}

function habitRecordsPayload() {
    const records = [{ key: 'prefs', record: habitPrefs }];
    Object.keys(habitDays).forEach(function (date) {
        const rec = habitDays[date] || {};
        rec.waterMl = (typeof waterByDate !== 'undefined' && waterByDate[date] != null)
            ? Number(waterByDate[date]) || 0
            : (Number(rec.waterMl) || 0);
        records.push({ key: date, record: rec });
    });
    if (typeof waterByDate !== 'undefined') {
        Object.keys(waterByDate).forEach(function (date) {
            if (habitDays[date]) return;
            records.push({ key: date, record: { waterMl: Number(waterByDate[date]) || 0, supp: {} } });
        });
    }
    return records;
}

function syncHabitsToSheet() {
    if (typeof currentUser === 'undefined' || !currentUser || typeof callAppsScript !== 'function') return;
    callAppsScript('saveHabitRecords', { records: habitRecordsPayload() }).catch(function () {});
}

function loadHabitsFromSheet() {
    loadHabitsLocal();
    if (typeof currentUser === 'undefined' || !currentUser || typeof callAppsScript !== 'function') {
        return Promise.resolve();
    }
    return callAppsScript('getHabitRecords', {}).then(function (res) {
        if (!res || res.status === 'error' || !Array.isArray(res.entries)) return;
        res.entries.forEach(function (row) {
            if (!row || !row.key) return;
            const rec = row.record && typeof row.record === 'object' ? row.record : {};
            if (row.key === 'prefs') {
                if (rec.trainingWeekdays) habitPrefs.trainingWeekdays = normalizeTrainWeekdays(rec.trainingWeekdays);
                const g = Number(rec.wheyGrams);
                if (g >= 15 && g <= 60) habitPrefs.wheyGrams = g;
                return;
            }
            const local = habitDays[row.key] || { supp: {} };
            const mergedSupp = Object.assign({}, rec.supp || {}, local.supp || {});
            habitDays[row.key] = Object.assign({}, rec, local, { supp: mergedSupp });
            const sheetWater = Number(rec.waterMl) || 0;
            if (typeof waterByDate !== 'undefined') {
                const localWater = Number(waterByDate[row.key]) || 0;
                waterByDate[row.key] = Math.max(localWater, sheetWater);
            }
        });
        saveHabitsLocal();
        if (typeof saveCalorieLog === 'function') saveCalorieLog();
        renderMorningChecklist();
        renderSupplementChecklist();
        renderTrainWeekStrip();
        if (typeof renderWaterTracker === 'function') renderWaterTracker();
        if (typeof renderQuickAddGrid === 'function') renderQuickAddGrid();
        renderOverviewDashboardSafe();
        if (typeof renderRecompTrend === 'function') renderRecompTrend();
    }).catch(function () {});
}

function notifyWaterChanged() {
    const key = habitsTodayKey();
    const day = ensureHabitDay(key);
    if (typeof waterByDate !== 'undefined') day.waterMl = Number(waterByDate[key]) || 0;
    persistHabitsSoon();
    renderOverviewDashboardSafe();
}

function setWheyGrams(g) {
    const n = Number(g);
    if (!(n >= 15 && n <= 60)) return;
    habitPrefs.wheyGrams = Math.round(n);
    persistHabitsSoon();
    if (typeof renderQuickAddGrid === 'function') renderQuickAddGrid();
    renderMorningChecklist();
}

function cycleWheyGrams() {
    const opts = [25, 30, 35, 40];
    const cur = getWheyGrams();
    const i = opts.indexOf(cur);
    setWheyGrams(opts[(i + 1) % opts.length]);
}

function toggleTrainWeekday(jsDay) {
    const day = Number(jsDay);
    if (!(day >= 0 && day <= 6)) return;
    let list = getTrainWeekdays().slice();
    const i = list.indexOf(day);
    if (i >= 0) {
        if (list.length <= 1) {
            if (typeof showToast === 'function') showToast('至少保留一日訓練');
            return;
        }
        list.splice(i, 1);
    } else {
        list.push(day);
    }
    habitPrefs.trainingWeekdays = normalizeTrainWeekdays(list);
    persistHabitsSoon();
    renderTrainWeekStrip();
    if (typeof markTrainingRestDay === 'function') markTrainingRestDay();
    renderOverviewDashboardSafe();
}

function renderTrainWeekStrip() {
    const el = document.getElementById('train-week-strip');
    if (!el) return;
    const train = getTrainWeekdays();
    const todayJs = new Date().getDay();
    el.innerHTML = WEEKDAY_LABELS_MON.map(function (d) {
        const on = train.indexOf(d.jsDay) >= 0;
        const ring = d.jsDay === todayJs ? ' ring-2 ring-emerald-400' : '';
        const cls = on
            ? 'bg-[#166534] text-white'
            : 'bg-[#292524] text-[#a8a29e]';
        return '<button type="button" class="rounded-xl py-1 ' + cls + ring + '" onclick="toggleTrainWeekday(' + d.jsDay + ')">' +
            '週' + d.short + '<br><span class="' + (on ? 'font-bold' : 'text-[9px]') + '">' + (on ? '訓練' : '休息') + '</span></button>';
    }).join('');
}

function workoutMatchesTrainingDay(w, day) {
    if (!w || !day) return false;
    const name = String(w.name || w.setName || w.title || w.workoutSetName || '');
    if (name && (name.indexOf(day.fullName) >= 0 || name.indexOf(day.label) >= 0)) return true;
    const exs = (w.exercises || []).map(function (e) { return e && e.name; }).filter(Boolean);
    if (!exs.length) return false;
    const hits = (day.exercises || []).filter(function (n) { return exs.indexOf(n) >= 0; }).length;
    return hits >= 3;
}

function trainingDayDoneThisWeek(day) {
    if (typeof getWeekStart !== 'function') return false;
    const weekStart = getWeekStart(new Date());
    const history = (typeof workoutHistory !== 'undefined' && Array.isArray(workoutHistory)) ? workoutHistory : [];
    return history.some(function (w) {
        if (!w || !w.date) return false;
        if (typeof workoutHasLoggedSets === 'function' && !workoutHasLoggedSets(w)) return false;
        const d = new Date(w.date + 'T00:00:00');
        if (d < weekStart) return false;
        return workoutMatchesTrainingDay(w, day);
    });
}

function getRecommendedTrainingDay() {
    const days = (typeof TRAINING_DAYS !== 'undefined') ? TRAINING_DAYS : [];
    for (let i = 0; i < days.length; i++) {
        if (!trainingDayDoneThisWeek(days[i])) return days[i];
    }
    return null;
}

function renderMorningChecklist() {
    const el = document.getElementById('overview-morning-list');
    if (!el) return;
    const whey = getWheyQuickFood();
    const items = [
        { id: 'egg3', label: '雞蛋 3隻', sub: '234 kcal · 19g 蛋白', quickId: 'egg3' },
        { id: 'whey', label: '蛋白粉 1 cup + 黑咖啡', sub: whey.calories + ' kcal · 蛋白 ' + whey.protein_g + ' g · 飲水 250 ml', quickId: 'whey' },
        { id: 'morningSupp', label: '朝早補充劑', sub: 'Protein / Collagen / Creatine / D3', habit: true }
    ];
    el.innerHTML = items.map(function (it) {
        const on = it.habit
            ? morningSuppsDone()
            : (typeof countTodayQuick === 'function' && countTodayQuick(it.quickId) > 0);
        return '<button type="button" class="habit-check-row' + (on ? ' on' : '') + '" onclick="toggleMorningItem(\'' + it.id + '\')">' +
            '<span class="habit-tick">' + (on ? '✓' : '') + '</span>' +
            '<span class="min-w-0 text-left"><span class="block text-sm font-semibold">' + it.label + '</span>' +
            '<span class="block text-[10px] text-[#a8a29e]">' + it.sub + '</span></span></button>';
    }).join('');
}

function toggleMorningItem(id) {
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    if (id === 'morningSupp') {
        setMorningSupps(!morningSuppsDone());
        return;
    }
    if (typeof countTodayQuick !== 'function') return;
    if (countTodayQuick(id) > 0) {
        if (typeof deleteLastQuickFood === 'function') deleteLastQuickFood(id);
        if (id === 'whey' && typeof deleteLastQuickFood === 'function') deleteLastQuickFood('coffee', 'whey');
        return;
    }
    if (id === 'whey' && typeof commitQuickFoodEntry === 'function') {
        commitQuickFoodEntry(getWheyQuickFood());
        const coffee = typeof getCoffeeQuickFood === 'function' ? getCoffeeQuickFood() : null;
        if (coffee) {
            commitQuickFoodEntry(Object.assign({}, coffee, {
                bundledWith: 'whey',
                userNote: '跟蛋白粉 1 cup 一齊'
            }));
        }
        return;
    }
    if (typeof addQuickFood === 'function') addQuickFood(id);
}

function renderSupplementChecklist() {
    const el = document.getElementById('supplement-check-list');
    if (!el) return;
    const slots = [
        { id: 'morning', title: '朝早 04:30' },
        { id: 'dinner', title: '晚餐隨餐' },
        { id: 'night', title: '睡前' }
    ];
    el.innerHTML = slots.map(function (slot) {
        const rows = SUPPLEMENT_ITEMS.filter(function (s) { return s.slot === slot.id; }).map(function (s) {
            const on = isSuppChecked(s.id);
            return '<button type="button" class="habit-check-row' + (on ? ' on' : '') + '" onclick="toggleSuppChecked(\'' + s.id + '\')">' +
                '<span class="habit-tick">' + (on ? '✓' : '') + '</span>' +
                '<span class="min-w-0 text-left"><span class="block text-sm font-semibold">' + s.name + '</span>' +
                '<span class="block text-[10px] text-[#a8a29e]">' + s.dose + '</span></span></button>';
        }).join('');
        return '<div class="mb-3"><div class="text-[11px] uppercase tracking-widest text-emerald-300 font-bold mb-1.5">' +
            slot.title + '</div>' + rows + '</div>';
    }).join('');
}

function renderOverviewDashboardSafe() {
    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
}

let recompDietChart = null;

function collectTrendSeries() {
    const days = 14;
    const labels = [];
    const weights = [];
    const bfs = [];
    const kcals = [];
    const proteins = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const body = typeof getBodyLog === 'function' ? getBodyLog() : [];
    const meals = Array.isArray(calorieLogEntries) ? calorieLogEntries : [];
    function dateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = dateKey(d);
        labels.push((d.getMonth() + 1) + '/' + d.getDate());
        let w = null;
        let bf = null;
        body.forEach(function (row) {
            const rk = String(row.date || (row.weighedAt || '')).slice(0, 10);
            if (rk !== key) return;
            if (row.weight != null) w = Number(row.weight);
            if (row.bf != null) bf = Number(row.bf);
        });
        weights.push(w);
        bfs.push(bf);
        const dayMeals = meals.filter(function (e) { return e && e.date === key; });
        const k = dayMeals.reduce(function (s, e) { return s + (Number(e.calories) || 0); }, 0);
        const p = dayMeals.reduce(function (s, e) { return s + (Number(e.protein_g) || 0); }, 0);
        kcals.push(k > 0 ? k : null);
        proteins.push(p > 0 ? p : null);
    }
    return { labels: labels, weights: weights, bfs: bfs, kcals: kcals, proteins: proteins };
}

function makeMiniLineChart(canvas, labels, a, b, aLabel, bLabel, aColor, bColor, aAxis, bAxis) {
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: aLabel, data: a, borderColor: aColor, backgroundColor: 'transparent', yAxisID: 'y', spanGaps: true, tension: 0.3, pointRadius: 2 },
                { label: bLabel, data: b, borderColor: bColor, backgroundColor: 'transparent', yAxisID: 'y1', spanGaps: true, tension: 0.3, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#a8a29e', boxWidth: 10, font: { size: 10 } } } },
            scales: {
                x: { ticks: { color: '#a8a29e', font: { size: 9 } }, grid: { color: '#292524' } },
                y: { position: 'left', ticks: { color: aColor, font: { size: 9 } }, grid: { color: '#292524' }, title: { display: true, text: aAxis, color: aColor, font: { size: 9 } } },
                y1: { position: 'right', ticks: { color: bColor, font: { size: 9 } }, grid: { drawOnChartArea: false }, title: { display: true, text: bAxis, color: bColor, font: { size: 9 } } }
            }
        }
    });
}

function renderRecompTrend() {
    const bodyCanvas = document.getElementById('recomp-trend-body');
    const dietCanvas = document.getElementById('recomp-trend-diet');
    if (typeof Chart === 'undefined' || !bodyCanvas || !dietCanvas) return;
    const s = collectTrendSeries();
    const hasBody = s.weights.some(function (v) { return v != null; }) || s.bfs.some(function (v) { return v != null; });
    const hasFood = s.kcals.some(function (v) { return v != null; }) || s.proteins.some(function (v) { return v != null; });
    const empty = document.getElementById('recomp-trend-empty');
    if (empty) empty.classList.toggle('hidden', hasBody || hasFood);
    if (recompTrendChart) { recompTrendChart.destroy(); recompTrendChart = null; }
    if (recompDietChart) { recompDietChart.destroy(); recompDietChart = null; }
    recompTrendChart = makeMiniLineChart(bodyCanvas, s.labels, s.weights, s.bfs, '體重', '體脂', '#4ade80', '#fbbf24', 'kg', '%');
    recompDietChart = makeMiniLineChart(dietCanvas, s.labels, s.kcals, s.proteins, '熱量', '蛋白', '#38bdf8', '#c4b5fd', 'kcal', 'g');
}

loadHabitsLocal();
