// js/ui-analysis.js
// Analysis UI (per exercise analysis, overall stats, charts)
// Extracted as part of A (architecture refactor)

function formatHoldDuration(seconds) {
    const s = parseInt(seconds) || 0;
    if (s >= 60) {
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return rem > 0 ? `${m} 分 ${rem} 秒` : `${m} 分`;
    }
    return `${s} 秒`;
}

function configureAnalysisFilter(recordType) {
    const labelEl = document.getElementById('analysis-filter-label');
    const inputEl = document.getElementById('analysis-filter-input');
    if (!labelEl || !inputEl) return;

    if (recordType === 'treadmill') {
        labelEl.textContent = '最低速度';
        inputEl.placeholder = 'km/h';
    } else if (recordType === 'time_reps') {
        labelEl.textContent = '最低秒數';
        inputEl.placeholder = '秒';
    } else if (recordType === 'bodyweight') {
        labelEl.textContent = '最低次數';
        inputEl.placeholder = '次';
    } else {
        labelEl.textContent = '最低重量';
        inputEl.placeholder = 'kg';
    }
    inputEl.value = '';
}

function configureAnalysisTableHead(recordType, exercise) {
    const headRow = document.getElementById('analysis-table-head-row');
    if (!headRow) return;
    const showBw = exercise && typeof isBodyweightExercise === 'function' && isBodyweightExercise(exercise);

    if (recordType === 'treadmill') {
        headRow.innerHTML = `
            <th class="py-2 px-3 text-left">日期</th>
            <th class="py-2 px-2 text-center">時間 (分)</th>
            <th class="py-2 px-2 text-center">速度 (km/h)</th>
            <th class="py-2 px-2 text-center">坡度 (%)</th>
            <th class="py-2 px-2 text-center">距離 (km)</th>
            <th class="py-2 px-3 text-left">備註</th>
        `;
    } else if (recordType === 'time_reps') {
        headRow.innerHTML = showBw ? `
            <th class="py-2 px-3 text-left">日期</th>
            <th class="py-2 px-2 text-center">體重 (kg)</th>
            <th class="py-2 px-2 text-center">支撐 (秒)</th>
            <th class="py-2 px-2 text-center">次數</th>
            <th class="py-2 px-2 text-center">Volume</th>
            <th class="py-2 px-3 text-left">備註</th>
        ` : `
            <th class="py-2 px-3 text-left">日期</th>
            <th class="py-2 px-2 text-center">支撐 (秒)</th>
            <th class="py-2 px-2 text-center">次數</th>
            <th class="py-2 px-2 text-center">顯示</th>
            <th class="py-2 px-3 text-left">備註</th>
        `;
    } else if (recordType === 'bodyweight') {
        headRow.innerHTML = `
            <th class="py-2 px-3 text-left">日期</th>
            <th class="py-2 px-2 text-center">體重 (kg)</th>
            <th class="py-2 px-2 text-center">次數</th>
            <th class="py-2 px-2 text-center">Volume</th>
            <th class="py-2 px-3 text-left">備註</th>
        `;
    } else {
        headRow.innerHTML = `
            <th class="py-2 px-3 text-left">日期</th>
            <th class="py-2 px-2 text-center">重量</th>
            <th class="py-2 px-2 text-center">次數</th>
            <th class="py-2 px-2 text-center">Volume</th>
            <th class="py-2 px-2 text-center">e1RM</th>
            <th class="py-2 px-3 text-left">備註</th>
        `;
    }
}

function configureAnalysisChartTitles(recordType) {
    const primaryTitle = document.getElementById('analysis-chart-primary-title');
    const secondaryTitle = document.getElementById('analysis-chart-secondary-title');
    if (!primaryTitle || !secondaryTitle) return;

    if (recordType === 'treadmill') {
        primaryTitle.textContent = '每次訓練距離 (km)';
        secondaryTitle.textContent = '平均速度 (km/h)';
    } else if (recordType === 'time_reps') {
        primaryTitle.textContent = '每次最佳支撐 (秒)';
        secondaryTitle.textContent = '每次總支撐時間 (秒)';
    } else if (recordType === 'bodyweight') {
        primaryTitle.textContent = '訓練量趨勢 (體重×次數)';
        secondaryTitle.textContent = '每次最佳次數';
    } else {
        primaryTitle.textContent = '訓練量趨勢 (Volume)';
        secondaryTitle.textContent = 'e1RM 進展曲線';
    }
}

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

