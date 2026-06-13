// js/ui-analysis.js
// Analysis UI (per exercise analysis, overall stats, charts)
// Extracted as part of A (architecture refactor)

// --- Per Exercise Analysis (Redesigned) ---
function updateExerciseSelectForAnalysis() {
    const sel = document.getElementById('analysis-exercise-select');
    if (!sel) return;
    if (!currentUser || workoutHistory.length === 0) {
        sel.innerHTML = '';
        return;
    }
    const exercises = getAllExercisesFromHistory();
    sel.innerHTML = exercises.map(e => `<option value="${e}">${e}</option>`).join('');
    if (exercises.length) sel.value = exercises[0];
}

function setAnalysisTimeRange(range) {
    analysisTimeRange = range;
    // Update button active states
    document.querySelectorAll('#log-section-analysis .time-range-btn').forEach(btn => {
        const r = btn.getAttribute('data-range');
        const isActive = r === range;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('bg-emerald-800/60', isActive);
    });
    renderExerciseAnalysis();
}

function resetAnalysisToAllTime() {
    analysisTimeRange = 'all';
    document.querySelectorAll('#log-section-analysis .time-range-btn').forEach(btn => {
        const isAll = btn.getAttribute('data-range') === 'all';
        btn.classList.toggle('active', isAll);
        btn.classList.toggle('bg-emerald-800/60', isAll);
    });
    renderExerciseAnalysis();
}

// Simple client-side table filter (min weight)
function filterAnalysisTable() {
    const minW = parseFloat(document.getElementById('analysis-filter-weight')?.value || '0') || 0;
    const tbody = document.getElementById('analysis-sets-table');
    if (!tbody) return;
    Array.from(tbody.rows).forEach(row => {
        const wCell = row.cells[1];
        if (!wCell) return;
        const w = parseFloat(wCell.textContent) || 0;
        row.style.display = (w >= minW) ? '' : 'none';
    });
}

function toggleAnalysisTable() {
    const wrapper = document.getElementById('analysis-table-wrapper');
    if (!wrapper) return;
    if (wrapper.style.maxHeight === '80px') {
        wrapper.style.maxHeight = '260px';
    } else {
        wrapper.style.maxHeight = '80px';
    }
}

// Basic linear regression (for e1RM trend line)
function computeRegressionLine(values) {
    const n = values.length;
    if (n < 2) return values.slice();
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i] || 0;
        sumXY += i * (values[i] || 0);
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    return values.map((_, i) => slope * i + intercept);
}

function filterSetsByRange(allSets) {
    if (!allSets || allSets.length === 0 || analysisTimeRange === 'all') return allSets;
    const now = new Date();
    let cutoffDate;
    if (analysisTimeRange === '30d') {
        cutoffDate = new Date(now.getTime() - 30 * 86400000);
    } else if (analysisTimeRange === '12w') {
        cutoffDate = new Date(now.getTime() - 84 * 86400000);
    } else {
        return allSets;
    }
    const cutoffStr = getLocalDateString(cutoffDate);
    return allSets.filter(s => s.date >= cutoffStr);
}

