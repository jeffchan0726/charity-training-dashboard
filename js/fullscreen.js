// js/fullscreen.js
// Fullscreen / immersive training mode logic extracted as part of architecture refactor (Option A)

function enterImmersiveMode() {
    try {
        // Use fullscreen-training class for true full-screen immersive mode
        document.body.classList.add('fullscreen-training');
        document.body.style.overflow = 'hidden';  // Prevent body scroll leaking during full-screen

        isInFullScreenTraining = true;

        const panel = document.getElementById('live-log-panel');
        if (panel) {
            // Robust move to body for fixed positioning: this prevents the panel from being trapped in a hidden ancestor (#content-log may have 'hidden' from tab state) which can cause the entire immersive view to appear blank or not render.
            if (!immersivePanelOriginalParent) {
                immersivePanelOriginalParent = panel.parentNode;
            }
            if (immersivePanelOriginalParent && panel.parentNode !== document.body) {
                document.body.appendChild(panel);
            }
            // Ensure it pops to full viewport (CSS rules handle most, but force important styles)
            panel.style.position = 'fixed';
            panel.style.inset = '0';
            panel.style.zIndex = '60';
            panel.style.margin = '0';
            panel.style.borderRadius = '0';
            panel.style.backgroundColor = '#1c1917';
            panel.style.overflow = 'hidden';
            panel.style.height = '100dvh';  /* reinforce dynamic viewport height */
            panel.classList.remove('hidden');  // ensure visible
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
        const mainNav = document.querySelector('.flex.flex-wrap.gap-1\\.5.sm\\:gap-2.mb-6');
        if (mainNav) mainNav.style.display = 'none';

        const header = document.querySelector('.charity-header');
        if (header) header.style.display = 'none';

        // After forcing the immersive layout styles, re-render the key Workout Log training UI elements.
        // This ensures #current-workout-exercises, session summary, and sets bar are populated and visible in the new fixed/flex context.
        // Only the log-related training region is affected; other tabs remain intact in DOM for restore on exit.
        if (typeof renderCurrentWorkout === 'function') renderCurrentWorkout();
        if (typeof updateSessionSummary === 'function') updateSessionSummary();

        // Auto-save when entering full screen
        saveWorkoutData();

        // Re-render Workout Sets bar AFTER the panel and container have been forced into full-screen styles.
        if (typeof renderWorkoutSetsBar === 'function') {
            renderWorkoutSetsBar();
        }
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
        const topBar = document.getElementById('immersive-sticky-top');
        if (topBar) topBar.classList.remove('collapsed');
        _immersiveTopCollapsed = false;
        const ic = document.getElementById('immersive-collapse-icon');
        if (ic) {
            ic.classList.remove('fa-chevron-down');
            ic.classList.add('fa-chevron-up');
        }

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
        const mainNav = document.querySelector('.flex.flex-wrap.gap-1\\.5.sm\\:gap-2.mb-6');
        if (mainNav) mainNav.style.display = '';

        const header = document.querySelector('.charity-header');
        if (header) header.style.display = '';

        // Also restore any previously hidden elements from older logic
        const topHeader = document.querySelector('#content-log > .flex.flex-col.sm\\:flex-row');
        if (topHeader) topHeader.style.display = '';
        const subNav = document.querySelector('#content-log .flex.gap-1\\.5.mb-3.text-sm.border-b');
        if (subNav) subNav.style.display = '';

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
        const mainNav = document.querySelector('.flex.flex-wrap.gap-1\\.5.sm\\:gap-2.mb-6');
        if (mainNav) mainNav.style.display = '';
        const topHeader = document.querySelector('#content-log > .flex.flex-col.sm\\:flex-row');
        if (topHeader) topHeader.style.display = '';
        const subNav = document.querySelector('#content-log .flex.gap-1\\.5.mb-3.text-sm.border-b');
        if (subNav) subNav.style.display = '';
    }
}

// === Immersive sticky top collapse/expand ===
// Mobile-friendly: 44px+ tap target (top-right), Tailwind transition + class toggle.
// When collapsed (.collapsed added): hides the header (title + sets-bar) + rest timer.
// ONLY the session-summary bar remains visible (volume / sets / tonnes stats).
function toggleImmersiveTopCollapse() {
    const top = document.getElementById('immersive-sticky-top');
    if (!top) return;
    _immersiveTopCollapsed = !_immersiveTopCollapsed;
    top.classList.toggle('collapsed', _immersiveTopCollapsed);
    const icon = document.getElementById('immersive-collapse-icon');
    if (icon) {
        if (_immersiveTopCollapsed) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    }
}