function filterAnalysisTable() {
    const sel = document.getElementById('analysis-exercise-select');
    const exercise = sel ? sel.value : null;
    const recordType = exercise && typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(exercise) : 'weight';
    const minVal = parseFloat(document.getElementById('analysis-filter-input')?.value || '0') || 0;
    const tbody = document.getElementById('analysis-sets-table');
    if (!tbody) return;

    Array.from(tbody.rows).forEach(row => {
        if (!minVal) {
            row.style.display = '';
            return;
        }
        const val = parseFloat(row.dataset.filter || '0') || 0;
        row.style.display = val >= minVal ? '' : 'none';
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

function collectTreadmillSets(exercise) {
    const sets = [];
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        ex.sets.forEach(s => {
            const duration = parseInt(s.duration) || 0;
            const speed = parseFloat(s.speed) || 0;
            const incline = parseFloat(s.incline) || 0;
            const distanceKm = typeof calculateTreadmillDistanceKm === 'function'
                ? calculateTreadmillDistanceKm(s) : 0;
            if (duration <= 0 && distanceKm <= 0) return;
            sets.push({
                date: d,
                duration,
                speed,
                incline,
                distanceKm,
                notes: s.notes || ''
            });
        });
    });
    return sets;
}

function groupTreadmillByDate(sets) {
    const dayGroups = {};
    sets.forEach(s => {
        if (!dayGroups[s.date]) {
            dayGroups[s.date] = {
                date: s.date,
                distanceKm: 0,
                duration: 0,
                speedSum: 0,
                setCount: 0,
                maxSpeed: 0,
                maxIncline: 0
            };
        }
        const g = dayGroups[s.date];
        g.distanceKm += s.distanceKm;
        g.duration += s.duration;
        g.speedSum += s.speed;
        g.setCount += 1;
        g.maxSpeed = Math.max(g.maxSpeed, s.speed);
        g.maxIncline = Math.max(g.maxIncline, s.incline);
    });
    return Object.values(dayGroups).map(g => ({
        ...g,
        avgSpeed: g.setCount ? Math.round((g.speedSum / g.setCount) * 10) / 10 : 0,
        distanceKm: Math.round(g.distanceKm * 100) / 100
    }));
}

function collectHoldSets(exercise) {
    const sets = [];
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        ex.sets.forEach(s => {
            const duration = parseInt(s.duration) || 0;
            const reps = parseInt(s.reps) || 0;
            if (duration <= 0) return;
            const bodyWeight = parseFloat(s.body_weight) || 0;
            const volume = typeof calculateSetVolume === 'function'
                ? calculateSetVolume(s, exercise)
                : (bodyWeight * reps);
            sets.push({
                date: d,
                duration,
                reps,
                body_weight: bodyWeight,
                volume,
                notes: s.notes || ''
            });
        });
    });
    return sets;
}

function groupHoldByDate(sets) {
    const dayGroups = {};
    sets.forEach(s => {
        if (!dayGroups[s.date]) {
            dayGroups[s.date] = {
                date: s.date,
                bestHold: 0,
                totalHold: 0,
                totalReps: 0,
                setCount: 0
            };
        }
        const g = dayGroups[s.date];
        g.bestHold = Math.max(g.bestHold, s.duration);
        g.totalHold += s.duration;
        g.totalReps += s.reps;
        g.setCount += 1;
    });
    return Object.values(dayGroups);
}

function collectBodyweightDaySets(exercise) {
    const dayGroups = {};
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        if (!dayGroups[d]) dayGroups[d] = { date: d, sets: [], volume: 0, bestReps: 0, bodyWeight: 0, notes: '' };
        ex.sets.forEach(s => {
            const bw = parseFloat(s.body_weight) || 0;
            const reps = parseInt(s.reps) || 0;
            const vol = typeof calculateSetVolume === 'function'
                ? calculateSetVolume(s, exercise)
                : bw * reps;
            dayGroups[d].sets.push(s);
            dayGroups[d].volume += vol;
            dayGroups[d].bestReps = Math.max(dayGroups[d].bestReps, reps);
            if (bw > dayGroups[d].bodyWeight) dayGroups[d].bodyWeight = bw;
            if (s.notes && !dayGroups[d].notes) dayGroups[d].notes = s.notes;
        });
    });

    return Object.values(dayGroups).map(g => ({
        date: g.date,
        body_weight: g.bodyWeight,
        reps: g.bestReps,
        volume: g.volume,
        notes: g.notes || ''
    }));
}

