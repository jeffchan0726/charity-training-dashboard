// js/ui-calendar.js
// Calendar rendering and month navigation + debug helper
// Extracted as part of A (architecture refactor)

function renderCalendar(year, month) {
    const grid = document.getElementById('calendar-grid');
    const titleEl = document.getElementById('calendar-title');
    const muscleContainer = document.getElementById('muscle-volume-bars');
    if (!grid) return;

    // 處理年月狀態：若未提供參數，則使用目前狀態；若無狀態則預設為今天
    if (year == null || month == null) {
        if (currentCalendarYear == null || currentCalendarMonth == null) {
            const nowInit = new Date();
            currentCalendarYear = nowInit.getFullYear();
            currentCalendarMonth = nowInit.getMonth();
        }
        year = currentCalendarYear;
        month = currentCalendarMonth;
    } else {
        // 更新狀態（切換月份時會寫入）
        currentCalendarYear = year;
        currentCalendarMonth = month;
    }

    grid.innerHTML = '';

    // 更新年月標題
    if (titleEl) {
        titleEl.textContent = `${year} 年 ${month + 1} 月`;
    }

    const firstDay = new Date(year, month, 1).getDay();           // 0=日 ... 6=六
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 使用共用 grouping 計算該月每一天的訓練量（與訓練歷史完全一致）
    const grouped = groupWorkoutsByDate();
    const volByDay = {};
    Object.keys(grouped).forEach(key => {
        const g = grouped[key];
        const [y, m, d] = key.split('-').map(Number);
        if (y === year && (m - 1) === month) {
            volByDay[d] = g.intensityScore != null ? g.intensityScore : (g.totalWeightKg || g.totalVolume || 0);
        }
    });

    const volValues = Object.values(volByDay);
    const maxVol = volValues.length > 0 ? Math.max(1, ...volValues) : 1;

    const today = new Date();

    const isViewingCurrentMonth = (year === today.getFullYear() && month === today.getMonth());

    // 前面空白日子（對齊星期）
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'h-9 rounded bg-[#252321] opacity-30';
        grid.appendChild(empty);
    }

    // 渲染每一天
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const v = volByDay[day] || 0;
        const intensity = (maxVol > 0) ? Math.min(1, v / maxVol) : 0;
        const bg = (v > 0)
            ? `rgba(74, 222, 128, ${0.25 + intensity * 0.65})`
            : '#252321';

        let cellClass = `h-9 flex items-center justify-center text-[10px] rounded cursor-pointer transition-all ${v > 0 ? 'text-white font-medium hover:brightness-110' : 'text-[#a8a29e]'}`;

        // 今日 highlight（只在查看當月時）
        if (isViewingCurrentMonth && day === today.getDate()) {
            cellClass += ' ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1c1917] font-semibold';
        }

        cell.className = cellClass;
        cell.style.background = bg;
        cell.innerHTML = `${day}`;

        if (v > 0) {
            // 有記錄才可點擊，顯示該日所有訓練（與歷史卡片一致，支援 grouping）
            cell.classList.add('calendar-workout-day');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cell.onclick = () => showWorkoutDetailForDate(dateStr);
        } else {
            cell.style.cursor = 'default';
        }

        grid.appendChild(cell);
    }

    // Muscle volume last 30d （獨立於目前顯示的月份；重量用 kg，跑步機/有氧用 km）
    muscleContainer.innerHTML = '';
    const muscleVol = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    workoutHistory.forEach(w => {
        const key = normalizeDateToLocal(w.date);
        const wd = key ? new Date(key) : new Date(w.date);
        if (wd < cutoff) return;

        w.exercises.forEach(ex => {
            const cat = getExerciseCategory(ex.name);
            if (!muscleVol[cat]) muscleVol[cat] = { weightKg: 0, distanceKm: 0 };

            ex.sets.forEach(s => {
                const isTreadmill = typeof isTreadmillExercise === 'function' && isTreadmillExercise(ex.name);
                if (isTreadmill) {
                    const km = typeof calculateTreadmillDistanceKm === 'function'
                        ? calculateTreadmillDistanceKm(s)
                        : (parseFloat(s.volume) || 0);
                    muscleVol[cat].distanceKm += km;
                } else {
                    const kg = typeof calculateSetVolume === 'function'
                        ? calculateSetVolume(s, ex.name)
                        : (s.volume || ((s.weight || 0) * (s.reps || 0)));
                    muscleVol[cat].weightKg += kg;
                }
            });
        });
    });

    const categories = Object.keys(muscleVol).filter(cat => {
        const v = muscleVol[cat];
        return v.weightKg > 0 || v.distanceKm > 0;
    });

    const totalWeightKg = categories.reduce((sum, cat) => sum + muscleVol[cat].weightKg, 0);
    const totalDistanceKm = categories.reduce((sum, cat) => sum + muscleVol[cat].distanceKm, 0);

    const sortScore = (stats) => Math.max(stats.weightKg, stats.distanceKm * 50);

    categories.sort((a, b) => sortScore(muscleVol[b]) - sortScore(muscleVol[a])).forEach(cat => {
        const stats = muscleVol[cat];
        let label = '';
        let pct = 0;

        if (stats.distanceKm > 0 && stats.weightKg <= 0) {
            pct = totalDistanceKm > 0 ? Math.round((stats.distanceKm / totalDistanceKm) * 100) : 0;
            label = `${stats.distanceKm.toFixed(1)} km (${pct}%)`;
        } else if (stats.weightKg > 0 && stats.distanceKm <= 0) {
            pct = totalWeightKg > 0 ? Math.round((stats.weightKg / totalWeightKg) * 100) : 0;
            label = `${Math.round(stats.weightKg).toLocaleString()} kg (${pct}%)`;
        } else {
            const weightPct = totalWeightKg > 0 ? Math.round((stats.weightKg / totalWeightKg) * 100) : 0;
            pct = weightPct;
            label = `${Math.round(stats.weightKg).toLocaleString()} kg + ${stats.distanceKm.toFixed(1)} km (${weightPct}%)`;
        }

        const bar = document.createElement('div');
        bar.innerHTML = `
            <div class="flex justify-between text-xs mb-0.5">
                <span>${escapeHtml(cat)}</span>
                <span class="tabular-nums">${label}</span>
            </div>
            <div class="h-2 bg-[#292524] rounded"><div class="h-2 bg-emerald-400 rounded" style="width:${pct}%"></div>
            </div>
        `;
        muscleContainer.appendChild(bar);
    });
}

