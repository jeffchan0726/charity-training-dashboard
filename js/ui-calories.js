// js/ui-calories.js
// 卡路里分析 tab — 影食物相，經 Apps Script 轉去 SpaceXAI 視覺模型估算熱量

const CALORIE_STORAGE_VERSION = 1;
const CALORIE_DEFAULT_GOAL = 2000;
const CALORIE_MAX_ENTRIES = 120;
const CALORIE_MAX_IMAGE_EDGE = 1024;
const CALORIE_MAX_DATA_URL_CHARS = 550000;
const CALORIE_THUMB_EDGE = 96;

let calorieListenersBound = false;
let calorieLastResult = null;

function getCalorieStorageKey() {
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
    return `calorieFoodLog_${user}`;
}

function loadCalorieLog() {
    calorieLogEntries = [];
    calorieDailyGoalKcal = CALORIE_DEFAULT_GOAL;
    try {
        const raw = localStorage.getItem(getCalorieStorageKey());
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) calorieLogEntries = data.entries;
        const goal = parseInt(data.goalKcal, 10);
        if (goal >= 800 && goal <= 6000) calorieDailyGoalKcal = goal;
    } catch (e) {
        console.warn('[calories] load failed', e);
    }
}

function saveCalorieLog() {
    try {
        if (calorieLogEntries.length > CALORIE_MAX_ENTRIES) {
            calorieLogEntries = calorieLogEntries
                .slice()
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, CALORIE_MAX_ENTRIES);
        }
        localStorage.setItem(getCalorieStorageKey(), JSON.stringify({
            v: CALORIE_STORAGE_VERSION,
            goalKcal: calorieDailyGoalKcal,
            entries: calorieLogEntries
        }));
    } catch (e) {
        console.warn('[calories] save failed', e);
        if (typeof showToast === 'function') showToast('儲存卡路里紀錄失敗（可能空間唔夠）');
    }
}

function isCaloriesUserLoggedIn() {
    return typeof currentUser !== 'undefined' && !!currentUser;
}

function initCaloriesTab() {
    bindCalorieListeners();
    renderCaloriesTab();
    loadCalorieLogsFromSheet();
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
        showCalorieError('唔好直接雙擊打開 HTML。請用本機伺服器：python -m http.server 8000 然後開 http://localhost:8000');
    }
}

function bindCalorieListeners() {
    if (calorieListenersBound) return;
    calorieListenersBound = true;

    const camera = document.getElementById('calorie-camera-input');
    const gallery = document.getElementById('calorie-gallery-input');
    if (camera) camera.addEventListener('change', onCalorieFilePicked);
    if (gallery) gallery.addEventListener('change', onCalorieFilePicked);

    const note = document.getElementById('calorie-note-input');
    if (note) {
        note.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                analyzeCaloriePhoto();
            }
        });
    }
}

function renderCaloriesTab() {
    const gate = document.getElementById('calories-login-gate');
    const main = document.getElementById('calories-main');
    const loggedIn = isCaloriesUserLoggedIn();

    if (gate) gate.classList.toggle('hidden', loggedIn);
    if (main) main.classList.toggle('hidden', !loggedIn);
    if (!loggedIn) return;

    loadCalorieLog();
    renderCalorieTodaySummary();
    renderCalorieTodayList();
}

function triggerCalorieCamera() {
    if (calorieAnalyzeInFlight) return;
    if (!isCaloriesUserLoggedIn()) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    const input = document.getElementById('calorie-camera-input');
    if (!input) return;
    input.value = '';
    input.click();
}

function triggerCalorieGallery() {
    if (calorieAnalyzeInFlight) return;
    if (!isCaloriesUserLoggedIn()) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    const input = document.getElementById('calorie-gallery-input');
    if (!input) return;
    input.value = '';
    input.click();
}

async function onCalorieFilePicked(event) {
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
        if (typeof showToast === 'function') showToast('請揀一張相片');
        return;
    }
    try {
        setCalorieBusy(true, '處理相片…');
        const dataUrl = await compressFoodImage(file);
        caloriePendingImage = dataUrl;
        showCaloriePreview(dataUrl);
        hideCalorieError();
        const btn = document.getElementById('calorie-analyze-btn');
        if (btn) btn.disabled = false;
        const clearBtn = document.getElementById('calorie-clear-btn');
        if (clearBtn) clearBtn.classList.remove('hidden');
    } catch (err) {
        showCalorieError((err && err.message) ? err.message : '無法讀取相片，請改用 JPEG / PNG');
    } finally {
        setCalorieBusy(false);
    }
}