function collectWeightDaySets(exercise) {
    const dayGroups = {};
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        if (!dayGroups[d]) dayGroups[d] = { date: d, sets: [], volume: 0, maxE1RM: 0, notes: '' };
        ex.sets.forEach(s => {
            const vol = typeof calculateSetVolume === 'function'
                ? calculateSetVolume(s, exercise)
                : ((s.volume != null) ? s.volume : (s.weight * s.reps));
            const e1 = (typeof estimate1RM === 'function') ? estimate1RM(s.weight, s.reps) : (s.weight * (1 + s.reps / 30));
            dayGroups[d].sets.push(s);
            dayGroups[d].volume += vol;
            if (e1 > dayGroups[d].maxE1RM) dayGroups[d].maxE1RM = e1;
            if (s.notes && !dayGroups[d].notes) dayGroups[d].notes = s.notes;
        });
    });

    return Object.values(dayGroups).map(g => {
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
}

function renderTreadmillAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl) {
    const allSets = collectTreadmillSets(exercise);
    const filteredSets = filterSetsByRange(allSets);
    const sessionData = filterSetsByRange(groupTreadmillByDate(allSets))
        .sort((a, b) => b.date.localeCompare(a.date));

    if (countEl) countEl.textContent = `(${filteredSets.length} 筆)`;

    if (cardsContainer) {
        if (filteredSets.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-2 text-xs text-[#a8a29e] p-3 bg-[#292524] rounded-2xl">此時間範圍內沒有 ${exercise} 記錄</div>`;
        } else {
            const totalKm = filteredSets.reduce((sum, s) => sum + s.distanceKm, 0);
            const totalMins = filteredSets.reduce((sum, s) => sum + s.duration, 0);
            const bestSpeed = Math.max(...filteredSets.map(s => s.speed));
            const bestDistance = Math.max(...filteredSets.map(s => s.distanceKm));
            const sessions = sessionData.length;

            cardsContainer.innerHTML = `
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">總距離</div>
                    <div class="text-2xl font-bold tabular-nums">${totalKm.toFixed(2)} <span class="text-sm">km</span></div>
                    <div class="text-[10px] text-[#a8a29e]">此範圍內累計</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">總時間</div>
                    <div class="text-2xl font-bold tabular-nums">${totalMins}</div>
                    <div class="text-xs text-emerald-300">分鐘</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">最高速度</div>
                    <div class="text-2xl font-bold tabular-nums">${bestSpeed.toFixed(1)}</div>
                    <div class="text-xs text-[#a8a29e]">km/h</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">單組最遠</div>
                    <div class="text-2xl font-bold tabular-nums">${bestDistance.toFixed(2)}</div>
                    <div class="text-xs text-[#a8a29e]">km · ${sessions} 訓練日</div>
                </div>
            `;
        }
    }

    if (insightEl) {
        const sessions = filterSetsByRange(groupTreadmillByDate(allSets))
            .sort((a, b) => a.date.localeCompare(b.date));
        if (sessions.length < 2) {
            insightEl.textContent = `需要更多 ${exercise} 的訓練數據才能給出有意義的分析。繼續記錄！`;
        } else {
            const first = sessions[0];
            const last = sessions[sessions.length - 1];
            const distProgress = first.distanceKm > 0
                ? Math.round(((last.distanceKm - first.distanceKm) / first.distanceKm) * 100) : 0;
            const speedTrend = last.avgSpeed > first.avgSpeed ? '上升' : (last.avgSpeed < first.avgSpeed ? '下降' : '穩定');
            let msg = `過去 ${analysisTimeRange === '30d' ? '30天' : (analysisTimeRange === '12w' ? '12週' : 'All Time')} ，${exercise} 每次訓練距離由 ${first.distanceKm}km 變為 ${last.distanceKm}km（${distProgress > 0 ? '+' : ''}${distProgress}%）。`;
            if (distProgress > 10) {
                msg += ` 有氧耐力進展良好！平均速度趨勢${speedTrend}，可維持現有強度或略增坡度。`;
            } else if (distProgress > 0) {
                msg += ` 距離穩步增加。注意恢復，可嘗試固定時間內提高速度。`;
            } else {
                msg += ` 距離持平或略減。檢查疲勞、熱身與跑步姿勢，或調整坡度與速度組合。`;
            }
            insightEl.textContent = msg;
        }
    }

    if (tableBody) {
        const displaySets = [...filteredSets].sort((a, b) => b.date.localeCompare(a.date));
        tableBody.innerHTML = displaySets.map(s => `
            <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60" data-filter="${s.speed}">
                <td class="py-1.5 px-3 font-medium">${s.date}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.duration}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.speed}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.incline}</td>
                <td class="py-1.5 px-2 text-center text-emerald-300 tabular-nums">${s.distanceKm.toFixed(2)}</td>
                <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
            </tr>
        `).join('') || `<tr><td colspan="6" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;
    }

    return filterSetsByRange(groupTreadmillByDate(allSets)).sort((a, b) => a.date.localeCompare(b.date));
}

function renderHoldAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl) {
    const allSets = collectHoldSets(exercise);
    const filteredSets = filterSetsByRange(allSets);
    const sessionData = filterSetsByRange(groupHoldByDate(allSets))
        .sort((a, b) => b.date.localeCompare(a.date));

    if (countEl) countEl.textContent = `(${filteredSets.length} 筆)`;

    if (cardsContainer) {
        if (filteredSets.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-2 text-xs text-[#a8a29e] p-3 bg-[#292524] rounded-2xl">此時間範圍內沒有 ${exercise} 記錄</div>`;
        } else {
            const bestHold = Math.max(...filteredSets.map(s => s.duration));
            const totalHold = filteredSets.reduce((sum, s) => sum + s.duration, 0);
            const totalReps = filteredSets.reduce((sum, s) => sum + s.reps, 0);
            const sessions = sessionData.length;

            cardsContainer.innerHTML = `
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">最佳支撐</div>
                    <div class="text-2xl font-bold tabular-nums">${formatHoldDuration(bestHold)}</div>
                    <div class="text-[10px] text-[#a8a29e]">單組最長</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">總支撐時間</div>
                    <div class="text-2xl font-bold tabular-nums">${formatHoldDuration(totalHold)}</div>
                    <div class="text-xs text-emerald-300">此範圍內累計</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">總次數</div>
                    <div class="text-2xl font-bold tabular-nums">${totalReps}</div>
                    <div class="text-xs text-[#a8a29e]">次</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">總組數</div>
                    <div class="text-2xl font-bold tabular-nums">${filteredSets.length}</div>
                    <div class="text-xs text-[#a8a29e]">${sessions} 訓練日</div>
                </div>
            `;
        }
    }

    if (insightEl) {
        const sessions = filterSetsByRange(groupHoldByDate(allSets))
            .sort((a, b) => a.date.localeCompare(b.date));
        if (sessions.length < 2) {
            insightEl.textContent = `需要更多 ${exercise} 的訓練數據才能給出有意義的分析。繼續記錄！`;
        } else {
            const first = sessions[0];
            const last = sessions[sessions.length - 1];
            const holdProgress = first.bestHold > 0
                ? Math.round(((last.bestHold - first.bestHold) / first.bestHold) * 100) : 0;
            const volumeTrend = last.totalHold > first.totalHold ? '上升' : (last.totalHold < first.totalHold ? '下降' : '穩定');
            let msg = `過去 ${analysisTimeRange === '30d' ? '30天' : (analysisTimeRange === '12w' ? '12週' : 'All Time')} ，${exercise} 每次最佳支撐由 ${first.bestHold}秒 變為 ${last.bestHold}秒（${holdProgress > 0 ? '+' : ''}${holdProgress}%）。`;
            if (holdProgress > 10) {
                msg += ` 核心耐力進展明顯！總支撐時間趨勢${volumeTrend}，可維持或略增組數。`;
            } else if (holdProgress > 0) {
                msg += ` 支撐時間穩步提升。專注姿勢穩定，可嘗試每組多撐 5–10 秒。`;
            } else {
                msg += ` 表現持平。檢查核心激活與呼吸節奏，或縮短組間休息再挑戰。`;
            }
            insightEl.textContent = msg;
        }
    }

    if (tableBody) {
        const displaySets = [...filteredSets].sort((a, b) => b.date.localeCompare(a.date));
        const showBw = typeof isBodyweightExercise === 'function' && isBodyweightExercise(exercise);
        if (showBw) {
            tableBody.innerHTML = displaySets.map(s => `
                <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60" data-filter="${s.duration}">
                    <td class="py-1.5 px-3 font-medium">${s.date}</td>
                    <td class="py-1.5 px-2 text-center tabular-nums">${s.body_weight || 0}</td>
                    <td class="py-1.5 px-2 text-center tabular-nums">${s.duration}</td>
                    <td class="py-1.5 px-2 text-center tabular-nums">${s.reps}</td>
                    <td class="py-1.5 px-2 text-center text-emerald-300 tabular-nums">${s.volume || 0}</td>
                    <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
                </tr>
            `).join('') || `<tr><td colspan="6" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;
        } else {
            tableBody.innerHTML = displaySets.map(s => `
                <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60" data-filter="${s.duration}">
                    <td class="py-1.5 px-3 font-medium">${s.date}</td>
                    <td class="py-1.5 px-2 text-center tabular-nums">${s.duration}</td>
                    <td class="py-1.5 px-2 text-center tabular-nums">${s.reps}</td>
                    <td class="py-1.5 px-2 text-center text-emerald-300">${typeof formatSetDisplay === 'function' ? formatSetDisplay(exercise, s) : `${s.duration}秒 × ${s.reps}次`}</td>
                    <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
                </tr>
            `).join('') || `<tr><td colspan="5" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;
        }
    }

    return filterSetsByRange(groupHoldByDate(allSets)).sort((a, b) => a.date.localeCompare(b.date));
}

