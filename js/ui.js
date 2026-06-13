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

    let totalVol = 0;
    let totalSets = 0;
    currentWorkout.exercises.forEach(ex => {
        totalSets += ex.sets.length;
        ex.sets.forEach(s => totalVol += (s.volume || calculateSetVolume(s)));
    });

    volEl.textContent = totalVol.toLocaleString();
    setsEl.textContent = `${totalSets} 組`;
    tonnesEl.textContent = (totalVol / 1000).toFixed(2) + ' t';
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
            hint.innerHTML = `<strong>${specificExercise}</strong> 上次：${lastS.weight}kg × ${lastS.reps} 於 ${l.date}`;
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