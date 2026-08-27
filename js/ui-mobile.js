// js/ui-mobile.js — 全程手機 App 外殼（電腦都用同一套欄寬）

function initMobileAppShell() {
    document.documentElement.classList.add('mobile-app');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileAppShell);
} else {
    initMobileAppShell();
}