function showCaloriePreview(dataUrl) {
    const img = document.getElementById('calorie-preview-img');
    const placeholder = document.getElementById('calorie-dropzone-placeholder');
    const zone = document.getElementById('calorie-dropzone');
    if (img) {
        img.src = dataUrl;
        img.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (zone) zone.classList.add('has-image');
}

function clearCaloriePhoto() {
    caloriePendingImage = null;
    calorieLastResult = null;
    const img = document.getElementById('calorie-preview-img');
    const placeholder = document.getElementById('calorie-dropzone-placeholder');
    const zone = document.getElementById('calorie-dropzone');
    const result = document.getElementById('calorie-result');
    if (img) {
        img.removeAttribute('src');
        img.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (zone) zone.classList.remove('has-image');
    if (result) result.classList.add('hidden');
    const btn = document.getElementById('calorie-analyze-btn');
    if (btn) btn.disabled = true;
    const clearBtn = document.getElementById('calorie-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    const camera = document.getElementById('calorie-camera-input');
    const gallery = document.getElementById('calorie-gallery-input');
    if (camera) camera.value = '';
    if (gallery) gallery.value = '';
    hideCalorieError();
}

function compressFoodImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('無法讀取檔案'));
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
                    let w = img.naturalWidth || img.width;
                    let h = img.naturalHeight || img.height;
                    if (!w || !h) {
                        reject(new Error('相片尺寸無效'));
                        return;
                    }
                    const scale = Math.min(1, CALORIE_MAX_IMAGE_EDGE / Math.max(w, h));
                    w = Math.max(1, Math.round(w * scale));
                    h = Math.max(1, Math.round(h * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('瀏覽器唔支援壓縮相片'));
                        return;
                    }
                    ctx.fillStyle = '#111';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    let q = 0.72;
                    let dataUrl = canvas.toDataURL('image/jpeg', q);
                    while (dataUrl.length > CALORIE_MAX_DATA_URL_CHARS && q > 0.42) {
                        q -= 0.08;
                        dataUrl = canvas.toDataURL('image/jpeg', q);
                    }
                    if (dataUrl.length > CALORIE_MAX_DATA_URL_CHARS * 1.4) {
                        reject(new Error('相片仍然太大，請再影近啲或者降低畫質'));
                        return;
                    }
                    resolve(dataUrl);
                } catch (e) {
                    reject(new Error('壓縮相片失敗'));
                }
            };
            img.onerror = () => reject(new Error('無法解碼相片（請用 JPEG / PNG）'));
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function makeCalorieThumb(dataUrl) {
    return new Promise((resolve) => {
        if (!dataUrl) {
            resolve('');
            return;
        }
        const img = new Image();
        img.onload = () => {
            try {
                const scale = CALORIE_THUMB_EDGE / Math.max(img.width, img.height);
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            } catch (_) {
                resolve('');
            }
        };
        img.onerror = () => resolve('');
        img.src = dataUrl;
    });
}

function setCalorieBusy(busy, overlayText) {
    calorieAnalyzeInFlight = !!busy;
    const overlay = document.getElementById('calorie-analyzing-overlay');
    const btn = document.getElementById('calorie-analyze-btn');
    if (overlay) {
        overlay.classList.toggle('hidden', !busy);
        if (busy && overlayText) {
            const span = overlay.querySelector('span');
            if (span) span.textContent = overlayText;
        }
    }
    if (btn) {
        btn.disabled = busy || !caloriePendingImage;
        if (busy) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> 分析中…';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-bolt mr-1.5"></i> 分析卡路里';
        }
    }
}

function hideCalorieError() {
    const el = document.getElementById('calorie-error');
    if (el) {
        el.classList.add('hidden');
        el.textContent = '';
    }
}

function showCalorieError(message) {
    const el = document.getElementById('calorie-error');
    if (!el) {
        if (typeof showToast === 'function') showToast(message);
        return;
    }
    el.classList.remove('hidden');
    el.textContent = message;
}

