// js/app-boot.js — auth & modal helpers (restored so login buttons work)
function showLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) {
        m.classList.remove('hidden');
        m.style.display = 'flex';
    }
    const u = document.getElementById('loginUsername');
    if (u) setTimeout(() => u.focus(), 50);
}

function hideLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) {
        m.classList.add('hidden');
        m.style.display = 'none';
    }
}

function showAddUserModal() {
    const m = document.getElementById('addUserModal');
    if (m) {
        m.classList.remove('hidden');
        m.style.display = 'flex';
    }
    const u = document.getElementById('newUsername');
    if (u) setTimeout(() => u.focus(), 50);
}

function hideAddUserModal() {
    const m = document.getElementById('addUserModal');
    if (m) {
        m.classList.add('hidden');
        m.style.display = 'none';
    }
}

async function loginUser() {
    const username = (document.getElementById('loginUsername')?.value || '').trim();
    const pin = (document.getElementById('loginPin')?.value || '').trim();
    if (!username || !pin) {
        alert('請輸入用戶名稱同 PIN');
        return;
    }
    if (typeof callAppsScript !== 'function') {
        alert('系統未完全載入，請重新整理');
        return;
    }
    try {
        const result = await callAppsScript('login', { user: username, pin: pin });
        if (result && result.status === 'success') {
            window.currentUser = username;
            try { localStorage.setItem('currentUser', username); } catch (e) {}
            hideLoginModal();
            if (typeof updateUIAfterLogin === 'function') updateUIAfterLogin();
            if (typeof loadUserLogs === 'function') await loadUserLogs();
            if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
        } else {
            alert('登入失敗，請檢查用戶名稱或 PIN');
        }
    } catch (e) {
        console.error(e);
        alert('登入失敗，請稍後再試');
    }
}

async function addNewUser() {
    const username = (document.getElementById('newUsername')?.value || '').trim();
    const pin = (document.getElementById('newPin')?.value || '').trim();
    if (!username || !pin) {
        alert('請輸入用戶名稱同 PIN');
        return;
    }
    if (typeof callAppsScript !== 'function') {
        alert('系統未完全載入，請重新整理');
        return;
    }
    try {
        const result = await callAppsScript('addUser', { user: username, pin: pin });
        if (result && result.status === 'success') {
            alert('用戶 ' + username + ' 已建立！');
            hideAddUserModal();
            window.currentUser = username;
            try { localStorage.setItem('currentUser', username); } catch (e) {}
            if (typeof updateUIAfterLogin === 'function') updateUIAfterLogin();
            if (typeof loadUserLogs === 'function') await loadUserLogs();
            if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
        } else {
            alert('建立用戶失敗（用戶名稱可能已存在）');
        }
    } catch (e) {
        console.error(e);
        alert('建立用戶失敗，請稍後再試');
    }
}

function logoutUser() {
    window.currentUser = null;
    try { localStorage.removeItem('currentUser'); } catch (e) {}
    if (typeof workoutLogs !== 'undefined') window.workoutLogs = [];
    const nameEl = document.getElementById('currentUserName');
    if (nameEl) nameEl.textContent = '';
    const loginBtn = document.getElementById('loginBtn');
    const accountBtn = document.getElementById('accountMenuBtn');
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (accountBtn) accountBtn.classList.add('hidden');
    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
    alert('已登出');
}

// Restore session if possible
(function restoreSession() {
    try {
        const saved = localStorage.getItem('currentUser');
        if (saved && typeof updateUIAfterLogin === 'function') {
            window.currentUser = saved;
            updateUIAfterLogin();
        }
    } catch (e) {}
})();
