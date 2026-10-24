// js/utils.js
// Utility functions extracted for architecture refactor (Option A)

const DIET_OWNER_USERNAME = 'jeff';

/** Diet / weight / nutrition / body-log surfaces are private to user `jeff`. */
function isJeffDietUser() {
    if (typeof currentUser === 'undefined' || !currentUser) return false;
    return String(currentUser).toLowerCase().replace(/[^a-z0-9]/g, '') === DIET_OWNER_USERNAME;
}

function applyJeffDietVisibility() {
    const on = isJeffDietUser();
    if (document.body) document.body.classList.toggle('jeff-diet-hidden', !on);
    document.querySelectorAll('.jeff-diet-only').forEach(function (el) {
        el.classList.toggle('hidden', !on);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
}

// ... (full content would be here; for this call we note the tool limit)