async function analyzeCaloriePhoto() {
    if (calorieAnalyzeInFlight) return;
    if (!isCaloriesUserLoggedIn()) {
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }
    if (!caloriePendingImage) {
        showCalorieError('請先影張或者揀張食物相');
        return;
    }
    if (typeof callAppsScript !== 'function') {
        showCalorieError('後端未就緒，請重新整理頁面');
        return;
    }

    hideCalorieError();
    setCalorieBusy(true, '認緊餸…');

    try {
        const noteEl = document.getElementById('calorie-note-input');
        const note = noteEl ? String(noteEl.value || '').trim().slice(0, 80) : '';
        const result = await callAppsScript('analyzeFoodCalories', {
            image: caloriePendingImage,
            note: note
        });

        if (!result || result.status === 'error') {
            showCalorieError(formatCalorieApiError(result));
            return;
        }

        const analysis = result && result.analysis;
        if (!analysis || typeof analysis !== 'object') {
            showCalorieError('後端冇回傳認餸結果，請再試一次');
            return;
        }
        if (analysis.is_food === false) {
            showCalorieError(analysis && analysis.notes
                ? analysis.notes
                : '睇唔到食物。請 45° 頂視，筷子或碗口入鏡再影。');
            const resultBox = document.getElementById('calorie-result');
            if (resultBox) resultBox.classList.add('hidden');
            return;
        }

        setCalorieBusy(true, '對緊香港／USDA 資料庫…');
        if (typeof resolveMealNutrition !== 'function') {
            showCalorieError('本地食物資料庫未載入，請重新整理');
            return;
        }
        const nutrition = await resolveMealNutrition(analysis, {
            note: note,
            oilMode: typeof getSelectedOilMode === 'function' ? getSelectedOilMode() : 'normal'
        });

        let depthNote = '';
        if (typeof maybeRunCalorieDepth === 'function' && typeof isCalorieDepthEnabled === 'function' && isCalorieDepthEnabled()) {
            setCalorieBusy(true, '深度輔助…');
            const depth = await maybeRunCalorieDepth(caloriePendingImage, analysis.camera);
            if (depth && depth.used && typeof applyDepthToGrams === 'function') {
                nutrition.items = applyDepthToGrams(nutrition.items, depth);
                nutrition.totals = sumCalorieItems(nutrition.items);
                depthNote = depth.note || '';
            } else if (depth && depth.note && !depth.used && isCalorieDepthEnabled()) {
                depthNote = depth.note;
            }
        }

        const entry = await buildCalorieEntry(analysis, nutrition, caloriePendingImage, note, {
            engine: result.engine || '',
            depthNote: depthNote
        });
        if (!entry || !Number.isFinite(Number(entry.calories)) || entry.calories < 0) {
            showCalorieError('分析結果唔完整，請再試一次');
            return;
        }

        calorieLastResult = entry;
        calorieLogEntries.unshift(entry);
        saveCalorieLog();
        renderCalorieResult(entry);
        renderCalorieTodaySummary();
        renderCalorieTodayList();
        if (typeof showToast === 'function') showToast(`已加入今日紀錄：${entry.calories} kcal`);
        syncCalorieEntryToSheet(entry);
    } catch (err) {
        console.error('[calories] analyze failed', err);
        showCalorieError('分析失敗，請檢查網絡後再試');
    } finally {
        setCalorieBusy(false);
    }
}

function formatCalorieApiError(result) {
    const msg = (result && result.message) ? String(result.message) : '分析失敗';
    if (/unknown action/i.test(msg) || /invalid action/i.test(msg)) {
        return '後端尚未更新。請將最新 Google_Apps_Script.txt 部署做新版本，並加入 XAI_API_KEY（Grok 認餸）。';
    }
    if (/無法解析/.test(msg)) {
        return msg.indexOf('重新部署') !== -1
            ? msg
            : (msg + ' 請將最新 Google_Apps_Script.txt 貼去 Apps Script 並新增一個部署版本。');
    }
    if (/incorrect api key|無效|xai- 開頭/i.test(msg)) {
        return 'Grok 金鑰無效。去 https://console.x.ai 開一把新 API key（通常以 xai- 開頭），貼去 Apps Script → 專案設定 → 指令碼屬性 → XAI_API_KEY。USDA / api.data.gov 嗰把唔能認餸。';
    }
    if (/DASHSCOPE|XAI_API_KEY|視覺金鑰|未設定/.test(msg)) {
        return '未設定 Grok 認餸金鑰。Apps Script → 指令碼屬性加入 XAI_API_KEY，然後重新部署。';
    }
    return msg;
}

