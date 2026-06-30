// js/ui-mobile.js — Mobile shell (top tabs retained as primary navigation)

function initMobileAppShell() {
    document.documentElement.classList.add('mobile-app');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileAppShell);
} else {
    initMobileAppShell();
}