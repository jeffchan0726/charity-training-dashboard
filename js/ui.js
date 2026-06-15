// js/ui.js
// UI render and helper functions extracted as part of architecture refactor (Option A)
// Start of UI module extraction. More functions (renderCurrentWorkout, history, etc.) will be moved here or split in future steps.

function updateSessionSummary() {
    if (!currentWorkout) return;
    const volEl = document.getElementById('session-volume');
    const setsEl = document.getElementById('session-sets-count');
    const tonnesEl = document.getElementById('session-tonnes');

    if (!volEl || !setsEl || !tonnesEl) {
        return;
    }

    const totals = typeof calculateWorkoutTotals === 'function'
        ? calculateWorkoutTotals(currentWorkout)
        : { weightKg: 0, distanceKm: 0, totalSets: 0 };
    const display = typeof formatWorkoutVolumeDisplay === 'function'
        ? formatWorkoutVolumeDisplay(currentWorkout)
        : { value: '0', unit: 'kg', sub: '0.00 t' };

    volEl.textContent = display.value;
    const unitEl = document.getElementById('session-volume-unit');
    if (unitEl) unitEl.textContent = display.unit;
    setsEl.textContent = `${totals.totalSets} 組`;
    tonnesEl.textContent = display.sub;
}

// Alias for backward compatibility with existing calls
function updateSessionVolume() {
    updateSessionSummary();
}

function updateLastPerformedHint(specificExercise = null) {
    const hint = document.getElementById('last-performed-hint');
    if (!hint) return;
    if (specificExercise && lastPerformed[specificExercise]) {
        const l = lastPerformed[specificExercise];
        if (l.sets && l.sets.length > 0) {
            const lastS = l.sets[l.sets.length - 1];
            const display = typeof formatSetDisplay === 'function'
                ? formatSetDisplay(specificExercise, lastS)
                : `${lastS.weight}kg × ${lastS.reps}`;
            hint.innerHTML = `<strong>${specificExercise}</strong> 上次：${display} 於 ${l.date}`;
        }
    } else {
        hint.innerHTML = '';
    }
}

// --- Rest Timer ---
// Safe DOM helpers to prevent null crashes in fullscreen / recovery scenarios
function safeSetTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function safeSetInnerHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// Additional small UI helpers can be added here in future extractions.