function collectBodyweightSets(exercise) {
    const sets = [];
    workoutHistory.forEach(w => {
        if (!w.exercises) return;
        const ex = w.exercises.find(e => e.name === exercise);
        if (!ex || !ex.sets || ex.sets.length === 0) return;
        const d = normalizeDateToLocal(w.date);
        ex.sets.forEach(s => {
            const bodyWeight = parseFloat(s.body_weight) || 0;
            const reps = parseInt(s.reps) || 0;
            if (bodyWeight <= 0 || reps <= 0) return;
            sets.push({
                date: d,
                body_weight: bodyWeight,
                reps,
                volume: typeof calculateSetVolume === 'function'
                    ? calculateSetVolume(s, exercise) : bodyWeight * reps,
                notes: s.notes || ''
            });
        });
    });
    return sets;
}

function renderBodyweightAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl) {
    const allSets = collectBodyweightSets(exercise);
    const filteredSets = filterSetsByRange(allSets);
    const chartData = filterSetsByRange(collectBodyweightDaySets(exercise))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (countEl) countEl.textContent = `(${filteredSets.length} 筆)`;

    if (cardsContainer) {
        if (filteredSets.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-2 text-xs text-[#a8a29e] p-3 bg-[#292524] rounded-2xl">此時間範圍內沒有 ${exercise} 記錄</div>`;
        } else {
            const bestReps = Math.max(...filteredSets.map(s => s.reps));
            const totalVol = filteredSets.reduce((sum, s) => sum + s.volume, 0);
            const latestBw = filteredSets.sort((a, b) => b.date.localeCompare(a.date))[0]?.body_weight || 0;
            const sessions = chartData.length;

            cardsContainer.innerHTML = `
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">最佳次數</div>
                    <div class="text-2xl font-bold tabular-nums">${bestReps}</div>
                    <div class="text-[10px] text-[#a8a29e]">單組最多</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Total Volume</div>
                    <div class="text-2xl font-bold tabular-nums">${totalVol.toLocaleString()}</div>
                    <div class="text-xs text-emerald-300">體重×次數</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">最近體重</div>
                    <div class="text-2xl font-bold tabular-nums">${latestBw}</div>
                    <div class="text-xs text-[#a8a29e]">kg</div>
                </div>
                <div class="perf-card rounded-2xl p-3">
                    <div class="text-[10px] text-[#a8a29e]">Sessions Count</div>
                    <div class="text-2xl font-bold tabular-nums">${sessions}</div>
                    <div class="text-xs text-[#a8a29e]">訓練日數</div>
                </div>
            `;
        }
    }

    if (insightEl) {
        if (chartData.length < 2) {
            insightEl.textContent = `需要更多 ${exercise} 的訓練數據才能給出有意義的分析。繼續記錄！`;
        } else {
            const first = chartData[0];
            const last = chartData[chartData.length - 1];
            const repProgress = first.reps > 0 ? Math.round(((last.reps - first.reps) / first.reps) * 100) : 0;
            const volTrend = last.volume > first.volume ? '上升' : (last.volume < first.volume ? '下降' : '穩定');
            let msg = `過去 ${analysisTimeRange === '30d' ? '30天' : (analysisTimeRange === '12w' ? '12週' : 'All Time')} ，${exercise} 每次最佳次數由 ${first.reps} 變為 ${last.reps}（${repProgress > 0 ? '+' : ''}${repProgress}%）。`;
            msg += ` 訓練量趨勢${volTrend}。`;
            if (last.body_weight !== first.body_weight) {
                msg += ` 記錄體重由 ${first.body_weight}kg 變為 ${last.body_weight}kg。`;
            }
            insightEl.textContent = msg;
        }
    }

    if (tableBody) {
        const displaySets = [...filteredSets].sort((a, b) => b.date.localeCompare(a.date));
        tableBody.innerHTML = displaySets.map(s => `
            <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60" data-filter="${s.reps}">
                <td class="py-1.5 px-3 font-medium">${s.date}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.body_weight}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.reps}</td>
                <td class="py-1.5 px-2 text-center text-emerald-300 tabular-nums">${s.volume}</td>
                <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
            </tr>
        `).join('') || `<tr><td colspan="5" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;
    }

    return chartData;
}

function renderWeightAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl) {
    let allSets = collectWeightDaySets(exercise);
    allSets.sort((a, b) => b.date.localeCompare(a.date));
    const filteredSets = filterSetsByRange(allSets);

    if (countEl) countEl.textContent = `(${filteredSets.length} 筆)`;

    if (cardsContainer) {
        const f = filteredSets;
        if (f.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-2 text-xs text-[#a8a29e] p-3 bg-[#292524] rounded-2xl">此時間範圍內沒有 ${exercise} 記錄</div>`;
        } else {
            const bestE1 = Math.max(...f.map(s => s.e1rm));
            const sortedAsc = [...f].sort((a, b) => a.date.localeCompare(b.date));
            const firstE1 = sortedAsc[0]?.e1rm || bestE1;
            const lastE1 = sortedAsc[sortedAsc.length - 1]?.e1rm || bestE1;
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

    if (insightEl) {
        const f = filteredSets;
        if (f.length < 2) {
            insightEl.textContent = `需要更多 ${exercise} 的訓練數據才能給出有意義的分析。繼續記錄！`;
        } else {
            const sortedAsc = [...f].sort((a, b) => a.date.localeCompare(b.date));
            const first = sortedAsc[0];
            const last = sortedAsc[sortedAsc.length - 1];
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

    if (tableBody) {
        const displaySets = filteredSets.slice();
        tableBody.innerHTML = displaySets.map(s => `
            <tr class="border-b border-[#3f3a36] hover:bg-[#292524]/60" data-filter="${s.weight}">
                <td class="py-1.5 px-3 font-medium">${s.date}</td>
                <td class="py-1.5 px-2 text-center tabular-nums">${s.weight}</td>
                <td class="py-1.5 px-2 text-center">${s.reps}</td>
                <td class="py-1.5 px-2 text-center text-emerald-300 tabular-nums">${s.volume}</td>
                <td class="py-1.5 px-2 text-center text-amber-300 tabular-nums">${s.e1rm}</td>
                <td class="py-1.5 px-3 text-xs text-[#a8a29e] truncate max-w-[90px]">${s.notes || ''}</td>
            </tr>
        `).join('') || `<tr><td colspan="6" class="py-3 text-center text-[#a8a29e]">此範圍內沒有記錄。</td></tr>`;
    }

    return [...filteredSets].sort((a, b) => a.date.localeCompare(b.date));
}

function renderAnalysisCharts(recordType, chartData) {
    if (analysisChart1RM) { analysisChart1RM.destroy(); analysisChart1RM = null; }
    if (analysisChartVolume) { analysisChartVolume.destroy(); analysisChartVolume = null; }

    const ctxVol = document.getElementById('chart-volume-trend');
    const ctxE1 = document.getElementById('chart-e1rm-progress');
    const labels = chartData.map(s => s.date);

    if (labels.length < 1 || !ctxVol || !ctxE1) {
        [ctxVol, ctxE1].forEach(c => { if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); });
        return;
    }

    if (recordType === 'treadmill') {
        const distData = chartData.map(s => s.distanceKm);
        const speedData = chartData.map(s => s.avgSpeed);

        analysisChartVolume = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { type: 'bar', label: '距離', data: distData, backgroundColor: '#166534', borderColor: '#4ade80', borderWidth: 1 },
                    { type: 'line', label: '趨勢', data: distData, borderColor: '#f59e0b', borderWidth: 2.5, tension: 0.3, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} km` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });

        const speedRegression = computeRegressionLine(speedData);
        analysisChart1RM = new Chart(ctxE1, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '平均速度', data: speedData, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                    { label: '趨勢', data: speedRegression, borderColor: '#f59e0b', borderDash: [5, 3], tension: 0, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} km/h` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });
        return;
    }

    if (recordType === 'time_reps') {
        const bestHoldData = chartData.map(s => s.bestHold);
        const totalHoldData = chartData.map(s => s.totalHold);

        analysisChartVolume = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { type: 'bar', label: '最佳支撐', data: bestHoldData, backgroundColor: '#9a3412', borderColor: '#fb923c', borderWidth: 1 },
                    { type: 'line', label: '趨勢', data: bestHoldData, borderColor: '#f59e0b', borderWidth: 2.5, tension: 0.3, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} 秒` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });

        const holdRegression = computeRegressionLine(totalHoldData);
        analysisChart1RM = new Chart(ctxE1, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '總支撐', data: totalHoldData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.12)', tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                    { label: '趨勢', data: holdRegression, borderColor: '#f59e0b', borderDash: [5, 3], tension: 0, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} 秒` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });
        return;
    }

    if (recordType === 'bodyweight') {
        const volData = chartData.map(s => s.volume);
        const repsData = chartData.map(s => s.reps);

        analysisChartVolume = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { type: 'bar', label: 'Volume', data: volData, backgroundColor: '#5b21b6', borderColor: '#a78bfa', borderWidth: 1 },
                    { type: 'line', label: 'Trend', data: volData, borderColor: '#f59e0b', borderWidth: 2.5, tension: 0.3, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} kg` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });

        const repsRegression = computeRegressionLine(repsData);
        analysisChart1RM = new Chart(ctxE1, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '最佳次數', data: repsData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.12)', tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                    { label: 'Trend', data: repsRegression, borderColor: '#f59e0b', borderDash: [5, 3], tension: 0, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} 次` } }
                },
                scales: {
                    x: { ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } },
                    y: { beginAtZero: true, ticks: { color: '#a8a29e', font: { size: 12 } }, grid: { color: '#3f3a36' } }
                },
                elements: { point: { hitRadius: 20 } }
            }
        });
        return;
    }

    const e1rmData = chartData.map(s => s.e1rm);
    const volData = chartData.map(s => s.volume);
    const regression = computeRegressionLine(e1rmData);

    analysisChartVolume = new Chart(ctxVol, {
        type: 'bar',
        data: {
            labels,
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
            elements: { point: { hitRadius: 20 } }
        }
    });

    analysisChart1RM = new Chart(ctxE1, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'e1RM', data: e1rmData, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.12)', tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                { label: 'Trend', data: regression, borderColor: '#f59e0b', borderDash: [5, 3], tension: 0, fill: false, pointRadius: 0 }
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
}