function sumCalorieItems(items) {
    const totals = (items || []).reduce(function (acc, it) {
        acc.calories += Number(it.calories) || 0;
        acc.protein_g += Number(it.protein_g) || 0;
        acc.carbs_g += Number(it.carbs_g) || 0;
        acc.fat_g += Number(it.fat_g) || 0;
        return acc;
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    totals.calories = Math.round(totals.calories);
    totals.protein_g = roundMacro(totals.protein_g);
    totals.carbs_g = roundMacro(totals.carbs_g);
    totals.fat_g = roundMacro(totals.fat_g);
    return totals;
}

async function buildCalorieEntry(analysis, nutrition, imageDataUrl, note, extra) {
    extra = extra || {};
    const totals = (nutrition && nutrition.totals) || {};
    const items = Array.isArray(nutrition && nutrition.items)
        ? nutrition.items.map(normalizeCalorieItem).filter(Boolean)
        : [];
    const thumb = await makeCalorieThumb(imageDataUrl);
    const now = new Date();
    const scale = typeof cameraScaleHint === 'function'
        ? cameraScaleHint(analysis && analysis.camera)
        : { ok: true, text: '' };
    return {
        id: `cal_${now.getTime()}_${Math.floor(Math.random() * 100000)}`,
        date: typeof getTodayStr === 'function' ? getTodayStr() : now.toISOString().slice(0, 10),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        createdAt: now.getTime(),
        mealName: String(analysis.meal_name || analysis.mealName || '食物').slice(0, 80),
        calories: Math.round(Number(totals.calories) || 0),
        protein_g: roundMacro(totals.protein_g),
        carbs_g: roundMacro(totals.carbs_g),
        fat_g: roundMacro(totals.fat_g),
        items: items,
        notes: String(analysis.notes || '').slice(0, 240),
        tips: extra.depthNote || '',
        confidence: String(analysis.confidence || 'medium'),
        userNote: note || '',
        thumb: thumb,
        engine: extra.engine || '',
        oilSpoons: nutrition && nutrition.oilSpoons,
        scaleText: scale.text,
        scaleOk: scale.ok
    };
}

function normalizeCalorieItem(item) {
    if (!item || typeof item !== 'object') return null;
    const name = String(item.name || item.name_zh || '').trim();
    if (!name) return null;
    return {
        name: name.slice(0, 60),
        portion: String(item.portion || (item.grams ? item.grams + ' g' : '')).slice(0, 40),
        calories: Math.round(Number(item.calories) || 0),
        protein_g: roundMacro(item.protein_g),
        carbs_g: roundMacro(item.carbs_g),
        fat_g: roundMacro(item.fat_g),
        source: item.source || '',
        fortified: !!item.fortified,
        unmatched: !!item.unmatched
    };
}

function roundMacro(value) {
    const n = Number(value);
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n * 10) / 10;
}

function renderCalorieResult(entry) {
    const box = document.getElementById('calorie-result');
    if (!box || !entry) return;
    box.classList.remove('hidden');

    const nameEl = document.getElementById('calorie-result-name');
    const kcalEl = document.getElementById('calorie-result-kcal');
    const pEl = document.getElementById('calorie-result-protein');
    const cEl = document.getElementById('calorie-result-carbs');
    const fEl = document.getElementById('calorie-result-fat');
    const confEl = document.getElementById('calorie-result-confidence');
    const itemsEl = document.getElementById('calorie-result-items');
    const notesEl = document.getElementById('calorie-result-notes');
    const tipsEl = document.getElementById('calorie-result-tips');

    if (nameEl) nameEl.textContent = entry.mealName;
    if (kcalEl) kcalEl.textContent = String(entry.calories);
    if (pEl) pEl.textContent = `${formatMacro(entry.protein_g)} g`;
    if (cEl) cEl.textContent = `${formatMacro(entry.carbs_g)} g`;
    if (fEl) fEl.textContent = `${formatMacro(entry.fat_g)} g`;
    if (confEl) {
        const map = { high: '信心高', medium: '信心中', low: '信心低（估算）' };
        confEl.textContent = map[entry.confidence] || '識別';
    }
    const scaleEl = document.getElementById('calorie-scale-hint');
    if (scaleEl) {
        scaleEl.textContent = entry.scaleText || '';
        scaleEl.classList.toggle('text-amber-300', entry.scaleOk === false);
        scaleEl.classList.toggle('text-[#a8a29e]', entry.scaleOk !== false);
    }
    const engineEl = document.getElementById('calorie-engine-hint');
    if (engineEl) {
        const eng = entry.engine === 'grok-4.6' ? '認餸：Grok'
            : entry.engine === 'qwen3-vl' ? '認餸：Qwen3-VL（後備）'
            : '';
        const oil = entry.oilSpoons > 0 ? ` · 已加炒餸油 ${entry.oilSpoons} 湯匙` : '';
        engineEl.textContent = (eng + oil).replace(/^ · /, '');
    }
    if (itemsEl) {
        if (!entry.items || !entry.items.length) {
            itemsEl.innerHTML = '';
        } else {
            itemsEl.innerHTML = entry.items.map(item => {
                const portion = item.portion ? ` · ${escapeHtml(item.portion)}` : '';
                const src = typeof sourceLabel === 'function' ? sourceLabel(item.source) : (item.source || '');
                const badgeClass = item.fortified ? 'calorie-source-badge fortify' : 'calorie-source-badge';
                const badge = src ? `<span class="${badgeClass}">${escapeHtml(src)}</span>` : '';
                return `<li class="flex items-center justify-between gap-2 text-xs bg-[#292524] border border-[#44403c] rounded-xl px-3 py-2">
                    <span class="text-[#e7e5e4] min-w-0">
                        <span class="block truncate">${escapeHtml(item.name)}<span class="text-[#a8a29e]">${portion}</span></span>
                        ${badge}
                    </span>
                    <span class="tabular-nums text-emerald-400 font-semibold flex-shrink-0">${item.calories || 0} kcal</span>
                </li>`;
            }).join('');
        }
    }
    if (notesEl) notesEl.textContent = entry.notes || '';
    if (tipsEl) tipsEl.textContent = entry.tips || '';
}

function formatMacro(n) {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function safeCalorieThumbSrc(src) {
    if (!src || typeof src !== 'string' || src.length > 80000) return '';
    if (src.indexOf('data:image/jpeg;base64,') === 0 || src.indexOf('data:image/png;base64,') === 0) return src;
    return '';
}

function getTodayCalorieEntries() {
    const today = typeof getTodayStr === 'function' ? getTodayStr() : '';
    return (calorieLogEntries || []).filter(e => e && e.date === today);
}

function renderCalorieTodaySummary() {
    const todayEntries = getTodayCalorieEntries();
    const totals = todayEntries.reduce((acc, e) => {
        acc.calories += Number(e.calories) || 0;
        acc.protein += Number(e.protein_g) || 0;
        acc.carbs += Number(e.carbs_g) || 0;
        acc.fat += Number(e.fat_g) || 0;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const totalEl = document.getElementById('calorie-today-total');
    const goalEl = document.getElementById('calorie-today-goal');
    const remainEl = document.getElementById('calorie-today-remain');
    const bar = document.getElementById('calorie-progress-bar');
    const pEl = document.getElementById('calorie-today-protein');
    const cEl = document.getElementById('calorie-today-carbs');
    const fEl = document.getElementById('calorie-today-fat');
    const countEl = document.getElementById('calorie-entry-count');
    const goal = calorieDailyGoalKcal || CALORIE_DEFAULT_GOAL;
    const remain = goal - totals.calories;
    const pct = goal > 0 ? Math.min(100, Math.round((totals.calories / goal) * 1000) / 10) : 0;

    if (totalEl) totalEl.textContent = String(Math.round(totals.calories));
    if (goalEl) goalEl.textContent = String(goal);
    if (remainEl) {
        remainEl.textContent = remain >= 0 ? `仲剩 ${Math.round(remain)} kcal` : `超出 ${Math.round(-remain)} kcal`;
        remainEl.classList.toggle('text-red-400', remain < 0);
        remainEl.classList.toggle('text-[#a8a29e]', remain >= 0);
    }
    if (bar) {
        bar.style.width = `${pct}%`;
        bar.classList.toggle('over', remain < 0);
    }
    if (pEl) pEl.textContent = `${formatMacro(Math.round(totals.protein * 10) / 10)} g`;
    if (cEl) cEl.textContent = `${formatMacro(Math.round(totals.carbs * 10) / 10)} g`;
    if (fEl) fEl.textContent = `${formatMacro(Math.round(totals.fat * 10) / 10)} g`;
    if (countEl) countEl.textContent = todayEntries.length ? `${todayEntries.length} 餐` : '';
}

function renderCalorieTodayList() {
    const list = document.getElementById('calorie-today-list');
    const empty = document.getElementById('calorie-today-empty');
    if (!list) return;
    const todayEntries = getTodayCalorieEntries();
    if (!todayEntries.length) {
        list.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = todayEntries.map(entry => {
        const thumbSrc = safeCalorieThumbSrc(entry.thumb);
        const thumb = thumbSrc
            ? `<img class="calorie-entry-thumb" alt="" src="${thumbSrc}">`
            : `<div class="calorie-entry-thumb flex items-center justify-center text-lg">🍽️</div>`;
        const note = entry.userNote
            ? `<div class="text-[10px] text-[#a8a29e]">${escapeHtml(entry.userNote)}</div>`
            : '';
        return `<li class="calorie-entry-row">
            ${thumb}
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] text-[#a8a29e] tabular-nums">${escapeHtml(entry.time || '')}</span>
                    <span class="font-semibold text-sm truncate">${escapeHtml(entry.mealName)}</span>
                </div>
                <div class="text-[11px] text-[#a8a29e] tabular-nums">
                    P ${formatMacro(entry.protein_g)} · C ${formatMacro(entry.carbs_g)} · F ${formatMacro(entry.fat_g)}
                </div>
                ${note}
            </div>
            <div class="text-right flex-shrink-0">
                <div class="font-bold text-emerald-400 tabular-nums">${entry.calories}</div>
                <div class="text-[10px] text-[#a8a29e]">kcal</div>
            </div>
            <button type="button" class="calorie-entry-delete" onclick="deleteCalorieEntry('${escapeJsString(entry.id)}')" aria-label="刪除紀錄">
                <i class="fa-solid fa-trash"></i>
            </button>
        </li>`;
    }).join('');
}

function deleteCalorieEntry(id) {
    if (!id) return;
    calorieLogEntries = (calorieLogEntries || []).filter(e => e.id !== id);
    saveCalorieLog();
    renderCalorieTodaySummary();
    renderCalorieTodayList();
    if (calorieLastResult && calorieLastResult.id === id) {
        const box = document.getElementById('calorie-result');
        if (box) box.classList.add('hidden');
        calorieLastResult = null;
    }
    if (typeof showToast === 'function') showToast('已刪除呢餐紀錄');
    if (typeof callAppsScript === 'function' && isCaloriesUserLoggedIn()) {
        callAppsScript('deleteCalorieEntry', { entryId: id }).catch(function () {});
    }
}

function calorieEntryForSheet(entry) {
    if (!entry) return null;
    return {
        id: entry.id,
        date: entry.date,
        time: entry.time,
        mealName: entry.mealName,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        oilSpoons: entry.oilSpoons || 0,
        items: (entry.items || []).map(function (it) {
            return {
                name: it.name,
                portion: it.portion,
                calories: it.calories,
                source: it.source
            };
        }),
        userNote: entry.userNote || '',
        notes: entry.notes || '',
        engine: entry.engine || '',
        createdAt: entry.createdAt
    };
}

function syncCalorieEntryToSheet(entry) {
    if (typeof callAppsScript !== 'function' || !isCaloriesUserLoggedIn()) return;
    const payload = calorieEntryForSheet(entry);
    if (!payload) return;
    callAppsScript('saveCalorieEntry', { entry: payload }).then(function (res) {
        if (res && res.status === 'error') {
            if (typeof showToast === 'function') showToast('Excel 試算表未能寫入：' + (res.message || '請重新部署 Apps Script'));
            return;
        }
        if (typeof showToast === 'function') showToast('已寫入 Google 試算表（Excel 開到）');
    }).catch(function () {
        if (typeof showToast === 'function') showToast('Excel 試算表未能寫入，本地紀錄仍然保留');
    });
}

function loadCalorieLogsFromSheet() {
    if (typeof callAppsScript !== 'function' || !isCaloriesUserLoggedIn()) return;
    callAppsScript('getCalorieLogs', {}).then(function (res) {
        if (!res || res.status === 'error' || !Array.isArray(res.entries)) return;
        const byId = {};
        (calorieLogEntries || []).forEach(function (e) { if (e && e.id) byId[e.id] = e; });
        res.entries.forEach(function (e) {
            if (!e || !e.id || byId[e.id]) return;
            byId[e.id] = {
                id: e.id,
                date: e.date,
                time: e.time,
                mealName: e.mealName,
                calories: e.calories,
                protein_g: e.protein_g,
                carbs_g: e.carbs_g,
                fat_g: e.fat_g,
                oilSpoons: e.oilSpoons,
                items: e.itemsText ? [{ name: e.itemsText, portion: '', calories: e.calories, source: e.sources }] : [],
                userNote: e.userNote,
                engine: e.engine,
                createdAt: e.createdAt,
                thumb: ''
            };
        });
        calorieLogEntries = Object.keys(byId).map(function (k) { return byId[k]; })
            .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        saveCalorieLog();
        renderCalorieTodaySummary();
        renderCalorieTodayList();
    }).catch(function () {});
}

function _xmlCalorieCell(value, type) {
    const t = type || (typeof value === 'number' ? 'Number' : 'String');
    const raw = value == null ? '' : String(value);
    const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<Cell><Data ss:Type="' + t + '">' + escaped + '</Data></Cell>';
}

function downloadCalorieExcel() {
    const rows = (calorieLogEntries || []).slice().sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
    });
    if (!rows.length) {
        if (typeof showToast === 'function') showToast('未有卡路里紀錄可以下載');
        return;
    }
    const header = ['日期', '時間', '餐名', '卡路里kcal', '蛋白質g', '碳水g', '脂肪g', '鑊油湯匙', '食物明細', '資料來源', '備註'];
    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Worksheet ss:Name="卡路里紀錄"><Table>';
    xml += '<Row>' + header.map(function (h) { return _xmlCalorieCell(h, 'String'); }).join('') + '</Row>';
    rows.forEach(function (e) {
        const items = (e.items || []).map(function (it) {
            return (it.name || '') + ' ' + (it.portion || '') + ' ' + (it.calories || 0) + 'kcal';
        }).join('; ');
        const sources = (e.items || []).map(function (it) { return it.source; })
            .filter(function (s, i, a) { return s && a.indexOf(s) === i; }).join(', ');
        xml += '<Row>'
            + _xmlCalorieCell(e.date || '', 'String')
            + _xmlCalorieCell(e.time || '', 'String')
            + _xmlCalorieCell(e.mealName || '', 'String')
            + _xmlCalorieCell(Number(e.calories) || 0, 'Number')
            + _xmlCalorieCell(Number(e.protein_g) || 0, 'Number')
            + _xmlCalorieCell(Number(e.carbs_g) || 0, 'Number')
            + _xmlCalorieCell(Number(e.fat_g) || 0, 'Number')
            + _xmlCalorieCell(Number(e.oilSpoons) || 0, 'Number')
            + _xmlCalorieCell(items, 'String')
            + _xmlCalorieCell(sources, 'String')
            + _xmlCalorieCell(e.userNote || '', 'String')
            + '</Row>';
    });
    xml += '</Table></Worksheet></Workbook>';
    const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const day = typeof getTodayStr === 'function' ? getTodayStr() : 'export';
    a.href = url;
    a.download = 'calorie-log-' + day + '.xls';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 400);
    if (typeof showToast === 'function') showToast('已下載 Excel：calorie-log-' + day + '.xls');
}

function toggleCalorieGoalEdit(force) {
    const wrap = document.getElementById('calorie-goal-edit');
    if (!wrap) return;
    const show = force === false ? false : wrap.classList.contains('hidden');
    wrap.classList.toggle('hidden', !show);
    if (show) {
        const input = document.getElementById('calorie-goal-input');
        if (input) {
            input.value = String(calorieDailyGoalKcal || CALORIE_DEFAULT_GOAL);
            input.focus();
            input.select();
        }
    }
}

function saveCalorieGoal() {
    const input = document.getElementById('calorie-goal-input');
    const raw = input ? parseInt(input.value, 10) : NaN;
    if (!raw || raw < 800 || raw > 6000) {
        if (typeof showToast === 'function') showToast('目標請設喺 800–6000 kcal');
        return;
    }
    calorieDailyGoalKcal = raw;
    saveCalorieLog();
    toggleCalorieGoalEdit(false);
    renderCalorieTodaySummary();
    if (typeof showToast === 'function') showToast(`每日目標已設為 ${raw} kcal`);
}
