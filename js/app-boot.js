        /*
          BACKEND (Google Apps Script) VALIDATION RULES REQUIRED:

          Username:
            - Must contain ONLY lowercase a-z and 0-9 after normalization.
            - The server MUST receive already-normalized username (frontend always sends cleaned value).
            - On server: user = String(user || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            - Reject if after cleaning length === 0 or does not match the sent value.

          PIN:
            - Must contain ONLY digits 0-9.
            - Server MUST: pin = String(pin || '').replace(/\D/g, '');
            - Reject if not purely numeric or empty.

          Recommended server-side (in doPost / login & addUser handlers):

          function normalizeUsername(u) { return String(u||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
          function normalizePin(p) { return String(p||'').replace(/\D/g,''); }

          Then at the start of login/addUser:
          const cleanUser = normalizeUsername(e.parameter.user || data.user);
          const cleanPin  = normalizePin(e.parameter.pin   || data.pin);

          if (cleanUser !== (data.user || e.parameter.user) || cleanPin !== (data.pin || e.parameter.pin)) {
            return {status: 'error', message: '輸入格式不正確（用戶名只接受小寫英數，PIN 只接受數字）'};
          }

          // then proceed with cleanUser / cleanPin for storage & comparison
        */

        // IMPORTANT: Replace this with your own deployed Google Apps Script Web App /exec URL
        // (From GAS: Deploy > New deployment > Web app > Copy the /exec URL)
        //
        // 公開 GitHub 前請改做你自己嘅 URL，否則會連到作者嘅後端！
        // 詳細步驟請參考 README.md 「GitHub 部署完整指南」
        var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxS8C7XUmx5IvhoSQZ-6JKegxyFtDtoK_gWv_xSS7b2vyRO3Nv7Sc6Kz8p6mWsVOrh1/exec";
        window.APPS_SCRIPT_URL = APPS_SCRIPT_URL;

        function normalizeUsername(raw) {
            if (!raw) return '';
            return String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        function normalizePin(raw) {
            if (!raw) return '';
            return String(raw).trim().replace(/\D/g, '');
        }

        function updateUIAfterLogin() {
            if (typeof applyAccountChrome === 'function') applyAccountChrome(true);
            else {
                const nameEl = document.getElementById('currentUserName');
                if (nameEl) nameEl.textContent = currentUser;
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.classList.add('hidden');
                const accountBtn = document.getElementById('accountMenuBtn');
                if (accountBtn) accountBtn.classList.remove('hidden');
            }

            const logUserName = document.getElementById('logUserName');
            if (logUserName) logUserName.textContent = `(${currentUser})`;

            // Refresh rich log for the newly logged in user
            if (typeof originalLogContent !== 'undefined' && originalLogContent) {
                const logEl = document.getElementById('content-log');
                if (logEl && logEl.innerHTML.includes('需要登入')) {
                    logEl.innerHTML = originalLogContent;
                }
            }
            try {
                cloudLogsReady = false;
                workoutHistory = [];
                if (typeof loadWorkoutData === 'function') {
                    loadWorkoutData({ skipHistory: false });
                }
                if (typeof renderCaloriesTab === 'function') renderCaloriesTab();
                if (typeof loadAppPrefs === 'function') loadAppPrefs();
                if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
                if (typeof renderBodyLog === 'function') renderBodyLog();
            } catch (err) {
                console.warn('updateUIAfterLogin log refresh error (non-fatal):', err);
            }
        }

        function showLoginModal() {
            const modal = document.getElementById('loginModal');
            if (!modal) {
                console.error('#loginModal not found in DOM');
                alert('登入視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function hideLoginModal() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function loginUser() {


            if (isLoggingIn) return;
            isLoggingIn = true;

            // Target both possible login buttons
            const loginBtns = document.querySelectorAll('#login-btn');
            const origHtmls = [];
            loginBtns.forEach((b, i) => {
                origHtmls[i] = b ? b.innerHTML : '';
                if (b) {
                    b.disabled = true;
                    b.classList.add('opacity-70', 'cursor-wait');
                    b.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 登入中...`;
                }
            });

            try {
                // Frontend normalization: force lowercase username + digits-only PIN
                let rawUsername = document.getElementById('loginUsername').value.trim();
                let rawPin = document.getElementById('loginPin').value.trim();

                const username = rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
                const pin = rawPin.replace(/\D/g, '');

                if (!username || !pin) {
                    // restore buttons before return
                    loginBtns.forEach((b, i) => {
                        if (b) {
                            b.disabled = false;
                            b.classList.remove('opacity-70', 'cursor-wait');
                            b.innerHTML = origHtmls[i] || '登入';
                        }
                    });
                    isLoggingIn = false;
                    return alert("請輸入用戶名稱同 PIN");
                }

                const result = await callAppsScript("login", { user: username, pin: pin });

                if (result.status === "success") {
                    currentUser = username;
                    currentUserPin = pin;
                    try { sessionStorage.setItem('currentUserPin', pin); } catch (_) {}
                    try { localStorage.setItem('currentUserPin', pin); } catch (_) {}
                    localStorage.setItem('currentUser', currentUser);
                    hideLoginModal();
                    // Restore log UI structure if it was replaced by guard
                    if (typeof originalLogContent !== 'undefined' && originalLogContent) {
                        const logEl = document.getElementById('content-log');
                        if (logEl) logEl.innerHTML = originalLogContent;
                    }
                    updateUIAfterLogin();
                    if (typeof bootstrapGoogleCloudData === 'function') {
                        await bootstrapGoogleCloudData();
                    }
                    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
                    try {
                        if (typeof showLogSubSection === 'function') showLogSubSection('history');
                    } catch (err) {
                        console.warn('showLogSubSection after login error (non-fatal):', err);
                    }
                } else {
                    const msg = (result.message || "登入失敗");
                    const lower = msg.toLowerCase();
                    if (lower.includes('用戶不存在') || lower.includes('not exist') || lower.includes('不存在') || lower.includes('no user') || lower.includes('not found')) {
                        // 用戶名不存在：顯示準確訊息，並引導註冊
                        alert(msg || "用戶不存在，請確認用戶名或先註冊");
                        hideLoginModal();
                        showAddUserModal();
                    } else if (lower.includes('pin 碼錯誤') || lower.includes('pin') || lower.includes('密碼') || lower.includes('incorrect') || lower.includes('wrong')) {
                        // PIN 錯誤（用戶存在）：顯示準確訊息
                        alert(msg || "PIN 碼錯誤，請重新輸入");
                    } else {
                        alert("登入失敗：" + msg);
                    }
                }
            } catch (err) {
                console.error('loginUser error:', err);
                alert("登入過程出錯，請檢查網絡或 Apps Script URL");
            } finally {
                isLoggingIn = false;
                // Always restore login buttons
                const loginBtns2 = document.querySelectorAll('#login-btn');
                loginBtns2.forEach((b, i) => {
                    if (b) {
                        b.disabled = false;
                        b.classList.remove('opacity-70', 'cursor-wait');
                        b.innerHTML = origHtmls[i] || '登入';
                    }
                });
            }
        }

        function logoutUser() {

            try {
                exitImmersiveMode();
            } catch (e) {
                // ultra cleanup will happen inside or below
            }
            currentUser = null;
            currentUserPin = null;
            cloudLogsReady = false;
            try { sessionStorage.removeItem('currentUserPin'); } catch (_) {}
            try { localStorage.removeItem('currentUserPin'); } catch (_) {}
            localStorage.removeItem('currentUser');
            workoutLogs = [];
            if (typeof applyAccountChrome === 'function') applyAccountChrome(false);
            else {
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.classList.remove('hidden');
                const accountBtn = document.getElementById('accountMenuBtn');
                if (accountBtn) accountBtn.classList.add('hidden');
            }
            if (typeof applyJeffDietVisibility === 'function') applyJeffDietVisibility();
            const logUserName = document.getElementById('logUserName');
            if (logUserName) logUserName.textContent = "";
            renderLogTable();

            // Clear rich workout state on logout (will reload guest on next action)
            currentWorkout = null;
            workoutHistory = [];
            lastPerformed = {};
            lastWorkoutSetName = null;
            workoutSets = [];
            workoutSetsCache = null;
            workoutSetsCacheTimestamp = 0;
            if (typeof resetGoogleBootstrapState === 'function') resetGoogleBootstrapState();
            currentEditingSet = null;
            editingSetExercises = [];
            const liveP = document.getElementById('live-log-panel');
            if (liveP) {
                liveP.classList.add('hidden');
                if (immersivePanelOriginalParent && liveP.parentNode !== immersivePanelOriginalParent) {
                    immersivePanelOriginalParent.appendChild(liveP);
                }
            }
            if (document.getElementById('log-empty-state')) document.getElementById('log-empty-state').classList.remove('hidden');
            if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory();
            if (typeof renderOverallStats === 'function') renderOverallStats();
            if (typeof renderCaloriesTab === 'function') renderCaloriesTab();
            if (typeof setBodyLog === 'function') setBodyLog([]);
            else if (typeof bodyLogCache !== 'undefined') bodyLogCache = [];
            if (typeof loadAppPrefs === 'function') loadAppPrefs();
            if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
            if (typeof renderBodyLog === 'function') renderBodyLog();
            // Clear the dynamic sets bar
            const bar = document.getElementById('workout-sets-bar');
            if (bar) bar.innerHTML = '';
        }

        let loadUserLogsInFlight = null;

        async function loadUserLogs(options = {}) {
            if (!currentUser) return;
            if (loadUserLogsInFlight) return loadUserLogsInFlight;

            loadUserLogsInFlight = (async () => {

            const silent = options.silent === true
                || (options.silent !== false && typeof isLogTabVisible === 'function' && !isLogTabVisible());

            // 1. 顯示 #content-log 內部的 loading 畫面（僅在用戶已打開 log tab 時）
            const loadingEl = document.getElementById('log-loading-state');
            const emptyState = document.getElementById('log-empty-state');
            const historyList = document.getElementById('workout-history-list');
            const subNav = document.getElementById('log-sub-nav');

            cloudLogsReady = false;
            if (!silent) {
                if (loadingEl) loadingEl.classList.remove('hidden');
                if (emptyState) emptyState.style.display = 'none';
                if (historyList) historyList.innerHTML = '';
                if (subNav) subNav.style.visibility = 'hidden';
            }

            // 右上角也顯示簡短狀態（保留但次要）
            showInitialSyncStatus('loading');

            const retryBtn = document.getElementById('log-retry-load-btn');
            if (retryBtn) retryBtn.classList.add('hidden');

            setInitialLoadRetry(() => {
                if (typeof bootstrapGoogleCloudData === 'function') {
                    bootstrapGoogleCloudData({ force: true }).catch(() => {});
                } else if (currentUser) {
                    loadUserLogs().catch(() => {});
                }
            });

            try {
                const logs = await callAppsScript("getLogs");
                if (!Array.isArray(logs)) {
                    const msg = (logs && logs.message) ? logs.message : 'getLogs 回傳格式錯誤';
                    if (/pin|未授權|重新登入|未登入/i.test(String(msg))) {
                        try { showToast('請重新登入以同步雲端', 3600); } catch (_) {}
                        try { showLoginModal(); } catch (_) {}
                    }
                    throw new Error(msg);
                }
                workoutLogs = logs;
                renderLogTable();

                try {
                    const localSnapshot = typeof getLocalHistoryFromStorage === 'function'
                        ? getLocalHistoryFromStorage()
                        : (Array.isArray(workoutHistory) ? JSON.parse(JSON.stringify(workoutHistory)) : []);

                    const cloudHistory = typeof rebuildWorkoutsFromLogRows === 'function'
                        ? rebuildWorkoutsFromLogRows(logs)
                        : [];

                    workoutHistory = typeof mergeCloudAndLocalHistory === 'function'
                        ? mergeCloudAndLocalHistory(cloudHistory, localSnapshot)
                        : (cloudHistory.length ? cloudHistory : localSnapshot);

                    if (typeof dedupeWorkoutHistoryBySessionId === 'function') {
                        workoutHistory = dedupeWorkoutHistoryBySessionId(workoutHistory);
                    }
                    (workoutHistory || []).forEach(w => {
                        if (typeof dedupeWorkoutSets === 'function') dedupeWorkoutSets(w);
                    });

                    if (typeof rebuildLastPerformed === 'function') rebuildLastPerformed();
                    if (typeof saveWorkoutData === 'function') saveWorkoutData();
                } catch (e) {
                    console.warn('Backend data load failed, using local cache', e);
                    if (typeof restoreLocalWorkoutCacheAfterCloudLoadFail === 'function') {
                        restoreLocalWorkoutCacheAfterCloudLoadFail();
                    }
                }

                // Refresh rich UI views
                try {
                    if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory();
                    if (typeof renderOverallStats === 'function') renderOverallStats();
                    if (typeof renderCalendar === 'function') renderCalendar();
                    if (typeof updateExerciseSelectForAnalysis === 'function') updateExerciseSelectForAnalysis();
                } catch (err) {
                    console.warn('post loadUserLogs render error (non-fatal):', err);
                }

                // 更新「開始新訓練 / 繼續今日訓練」按鈕
                try { updateStartTrainingButton(); } catch (e) {}
                try {
                    if (typeof refreshDietFromBodyLog === 'function') refreshDietFromBodyLog();
                } catch (e) {}

                cloudLogsReady = true;
                if (typeof finalizeLogTabUiReady === 'function') {
                    finalizeLogTabUiReady();
                } else {
                    if (loadingEl) loadingEl.classList.add('hidden');
                    if (emptyState) emptyState.style.display = '';
                    if (subNav) subNav.style.visibility = '';
                }

                // 右上角成功提示
                showInitialSyncStatus('success');

            } catch (err) {
                console.error('[loadUserLogs] getLogs / rebuild failed:', err);
                cloudLogsReady = false;

                if (typeof restoreLocalWorkoutCacheAfterCloudLoadFail === 'function') {
                    restoreLocalWorkoutCacheAfterCloudLoadFail();
                }

                // 顯示錯誤狀態在 log 區域內（背景靜默載入失敗時，等用戶打開 tab 先顯示）
                if (!silent && loadingEl) {
                    loadingEl.classList.remove('hidden');
                    // 替換內容為錯誤 + 重試
                    loadingEl.innerHTML = `
                        <div class="log-card rounded-3xl p-8 text-center border border-red-900/40 bg-red-950/10">
                            <i class="fa-solid fa-exclamation-triangle text-3xl text-red-400 mb-3"></i>
                            <div class="font-semibold text-base mb-2 text-red-300">載入訓練紀錄失敗</div>
                            <p class="text-sm text-[#a8a29e] mb-4">${escapeHtml((err && err.message) ? err.message : '無法從 Google 取得最新數據')}。已顯示本地快取（如有）。</p>
                            <button onclick="retryLoadUserLogs()" 
                                    class="px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-2xl text-sm font-semibold">
                                <i class="fa-solid fa-redo mr-1.5"></i> 立即重試
                            </button>
                        </div>`;
                }

                // 還原其他內容（本地資料）
                if (emptyState) emptyState.style.display = '';
                if (subNav) subNav.style.visibility = '';
                if (historyList) {
                    try { if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory(); } catch (_) {}
                }

                showInitialSyncStatus('error');
                try { updateGlobalSyncIndicator('error'); } catch (_) {}
                try { showToast('載入失敗，請點擊 log 區域內的重試按鈕', 3800); } catch (_) {}
            }
            })();

            try {
                return await loadUserLogsInFlight;
            } finally {
                loadUserLogsInFlight = null;
            }
        }

        function renderLogTable() {
            // Legacy flat table no longer rendered in new professional UI.
            // Instead refresh the rich history view (if the new system is loaded).
            if (typeof renderWorkoutHistory === 'function') {
                renderWorkoutHistory();
            }
            // Also keep the old workoutLogs array in sync if needed for other code
        }

        function showAddLogModal() {
            if (!currentUser) return alert("請先登入");
            const modal = document.getElementById('addLogModal');
            if (!modal) {
                console.error('#addLogModal not found in DOM');
                alert('記錄視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            const dateEl = document.getElementById('logDate');
            if (dateEl) dateEl.value = getLocalDateString();
        }

        function hideAddLogModal() {
            const modal = document.getElementById('addLogModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function addNewLog() {
            if (!currentUser) return;
            const dateEl = document.getElementById('logDate');
            const exEl = document.getElementById('logExercise');
            const setsEl = document.getElementById('logSets');
            const repsEl = document.getElementById('logReps');
            const weightEl = document.getElementById('logWeight');
            const sessionId = String(Date.now());
            const newLog = {
                id: Date.now(),
                session_id: sessionId,
                user: currentUser,
                date: dateEl ? dateEl.value : '',
                exercise: exEl ? exEl.value : '',
                // sets: vestigial from legacy flat model; sent for compat but ignored by loadUserLogs / volume / PR paths (rich training uses per-set arrays)
                sets: setsEl ? setsEl.value : '',
                reps: repsEl ? repsEl.value : '',
                weight: weightEl ? weightEl.value : ''
            };
            if (!newLog.exercise) return alert("請輸入動作名稱");
            const reps = parseInt(newLog.reps) || 0;
            if (reps <= 0) {
                alert('請輸入次數');
                return;
            }
            const result = await callAppsScript("addLog", { user: currentUser, log: newLog });
            if (result && result.status === 'success') {
                hideAddLogModal();
                await loadUserLogs();
            } else {
                alert((result && result.message) || '儲存失敗，請重試');
            }
        }

        async function deleteLog(logId) {
            if (!confirm("確定刪除？")) return;
            await callAppsScript("deleteLog", { user: currentUser, logId: logId });
            await loadUserLogs();
        }

        /* ============================================================
           WORKOUT LOG ENGINE (Rich client-side with localStorage persistence + optional backend sync)
           ============================================================ */

        let personalRecords = {};
        let currentLogSub = 'history';
        let workoutSetsCacheTimestamp = 0;
        const WORKOUT_SETS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for cache
        let isLoggingIn = false;

        function showUnfinishedWorkoutModal() {
            const modal = document.getElementById('unfinishedWorkoutModal');
            const msgEl = document.getElementById('unfinished-workout-msg');
            if (!modal) {
                console.error('#unfinishedWorkoutModal not found in DOM');
                alert('未完成訓練提示視窗載入失敗，請重新整理頁面。');
                return;
            }

            const date = formatDateForDisplay(currentWorkout.date || '');
            const exCount = currentWorkout.exercises ? currentWorkout.exercises.length : 0;
            if (msgEl) {
                msgEl.textContent = `偵測到未完成的訓練（日期 ${date}，${exCount} 個動作）。是否繼續之前的訓練？`;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function hideUnfinishedWorkoutModal() {
            const modal = document.getElementById('unfinishedWorkoutModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        function resumeUnfinishedWorkout() {
            if (guardServerSyncing('同步中，請稍候再繼續訓練')) return;
            hideUnfinishedWorkoutModal();
            // Resume - show in normal (non-fullscreen) log view so other tabs remain clickable
            const live = document.getElementById('live-log-panel');
            if (live) live.classList.remove('hidden');
            const empty = document.getElementById('log-empty-state');
            if (empty) empty.classList.add('hidden');
            const dateInput = document.getElementById('current-workout-date');
            if (dateInput) dateInput.value = currentWorkout.date || getLocalDateString();
            renderCurrentWorkout();
            updateSessionSummary();

        }

        function discardAndStartNew() {
            if (guardServerSyncing('同步中，請稍候再開始訓練')) return;
            hideUnfinishedWorkoutModal();
            currentWorkout = null;
            saveWorkoutData();
            // Now proceed with fresh start (re-call startNewWorkout to create new one)
            // Use setTimeout to avoid recursion stack in same call
            setTimeout(() => {
                if (typeof startNewWorkout === 'function') startNewWorkout();
            }, 0);
        }

        function saveDraftBeforeUnload() {

            if (currentWorkout) {
                saveWorkoutData();
                // Best-effort: if user is logged in we could push a lightweight draft here,
                // but main persistence is localStorage + final push on finish.
            }
        }

        function rebuildLastPerformed() {
            lastPerformed = {};
            [...workoutHistory].sort((a,b) => b.date.localeCompare(a.date)).forEach(w => {
                w.exercises.forEach(ex => {
                    if (!lastPerformed[ex.name] && ex.sets && ex.sets.length) {
                        // Store FULL sets from the last historical workout for this exercise (for "Last" display with multi-set support)
                        lastPerformed[ex.name] = {
                            sets: ex.sets.map(s => ({
                                weight: s.weight,
                                body_weight: s.body_weight,
                                reps: s.reps,
                                duration: s.duration,
                                incline: s.incline,
                                speed: s.speed,
                                notes: s.notes,
                                volume: s.volume
                            })),
                            date: w.date
                        };
                    }
                });
            });
        }

        // --- Current Workout Management (the fast logging core) ---

        /* ============================================================
           B. 今日繼續邏輯 - Helpers
        ============================================================ */

        // Date utils now from js/utils.js (A refactor)

        /**
         * 從 workoutHistory 找出「今日」的所有訓練（支援同日多場，合併 exercises + sets）
         * 回傳一個 workout-like 物件，方便 preload。
         * 如果無今日紀錄則回 null。
         */
        function getTodayWorkoutFromHistory() {
            if (!Array.isArray(workoutHistory) || workoutHistory.length === 0) return null;
            const today = getTodayStr();

            // 優先直接在 workoutHistory 找（已按日期排序）
            let matches = workoutHistory.filter(w => {
                const d = normalizeDateToLocal(w.date);
                return d === today;
            });

            if (matches.length === 0) return null;

            let combinedNotes = '';
            matches.forEach(w => {
                if (w.notes) combinedNotes = (combinedNotes ? combinedNotes + ' | ' : '') + w.notes;
            });

            const allExercises = matches.flatMap(w => w.exercises || []);
            const mergedExerciseList = typeof mergeExercisesByName === 'function'
                ? mergeExercisesByName(allExercises)
                : allExercises;

            const primary = matches[0];
            const workoutSetName = primary.workoutSetName
                || (typeof inferWorkoutSetNameFromExercises === 'function'
                    ? inferWorkoutSetNameFromExercises(mergedExerciseList)
                    : '');
            return {
                id: primary.id || primary.session_id || primary.sessionId || ('today_' + today + '_' + Date.now()),
                session_id: primary.session_id || primary.sessionId || primary.id || ('today_' + today + '_' + Date.now()),
                date: today,
                exercises: mergedExerciseList,
                notes: combinedNotes,
                workoutSetName: workoutSetName || undefined,
                isContinuedFromToday: true,
                // 記錄所有原本的 session ids，如果有需要可全刪（但此處只繼承主一個）
                _originalSessionIds: matches.map(m => m.id || m.session_id || m.sessionId).filter(Boolean)
            };
        }

        /**
         * 根據日期 preload 一個 currentWorkout 結構（同全新訓練一致）
         * 給 startNewWorkout 使用。
         */
        function preloadWorkoutFromHistory(dateStr) {
            if (!dateStr) return null;
            const d = normalizeDateToLocal(dateStr);
            const today = getTodayStr();
            if (d !== today) return null;

            const todayData = getTodayWorkoutFromHistory();
            if (!todayData || !todayData.exercises || todayData.exercises.length === 0) return null;

            const preloaded = {
                id: todayData.id || todayData.session_id || Date.now(),
                session_id: todayData.session_id || todayData.id,
                date: today,
                exercises: JSON.parse(JSON.stringify(todayData.exercises)),
                notes: todayData.notes || '',
                startTime: Date.now(),
                isContinuedFromToday: true,
                _originalSessionIds: todayData._originalSessionIds || []
            };
            if (typeof markWorkoutSetsAsSyncedFromCloud === 'function') {
                markWorkoutSetsAsSyncedFromCloud(preloaded);
            }
            if (typeof createContinueWorkoutSnapshot === 'function') {
                preloaded._continueSnapshot = createContinueWorkoutSnapshot(preloaded);
            }
            return preloaded;
        }

        function shouldRefreshContinueWorkout() {
            if (!currentWorkout) return true;
            if (currentWorkout.isContinuedFromToday) return false;

            const today = getTodayStr();
            const draftDate = normalizeDateToLocal(currentWorkout.date);
            if (draftDate !== today) return true;

            const draftSets = typeof countWorkoutSets === 'function'
                ? countWorkoutSets(currentWorkout) : 0;
            return draftSets === 0 && hasTrainingToday();
        }

        /**
         * 新增 helper：檢查今日是否有訓練紀錄
         */
        function hasTrainingToday() {
            const todayWorkout = getTodayWorkoutFromHistory();
            return !!(todayWorkout && todayWorkout.exercises && todayWorkout.exercises.length > 0);
        }

        /**
         * 新增 helper：取得今日的 workout（已合併）
         */
        function getTodayWorkout() {
            return getTodayWorkoutFromHistory();
        }

        /**
         * 新增 helper：將今日紀錄 preload 入 currentWorkout
         * 結構與全新訓練一致
         */
        function loadTodayWorkoutIntoCurrent(force = false) {
            const todayData = getTodayWorkout();
            if (!todayData || !todayData.exercises || todayData.exercises.length === 0) return false;

            if (!force && currentWorkout) {
                if (currentWorkout.isContinuedFromToday) return false;
                const draftSets = typeof countWorkoutSets === 'function'
                    ? countWorkoutSets(currentWorkout) : 0;
                if (draftSets > 0) return false;
            }

            currentWorkout = {
                id: todayData.id || todayData.session_id || todayData.sessionId || Date.now(),
                session_id: todayData.session_id || todayData.sessionId || todayData.id,
                date: getTodayStr(),
                exercises: JSON.parse(JSON.stringify(todayData.exercises)),
                notes: todayData.notes || '',
                startTime: Date.now(),
                isContinuedFromToday: true,
                _originalSessionIds: todayData._originalSessionIds || []
            };

            if (typeof markWorkoutSetsAsSyncedFromCloud === 'function') {
                markWorkoutSetsAsSyncedFromCloud(currentWorkout);
            }
            if (typeof createContinueWorkoutSnapshot === 'function') {
                currentWorkout._continueSnapshot = createContinueWorkoutSnapshot(currentWorkout);
            }
            if (typeof sessionCloudDeletedIds !== 'undefined') {
                sessionCloudDeletedIds = new Set();
            }
            return true;
        }

        /**
         * 動態更新「開始新訓練」按鈕（或「繼續今日訓練」）
         * 在 empty-state 區域顯示正確的入口
         */
        function updateStartTrainingButton() {
            const btn = document.getElementById('start-training-btn');
            if (!btn) return;

            const hasToday = hasTrainingToday();
            const descP = document.querySelector('#log-empty-state p');

            if (hasToday) {
                btn.textContent = '繼續今日訓練';
                // 可選：用不同顏色強調繼續模式
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                btn.classList.add('bg-amber-600', 'hover:bg-amber-700');

                if (descP) {
                    descP.textContent = '今日已有訓練記錄，點擊繼續完成今日訓練。';
                }
            } else {
                btn.textContent = '開始新訓練';
                btn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
                btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');

                if (descP) {
                    descP.textContent = '點擊開始新訓練，計時器幫助你在組間適當休息。';
                }
            }
        }

        function startNewWorkout(dateStr = null) {
            const alreadyInFullscreen = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;

            if (!currentUser) {
                showLoginModal();
                return;
            }

            if (guardServerSyncing('同步中，請稍候再開始或繼續訓練')) return;

            // 自動恢復未完成訓練的提示已完全停用（按用戶要求）
            // 不再彈出 showUnfinishedWorkoutModal()
            // 如有 currentWorkout（來自 localStorage），會直接重用（或由「今日繼續」邏輯處理）

            const today = getTodayStr();
            const date = dateStr || today;

            // === B. 智能「今日繼續」邏輯 ===
            if (!currentWorkout || shouldRefreshContinueWorkout()) {
                let loadedFromToday = false;
                if (date === today && hasTrainingToday()) {
                    loadedFromToday = loadTodayWorkoutIntoCurrent(true);
                }
                if (!loadedFromToday && !currentWorkout) {
                    currentWorkout = { id: Date.now(), date, exercises: [], notes: '', startTime: Date.now() };
                }
            }

            if (currentWorkout && currentWorkout.isContinuedFromToday &&
                !currentWorkout._continueSnapshot &&
                typeof createContinueWorkoutSnapshot === 'function') {
                currentWorkout._continueSnapshot = createContinueWorkoutSnapshot(currentWorkout);
            }

            // Reset any previous sync status when starting fresh training
            activeBackgroundSyncs = 0;
            if (typeof sessionCloudDeletedIds !== 'undefined') {
                sessionCloudDeletedIds = new Set();
            }
            const syncEl = document.getElementById('sync-status');
            if (syncEl) syncEl.innerHTML = '';

            if (currentWorkout && !currentWorkout.isContinuedFromToday) {
                delete currentWorkout._continueSnapshot;
            }

            // === Auto "接埋" last chosen training set ===
            // 只有全新空白訓練才自動接 last set；繼續今日訓練已 preload 了內容，跳過。
            const isContinueMode = !!(currentWorkout && currentWorkout.isContinuedFromToday);
            if (!isContinueMode && lastWorkoutSetName && currentWorkout && (!currentWorkout.exercises || currentWorkout.exercises.length === 0)) {
                let lastSet = (workoutSets || []).find(s => s.name === lastWorkoutSetName);
                if (!lastSet && typeof TRAINING_DAYS !== 'undefined') {
                    const presetDay = TRAINING_DAYS.find(d =>
                        d.fullName === lastWorkoutSetName || d.label === lastWorkoutSetName
                    );
                    if (presetDay) {
                        lastSet = { name: presetDay.fullName, exercises: presetDay.exercises };
                    }
                }
                if (lastSet && Array.isArray(lastSet.exercises) && lastSet.exercises.length > 0) {
                    currentWorkout.workoutSetName = lastSet.name || lastWorkoutSetName;
                    lastSet.exercises.forEach(name => {
                        const ex = getExerciseByName(name);
                        const displayName = ex ? getExerciseDisplay(ex) : name;
                        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
                            currentWorkout.exercises.push({ name: displayName, sets: [] });
                        }
                    });
                }
            }

            // Robust tab activation for log: only switch if the content-log is currently hidden.
            // This avoids unnecessary switchTab('log') calls (and the associated "Restoring originalLogContent" + wrapper spam)
            // when we are already on the log tab (common case right after finishing a workout).
            // Direct DOM manipulation for tab state to prevent hook side-effects.
            const logContent = document.getElementById('content-log');
            if (logContent && logContent.classList.contains('hidden')) {
                try {
                    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
                    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active', 'bg-[#166534]', 'text-white'));
                    logContent.classList.remove('hidden');
                    const logTabBtn = document.getElementById('tab-log');
                    if (logTabBtn) logTabBtn.classList.add('active', 'bg-[#166534]', 'text-white');
                    // direct tab activation
                } catch (e) {
                    // fallback
                    try {
                        if (typeof switchTab === 'function') switchTab('log');
                    } catch (e2) {}
                }
            } else if (logContent) {
                // log tab already visible
            }

            // Robust element access with null checks and recovery
            const livePanel = document.getElementById('live-log-panel');
            if (livePanel) {
                livePanel.classList.remove('hidden');
            } else {
                const logEl = document.getElementById('content-log');
                if (logEl && typeof originalLogContent !== 'undefined' && originalLogContent) {
                    // More robust recovery: always attempt restore if we have original content (especially after fullscreen exit + new start)
                    const needsRestore = logEl.innerHTML.includes('需要登入') || !document.getElementById('live-log-panel');
                    if (needsRestore) {
                        logEl.innerHTML = originalLogContent;
                        // retry finding panel
                        const recoveredPanel = document.getElementById('live-log-panel');
                        if (recoveredPanel) {
                            recoveredPanel.classList.remove('hidden');
                            // If we are supposed to be in fullscreen after recovery, re-apply move (rare but defensive)
                            const isFs = document.body.classList.contains('fullscreen-training') || isInFullScreenTraining;
                            if (isFs && immersivePanelOriginalParent && recoveredPanel.parentNode !== document.body) {
                                document.body.appendChild(recoveredPanel);
                            }
                        }
                    }
                }
            }

            const emptyState = document.getElementById('log-empty-state');
            if (emptyState) {
                emptyState.classList.add('hidden');
            }

            const dateInput = document.getElementById('current-workout-date');
            if (dateInput) {
                dateInput.value = currentWorkout.date || getLocalDateString();
            }

            // Defensive renders - these functions should also be null-safe internally, but guard the calls
            try {
                renderCurrentWorkout();
            } catch (e) {}
            try {
                updateSessionSummary();
            } catch (e) {}
            try {
                updateLastPerformedHint();
            } catch (e) {}

            // === B. 繼續今日訓練的 UI 提示 ===
            const continueBadge = document.getElementById('continue-badge');
            const modeTitle = document.getElementById('training-mode-title');
            const isContinue = !!(currentWorkout && currentWorkout.isContinuedFromToday);

            if (continueBadge) {
                continueBadge.classList.toggle('hidden', !isContinue);
            }
            if (modeTitle) {
                modeTitle.textContent = isContinue ? '繼續今日訓練' : '進行中訓練';
            }

            if (isContinue) {
                // 給用戶一個清楚的一次性提示（mobile friendly）
                const exCount = (currentWorkout.exercises || []).length;
                const setCount = (currentWorkout.exercises || []).reduce((sum, ex) => sum + (ex.sets || []).length, 0);
                try {
                    showToast(`繼續今日訓練 • 已載入 ${exCount} 動作 / ${setCount} 組`, 2800);
                } catch (_) {}
            }

            // Use cache for instant Workout Sets bar display (key for perceived speed after "開始新訓練")
            if (workoutSetsCache && workoutSetsCache.length > 0 && (!workoutSets || workoutSets.length === 0)) {
                workoutSets = JSON.parse(JSON.stringify(workoutSetsCache));
            }

            // Always re-render the dynamic Workout Sets bar (important for full-screen) - now instant if cached
            if (typeof renderWorkoutSetsBar === 'function') {
                try {
                    renderWorkoutSetsBar();
                } catch (e) {}
            }

            // Trigger background refresh if no cache or stale (non-blocking)
            if (!workoutSetsCache && currentUser && typeof loadWorkoutSets === 'function') {
                loadWorkoutSets().catch(e => {});
            }

            // Only enter immersive mode if we are not already in full-screen training.
            // This prevents clicking a Set button from kicking us out or causing re-entry flicker.
            if (!alreadyInFullscreen) {
                // Enter immersive full-screen training mode
                if (typeof enterImmersiveMode === 'function') {
                    try {
                        enterImmersiveMode();
                    } catch (e) {
                        // fallback: at least show the panel
                        const p = document.getElementById('live-log-panel');
                        if (p) p.classList.remove('hidden');
                    }
                }
            }

            // Immediate auto-save of the new/ resumed session
            saveWorkoutData();
            if (typeof setImmersiveAddExerciseCollapsed === 'function') {
                setImmersiveAddExerciseCollapsed(true);
            }
        }

        function updateCurrentWorkoutDate() {
            if (!currentWorkout) return;
            currentWorkout.date = document.getElementById('current-workout-date').value;
            saveWorkoutData();
        }

        function cancelCurrentWorkout() {

            if (!currentWorkout) return;

            // C. 放棄也要自動儲存已記錄的組數
            const hasData = (currentWorkout.exercises || []).some(ex => (ex.sets || []).length > 0);
            const isContinue = !!currentWorkout.isContinuedFromToday;

            if (hasData) {
                const msg = isContinue
                    ? '確定結束繼續訓練？\n今日已記錄的組數會保留，新加的組數會同步到 Google。'
                    : '確定放棄本次訓練？\n之前已記錄的組數會自動背景儲存到 Google（只係唔繼續呢個 session）。';
                if (!confirm(msg)) return;

                const snapshot = JSON.parse(JSON.stringify(currentWorkout));
                if (isContinue && typeof applyContinueWorkoutFinishToLocalHistory === 'function') {
                    applyContinueWorkoutFinishToLocalHistory(snapshot);
                } else if (typeof upsertWorkoutInHistory === 'function') {
                    upsertWorkoutInHistory(snapshot);
                } else {
                    workoutHistory.unshift(JSON.parse(JSON.stringify(snapshot)));
                }
                rebuildLastPerformed();
                saveWorkoutData();
                try { renderWorkoutHistory(); } catch (_) {}

                if (currentUser) {
                    finalizeAndSaveWorkout(snapshot, snapshot.notes || '').catch(() => {});
                }

                try {
                    showToast(isContinue ? '今日訓練已更新' : '已自動儲存你之前記錄的組數', 3200);
                } catch (_) {}
            } else {
                if (!confirm('Discard current workout?')) return;
            }

            currentWorkout = null;
            const liveP2 = document.getElementById('live-log-panel');
            if (liveP2) {
                liveP2.classList.add('hidden');
                if (immersivePanelOriginalParent && liveP2.parentNode !== immersivePanelOriginalParent) {
                    immersivePanelOriginalParent.appendChild(liveP2);
                }
            }
            const empty = document.getElementById('log-empty-state');
            if (empty) empty.classList.remove('hidden');
            exitImmersiveMode();
            saveWorkoutData();
            try { updateStartTrainingButton(); } catch (_) {}
        }

        function addExerciseToCurrentWorkout(nameFromInput = null) {
            if (!currentWorkout) startNewWorkout();
            if (!currentWorkout) return;
            let name = nameFromInput || document.getElementById('add-exercise-input').value.trim();
            if (!name) return;

            const ex = getExerciseByName(name);
            const displayName = ex ? getExerciseDisplay(ex) : name;

            const existing = currentWorkout.exercises.find(e => e.name.toLowerCase() === displayName.toLowerCase());
            if (existing) {
                alert('此動作已在本訓練中。');
                return;
            }

            // 切換去下一個動作前，補同步上一個動作未推送的組數
            if (currentUser && typeof flushWorkoutPendingCloudSync === 'function') {
                flushWorkoutPendingCloudSync(currentWorkout);
            }

            currentWorkout.exercises.push({ name: displayName, sets: [] });
            document.getElementById('add-exercise-input').value = '';
            renderCurrentWorkout();
            saveWorkoutData();
            updateLastPerformedHint(displayName);
        }

        /**
         * 3. 改善「加入動作」自動建議：優先顯示 workoutSets（用戶動作倉 / 自訂組合）中最相關的動作
         * 使用簡單 fuzzy / 包含匹配 + 優先排序。
         * 動態更新 datalist，mobile 體驗佳（原生 dropdown）。
         */
        function updateExerciseSuggestions(query = '') {
            const datalist = document.getElementById('exercise-datalist');
            if (!datalist) return;

            const q = (query || '').toLowerCase().trim();

            // 收集來源：workoutSets（最高優先） + lastPerformed（最近用過） + EXERCISES
            const librarySet = new Set();
            (workoutSets || []).forEach(ws => {
                (ws.exercises || []).forEach(name => {
                    if (name) librarySet.add(name);
                });
            });

            const recentSet = new Set(Object.keys(lastPerformed || {}));

            let candidates = [];

            // 1. workoutSets 裡的動作（最高權重）
            librarySet.forEach(name => candidates.push({ name, score: 100 }));

            // 2. 最近用過的（中高權重），避免重複
            recentSet.forEach(name => {
                if (!librarySet.has(name)) candidates.push({ name, score: 80 });
            });

            (exerciseLibrary || []).forEach(ex => {
                const name = ex && ex.name;
                if (!name) return;
                if (!candidates.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                    candidates.push({ name, score: 40 });
                }
            });

            // 3. 完整 EXERCISES 作為 fallback
            (EXERCISES || []).forEach(ex => {
                const name = ex.name || ex;
                const already = candidates.find(c => c.name.toLowerCase() === name.toLowerCase());
                if (!already) {
                    candidates.push({ name, score: 10 });
                }
            });

            // 過濾 + 評分
            if (q.length > 0) {
                candidates = candidates.filter(c => c.name.toLowerCase().includes(q)).map(c => {
                    const lower = c.name.toLowerCase();
                    let extra = 0;
                    if (lower.startsWith(q)) extra = 50;
                    else if (lower.indexOf(q) === 0) extra = 30;
                    // 如果在 library 裡再加分（已經在 score 基礎上）
                    if (librarySet.has(c.name)) extra += 20;
                    if (recentSet.has(c.name)) extra += 10;
                    return { ...c, score: c.score + extra };
                });
            } else {
                // 無輸入時也優先顯示 library + recent
                candidates.forEach(c => {
                    if (librarySet.has(c.name)) c.score += 30;
                    if (recentSet.has(c.name)) c.score += 15;
                });
            }

            // 排序：score 降冪，然後名稱
            candidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.name.localeCompare(b.name);
            });

            // 限制數量（mobile 避免太長）
            const top = candidates.slice(0, 28);

            // 重建 datalist
            datalist.innerHTML = top.map(c => `<option value="${escapeAttr(c.name)}">`).join('');
        }

        function removeExerciseFromCurrent(exIdx) {
            if (!currentWorkout) return;
            if (exIdx < 0 || exIdx >= currentWorkout.exercises.length) {
                return;
            }

            const ex = currentWorkout.exercises[exIdx];
            if (!ex) return;

            const removedName = ex.name;

            if (typeof activeHoldTimer !== 'undefined' && activeHoldTimer &&
                (activeHoldTimer.exIdx === exIdx || activeHoldTimer.exName === removedName)) {
                if (typeof cancelHoldTimer === 'function') cancelHoldTimer(exIdx);
            } else if (typeof activeHoldTimer !== 'undefined' && activeHoldTimer && activeHoldTimer.exIdx > exIdx) {
                activeHoldTimer.exIdx -= 1;
            }

            const syncedLogIds = (ex.sets || [])
                .map(s => {
                    if (s && s._syncInFlight) s._deleted = true;
                    return s && s.id;
                })
                .filter(Boolean);

            // 2. 立即從本地移除 exercise（用戶體驗優先，UI 馬上更新）
            currentWorkout.exercises.splice(exIdx, 1);
            renderCurrentWorkout();
            updateSessionSummary();
            saveWorkoutData();

            // 3. 背景刪除後端已同步的數據
            if (currentUser && syncedLogIds.length > 0) {
                // 使用現有 backgroundDeleteLog 機制，會正確更新右上角 sync indicator 及 pending count
                syncedLogIds.forEach(logId => {
                    backgroundDeleteLog(logId);
                });
            }

            // 注意：即使 backgroundDeleteLog 內部 delete 失敗（catch 會 console + 可能設 error indicator），
            // 我們仍然已本地移除，避免數據不一致。
            // 如果需要更明確的 toast，可以在 backgroundDeleteLog 的 catch 裡加，但這裡保持靜默為主。
        }

        /* ============================================================
           A. 初始載入狀態指示器 (Initial Load Status in header right)
           用於登入成功或已登入刷新時的 getLogs + workoutHistory 重建
           status: 'loading' | 'success' | 'error'
        ============================================================ */
        let _initialLoadRetryFn = null;

        function showInitialSyncStatus(status) {
            const container = document.getElementById('initial-load-indicator');
            const icon = document.getElementById('initial-sync-icon');
            const text = document.getElementById('initial-sync-text');
            if (!container || !icon) return;

            container.classList.remove('hidden', 'loading', 'success', 'error');
            container.classList.add('flex');
            if (text) text.classList.add('hidden');

            if (status === 'loading') {
                container.classList.add('loading');
                icon.className = 'fa-solid fa-spinner fa-spin text-[9px] sm:text-[10px]';
                if (text) {
                    text.classList.remove('hidden');
                    text.textContent = '載入中';
                }
                container.title = '正在載入訓練記錄...';
                container.onclick = null;
                container.style.cursor = 'default';
            } else if (status === 'success') {
                container.classList.add('success');
                icon.className = 'fa-solid fa-check text-[9px] sm:text-[10px]';
                if (text) text.classList.add('hidden');
                container.title = '載入成功';
                container.onclick = null;
                container.style.cursor = 'default';
                // 短暫顯示綠剔 1.2–1.8s 後隱藏（或轉靜態）
                setTimeout(() => {
                    if (container && container.classList.contains('success')) {
                        container.classList.remove('flex', 'success');
                        container.classList.add('hidden');
                    }
                }, 1450);
            } else if (status === 'error') {
                container.classList.add('error');
                icon.className = 'fa-solid fa-exclamation-triangle text-[9px] sm:text-[10px]';
                if (text) {
                    text.classList.remove('hidden');
                    text.textContent = '失敗';
                }
                container.title = '載入失敗，點擊重試';
                container.style.cursor = 'pointer';
                container.onclick = () => {
                    container.onclick = null;
                    container.classList.remove('flex', 'error');
                    container.classList.add('hidden');
                    // 觸發重試
                    if (typeof _initialLoadRetryFn === 'function') {
                        _initialLoadRetryFn();
                    } else {
                        // fallback: 重新整理（或可呼叫 loadUserLogs）
                        if (typeof bootstrapGoogleCloudData === 'function') {
                            bootstrapGoogleCloudData({ force: true }).catch(() => {});
                        } else if (currentUser && typeof loadUserLogs === 'function') {
                            loadUserLogs().catch(() => {});
                        }
                    }
                };
            } else {
                // idle / hide
                container.classList.remove('flex', 'loading', 'success', 'error');
                container.classList.add('hidden');
                container.onclick = null;
                container.style.cursor = 'default';
            }
        }

        // Helper: register a retry function (usually re-runs the login/refresh load sequence)
        function setInitialLoadRetry(fn) {
            _initialLoadRetryFn = (typeof fn === 'function') ? fn : null;
        }

        // 公開重試函數，給 log 內部 loading 錯誤畫面的重試按鈕使用
        window.retryLoadUserLogs = function() {
            if (typeof bootstrapGoogleCloudData === 'function') {
                bootstrapGoogleCloudData({ force: true }).catch(() => {});
            } else if (currentUser && typeof loadUserLogs === 'function') {
                loadUserLogs().catch(() => {});
            }
        };

        // beforeunload protection for pending background syncs (D.)
        window.addEventListener('beforeunload', function (e) {
            if (globalPendingSyncs > 0 || isFinishingWorkout) {
                const msg = '數據正在背景同步，建議等待完成再離開頁面。';
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        });

        // Optional: try to flush on hide (visibilitychange)
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden' && (globalPendingSyncs > 0 || isFinishingWorkout)) {
                // Best effort: the keepalive fetches from finish should help

            }
        });

        // --- Finish Workout + PR Detection + Charity ---
        function finishCurrentWorkout() {
            // Simple debounce + guard for rapid mobile taps on "完成訓練" button
            const now = Date.now();
            if (now - lastFinishClick < 250) return;
            lastFinishClick = now;

            if (isFinishingWorkout) return;  // prevent while confirming

            if (!currentWorkout) {
                alert('沒有進行中的訓練。');
                return;
            }
            if (!currentWorkout.exercises || currentWorkout.exercises.length === 0) {
                alert('完成前請至少加入一個動作並記錄組數。');
                return;
            }

            const totals = typeof calculateWorkoutTotals === 'function'
                ? calculateWorkoutTotals(currentWorkout)
                : { weightKg: calculateWorkoutVolume(currentWorkout), distanceKm: 0, totalSets: 0 };
            const volDisplay = typeof formatWorkoutVolumeDisplay === 'function'
                ? formatWorkoutVolumeDisplay(currentWorkout)
                : { value: totals.weightKg, unit: 'kg', sub: (totals.weightKg / 1000).toFixed(2) + ' tonnes moved' };
            const totalSets = totals.totalSets;

            // Detect new PRs
            const prs = detectNewPRs(currentWorkout);

            // Populate modal - robust getElementById + checks
            const dateEl = document.getElementById('finish-date');
            const volEl = document.getElementById('finish-volume');
            const tonnesEl = document.getElementById('finish-tonnes');
            const setsEl = document.getElementById('finish-sets');
            const prContainer = document.getElementById('finish-prs');
            const notesEl = document.getElementById('finish-notes');
            const modal = document.getElementById('finishModal');

            if (!modal || !volEl || !prContainer) {
                alert('無法顯示完成摘要，請重試。');
                return;
            }

            if (dateEl) dateEl.textContent = currentWorkout.date || '';
            volEl.textContent = volDisplay.unit === 'km'
                ? volDisplay.value + ' km'
                : volDisplay.value + ' kg';
            tonnesEl.textContent = volDisplay.sub;
            setsEl.textContent = `${totalSets} sets • ${currentWorkout.exercises.length} exercises`;

            // Duration (if startTime recorded)
            const durEl = document.getElementById('finish-duration');
            const durCard = document.getElementById('finish-duration-card');
            if (durEl && currentWorkout.startTime) {
                const mins = Math.max(1, Math.round((Date.now() - currentWorkout.startTime) / 60000));
                durEl.textContent = mins;
                if (durCard) durCard.style.display = '';
            } else if (durCard) {
                durCard.style.display = 'none';
            }

            // Enhanced PR section - compact wrap layout for long lists
            let prHtml = '';
            if (prs.length > 0) {
                // Summary header
                prHtml = `<div class="mb-1.5 text-amber-400 text-sm font-semibold flex items-center gap-2">
                    <i class="fa-solid fa-trophy"></i>
                    <span>新個人紀錄！</span>
                    <span class="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">${prs.length} 項突破</span>
                </div>`;
                // Compact flex-wrap badges (instead of vertical list)
                prHtml += `<div class="flex flex-wrap gap-1">` +
                    prs.map(p => `<span class="inline-flex items-center px-2 py-0.5 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full">${escapeHtml(p)}</span>`).join('') +
                    `</div>`;
                // Optional: if very long, could add "展開全部" but for now wrap + max-h on container in HTML
            } else {
                prHtml = `<div class="text-xs text-[#a8a29e] bg-[#292524] inline-block px-3 py-1 rounded-2xl">本次穩健發揮。沒有新 PR — 繼續加油！</div>`;
            }

            prContainer.innerHTML = prHtml;

            if (notesEl) notesEl.value = currentWorkout.notes || '';

            // Show modal - force high z for fullscreen, remove hidden, add flex
            // Robust show for both normal and fullscreen-training modes
            // Use very high z so it overlays the immersive panel (z-60/z-70) and stickies
            modal.style.zIndex = '90';
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Disable the bottom immersive finish button while modal is open (prevents duplicate finish attempts)
            const immersiveBtn = document.getElementById('immersive-finish-btn');
            if (immersiveBtn) immersiveBtn.disabled = true;

            // Auto-focus notes
            setTimeout(() => {
                if (notesEl) notesEl.focus();
            }, 50);


        }

        function detectNewPRs(workout) {
            if (typeof detectWorkoutPRs === 'function') {
                return detectWorkoutPRs(workout, workoutHistory);
            }
            return [];
        }

        function hideFinishModal() {
            const modal = document.getElementById('finishModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            // Re-enable the immersive finish button (in case user cancelled the modal)
            const immersiveBtn = document.getElementById('immersive-finish-btn');
            if (immersiveBtn) immersiveBtn.disabled = false;
        }

        // Simple premium toast for success feedback (works in normal + fullscreen)
        function showToast(message, timeout = 3500) {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1f1c1a] border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-2xl shadow-xl text-sm max-w-[90vw] flex items-center gap-2 z-[100]`;
            const span = document.createElement('span');
            span.textContent = message;
            toast.appendChild(span);
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.transition = 'all 0.2s ease';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 200);
            }, timeout);
        }

        // Optional reusable helper (for future buttons or refactors)
        // Usage example:
        //   const btn = document.getElementById('foo');
        //   await withAsyncButtonLock(btn, '儲存中...', async () => { await doSomething(); });
        async function withAsyncButtonLock(btn, loadingHtml, actionFn) {
            if (!btn || btn.disabled) return;
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('opacity-70', 'cursor-wait');
            btn.innerHTML = loadingHtml || `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 處理中...`;
            try {
                return await Promise.resolve().then(() => actionFn());
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-wait');
                btn.innerHTML = originalHtml;
            }
        }

        async function confirmFinishWorkout() {
            if (!currentWorkout) return;

            const isContinue = !!currentWorkout.isContinuedFromToday;
            const hasSid = !!(currentWorkout.id || currentWorkout.session_id || currentWorkout.sessionId);

            // 簡單防重複點擊 guard（防止極短時間內連擊，不影響 UI 退出速度）
            if (isFinishingWorkout) return;
            isFinishingWorkout = true;

            const notes = document.getElementById('finish-notes').value.trim();
            currentWorkout.notes = notes;

            const finalTotals = typeof calculateWorkoutTotals === 'function'
                ? calculateWorkoutTotals(currentWorkout)
                : { weightKg: calculateWorkoutVolume(currentWorkout), distanceKm: 0 };
            currentWorkout.totalVolume = finalTotals.weightKg;
            currentWorkout.totalDistanceKm = finalTotals.distanceKm;

            // Capture snapshot 供背景儲存使用
            const workoutToSave = JSON.parse(JSON.stringify(currentWorkout));

            // === 立即退出介面（無任何 loading / 等待提示） ===
            // 1. 本地立即更新（歷史 + 持久化）
            if (isContinue && typeof applyContinueWorkoutFinishToLocalHistory === 'function') {
                applyContinueWorkoutFinishToLocalHistory(workoutToSave);
            } else if (typeof upsertWorkoutInHistory === 'function') {
                upsertWorkoutInHistory(workoutToSave);
            } else {
                delete workoutToSave.isContinuedFromToday;
                delete workoutToSave._originalSessionIds;
                delete workoutToSave._continueSnapshot;
                delete workoutToSave.startTime;
                workoutHistory.unshift(workoutToSave);
            }
            rebuildLastPerformed();
            saveWorkoutData();

            // 2. 立即隱藏 summary modal 及退出 immersive
            hideFinishModal();
            currentWorkout = null;

            const liveP2 = document.getElementById('live-log-panel');
            if (liveP2) {
                liveP2.classList.add('hidden');
                if (immersivePanelOriginalParent && liveP2.parentNode !== immersivePanelOriginalParent) {
                    immersivePanelOriginalParent.appendChild(liveP2);
                }
            }

            const emptyState = document.getElementById('log-empty-state');
            if (emptyState) emptyState.classList.remove('hidden');

            exitImmersiveMode();

            // 3. 立即刷新歷史（用戶可即時看到新紀錄）
            try { renderWorkoutHistory(); } catch (e) {}
            try { renderOverallStats(); } catch (e) {}
            try { renderCalendar(); } catch (e) {}
            try { updateExerciseSelectForAnalysis(); } catch (e) {}
            try { updateStartTrainingButton(); } catch (e) {}

            // 4. 簡單即時 toast（無阻塞，快速消失）
            showToast(isContinue ? '今日訓練已更新' : '訓練已記錄', 2200);

            // === 背景默默儲存：鎖定至 finalizeAndSaveWorkout 完成 ===
            if (currentUser) {
                setTimeout(async () => {
                    try {
                        await finalizeAndSaveWorkout(workoutToSave, notes);
                    } catch (e) {
                        console.warn('[confirmFinishWorkout] background sync failed:', e);
                    } finally {
                        isFinishingWorkout = false;
                        try { if (typeof updateInteractionLock === 'function') updateInteractionLock(); } catch (_) {}
                    }
                }, 0);
            } else {
                isFinishingWorkout = false;
                try { if (typeof updateInteractionLock === 'function') updateInteractionLock(); } catch (_) {}
            }
        }




        async function pushCurrentWorkoutToLegacyGAS(workout) {
            if (!currentUser || !APPS_SCRIPT_URL) return;
            const sessionId = workout.id || Date.now();
            for (const ex of workout.exercises) {
                for (const set of ex.sets) {
                    try {
                        await callAppsScript("addLog", {
                            user: currentUser,
                            log: {
                                id: Date.now() + Math.random(),
                                session_id: sessionId,
                                date: workout.date,
                                exercise: ex.name,           // bilingual name
                                weight: set.weight || 0,
                                body_weight: set.body_weight != null ? parseFloat(set.body_weight) : 0,
                                reps: set.reps || 0,
                                duration: set.duration != null ? parseInt(set.duration) : 0,
                                incline: set.incline != null ? parseFloat(set.incline) : 0,
                                speed: set.speed != null ? parseFloat(set.speed) : 0,
                                notes: set.notes || '',
                                volume: set.volume != null ? set.volume : (typeof calculateSetVolume === 'function' ? calculateSetVolume(set, ex.name) : ((set.weight || 0) * (set.reps || 0)))
                            }
                        });
                    } catch (e) { console.warn('GAS save set failed', e); }
                }
            }
        }

        function showRoutinesModal() {
            const modal = document.getElementById('routinesModal');
            if (!modal) {
                console.error('[ERROR] #routinesModal not found in DOM');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderRoutinesList();
        }

        function hideRoutinesModal() {
            const modal = document.getElementById('routinesModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        function renderRoutinesList() {
            const container = document.getElementById('routines-list');
            container.innerHTML = '';
            if (routines.length === 0) {
                container.innerHTML = `<div class="text-xs text-[#a8a29e] py-2">尚未有模板。請在上方將目前訓練結構儲存。</div>`;
                return;
            }
            routines.forEach((r, idx) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center bg-[#292524] px-3 py-2 rounded-2xl text-sm';
                div.innerHTML = `
                    <div>
                        <span class="font-medium">${escapeHtml(r.name)}</span>
                        <span class="text-xs text-[#a8a29e] ml-2">${r.exercises.length} exercises</span>
                    </div>
                    <div class="flex gap-1">
                        <button class="text-emerald-400 text-xs px-2" onclick="loadRoutine(${idx});hideRoutinesModal()">Load</button>
                        <button class="text-red-400 text-xs px-2" onclick="deleteRoutine(${idx});renderRoutinesList()">Del</button>
                    </div>`;
                container.appendChild(div);
            });
        }

        function saveCurrentAsRoutine() {
            if (!currentWorkout || currentWorkout.exercises.length === 0) {
                alert('請先開始訓練並加入動作。');
                return;
            }
            const name = document.getElementById('new-routine-name').value.trim();
            if (!name) return alert('請為模板命名');
            routines.push({
                id: Date.now(),
                name,
                exercises: currentWorkout.exercises.map(e => e.name)
            });
            saveWorkoutData();
            document.getElementById('new-routine-name').value = '';
            renderRoutinesList();
            alert('Routine saved!');
        }

        function loadRoutine(idx) {
            const routine = routines[idx];
            if (!routine) return;
            if (!currentWorkout) startNewWorkout();
            routine.exercises.forEach(name => {
                if (!currentWorkout.exercises.find(e => e.name === name)) {
                    currentWorkout.exercises.push({ name, sets: [] });
                }
            });
            renderCurrentWorkout();
            hideRoutinesModal();
        }

        function deleteRoutine(idx) {
            if (!confirm('Delete this routine?')) return;
            routines.splice(idx, 1);
            saveWorkoutData();
        }

        // --- Export / Import / Data layer ---
        function exportAllData() {
            const data = {
                exportedAt: new Date().toISOString(),
                user: currentUser,
                history: workoutHistory,
                library: exerciseLibrary,
                routines: routines
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `charity-training-log-${currentUser || 'guest'}-${getLocalDateString()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            // Also offer flat CSV of all sets
            let csv = 'date,exercise,record_type,body_weight_kg,weight_kg,reps,duration,incline,speed,volume_kg_or_km,volume_unit,notes\n';
            workoutHistory.forEach(w => {
                (w.exercises || []).forEach(ex => {
                    const recordType = typeof getExerciseRecordType === 'function'
                        ? getExerciseRecordType(ex.name) : 'weight';
                    ex.sets.forEach(s => {
                        const vol = typeof calculateSetVolume === 'function'
                            ? calculateSetVolume(s, ex.name)
                            : (s.volume || 0);
                        const unit = recordType === 'treadmill' ? 'km' : 'kg';
                        csv += `${w.date},${ex.name},${recordType},${s.body_weight || 0},${s.weight || 0},${s.reps || 0},${s.duration || 0},${s.incline || 0},${s.speed || 0},${vol},${unit},"${(s.notes||'').replace(/"/g,'""')}"\n`;
                    });
                });
            });
            const csvBlob = new Blob([csv], {type: 'text/csv'});
            const csvUrl = URL.createObjectURL(csvBlob);
            const csvA = document.createElement('a');
            csvA.href = csvUrl;
            csvA.download = `charity-training-sets-${currentUser || 'guest'}.csv`;
            // Auto trigger second download after short delay
            setTimeout(() => { csvA.click(); URL.revokeObjectURL(csvUrl); }, 650);
        }

        function importDataPrompt() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const imported = JSON.parse(ev.target.result);
                        if (imported.history) workoutHistory = imported.history;
                        if (imported.library) exerciseLibrary = imported.library;
                        if (imported.routines) routines = imported.routines;
                        saveWorkoutData();
                        // Refresh UI
                        renderWorkoutHistory();
                        renderOverallStats();
                        renderCalendar();
                        updateExerciseSelectForAnalysis();
                        alert('數據匯入成功！');
                    } catch (err) {
                        alert('匯入失敗：' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        function initializeWorkoutLog() {
            try {
                // Save original early for protection (before any possible guard replace on tab switch)
                if (!originalLogContent) {
                    const logContentEl = document.getElementById('content-log');
                    if (logContentEl) {
                        originalLogContent = logContentEl.innerHTML;
                    }
                }

                if (typeof loadWorkoutData === 'function') {
                    loadWorkoutData({ skipHistory: false });
                }

                // Guest demo seeding disabled during A refactor.
                // Real per-user data always comes from GAS (loadUserLogs + loadWorkoutSets).

                if (typeof rebuildLastPerformed === 'function') {
                    rebuildLastPerformed();
                }

                // Populate datalist for quick add — 現在改用動態優先建議（見 updateExerciseSuggestions）
                const dl = document.getElementById('exercise-datalist');
                if (dl) {
                    // 初始時顯示所有（無輸入），之後由 input 事件動態更新
                    updateExerciseSuggestions('');
                }

                // 為 add-exercise-input 綁定即時建議（輸入 / focus 時重新排序）
                const addExInput = document.getElementById('add-exercise-input');
                if (addExInput) {
                    const handler = () => updateExerciseSuggestions(addExInput.value);
                    addExInput.addEventListener('input', handler);
                    addExInput.addEventListener('focus', handler);
                    // 首次 focus 也觸發一次
                }

                // Initial renders - each wrapped individually for partial failure tolerance
                try { if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory(); } catch (e) { console.warn('renderWorkoutHistory init error (non-fatal):', e); }
                try { if (typeof updateExerciseSelectForAnalysis === 'function') updateExerciseSelectForAnalysis(); } catch (e) { console.warn('updateExerciseSelectForAnalysis init error (non-fatal):', e); }
                try { if (typeof renderOverallStats === 'function') renderOverallStats(); } catch (e) { console.warn('renderOverallStats init error (non-fatal):', e); }
                try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) { console.warn('renderCalendar init error (non-fatal):', e); }

                // 初始化開始訓練按鈕狀態（今日繼續智能）
                try { updateStartTrainingButton(); } catch (e) {}
                try { if (typeof updateInteractionLock === 'function') updateInteractionLock(); } catch (e) {}

                // Make sure sub sections start correctly
                if (typeof showLogSubSection === 'function') {
                    showLogSubSection('history');
                }

                // Keyboard niceties
                document.addEventListener('keydown', function(e) {
                    const logContent = document.getElementById('content-log');
                    if (logContent && logContent.classList.contains('hidden')) return;
                    if (e.key === '/' && document.activeElement.tagName === 'BODY') {
                        e.preventDefault();
                        const input = document.getElementById('add-exercise-input');
                        if (input) input.focus();
                    }
                    if (document.body.classList.contains('fullscreen-training')) {

                    }
                });

                // Global beforeunload protection for in-progress training
                if (typeof saveDraftBeforeUnload === 'function') {
                    window.addEventListener('beforeunload', saveDraftBeforeUnload);
                }
            } catch (err) {
                // Critical: never let Workout Log initialization error break the tab or page
                console.error('initializeWorkoutLog encountered error (non-fatal - Workout Log should still be usable):', err);
            }
        }

        function showLogSubSection(section) {
            ['history', 'analysis', 'stats', 'calendar'].forEach(s => {
                const el = document.getElementById('log-section-' + s);
                const tab = document.getElementById('logsub-' + s);
                if (el) el.classList.toggle('hidden', s !== section);
                if (tab) tab.classList.toggle('active', s === section);
                if (tab) tab.classList.toggle('bg-[#292524]', s === section);
            });
            currentLogSub = section;

            if (section === 'analysis') {
                setTimeout(renderExerciseAnalysis, 30);
            }
            if (section === 'stats') {
                setTimeout(renderOverallStats, 30);
            }
            if (section === 'calendar') {
                setTimeout(renderCalendar, 30);
            }
        }

        // Hook into existing tab switching so we refresh on entering the log tab
        // Note: The switchTab hook for log refresh is installed after the switchTab definition below for execution order safety.

        // Expose a couple helpers for console / future
        window.__resetWorkoutDemoData = () => { localStorage.removeItem(getUserStorageKey()); location.reload(); };

        function showAddUserModal() {
            const modal = document.getElementById('addUserModal');
            if (!modal) {
                console.error('#addUserModal not found in DOM');
                alert('新增用戶視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function hideAddUserModal() {
            const modal = document.getElementById('addUserModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function addNewUser() {

            try {
                // Read raw values first (before any normalization)
                const rawUsername = document.getElementById('newUsername').value.trim();
                const rawPin = document.getElementById('newPin').value.trim();

                // Enforce rules: username = lowercase a-z0-9 only; PIN = digits only
                const username = rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
                const pin = rawPin.replace(/\D/g, '');

                if (!username || !pin) return alert("請輸入用戶名稱同 PIN");

                // Registration UX: if user typed uppercase or invalid chars, auto-convert + notify
                const hadUpperOrInvalid = (rawUsername !== username) || (rawPin !== pin);
                if (hadUpperOrInvalid) {
                    alert("已自動將用戶名轉為小寫，並移除無效字元（只接受 a-z 及 0-9）。");
                }

                const result = await callAppsScript("addUser", { user: username, pin: pin });

                if (result.status === "success") {
                    alert(`用戶 ${username} 已建立！`);
                    hideAddUserModal();
                    // Auto login the user after successful registration (mainstream UX)
                    currentUser = username;
                    currentUserPin = pin;
                    try { sessionStorage.setItem('currentUserPin', pin); } catch (_) {}
                    try { localStorage.setItem('currentUserPin', pin); } catch (_) {}
                    localStorage.setItem('currentUser', currentUser);
                    // Restore log UI structure if it was replaced by guard
                    if (typeof originalLogContent !== 'undefined' && originalLogContent) {
                        const logEl = document.getElementById('content-log');
                        if (logEl) logEl.innerHTML = originalLogContent;
                    }
                    updateUIAfterLogin();
                    if (typeof bootstrapGoogleCloudData === 'function') {
                        await bootstrapGoogleCloudData();
                    }
                    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
                    try {
                        if (typeof showLogSubSection === 'function') showLogSubSection('history');
                    } catch (err) {
                        console.warn('showLogSubSection after login error (non-fatal):', err);
                    }
                } else {
                    const msg = result.message || "";
                    if (msg.includes('已被使用') || msg.includes('已存在') || msg.toLowerCase().includes('exist')) {
                        alert("此用戶名已被使用，請直接登入");
                        hideAddUserModal();
                        document.getElementById('loginUsername').value = username;
                        document.getElementById('loginPin').value = pin;
                        showLoginModal();
                    } else {
                        alert("建立用戶失敗：" + (msg || "請稍後再試"));
                    }
                }
            } catch (err) {
                console.error('addNewUser error:', err);
                alert("註冊過程出錯，請檢查網絡或 Apps Script URL");
            }
        }

        function switchTab(tab) {
            // 極簡可靠版本 - 支援所有 tab (overview / schedule / supplement / training / log / yugong / rixing / calories)
            // 標準流程：隱藏全部 .tab-content → 顯示目標 content → 更新對應 nav button active 狀態
            // log-only 邏輯嚴格隔離在後面
            // 無多餘 debug
            // 加入 null check，穩定支援 isInitializing 及 fullscreen 模式
            try {
                if (tab === 'calories' && typeof isJeffDietUser === 'function' && !isJeffDietUser()) {
                    tab = 'overview';
                }
                try {
                    window.scrollTo(0, 0);
                    const main = document.getElementById('app-main');
                    if (main) main.scrollTop = 0;
                } catch (_) {}
                // 1. 隱藏所有 tab 內容
                document.querySelectorAll('.tab-content').forEach(el => {
                    if (el && el.classList) el.classList.add('hidden');
                });

                // 2. 清除所有 nav button 嘅 active 樣式
                document.querySelectorAll('.nav-tab').forEach(el => {
                    if (el && el.classList) el.classList.remove('active', 'bg-[#166534]', 'text-white');
                });

                // 3. 顯示目標 tab 內容
                const targetContent = document.getElementById('content-' + tab);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                    targetContent.style.display = '';   // 清除之前可能留低嘅 inline style
                }

                // 4. 激活對應嘅 nav button
                const targetTab = document.getElementById('tab-' + tab);
                if (targetTab) {
                    targetTab.classList.add('active', 'bg-[#166534]', 'text-white');
                }
                if (tab === 'training' || tab === 'schedule' || tab === 'supplement') {
                    const meBtn = document.getElementById('tab-me');
                    if (meBtn) meBtn.classList.add('active', 'bg-[#166534]', 'text-white');
                    if (typeof onAppTabShown === 'function') onAppTabShown(tab);
                }
                const mainKey = (typeof APP_MAIN_NAV !== 'undefined' && APP_MAIN_NAV[tab]) ? APP_MAIN_NAV[tab] : tab;
                document.querySelectorAll('#main-bottom-nav [role="tab"]').forEach(function (btn) {
                    const on = btn.id === 'tab-' + mainKey;
                    btn.setAttribute('aria-selected', on ? 'true' : 'false');
                });

                if (tab === 'log') {
                    ensureAllModalsExist();
                }

                if (tab === 'millennium' || tab === 'yugong' || tab === 'rixing') {
                    const mill = document.getElementById('content-millennium');
                    if (mill) mill.classList.remove('hidden');
                    const millBtn = document.getElementById('tab-millennium');
                    if (millBtn) millBtn.classList.add('active', 'bg-[#166534]', 'text-white');
                    if (typeof onAppTabShown === 'function') {
                        onAppTabShown(tab === 'rixing' ? 'rixing' : (tab === 'yugong' ? 'yugong' : 'millennium'));
                    }
                }

                if (tab === 'me' && typeof onAppTabShown === 'function') onAppTabShown('me');
                if (tab === 'overview' && typeof onAppTabShown === 'function') onAppTabShown('overview');

                if (tab === 'calories') {
                    if (typeof onAppTabShown === 'function') onAppTabShown('calories');
                    if (typeof initCaloriesTab === 'function') initCaloriesTab();
                }

                try {
                    if (location.hash !== '#' + tab) {
                        history.replaceState(null, '', '#' + tab);
                    }
                } catch (e) {}

                if (tab === 'log' && currentUser) {
                    if (loadUserLogsInFlight) {
                        const loadingEl = document.getElementById('log-loading-state');
                        if (loadingEl) loadingEl.classList.remove('hidden');
                        const emptyState = document.getElementById('log-empty-state');
                        const subNav = document.getElementById('log-sub-nav');
                        if (emptyState) emptyState.style.display = 'none';
                        if (subNav) subNav.style.visibility = 'hidden';
                    } else if (cloudLogsReady) {
                        if (typeof finalizeLogTabUiReady === 'function') finalizeLogTabUiReady();
                    } else if (typeof loadUserLogs === 'function') {
                        loadUserLogs({ silent: false });
                    }
                }

                // 切換 tab 時若背景預載尚未完成，繼續拉取（唔阻塞 UI）
                if ((tab === 'log' || tab === 'training' || tab === 'millennium' || tab === 'yugong' || tab === 'overview') &&
                    typeof bootstrapGoogleCloudData === 'function') {
                    bootstrapGoogleCloudData().catch(() => {});
                }

                // ==================== 以下全部係 log tab 專用邏輯（嚴格隔離） ====================

                // log tab 登入 guard 恢復原本內容（如果之前被 guard 替換咗）
                if (tab === 'log' &&
                    typeof currentUser !== 'undefined' && currentUser &&
                    typeof originalLogContent !== 'undefined' && originalLogContent) {
                    const logEl = document.getElementById('content-log');
                    if (logEl && logEl.innerHTML && logEl.innerHTML.includes('需要登入')) {
                        logEl.innerHTML = originalLogContent;
                    }
                }

                // log tab 未登入 guard（顯示登入提示）
                if (tab === 'log' && typeof currentUser !== 'undefined' && !currentUser) {
                    const logEl = document.getElementById('content-log');
                    if (logEl) {
                        logEl.innerHTML = `
                            <div class="section-card rounded-3xl p-8 text-center">
                                <i class="fa-solid fa-lock text-4xl text-emerald-400 mb-4"></i>
                                <h3 class="font-bold text-xl mb-2">需要登入</h3>
                                <p class="text-[#a8a29e] mb-4">請登入先至用訓練日誌，記低組數同慈善噸數。</p>
                                <button onclick="showLoginModal()" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-sm font-semibold">登入 / 註冊</button>
                            </div>
                        `;
                        logEl.classList.remove('hidden');
                        const logTabBtn = document.getElementById('tab-log');
                        if (logTabBtn) logTabBtn.classList.add('active', 'bg-[#166534]', 'text-white');
                    }
                    return;
                }

                // log tab 專用：切換過去之後 refresh 歷史/統計/日曆（logged-in）
                if (tab === 'log') {
                    setTimeout(() => {
                        try {
                            if (typeof renderWorkoutHistory === 'function') renderWorkoutHistory();
                            if (typeof renderOverallStats === 'function') renderOverallStats();
                            if (typeof renderCalendar === 'function') renderCalendar();
                            if (typeof currentLogSub !== 'undefined' && currentLogSub === 'analysis' && typeof renderExerciseAnalysis === 'function') renderExerciseAnalysis();
                        } catch (e) { /* non-fatal */ }
                    }, 80);
                }
            } catch (err) {
                console.error('switchTab error (non-fatal):', err);
                // 最後防線：仍然盡力激活目標 tab
                try {
                    document.querySelectorAll('.tab-content').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });
                    const fb = document.getElementById('content-' + tab);
                    if (fb) fb.classList.remove('hidden');
                    const fbBtn = document.getElementById('tab-' + tab);
                    if (fbBtn) fbBtn.classList.add('active', 'bg-[#166534]', 'text-white');
                } catch (e) {}
            }
        }

        // Ensure all important modals exist in DOM (defensive for large cleanups or partial loads)
        function ensureAllModalsExist() {
            const importantModals = [
                'loginModal',
                'addUserModal',
                'finishModal',
                'workoutSetModal',
                'libraryModal',
                'customExerciseModal',
                'routinesModal',
                'unfinishedWorkoutModal'
            ];
            importantModals.forEach(id => {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn(`[WARNING] Modal #${id} not found in DOM. Some features may not work.`);
                }
            });
        }

        // 確保 onclick 同其他地方呼叫嘅係呢個最新版本
        try {
            window.switchTab = switchTab;
        } catch (e) {}

        function toggleSession(buttonEl) {
            const card = buttonEl.closest('.section-card');
            const content = (card && card.querySelector('.session-content')) || buttonEl.nextElementSibling;
            const icon = buttonEl.querySelector('.fa-chevron-down, .fa-chevron-up')
                || (card && card.querySelector('.fa-chevron-down, .fa-chevron-up'));
            if (!content || !icon) return;
            const isHidden = content.classList.toggle('hidden');
            if (isHidden) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                icon.style.transform = '';
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                icon.style.transform = 'rotate(180deg)';
            }
        }

        function expandAllSessions() {
            document.querySelectorAll('#content-training .session-content').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('#content-training .fa-chevron-down, #content-training .fa-chevron-up').forEach(icon => {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                icon.style.transform = 'rotate(180deg)';
            });
        }

        function collapseAllSessions() {
            document.querySelectorAll('#content-training .session-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('#content-training .fa-chevron-down, #content-training .fa-chevron-up').forEach(icon => {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                icon.style.transform = '';
            });
        }


        function launchBigShow() {
            // 火箭
            for (let i = 0; i < 15; i++) {
                setTimeout(() => createRocket(), i * 60);
            }
            // 煙花
            for (let i = 0; i < 8; i++) {
                setTimeout(() => createFirework(), i * 280);
            }
            // 跑車
            for (let i = 0; i < 5; i++) {
                setTimeout(() => createSportCar(), i * 420);
            }
        }

        function createRocket() {
            const rocket = document.createElement('div');
            rocket.className = 'rocket';
            rocket.innerHTML = '🚀';
            rocket.style.left = Math.random() * window.innerWidth + 'px';
            rocket.style.bottom = '-60px';
            rocket.style.fontSize = (Math.random() * 2 + 2) + 'rem';
            rocket.style.animation = `flyRocket ${Math.random() * 1.1 + 1.4}s linear forwards`;
            document.body.appendChild(rocket);
            setTimeout(() => rocket.remove(), 3000);
        }

        function createFirework() {
            const colors = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899'];
            const fw = document.createElement('div');
            fw.className = 'firework';
            fw.style.left = Math.random() * window.innerWidth + 'px';
            fw.style.top = (Math.random() * 300 + 150) + 'px';
            fw.style.fontSize = '2.5rem';
            fw.innerHTML = '🎆';
            fw.style.color = colors[Math.floor(Math.random() * colors.length)];
            fw.style.animation = 'explode 1.2s ease-out forwards';
            document.body.appendChild(fw);
            setTimeout(() => fw.remove(), 1500);
        }

        function createSportCar() {
            const car = document.createElement('div');
            car.className = 'sportscar';
            car.innerHTML = '🏎️';
            car.style.bottom = (Math.random() * 120 + 80) + 'px';
            car.style.left = '-120px';
            car.style.fontSize = (Math.random() * 1.5 + 2.5) + 'rem';
            car.style.animation = `driveCar ${Math.random() * 1.8 + 2.2}s linear forwards`;
            document.body.appendChild(car);
            setTimeout(() => car.remove(), 4500);
        }


        async function initialize() {
            isInitializing = true;


            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                // Always normalize restored user (in case old data had uppercase)
                currentUser = normalizeUsername(savedUser);
                if (currentUser !== savedUser) {
                    localStorage.setItem('currentUser', currentUser);
                }
                try {
                    currentUserPin = sessionStorage.getItem('currentUserPin')
                        || localStorage.getItem('currentUserPin')
                        || null;
                    if (currentUserPin) sessionStorage.setItem('currentUserPin', currentUserPin);
                } catch (_) { currentUserPin = currentUserPin || null; }
                if (!currentUserPin) {
                    try { showToast('請重新登入以恢復雲端同步', 4000); } catch (_) {}
                    setTimeout(() => { try { showLoginModal(); } catch (_) {} }, 400);
                }
                const nameEl = document.getElementById('currentUserName');
                if (nameEl) nameEl.textContent = currentUser;
                if (typeof applyAccountChrome === 'function') applyAccountChrome(true);
                else {
                    const loginBtn = document.getElementById('loginBtn');
                    if (loginBtn) loginBtn.classList.add('hidden');
                    const accountBtn = document.getElementById('accountMenuBtn');
                    if (accountBtn) accountBtn.classList.remove('hidden');
                }
                const logUserName = document.getElementById('logUserName');
                if (logUserName) logUserName.textContent = `(${currentUser})`;
                if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();

                // 背景靜默載入雲端數據；log tab 未打開唔顯示 loading（撳入去應即時有內容）
                showInitialSyncStatus('loading');
                if (typeof bootstrapGoogleCloudData === 'function') {
                    await bootstrapGoogleCloudData();
                } else {
                    await loadUserLogs();
                }
            } else {
                if (typeof applyAccountChrome === 'function') applyAccountChrome(false);
                if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
                if (typeof bootstrapGoogleCloudData === 'function') {
                    await bootstrapGoogleCloudData();
                }
            }

            // Safety: on init, if full-screen class is present but no currentWorkout object at all, force exit to restore clicks.
            // Note: We allow length===0 because a brand new training starts empty and user adds exercises inside full-screen.
            // The main protection for active full-screen during init is handled in switchTab using isInitializing flag.
            if (document.body.classList.contains('fullscreen-training') && !currentWorkout) {

                try {
                    exitImmersiveMode();
                } catch (e) {
                    document.body.classList.remove('fullscreen-training');
                    document.body.style.overflow = '';
                    isInFullScreenTraining = false;
                    const p = document.getElementById('live-log-panel');
                    if (p) {
                        p.classList.add('hidden');
                        if (immersivePanelOriginalParent && p.parentNode !== immersivePanelOriginalParent) {
                            immersivePanelOriginalParent.appendChild(p);
                        }
                    }
                }
            }
            // Initialize the rich professional Workout Log system
            try {
                if (typeof initializeWorkoutLog === 'function') {
                    initializeWorkoutLog();
                }
            } catch (err) {
                console.error('initializeWorkoutLog top level call error (non-fatal):', err);
            }

            // Clean init: completely avoid any switchTab calls during initialization (isInitializing=true).
            // - Static HTML already sets the correct default active tab (overview) + visible content-overview.
            // - Remove all tab switching logic here so initialize only does essential work:
            //   user state restore, safety cleanup, initializeWorkoutLog (data load, sample, renders of *history* etc inside log, listeners, resume check).
            // - Tab activation happens outside the init phase (via user clicks or login flows) for stability.
            // - This eliminates unnecessary switchTab overhead, guards, wrapper side-effects and debug spam during startup.
            isInitializing = false;

            try {
                if (typeof loadAppPrefs === 'function') loadAppPrefs();
                if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
                const hash = String(location.hash || '').replace(/^#/, '').split('?')[0];
                const hashMap = { yugong: 'millennium', rixing: 'millennium' };
                const mapped = hashMap[hash] || hash;
                if (typeof switchTab === 'function') {
                    if (mapped && document.getElementById('content-' + mapped)) {
                        switchTab(hash === 'rixing' ? 'rixing' : mapped);
                    } else {
                        switchTab('overview');
                    }
                }
            } catch (e) {}

            // Defensive: check modals exist
            ensureAllModalsExist();

            // After init complete, force a render of Workout Sets bar if logged in.
            // This ensures the bar (with 3 defaults + + button) is stably populated and visible
            // in the log tab / training panel, even if some early renders happened while hidden.
            if (currentUser && typeof renderWorkoutSetsBar === 'function') {
                try {
                    renderWorkoutSetsBar();
                } catch (e) {}
            }

            if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                navigator.serviceWorker.register('sw.js').catch(() => {});
            }

        }

        // Global protection: Esc key to force exit full-screen training mode if stuck
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('fullscreen-training')) {
                const panel = document.getElementById('live-log-panel');
                if (panel) {
                    panel.classList.add('hidden');
                }
                try {
                    exitImmersiveMode();
                } catch (err) {
                    // Ultra fallback: manually clean
                    document.body.classList.remove('fullscreen-training');
                    document.body.style.overflow = '';
                    isInFullScreenTraining = false;
                    if (panel) {
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
                    }
                    // Restore key elements
                    const chrome = document.getElementById('app-chrome');
                    if (chrome) chrome.style.display = '';
                    const mainNav = document.getElementById('main-bottom-nav') || document.getElementById('main-top-nav');
                    if (mainNav) mainNav.style.display = '';
                    const topHdr = document.querySelector('.charity-header');
                    if (topHdr) topHdr.style.display = '';
                    const topHeader = document.querySelector('#content-log > .flex.flex-col.sm\\:flex-row');
                    if (topHeader) topHeader.style.display = '';
                    const subNav = document.getElementById('log-sub-nav');
                    if (subNav) subNav.style.display = '';
                }
            }
        });

        if (document.readyState === 'complete') initialize();
        else window.addEventListener('load', initialize);