function renderExerciseAnalysis() {
    const sel = document.getElementById('analysis-exercise-select');
    const exercise = sel ? sel.value : null;

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

    const recordType = typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(exercise) : 'weight';

    configureAnalysisFilter(recordType);
    configureAnalysisTableHead(recordType, exercise);
    configureAnalysisChartTitles(recordType);

    const cardsContainer = document.getElementById('analysis-key-cards');
    const tableBody = document.getElementById('analysis-sets-table');
    const countEl = document.getElementById('analysis-record-count');
    const insightEl = document.getElementById('analysis-coach-insight');

    let chartData;
    if (recordType === 'treadmill') {
        chartData = renderTreadmillAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl);
    } else if (recordType === 'time_reps') {
        chartData = renderHoldAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl);
    } else if (recordType === 'bodyweight') {
        chartData = renderBodyweightAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl);
    } else {
        chartData = renderWeightAnalysis(exercise, cardsContainer, tableBody, countEl, insightEl);
    }

    setTimeout(filterAnalysisTable, 0);
    renderAnalysisCharts(recordType, chartData);
}

// --- 整體數據 + 肌群分佈 + 每週圖表 ---
function renderOverallStats() {
    const totalWorkouts = workoutHistory.length;
    let totalSets = 0;
    let lifetimeWeightKg = 0;
    let lifetimeDistanceKm = 0;

    const bodyPartVol = {};
    EXERCISE_CATEGORIES.forEach(c => bodyPartVol[c] = { weightKg: 0, distanceKm: 0 });

    workoutHistory.forEach(w => {
        w.exercises.forEach(ex => {
            const cat = getExerciseCategory(ex.name);
            ex.sets.forEach(s => {
                const split = typeof getSetCategoryVolume === 'function'
                    ? getSetCategoryVolume(ex.name, s)
                    : { weightKg: calculateSetVolume(s, ex.name), distanceKm: 0 };
                if (!bodyPartVol[cat]) bodyPartVol[cat] = { weightKg: 0, distanceKm: 0 };
                bodyPartVol[cat].weightKg += split.weightKg;
                bodyPartVol[cat].distanceKm += split.distanceKm;
                lifetimeWeightKg += split.weightKg;
                lifetimeDistanceKm += split.distanceKm;
                totalSets++;
            });
        });
    });

    const sortedDates = [...new Set(workoutHistory.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (sortedDates.length > 0) {
        let current = new Date(sortedDates[0]);
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const prev = new Date(sortedDates[i]);
            const diff = Math.round((current - prev) / (1000 * 3600 * 24));
            if (diff === 1) {
                streak++;
                current = prev;
            } else {
                break;
            }
        }
    }

    document.getElementById('stat-streak').textContent = streak;
    const lifetimeVolEl = document.getElementById('stat-lifetime-volume');
    const lifetimeTonnesEl = document.getElementById('stat-lifetime-tonnes');
    if (lifetimeDistanceKm > 0 && lifetimeWeightKg === 0) {
        if (lifetimeVolEl) lifetimeVolEl.textContent = lifetimeDistanceKm.toFixed(2);
        if (lifetimeTonnesEl) lifetimeTonnesEl.textContent = '公里';
    } else if (lifetimeDistanceKm > 0 && lifetimeWeightKg > 0) {
        if (lifetimeVolEl) lifetimeVolEl.textContent = lifetimeWeightKg.toLocaleString();
        if (lifetimeTonnesEl) lifetimeTonnesEl.textContent = `${(lifetimeWeightKg / 1000).toFixed(1)} 噸 + ${lifetimeDistanceKm.toFixed(1)} km`;
    } else {
        if (lifetimeVolEl) lifetimeVolEl.textContent = lifetimeWeightKg.toLocaleString();
        if (lifetimeTonnesEl) lifetimeTonnesEl.textContent = (lifetimeWeightKg / 1000).toFixed(1);
    }
    document.getElementById('stat-total-workouts').textContent = totalWorkouts;
    document.getElementById('stat-total-sets').textContent = totalSets;
    document.getElementById('stat-pr-count').textContent = countLifetimePRs();

    if (bodyPartChart) bodyPartChart.destroy();
    const bpCtx = document.getElementById('chart-bodypart');
    const labels = Object.keys(bodyPartVol).filter(k => {
        const v = bodyPartVol[k];
        return v.weightKg > 0 || v.distanceKm > 0;
    });
    const dataVals = labels.map(k => {
        const v = bodyPartVol[k];
        return v.weightKg + v.distanceKm * 50;
    });
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

    if (weeklyVolumeChart) weeklyVolumeChart.destroy();
    const weeklyCtx = document.getElementById('chart-weekly-volume');
    const weekly = computeWeeklyVolumes(8);
    if (weeklyCtx) {
        weeklyVolumeChart = new Chart(weeklyCtx, {
            type: 'bar',
            data: { labels: weekly.labels, datasets: [{ label: '每週訓練量 (kg)', data: weekly.values, backgroundColor: '#4ade80' }] },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const km = weekly.kmValues[ctx.dataIndex] || 0;
                                const kg = ctx.raw || 0;
                                return km > 0 ? `${kg.toLocaleString()} kg + ${km.toFixed(1)} km` : `${kg.toLocaleString()} kg`;
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

function countLifetimePRs() {
    let count = 0;
    const seen = new Set();
    const sorted = [...workoutHistory].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((w, wi) => {
        const prior = sorted.slice(0, wi);
        if (typeof detectWorkoutPRs === 'function') {
            detectWorkoutPRs(w, prior).forEach(pr => {
                const key = `${w.date}|${pr}`;
                if (!seen.has(key)) { seen.add(key); count++; }
            });
        }
    });
    return count;
}

function computeWeeklyVolumes(weeks = 8) {
    const labels = [];
    const values = [];
    const kmValues = [];
    const now = new Date();
    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekLabel = `${weekStart.getMonth()+1}/${weekStart.getDate()}`;
        labels.push(weekLabel);

        let weekKg = 0;
        let weekKm = 0;
        workoutHistory.forEach(w => {
            const wd = new Date(w.date);
            const daysDiff = Math.round((now - wd) / (1000*3600*24));
            if (daysDiff >= i * 7 && daysDiff < (i + 1) * 7) {
                const t = typeof calculateWorkoutTotals === 'function'
                    ? calculateWorkoutTotals(w)
                    : { weightKg: w.totalVolume || 0, distanceKm: w.totalDistanceKm || 0 };
                weekKg += t.weightKg;
                weekKm += t.distanceKm;
            }
        });
        values.push(weekKg);
        kmValues.push(weekKm);
    }
    return { labels, values, kmValues };
}

function getExerciseCategory(name) {
    return getMuscleGroup(name);
}