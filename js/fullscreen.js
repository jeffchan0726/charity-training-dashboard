// js/fullscreen.js
// Fullscreen / immersive training mode logic extracted as part of architecture refactor (Option A)

function enterImmersiveMode(options) {
    const skipRender = !!(options && options.skipRender);
    try {
        // Use fullscreen-training class for true full-screen immersive mode
        document.body.classList.add('fullscreen-training');
        document.body.style.overflow = 'hidden';  // Prevent body scroll leaking during full-screen

        isInFullScreenTraining = true;

        const panel = document.getElementById('live-log-panel');
        if (panel) {
            // Move onto document.body so #app-shell overflow doesn't clip or steal taps.
            if (!immersivePanelOriginalParent) {
                immersivePanelOriginalParent = panel.parentNode;
            }
            if (panel.parentNode !== document.body) {
                document.body.appendChild(panel);
            }
            panel.style.position = 'fixed';
            panel.style.inset = '0';
            panel.style.zIndex = '100';
            panel.style.margin = '0';
            panel.style.borderRadius = '0';
            panel.style.backgroundColor = '#1c1917';
            panel.style.overflow = 'hidden';
            panel.style.height = '100dvh';
            panel.classList.remove('hidden');
        }

        const container = panel ? panel.querySelector('.immersive-container') : null;
        if (container) {
            // Use 100dvh so height dynamically matches the visible viewport (address bar hide/show)
            container.style.height = '100dvh';
            container.style.minHeight = '100dvh';
            container.style.maxHeight = '100dvh';
            container.style.borderRadius = '0';
            container.style.border = 'none';
        }

        // Hide main navigation elements for focus (explicit JS control instead of broad CSS to prevent blank page issues)
        const chrome = document.getElementById('app-chrome');
        if (chrome) chrome.style.display = 'none';
        const mainNav = document.getElementById('main-bottom-nav')
            || document.getElementById('main-top-nav')
            || document.querySelector('.flex.flex-wrap.gap-1\\.5.sm\\:gap-2.mb-6');
        if (mainNav) mainNav.style.display = 'none';

        const header = document.querySelector('.charity-header');
        if (header) header.style.display = 'none';

        // After forcing the immersive layout styles, re-render the key Workout Log training UI elements.
        // This ensures #current-workout-exercises, session summary, and sets bar are populated and visible in the new fixed/flex context.
        // Only the log-related training region is affected; other tabs remain intact in DOM for restore on exit.
        if (!skipRender && typeof renderCurrentWorkout === 'function') renderCurrentWorkout();
        if (typeof updateSessionSummary === 'function') updateSessionSummary();

        if (typeof saveWorkoutData === 'function') saveWorkoutData();

        // 組數列收起之後先畫，避免開訓當下主線程被一排按鈕卡住。
        if (typeof renderWorkoutSetsBar === 'function') {
            setTimeout(function () {
                try { renderWorkoutSetsBar(); } catch (_) {}
            }, 0);
        }
        if (typeof setImmersiveAddExerciseCollapsed === 'function') {
            setImmersiveAddExerciseCollapsed(true);
        }
        if (panel) panel.style.touchAction = 'manipulation';
    } catch (err) {
        console.error('Error in enterImmersiveMode, attempting cleanup', err);
        // safety
        document.body.classList.remove('fullscreen-training');
        document.body.style.overflow = '';
        isInFullScreenTraining = false;
    }
}