// 月份切換函數
function prevMonth() {
    let y = currentCalendarYear;
    let m = currentCalendarMonth;
    if (y == null || m == null) {
        const n = new Date();
        y = n.getFullYear();
        m = n.getMonth();
    }
    m--;
    if (m < 0) {
        m = 11;
        y--;
    }
    renderCalendar(y, m);
}

function nextMonth() {
    let y = currentCalendarYear;
    let m = currentCalendarMonth;
    if (y == null || m == null) {
        const n = new Date();
        y = n.getFullYear();
        m = n.getMonth();
    }
    m++;
    if (m > 11) {
        m = 0;
        y++;
    }
    renderCalendar(y, m);
}

// 開發輔助函數：顯示所有有訓練記錄的日期（可透過 console 呼叫）
function showAllWorkoutDates() {
    if (!workoutHistory || workoutHistory.length === 0) {
        alert('目前 workoutHistory 沒有任何記錄。');
        return;
    }

    const groupedByDate = typeof groupWorkoutsByDate === 'function'
        ? groupWorkoutsByDate()
        : {};
    const groups = {};
    workoutHistory.forEach((w, idx) => {
        const d = normalizeDateToLocal(w.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
        if (!groups[d]) {
            const dayGroup = groupedByDate[d];
            const volDisplay = typeof formatWorkoutVolumeDisplay === 'function'
                ? formatWorkoutVolumeDisplay({ exercises: dayGroup?.exercises || w.exercises || [] })
                : { value: '0', unit: 'kg', sub: '0 kg' };
            groups[d] = {
                date: d,
                volDisplay,
                exerciseNames: new Set(),
                setCount: dayGroup?.totalSets || 0,
                repWorkout: w,
                repIndex: idx
            };
        }
        const g = groups[d];
        (w.exercises || []).forEach(ex => {
            if (ex && ex.name) g.exerciseNames.add(ex.name);
        });
    });

    // Sort newest first
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    // Build a simple self-contained modal (consistent with app styling)
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4';
    const listHtml = dates.length === 0 
        ? '<div class="p-4 text-[#a8a29e] text-sm">沒有有效日期記錄。</div>' 
        : dates.map(d => {
            const g = groups[d];
            const exCount = g.exerciseNames.size;
            const vol = g.volDisplay || { value: '0', unit: 'kg', sub: '0 kg' };
            const volStr = vol.unit === 'km'
                ? `${vol.value} km`
                : (vol.sub && vol.sub.includes('km') ? vol.sub : `${vol.value} kg`);
            return `
                <div class="workout-date-row px-4 py-3 mb-1.5 rounded-2xl bg-[#252321] hover:bg-[#2f2c2a] active:bg-[#3f3a36] cursor-pointer border border-transparent flex items-center justify-between gap-3"
                     data-date="${d}">
                    <div class="min-w-0">
                        <div class="font-semibold tabular-nums text-sm">${d}</div>
                        <div class="text-[11px] text-[#a8a29e] mt-0.5">${exCount} 動作 • ${g.setCount} 組</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="font-semibold text-emerald-400 tabular-nums">${volStr}</div>
                    </div>
                </div>
            `;
        }).join('');

    modal.innerHTML = `
        <div class="bg-[#1c1917] border border-[#44403c] rounded-3xl max-w-md w-full max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">
            <div class="px-5 py-3.5 border-b border-[#44403c] flex items-center justify-between">
                <div>
                    <div class="font-semibold">所有有訓練記錄嘅日期</div>
                    <div class="text-xs text-[#a8a29e]">共 ${dates.length} 日（由新到舊）</div>
                </div>
                <button class="text-xl leading-none px-2 py-1 text-[#a8a29e] hover:text-white" onclick="this.closest('.fixed').remove()">✕</button>
            </div>
            <div class="overflow-auto p-3" style="max-height: 58vh;">
                ${listHtml}
            </div>
            <div class="px-4 py-3 border-t border-[#44403c] text-[11px] text-[#a8a29e]">
                點擊任何日期可直接開啟詳情（可刪除該筆記錄）
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Wire up clicks for each date row → call showWorkoutDetail
    modal.querySelectorAll('.workout-date-row[data-date]').forEach(row => {
        row.addEventListener('click', () => {
            const d = row.getAttribute('data-date');
            const g = groups[d];
            modal.remove();
            if (g && g.repWorkout) {
                // Use the representative workout + its original index (same pattern as renderWorkoutHistory)
                const realIdx = workoutHistory.indexOf(g.repWorkout);
                showWorkoutDetail(g.repWorkout, realIdx >= 0 ? realIdx : g.repIndex);
            }
        });
    });

    // Click backdrop to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}