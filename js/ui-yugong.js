// js/ui-yugong.js
// 愚公移山 tab — Q→Q 放大鏡：同一座山由最細放到最大（四張圖任睇，唔使解鎖）

const YUGONG_MOUNTAIN_GOAL_TONNES = 100;

const YUGONG_ZOOM_STEPS = [
    {
        zoomStep: 1,
        image: 'images/可愛山圖1.png',
        zoomLabel: '最細',
        viewLabel: '遠眺成座山',
        scale: 0.55,
        caption: '最細倍率 — 成座山仲好遠，逐噸逐噸嚟！',
        speech: ''
    },
    {
        zoomStep: 2,
        image: 'images/可愛山圖2.png',
        zoomLabel: '放大',
        viewLabel: '山坡碎石',
        scale: 0.72,
        caption: '再放啲 — 見到山坡同碎石喇！',
        speech: ''
    },
    {
        zoomStep: 3,
        image: 'images/可愛山圖3.png',
        zoomLabel: '再放大',
        viewLabel: '一齊挖山',
        scale: 0.88,
        caption: '愈嚟愈大 — 兩個小人一齊掘，唔使怕！',
        speech: ''
    },
    {
        zoomStep: 4,
        image: 'images/可愛山圖4.png',
        zoomLabel: '最大',
        viewLabel: 'Jeff 特寫',
        scale: 1,
        caption: '最大倍率 — 放到最近，聽下 Jeff 講咩！',
        speech: '頂呀！繼續搬！慈善噸數就靠你哋啦！💪'
    }
];

const YUGONG_ZOOM_MAX = YUGONG_ZOOM_STEPS.length;

const YUGONG_SUGGESTIONS = [
    {
        icon: '👫',
        title: '朋友幫手移山',
        text: '叫埋朋友一齊操，互相督促，噸數加倍快。'
    },
    {
        icon: '📝',
        title: '記低每組訓練',
        text: '訓練日誌有記錄先計到慈善噸數，唔好漏呀。'
    },
    {
        icon: '🏋️',
        title: '每日做少少都算',
        text: '就算一組都算數，積少成多，愚公精神就係咁嚟。'
    }
];

let yugongViewZoom = 1;
let yugongLastProgressPct = 0;

function getYugongStats() {
    const movedTonnes = typeof getLifetimeTonnes === 'function' ? getLifetimeTonnes() : 0;
    const goalTonnes = YUGONG_MOUNTAIN_GOAL_TONNES;
    const remainingTonnes = Math.max(0, goalTonnes - movedTonnes);
    const progressPct = Math.min(100, (movedTonnes / goalTonnes) * 100);
    return { movedTonnes, remainingTonnes, progressPct, goalTonnes };
}

function getYugongZoomConfig(zoomStep) {
    return YUGONG_ZOOM_STEPS.find(s => s.zoomStep === zoomStep) || YUGONG_ZOOM_STEPS[0];
}

function cycleYugongZoom() {
    yugongViewZoom = yugongViewZoom >= YUGONG_ZOOM_MAX ? 1 : yugongViewZoom + 1;
    renderYugongTab({ animate: true, fromMagnifier: true });
}