function exitImmersiveMode() {
    try {
        document.body.classList.remove('fullscreen-training');
        document.body.style.overflow = '';  // Restore body scroll

        isInFullScreenTraining = false;

        // Reset collapse state for next training session (always start expanded)
        if (typeof setImmersiveTopCollapsed === 'function') setImmersiveTopCollapsed(false);
        else {
            const topBar = document.getElementById('immersive-sticky-top');
            if (topBar) topBar.classList.remove('collapsed');
            _immersiveTopCollapsed = false;
            const ic = document.getElementById('immersive-collapse-icon');
            if (ic) {
                ic.classList.remove('fa-chevron-down');
                ic.classList.add('fa-chevron-up');
            }
        }
        if (typeof setImmersiveAddExerciseCollapsed === 'function') setImmersiveAddExerciseCollapsed(false);

        const panel = document.getElementById('live-log-panel');
        if (panel) {
            // Reset inline styles so normal layout resumes
            panel.style.position = '';
            panel.style.inset = '';
            panel.style.zIndex = '';
            panel.style.margin = '';
            panel.style.borderRadius = '';
            panel.style.backgroundColor = '';
            panel.style.overflow = '';
            panel.classList.add('hidden');
            // Restore to original parent if we moved it for immersive (robust for tab switching and avoiding nesting issues)
            if (immersivePanelOriginalParent && panel.parentNode !== immersivePanelOriginalParent) {
                immersivePanelOriginalParent.appendChild(panel);
            }
        } else {
            // Explicit ensure: if panel missing after exit (e.g. partial restore), try recovery
            const logEl = document.getElementById('content-log');
            if (logEl && typeof originalLogContent !== 'undefined' && originalLogContent) {
                logEl.innerHTML = originalLogContent;
                const recovered = document.getElementById('live-log-panel');
                if (recovered) recovered.classList.add('hidden');
            }
        }

        const container = panel ? panel.querySelector('.immersive-container') : null;
        if (container) {
            container.style.height = '';
            container.style.minHeight = '';
            container.style.maxHeight = '';
            container.style.borderRadius = '';
            container.style.border = '';
        }

        // Restore main navigation and header (explicit, to match simplified CSS)
        const chrome = document.getElementById('app-chrome');
        if (chrome) chrome.style.display = '';
        const mainNav = document.getElementById('main-bottom-nav')
            || document.getElementById('main-top-nav');
        if (mainNav) mainNav.style.display = '';

        const header = document.querySelector('.charity-header');
        if (header) header.style.display = '';

        // Also restore any previously hidden elements from older logic
        const topHeader = document.querySelector('#content-log > .flex.flex-col.sm\\:flex-row');
        if (topHeader) topHeader.style.display = '';
        const subNav = document.getElementById('log-sub-nav');
        if (subNav) subNav.style.display = '';

        if (typeof _exerciseDragState !== 'undefined') _exerciseDragState = null;
        document.body.classList.remove('exercise-drag-active');

        if (typeof flushWorkoutDataSave === 'function') flushWorkoutDataSave();

        setTimeout(function () {
            if (document.body.classList.contains('fullscreen-training')) return;
            try { if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory(); } catch (_) {}
            try { if (typeof refreshDietFromBodyLog === 'function') refreshDietFromBodyLog(); } catch (_) {}
        }, 0);

        // Cleanup any lingering debug listeners (defensive)
        const scrollArea = document.querySelector('.immersive-scroll');
        if (scrollArea && window._debugFullscreenScroll) {
            scrollArea.removeEventListener('scroll', window._debugFullscreenScroll);
            window._debugFullscreenScroll = null;
        }
        if (window._debugWindowScroll) {
            window.removeEventListener('scroll', window._debugWindowScroll);
            window._debugWindowScroll = null;
        }
    } catch (err) {
        console.error('Error in exitImmersiveMode, doing manual ultra-cleanup', err);
        // Force recovery
        document.body.classList.remove('fullscreen-training');
        document.body.style.overflow = '';
        isInFullScreenTraining = false;
        const panel = document.getElementById('live-log-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.style.position = '';
            panel.style.inset = '';
            panel.style.zIndex = '';
            panel.style.margin = '';
            panel.style.borderRadius = '';
            panel.style.backgroundColor = '';
            panel.style.overflow = '';
            if (immersivePanelOriginalParent && panel.parentNode !== immersivePanelOriginalParent) {
                immersivePanelOriginalParent.appendChild(panel);
            }
        } else {
            // Ensure in ultra cleanup
            const logEl = document.getElementById('content-log');
            if (logEl && typeof originalLogContent !== 'undefined' && originalLogContent) {
                logEl.innerHTML = originalLogContent;
                const rec = document.getElementById('live-log-panel');
                if (rec) rec.classList.add('hidden');
            }
        }
        const chrome = document.getElementById('app-chrome');
        if (chrome) chrome.style.display = '';
        const mainNav = document.getElementById('main-bottom-nav')
            || document.getElementById('main-top-nav');
        if (mainNav) mainNav.style.display = '';
        const header = document.querySelector('.charity-header');
        if (header) header.style.display = '';
        const topHeader = document.querySelector('#content-log > .flex.flex-col.sm\\:flex-row');
        if (topHeader) topHeader.style.display = '';
        const subNav = document.getElementById('log-sub-nav');
        if (subNav) subNav.style.display = '';
    }
}

function setImmersiveTopCollapsed(collapsed) {
    const top = document.getElementById('immersive-sticky-top');
    if (!top) return;
    collapsed = !!collapsed;
    _immersiveTopCollapsed = collapsed;
    top.classList.toggle('collapsed', collapsed);
    const icon = document.getElementById('immersive-collapse-icon');
    if (icon) {
        if (collapsed) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    }
}

// === Immersive sticky top collapse/expand ===
// Mobile-friendly: 44px+ tap target (top-right), Tailwind transition + class toggle.
// When collapsed (.collapsed added): hides the header (title + sets-bar).
// ONLY the session-summary bar remains visible (volume / sets / tonnes stats).
function setImmersiveAddExerciseCollapsed(collapsed) {
    collapsed = !!collapsed;
    _immersiveAddExerciseCollapsed = collapsed;
    const box = document.getElementById('immersive-add-exercise')
        || document.querySelector('.immersive-add-exercise');
    if (box) box.classList.toggle('collapsed', collapsed);
    const toggle = document.getElementById('immersive-add-exercise-toggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        toggle.setAttribute('aria-label', collapsed ? '展開加入動作' : '收起加入動作');
    }
    const icon = document.getElementById('immersive-add-exercise-icon');
    if (icon) {
        icon.classList.toggle('fa-chevron-up', !collapsed);
        icon.classList.toggle('fa-chevron-down', collapsed);
    }
}

function toggleImmersiveAddExercise() {
    setImmersiveAddExerciseCollapsed(!_immersiveAddExerciseCollapsed);
}

function toggleImmersiveTopCollapse() {
    setImmersiveTopCollapsed(!_immersiveTopCollapsed);
}