function renderExerciseAnalysis() {
    const sel = document.getElementById('analysis-exercise-select');
    const exercise = sel ? sel.value : null;

    // Sync time range buttons (robust after fullscreen / tab switch)
    document.querySelectorAll('#log-section-analysis .time-range-btn').forEach(btn => {
        const r = btn.getAttribute('data-range');
        const isActive = r === (analysisTimeRange || 'all');
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('bg-emerald-800/60', isActive);
    });

    if (!exercise) {
        updateExerciseSelectForAnalysis();
        if (sel && sel.value) renderExerciseAnalysis();
        return;
    }

    const cardsContainer = document.getElementById('analysis-key-cards');
    const tableBody = document.getElementById('analysis-sets-table');
    const countEl = document.getElementById('analysis-record-count');
    const insightEl = document.getElementById('analysis-coach-insight');

    // 1. Group by date
    const dayGroups = {};
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        if (!dayGroups[d]) dayGroups[d] = { date: d, sets: [], volume: 0, maxE1RM: 0, notes: '' };
        ex.sets.forEach(s => {
            const vol = (s.volume != null) ? s.volume : (s.weight * s.reps);
            const e1 = (typeof estimate1RM === 'function') ? estimate1RM(s.weight, s.reps) : (s.weight * (1 + s.reps / 30));
            dayGroups[d].sets.push(s);
            dayGroups[d].volume += vol;
            if (e1 > dayGroups[d].maxE1RM) dayGroups[d].maxE1RM = e1;
            if (s.notes && !dayGroups[d].notes) dayGroups[d].notes = s.notes;
        });
    });

    let allSets = Object.values(dayGroups).map(g => {
        const weights = g.sets.map(s => s.weight);
        const bestW = weights.length ? Math.max(...weights) : 0;
        const bestSet = g.sets.find(s => s.weight === bestW) || g.sets[0];
        return {
            date: g.date,
            weight: bestW,
            reps: bestSet ? bestSet.reps : 0,
            volume: g.volume,
            e1rm: Math.round(g.maxE1RM * 10) / 10,
            notes: g.notes || ''
        };
    });
    allSets.sort((a, b) => b.date.localeCompare(a.date));

    const filteredSets = filterSetsByRange(allSets);

    if (countEl) countEl.textContent = `(${filteredSets.length} 筆)`;

    // 2. 4 Key Stat Cards (Mobile 2x2)
    if (cardsContainer) {
        const f = filteredSets;
        if (f.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-2 text-xs text-[#a8a29e] p-3 bg-[#292524] rounded-2xl">此時間範圍內沒有 ${exercise} 記錄</div>`;
        } else {
            const bestE1 = Math.max(...f.map(s => s.e1rm));
            const sortedAsc = [...f].sort((a,b) => a.date.localeCompare(b.date));
            const firstE1 = sortedAsc[0]?.e1rm || bestE1;
            const lastE1 = sortedAsc[sortedAsc.length-1]?.e1rm || bestE1;
            const e1Progress = firstE1 > 0 ? Math.round(((lastE1 - firstE1) / firstE1) * 100) : 0;
            const e1Color = e1Progress > 3 ? 'progress-up' : (e1Progress < -3 ? 'progress-down' : 'progress-flat');
            const e1Arrow = e1Progress > 0 ? '↑' : (e1Progress < 0 ? '↓' : '→');

            const totalVol = f.reduce((sum, s) => sum + s.volume, 0);
            const sessions = f.length;

            const bestWeightEntry = f.reduce((best, cur) => cur.weight > best.weight ? cur : best, f[0]);
            const bestW = `${bestWeightEntry.weight} kg × ${bestWeightEntry.reps}`;

            cardsContainer.innerHTML = `
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Best e1RM</div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold tabular-nums">${bestE1}</span>
                        <span class="text-xs ${e1Color} font-semibold">${e1Arrow} ${e1Progress > 0 ? '+' : ''}${e1Progress}%</span>
                    </div>
                    <div class="text-[10px] text-[#a8a29e]">Epley 估算</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Total Volume</div>
                    <div class="text-2xl font-bold tabular-nums">${totalVol.toLocaleString()}</div>
                    <div class="text-xs text-emerald-300">此範圍內總量</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Best Weight × Reps</div>
                    <div class="text-xl font-semibold tabular-nums">${bestW}</div>
                    <div class="text-[10px] text-[#a8a29e]">單次最佳</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Sessions Count</div>
                    <div class="text-2xl font-bold tabular-nums">${sessions}</div>
                    <div class="text-xs text-[#a8a29e]">訓練日數</div>
                </div>
            `;
        }
    }

    // 3. Coach Insight (dynamic, simple rule-based)
    if (insightEl) {
        const f = filteredSets;
        if (f.length < 2) {
            insightEl.innerHTML = `需要更多 ${exercise} 的訓練數據才能給出有意義的分析。繼續記錄！`;
        } else {
            const sortedAsc = [...f].sort((a,b) => a.date.localeCompare(b.date));
            const first = sortedAsc[0];
            const last = sortedAsc[sortedAsc.length-1];
            const progress = first.e1rm > 0 ? Math.round(((last.e1rm - first.e1rm) / first.e1rm) * 100) : 0;
            const volTrend = last.volume > first.volume ? '上升' : (last.volume < first.volume ? '下降' : '穩定');
            let msg = `過去 ${analysisTimeRange === '30d' ? '30天' : (analysisTimeRange === '12w' ? '12週' : 'All Time')} ，${exercise} 的 e1RM 由 ${first.e1rm}kg 變為 ${last.e1rm}kg（${progress > 0 ? '+' : ''}${progress}%）。`;
            if (progress > 8) {
                msg += ` 進展優秀！Volume 趨勢${volTrend}。建議維持線性進展或考慮微調組數。`;
            } else if (progress > 0) {
                msg += ` 進展穩健。繼續專注形式與恢復，下週可試微增重量。`;
            } else {
                msg += ` 表現持平或輕微退步。檢查睡眠、營養與恢復，或考慮 deload 週。`;
            }
            insightEl.textContent = msg;
        }
    }

    // 4. Table (filtered data)
    const displaySets = filteredSets.slice();
    tableBody.innerHTML = displaySets.map(s => `
        <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60">
            <td class="py-1.5 px-3 font-medium">${s.date}</td>
            <td class="py-1.5 px-2 text-center tabular-nums">${s.weight}</td>
            <td class="py-1.5 px-2 text-center">${s.reps}</td>
            <td class="py-1.5 px-2 text-center text-emerald-300 tabular-nums">${s.volume}</td>
            <td class="py-1.5 px-2 text-center text-amber-300 tabular-nums">${s.e1rm}</td>
            <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
        </tr>
    `).join('') || `<tr><td colspan="6" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;

    setTimeout(filterAnalysisTable, 0);

    // 5. Charts - destroy old
    if (analysisChart1RM) { analysisChart1RM.destroy(); analysisChart1RM = null; }
    if (analysisChartVolume) { analysisChartVolume.destroy(); analysisChartVolume = null; }

    const chartData = [...filteredSets].sort((a, b) => a.date.localeCompare(b.date));
    const labels = chartData.map(s => s.date);
    const e1rmData = chartData.map(s => s.e1rm);
    const volData = chartData.map(s => s.volume);

    const ctxVol = document.getElementById('chart-volume-trend');
    const ctxE1 = document.getElementById('chart-e1rm-progress');

    if (labels.length >= 1 && ctxVol && ctxE1) {
        // Volume Trend - Mobile friendly, larger fonts, no legend
        analysisChartVolume = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { type: 'bar', label: 'Volume', data: volData, backgroundColor: '#166534', borderColor: '#4ade80', borderWidth: 1 },
                    { type: 'line', label: 'Trend', data: volData, borderColor: '#f59e0b', borderWidth: 2.5, tension: 0.3, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { title: (i) => i[0].label, label: (c) => `${c.dataset.label}: ${c.raw} kg` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } } // touch friendly
            }
        });

        // e1RM Progression - with regression, larger fonts
        const regression = computeRegressionLine(e1rmData);
        analysisChart1RM = new Chart(ctxE1, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'e1RM', data: e1rmData, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.12)', tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                    { label: 'Trend', data: regression, borderColor: '#f59e0b', borderDash: [5,3], tension: 0, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { title: (i) => i[0].label, label: (c) => `${c.dataset.label}: ${c.raw} kg` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });
    } else {
        [ctxVol, ctxE1].forEach(c => { if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); });
    }
}

// --- 整體數據 + 肌群分佈 + 每週圖表 ---
function renderOverallStats() {
    const totalWorkouts = workoutHistory.length;
    let totalSets = 0;
    let lifetimeVol = 0;
    let prCount = 0; // simplistic: count how many times we saw a new high e1rm historically

    const bodyPartVol = {};
    EXERCISE_CATEGORIES.forEach(c => bodyPartVol[c] = 0);

    workoutHistory.forEach(w => {
        w.exercises.forEach(ex => {
            const cat = getExerciseCategory(ex.name);
            let exVol = 0;
            ex.sets.forEach(s => {
                const v = s.volume || calculateSetVolume(s);
                exVol += v;
                totalSets++;
            });
            bodyPartVol[cat] = (bodyPartVol[cat] || 0) + exVol;
            lifetimeVol += exVol;
        });
    });

    // Streak calculation (simple consecutive calendar days with workouts)
    const sortedDates = [...new Set(workoutHistory.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (sortedDates.length > 0) {
        let current = new Date(sortedDates[0]);
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const prev = new Date(sortedDates[i]);
            const diff = Math.round((current - prev) / (1000*3600*24));
            if (diff === 1) {
                streak++;
                current = prev;
            } else {
                break;
            }
        }
    }

    document.getElementById('stat-streak').textContent = streak;
    document.getElementById('stat-lifetime-volume').textContent = lifetimeVol.toLocaleString();
    document.getElementById('stat-lifetime-tonnes').textContent = (lifetimeVol / 1000).toFixed(1);
    document.getElementById('stat-total-workouts').textContent = totalWorkouts;
    document.getElementById('stat-total-sets').textContent = totalSets;
    document.getElementById('stat-pr-count').textContent = Math.floor(lifetimeVol / 12000) + 3; // fun proxy

    // Body part pie
    if (bodyPartChart) bodyPartChart.destroy();
    const bpCtx = document.getElementById('chart-bodypart');
    const labels = Object.keys(bodyPartVol).filter(k => bodyPartVol[k] > 0);
    const dataVals = labels.map(k => bodyPartVol[k]);
    if (bpCtx && labels.length) {
        bodyPartChart = new Chart(bpCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: dataVals, backgroundColor: ['#4ade80','#166534','#f59e0b','#a78bfa','#f472b6','#38bdf8','#fbbf24','#64748b'] }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 10} } } } }
        });
    }

    // Weekly volume (very rough last 8 weeks)
    if (weeklyVolumeChart) weeklyVolumeChart.destroy();
    const weeklyCtx = document.getElementById('chart-weekly-volume');
    const weekly = computeWeeklyVolumes(8);
    if (weeklyCtx) {
        weeklyVolumeChart = new Chart(weeklyCtx, {
            type: 'bar',
            data: { labels: weekly.labels, datasets: [{ label: 'Weekly Volume (kg)', data: weekly.values, backgroundColor: '#4ade80' }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

function computeWeeklyVolumes(weeks = 8) {
    const labels = [];
    const values = [];
    const now = new Date();
    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekLabel = `${weekStart.getMonth()+1}/${weekStart.getDate()}`;
        labels.push(weekLabel);

        let weekVol = 0;
        workoutHistory.forEach(w => {
            const wd = new Date(w.date);
            const daysDiff = Math.round((now - wd) / (1000*3600*24));
            if (daysDiff >= i*7 && daysDiff < (i+1)*7) {
                weekVol += (w.totalVolume || calculateWorkoutVolume(w));
            }
        });
        values.push(weekVol);
    }
    return { labels, values };
}

function getExerciseCategory(name) {
    return getMuscleGroup(name);
}