function renderYugongTab(opts = {}) {
    const panel = document.getElementById('content-yugong');
    if (!panel || panel.classList.contains('hidden')) return;

    const stats = getYugongStats();
    const { movedTonnes, remainingTonnes, progressPct } = stats;
    const zoomCfg = getYugongZoomConfig(yugongViewZoom);
    const progressMilestone = progressPct >= 100 && yugongLastProgressPct < 100;
    yugongLastProgressPct = progressPct;

    const movedEl = document.getElementById('yugong-moved-tonnes');
    const remainEl = document.getElementById('yugong-remaining-tonnes');
    const pctEl = document.getElementById('yugong-progress-pct');
    const barEl = document.getElementById('yugong-progress-bar');
    const badgeEl = document.getElementById('yugong-zoom-badge');
    const hintEl = document.getElementById('yugong-earned-hint');
    const captionEl = document.getElementById('yugong-level-caption');
    const scaleEl = document.getElementById('yugong-zoom-scale-label');
    const imgEl = document.getElementById('yugong-mountain-img');
    const innerEl = document.getElementById('yugong-scene-inner');
    const speechEl = document.getElementById('yugong-speech');
    const sceneEl = document.getElementById('yugong-scene');

    if (movedEl) movedEl.textContent = movedTonnes.toFixed(2) + ' 噸';
    if (remainEl) remainEl.textContent = remainingTonnes.toFixed(2) + ' 噸';
    if (pctEl) pctEl.textContent = '移山進度 ' + progressPct.toFixed(1) + '%';
    if (barEl) barEl.style.width = progressPct + '%';
    if (badgeEl) {
        badgeEl.textContent = '放大：' + zoomCfg.zoomLabel + ' · ' + zoomCfg.viewLabel;
        badgeEl.className = 'yugong-zoom-badge yugong-zoom-' + yugongViewZoom + (progressMilestone ? ' yugong-zoom-milestone' : '');
    }
    if (scaleEl) {
        scaleEl.textContent = '最細 ━ ' + zoomCfg.zoomLabel + ' ━ 最大（' + yugongViewZoom + '/' + YUGONG_ZOOM_MAX + '）';
    }
    if (hintEl) {
        hintEl.textContent = progressPct >= 100
            ? '搬晒座山喇 — 繼續操，保持習慣呀！'
            : '撳 Q→Q 由最細放到最大，四格放大任睇';
    }
    if (captionEl) captionEl.textContent = zoomCfg.caption;

    if (imgEl && innerEl) {
        const applyZoom = () => {
            imgEl.src = zoomCfg.image;
            imgEl.alt = '愚公移山 — 放大' + zoomCfg.zoomLabel + '（' + zoomCfg.viewLabel + '）';
            innerEl.style.setProperty('--yugong-scale', String(zoomCfg.scale));
        };
        if (opts.animate) {
            innerEl.classList.add('yugong-zoom-out');
            setTimeout(() => {
                applyZoom();
                innerEl.classList.remove('yugong-zoom-out');
                innerEl.classList.add('yugong-zoom-in');
                setTimeout(() => innerEl.classList.remove('yugong-zoom-in'), 420);
            }, 180);
        } else {
            applyZoom();
        }
    }

    if (speechEl) {
        if (yugongViewZoom === YUGONG_ZOOM_MAX && zoomCfg.speech) {
            speechEl.textContent = zoomCfg.speech;
            speechEl.classList.remove('hidden');
        } else {
            speechEl.classList.add('hidden');
        }
    }

    if (sceneEl && progressMilestone && !opts.fromMagnifier) {
        sceneEl.classList.add('yugong-scene-celebrate');
        setTimeout(() => sceneEl.classList.remove('yugong-scene-celebrate'), 900);
    }

    renderYugongSuggestions(stats);
}

function renderYugongSuggestions(stats) {
    const list = document.getElementById('yugong-suggestions');
    if (!list) return;

    let dynamicHint;
    if (stats.progressPct >= 100) {
        dynamicHint = '恭喜！已經搬晒座山 — 繼續操，保持習慣呀！';
    } else {
        dynamicHint = '再搬 ' + stats.remainingTonnes.toFixed(1) + ' 噸就搬完座山';
    }

    list.innerHTML = YUGONG_SUGGESTIONS.map(s => `
        <li class="yugong-tip-item flex gap-3 items-start rounded-2xl p-3">
            <span class="text-lg flex-shrink-0">${s.icon}</span>
            <div>
                <div class="font-semibold text-sm yugong-tip-title">${s.title}</div>
                <div class="text-xs mt-0.5 leading-relaxed yugong-tip-text">${s.text}</div>
            </div>
        </li>
    `).join('') + `
        <li class="yugong-tip-dynamic text-center text-xs py-1">${dynamicHint}</li>
    `;
}

function refreshYugongIfVisible() {
    const panel = document.getElementById('content-yugong');
    if (panel && !panel.classList.contains('hidden')) {
        renderYugongTab();
    }
}

function initYugongTab() {
    if (yugongViewZoom < 1 || yugongViewZoom > YUGONG_ZOOM_MAX) {
        yugongViewZoom = 1;
    }
    renderYugongTab();
}