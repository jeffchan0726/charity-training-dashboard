// js/ui-library.js
// Library / 動作庫 UI and related
// Extracted as part of A (architecture refactor)

// --- Library ---
// currentLibraryFilter moved to js/state.js (A refactor)
const LIBRARY_MODAL_Z = 120;
const LIBRARY_CHILD_MODAL_Z = 130;

function showLibraryModal(addToCurrent = false, addToHistory = false) {
    const modal = document.getElementById('libraryModal');
    if (!modal) {
        console.error('#libraryModal not found in DOM');
        alert('動作庫視窗載入失敗，請重新整理頁面或檢查檔案是否完整。');
        return;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    window._libraryAddToCurrent = addToCurrent;
    window._libraryAddToHistory = addToHistory;

    // Always keep library above history edit (110), workout set (50), login (100), etc.
    modal.style.zIndex = String(LIBRARY_MODAL_Z);

    renderLibraryList();
    renderCategoryFilters();
}

function hideLibraryModal() {
    const lib = document.getElementById('libraryModal');
    if (lib) {
        lib.classList.add('hidden');
        lib.classList.remove('flex');
        lib.style.zIndex = ''; // reset any fullscreen boost
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('library-categories');
    container.innerHTML = '';
    EXERCISE_CATEGORIES.forEach(cat => {
        const chip = document.createElement('button');
        chip.className = `px-2.5 py-0.5 text-xs rounded-2xl border ${currentLibraryFilter === cat ? 'bg-emerald-900 border-emerald-600' : 'border-[#57534e] hover:bg-[#292524]'}`;
        chip.textContent = cat;
        chip.onclick = () => {
            currentLibraryFilter = (currentLibraryFilter === cat) ? null : cat;
            renderCategoryFilters();
            renderLibraryList();
        };
        container.appendChild(chip);
    });
    const all = document.createElement('button');
    all.className = 'px-2.5 py-0.5 text-xs rounded-2xl border border-[#57534e]';
    all.textContent = '全部';
    all.onclick = () => { currentLibraryFilter = null; renderCategoryFilters(); renderLibraryList(); };
    container.appendChild(all);
}

function filterLibrary() {
    renderLibraryList();
}

function renderLibraryList() {
    const container = document.getElementById('library-list');
    const searchVal = (document.getElementById('library-search')?.value || '').toLowerCase().trim();
    container.innerHTML = '';

    let filtered = EXERCISES;
    if (currentLibraryFilter) filtered = filtered.filter(e => e.muscle_group === currentLibraryFilter);
    if (searchVal) {
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(searchVal)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-sm text-[#a8a29e] py-4">沒有符合的項目。試試在動作庫新增自訂。</div>`;
        return;
    }

    filtered.forEach(ex => {
        const display = getExerciseDisplay(ex);
        const div = document.createElement('div');
        div.className = 'exercise-card bg-[#292524] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.985] transition flex flex-col';
        div.onclick = () => showExerciseDetail(ex.name);
        div.innerHTML = `
            <div class="relative bg-[#1c1917]">
                <img src="${sanitizeUrl(ex.image)}" class="w-full h-32 object-contain" loading="lazy" onerror="this.style.display='none';">
                <div class="absolute top-1 right-1 bg-black/50 text-[9px] px-1 rounded">${escapeHtml(ex.muscle_group)}</div>
            </div>
            <div class="p-2 flex-1">
                <div class="font-medium text-sm leading-tight truncate">${escapeHtml(display)}</div>
            </div>
            <div class="px-2 pb-2">
                <button type="button" class="lib-use-exercise-btn text-xs px-2.5 py-1 bg-emerald-900/70 hover:bg-emerald-800 rounded w-full">加入</button>
            </div>
        `;
        const addBtn = div.querySelector('.lib-use-exercise-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (ev) => {
                ev.stopImmediatePropagation();
                useExerciseFromLibrary(ex.name);
            });
        }
        container.appendChild(div);
    });
}

function showExerciseDetail(nameOrObj) {
    const modal = document.getElementById('exerciseDetailModal');
    if (!modal) return;

    let ex = typeof nameOrObj === 'string' ? getExerciseByName(nameOrObj) : nameOrObj;
    if (!ex && typeof nameOrObj === 'string') {
        const libEntry = (exerciseLibrary || []).find(e =>
            e.name === nameOrObj || (e.name && e.name.toLowerCase() === nameOrObj.toLowerCase())
        );
        ex = {
            name: nameOrObj,
            muscle_group: (libEntry && libEntry.category)
                || (typeof getMuscleGroup === 'function' ? getMuscleGroup(nameOrObj) : null)
                || '全身'
        };
    }
    if (!ex) return;

    const displayName = getExerciseDisplay(ex);

    const gifWrap = document.getElementById('detail-gif-wrap');
    const gifEl = document.getElementById('detail-gif');
    const gifLoading = document.getElementById('detail-gif-loading');
    const gifFallback = ex.image || '';
    const gifUrl = typeof getExerciseGifUrl === 'function' ? getExerciseGifUrl(ex) : null;

    if (gifEl) {
        gifEl.style.display = 'none';
        gifEl.removeAttribute('src');
        gifEl.alt = displayName + ' 動作示範';
        gifEl.onerror = () => {
            if (gifFallback) {
                gifEl.src = gifFallback;
                gifEl.style.display = '';
            } else {
                gifEl.style.display = 'none';
            }
            if (gifLoading) gifLoading.classList.add('hidden');
        };
        gifEl.onload = () => {
            gifEl.style.display = '';
            if (gifLoading) gifLoading.classList.add('hidden');
        };

        if (gifUrl) {
            if (gifLoading) gifLoading.classList.remove('hidden');
            gifEl.src = gifUrl;
        } else if (gifFallback) {
            if (gifLoading) gifLoading.classList.add('hidden');
            gifEl.src = gifFallback;
            gifEl.style.display = '';
        } else if (gifLoading) {
            gifLoading.classList.add('hidden');
        }
    }
    if (gifWrap) gifWrap.classList.toggle('hidden', !gifUrl && !gifFallback);

    document.getElementById('detail-name').textContent = displayName;
    document.getElementById('detail-muscle').textContent = ex.muscle_group || '全身';

    const diagram = document.getElementById('detail-muscle-diagram');
    diagram.innerHTML = '';
    const muscles = (ex.muscle_group || '全身').split('+').map(m => m.trim());
    muscles.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'px-2 py-0.5 text-[10px] bg-emerald-900/70 text-emerald-300 rounded-full';
        chip.textContent = m;
        diagram.appendChild(chip);
    });

    const tipsEl = document.getElementById('detail-tips');
    tipsEl.innerHTML = '';
    const tips = getExpertTips(ex);
    tips.forEach(tip => {
        const li = document.createElement('li');
        li.className = 'flex gap-2';
        li.innerHTML = `<span class="text-emerald-400">•</span> <span>${escapeHtml(tip)}</span>`;
        tipsEl.appendChild(li);
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.zIndex = String(LIBRARY_CHILD_MODAL_Z);
}

function hideExerciseDetail() {
    const modal = document.getElementById('exerciseDetailModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
    const gifEl = document.getElementById('detail-gif');
    if (gifEl) {
        gifEl.removeAttribute('src');
        gifEl.style.display = 'none';
    }
    const gifLoading = document.getElementById('detail-gif-loading');
    if (gifLoading) gifLoading.classList.add('hidden');
}

const EXPERT_TIPS_BY_ID = {
    incline_dumbbell_press: [
        "肩胛骨下壓後縮，胸大肌上部發力",
        "手肘約 45°，避免肩關節過度前移",
        "啞鈴軌跡略呈弧線，頂點停 1 秒擠壓",
        "下降時手肘低於肩線，保護肩袖"
    ],
    flat_dumbbell_press: [
        "肩胛下壓後縮、胸挺，腳穩踩地",
        "啞鈴軌跡呈弧線而非直上直下",
        "頂點保持手肘微屈，避免鎖死增加肩壓",
        "組間休息 90–120 秒"
    ],
    barbell_bench_press: [
        "肩胛後縮貼凳，腳踩實地面",
        "握距略寬於肩，槓鈴落點在乳頭附近",
        "手肘約 45° 角下壓，避免過度外展",
        "起槓時呼氣，下降 2–3 秒控制"
    ],
    lower_chest_cable_fly: [
        "繩索從高位出發，身體略前傾",
        "手肘微屈固定，用胸肌帶動夾合",
        "底部擠壓下胸 1 秒，避免聳肩",
        "回程慢而受控，保持張力"
    ],
    cable_crossover: [
        "站姿穩定，核心收緊，微屈膝",
        "雙手於胸前交會，擠壓胸肌中縫",
        "手肘微屈，避免用手臂代勞",
        "打開時感受胸肌拉伸，全程控制"
    ],
    chest_dips: [
        "身體略前傾，手肘向外打開",
        "下降至大臂約平行地面，胸肌拉伸",
        "推起時擠壓胸肌，避免聳肩",
        "記錄時填寫體重；進階可加負重腰帶"
    ],
    machine_chest_press: [
        "肩胛貼靠椅背，握把與乳頭同高",
        "推起時胸肌發力，避免聳肩",
        "頂點不完全鎖死手肘",
        "回程慢 2–3 秒，保持肌肉張力"
    ],
    pull_ups: [
        "肩胛先下壓後縮，胸部向槓靠近",
        "避免甩動借力，全程控制上下",
        "下巴過槓為一次完整動作",
        "記錄時填寫體重；力竭可用彈力帶或負重腰帶"
    ],
    deadlift: [
        "髖鉸鏈先啟動，膝蓋隨之彎曲，背部中立",
        "槓鈴貼近小腿，肩胛下壓",
        "頂點臀部夾緊，避免過度後仰",
        "下降控制速度，勿讓槓鈴彈地"
    ],
    seated_cable_row: [
        "挺胸坐直，核心收緊，腳踩實",
        "拉向腹部時肩胛後縮，擠壓背肌",
        "手肘貼近身體，避免用手臂代勞",
        "回程慢而受控，保持繩索張力"
    ],
    barbell_row: [
        "髖部後推、背部約與地面平行",
        "拉槓向腹部，肩胛後縮擠壓背肌",
        "核心全程 bracing，避免圓背",
        "下降 2–3 秒，勿用慣性甩起"
    ],
    lat_pulldown: [
        "寬握，挺胸，肩胛先下壓",
        "拉至鎖骨附近，手肘向後下方",
        "避免身體過度後仰借力",
        "回程慢 2–3 秒，感受背闊肌拉伸"
    ],
    dumbbell_row: [
        "一手一膝撐凳，背部平行地面",
        "拉啞鈴向髖部，肩胛後縮",
        "頂點擠壓背肌 1 秒",
        "避免旋轉軀幹借力"
    ],
    incline_bench_row: [
        "上斜凳支撐胸部，下巴略離凳面",
        "拉啞鈴向腰側，肩胛後縮",
        "手肘貼近身體，刺激背闊肌下部",
        "下降慢而受控，保持張力"
    ],
    t_bar_row: [
        "髖部後推，背部中立，核心緊",
        "拉向腹部，手肘貼身擠壓背肌",
        "頂點停 1 秒，避免聳肩",
        "重量由小漸增，先掌握動作軌跡"
    ],
    face_pulls: [
        "繩索與眼同高，雙手分開拉向臉側",
        "手肘高於手腕，肩胛後縮",
        "頂點擠壓後三角與肩袖",
        "小重量高次數，注重控制與姿勢"
    ],
    barbell_back_squat: [
        "槓鈴置上背，核心 bracing，挺胸",
        "膝蓋與腳趾同向，髖部向後坐",
        "深度至大腿至少平行地面",
        "站起時髖部與膝蓋同步伸展"
    ],
    zercher_squats: [
        "槓鈴置肘彎，前臂可墊毛巾減壓",
        "胸部挺起，核心全程收緊",
        "膝蓋與腳趾同向，臀部向後坐",
        "站起時髖部先推，深度至大腿平行或更低"
    ],
    goblet_squat: [
        "啞鈴捧於胸前，手肘內夾",
        "腳略寬於肩，膝蓋隨腳尖方向",
        "下蹲時手肘推開膝蓋，保持挺胸",
        "適合學習深蹲深度與髖鉸鏈模式"
    ],
    romanian_deadlift: [
        "膝蓋微屈固定，以髖鉸鏈向後推",
        "槓鈴沿大腿下滑，背部中立",
        "感受腿後肌拉伸至大腿後側緊繃",
        "站起時臀部前推，勿過度後仰"
    ],
    walking_lunges: [
        "每一步膝蓋勿超過腳尖太多",
        "軀幹直立，核心穩定",
        "後膝接近地面但不碰地",
        "可手持啞鈴增加強度"
    ],
    bulgarian_split_squat: [
        "後腳墊高，前腳承重約 80%",
        "下蹲時前膝與腳尖同向，軀幹微前傾",
        "前大腿平行地面為佳",
        "單腿訓練，有助改善左右不平衡"
    ],
    leg_press: [
        "腳掌均勻踩板，膝蓋與腳尖同向",
        "下放至膝蓋約 90°，腰部貼實椅背",
        "推起勿鎖死膝蓋",
        "避免下放過深導致腰椎離開椅背"
    ],
    leg_curl: [
        "髖部貼實墊面，勿抬臀借力",
        "彎舉至小腿接近大腿後側",
        "頂點擠壓腿後肌 1 秒",
        "回程慢 2–3 秒"
    ],
    leg_extension: [
        "膝蓋對準轉軸，背部貼靠",
        "伸展至膝蓋伸直但不鎖死",
        "頂點擠壓股四頭肌 1 秒",
        "下降慢而受控，避免甩動"
    ],
    hip_thrust: [
        "上背靠凳，槓鈴置髖部（可用墊保護）",
        "腳掌踩地，膝蓋約 90°",
        "頂點臀部夾緊，下巴微收",
        "下降時控制，勿讓槓鈴彈起"
    ],
    standing_calf_raise: [
        "腳掌前掌發力，全程控制上下",
        "頂點踮高停 1 秒，充分拉伸跟腱",
        "下降時腳跟盡量下沉",
        "可單腳或加重增加難度"
    ],
    barbell_curl: [
        "手肘貼近身體，避免前後擺動",
        "上舉時前臂旋前，擠壓二頭",
        "下降 2–3 秒，勿完全放鬆",
        "身體勿過度後仰借力"
    ],
    preacher_curls: [
        "上臂貼實斜板，手肘勿離開",
        "彎舉至頂點擠壓二頭",
        "下降慢 3 秒，感受肌肉拉伸",
        "小重量高控制，避免甩動"
    ],
    bayesian_cable_curls: [
        "背對繩索，手肘固定於身側",
        "彎舉時二頭全程受張力（與重力方向不同）",
        "頂點停 1 秒擠壓",
        "適合補強二頭長頭"
    ],
    hammer_curls: [
        "中立握（掌心相對），手肘貼身",
        "同時或交替彎舉，刺激肱肌與前臂",
        "避免聳肩或身體搖晃",
        "下降慢而受控"
    ],
    tricep_rope_pushdown: [
        "手肘貼身固定，僅前臂活動",
        "下壓至手臂伸直，繩索分開擠壓三頭",
        "頂點停 1 秒",
        "回程慢 2–3 秒，勿讓重量拉起手肘"
    ],
    cable_overhead_triceps: [
        "背對繩索，手肘指向天花板固定",
        "僅前臂伸展，刺激三頭長頭",
        "頂點鎖緊手臂，擠壓三頭",
        "小重量先掌握肩關節穩定"
    ],
    skull_crushers: [
        "仰臥，手肘略窄於肩、指向天花板",
        "彎曲手肘使槓鈴落至額頭附近",
        "伸展時三頭發力，手肘勿外開",
        "可用 EZ 槓減少手腕壓力"
    ],
    reverse_forearm_curl: [
        "過手握（掌心向下），前臂貼大腿或凳面",
        "僅手腕活動，慢速彎舉",
        "頂點停 1 秒，刺激前臂伸肌",
        "小重量高次數，避免甩動"
    ],
    finger_curls: [
        "掌心向上，槓鈴滾至指尖再握緊",
        "專注前臂屈肌與握力",
        "全程控制，勿讓槓鈴滑落",
        "適合攀岩、硬拉輔助訓練"
    ],
    overhead_press: [
        "核心 bracing，臀部夾緊",
        "槓鈴從鎖骨推至頭頂，頭略前移讓出空間",
        "手肘略在前方，避免過度外展",
        "下降控制至鎖骨附近"
    ],
    seated_dumbbell_press: [
        "椅背調至約 85°，肩胛貼靠",
        "啞鈴從肩高推至頭頂，掌心朝前",
        "推起勿聳肩，頂點不完全鎖死",
        "下降慢 2–3 秒"
    ],
    arnold_press: [
        "坐姿，啞鈴從胸前掌心相對開始",
        "推起同時旋轉至掌心朝前",
        "全程控制，刺激三角肌各束",
        "重量不宜過大，注重旋轉軌跡"
    ],
    lateral_raises: [
        "手肘微屈，以手肘帶動小臂上舉",
        "舉至手肘與肩同高即可，勿過高",
        "下降慢 3 秒，避免聳肩",
        "小重量高控制，感受中束發力"
    ],
    cable_lateral_raise: [
        "側身站，遠離繩索的手單手舉",
        "手肘微屈，舉至肩高",
        "纜繩提供持續張力，頂點停 1 秒",
        "避免聳肩或身體側傾借力"
    ],
    rear_delt_raises: [
        "髖部後推，背部約平行地面",
        "手肘微屈，向兩側舉至肩高",
        "擠壓後三角，避免用手臂甩動",
        "可用啞鈴或繩索，小重量高控制"
    ],
    barbell_shrugs: [
        "直立握槓，手臂伸直",
        "僅肩胛上提，勿用手臂彎舉",
        "頂點停 1 秒，下降慢而受控",
        "避免前後擺動或過度重量"
    ],
    ab_wheel_rollout: [
        "從跪姿開始，核心全程收緊",
        "臀部勿塌，身體成一直線",
        "滾出範圍由小到大，勿一開始就全伸",
        "吸氣滾出、呼氣收回"
    ],
    dragon_flag: [
        "肩胛固定於凳面，僅軀幹活動",
        "身體成一直線，臀部勿塌",
        "從小幅下降開始，漸進增加範圍",
        "呼氣控制下降，進階動作需充分熱身"
    ],
    hanging_leg_raise: [
        "握槓穩定，避免過度搖晃",
        "骨盆後傾，用下腹帶動抬腿",
        "膝蓋可彎曲降低難度，伸直則更進階",
        "記錄時填寫體重，方便追蹤 volume"
    ],
    plank: [
        "前臂撐地，肘在肩正下方",
        "頭至腳跟成一直線，勿塌腰或抬臀",
        "核心與臀部收緊，均勻呼吸",
        "記錄秒數與組數；可填體重以計算 volume"
    ],
    cable_wood_chopper: [
        "雙手握繩索，從高位斜向下拉",
        "以核心旋轉帶動，髖部參與但勿過度甩動",
        "拉至對側髖部附近，擠壓腹斜肌",
        "左右交替，控制回程"
    ],
    cable_crunch: [
        "跪姿握繩索於頭頂，髖部固定",
        "以腹肌捲曲帶動，非用手拉繩索",
        "下巴微收，擠壓腹部 1 秒",
        "回程慢而受控，保持繃緊"
    ],
    decline_crunch: [
        "下斜板固定，腳勾穩，避免身體下滑",
        "下巴微收，以腹肌捲曲帶動，非用手拉",
        "頂點擠壓下腹 1 秒，呼氣發力",
        "下降慢 2–3 秒，全程保持腹部繃緊"
    ],
    farmer_carry: [
        "雙手垂握重物，肩膀下沉後縮",
        "步伐穩定，核心 bracing，抬頭挺胸",
        "避免身體向一側傾斜",
        "記錄重量與次數；可走距離或時間計組"
    ],
    battle_ropes: [
        "微屈膝，核心穩定，背部中立",
        "交替或同步甩繩，保持節奏",
        "用全身協調發力，非只用手臂",
        "記錄持續時間與組數"
    ],
    burpees: [
        "俯撐時身體成線，核心收緊",
        "跳起時輕盈落地，減少膝蓋衝擊",
        "可依體能調整速度與是否加伏地挺身",
        "記錄時填寫體重與次數"
    ],
    rowing_machine: [
        "先推腿、再傾髖、最後拉手（順序勿亂）",
        "回程依序放鬆：手→髖→腿",
        "保持穩定節奏與呼吸",
        "記錄持續時間與組數"
    ],
    jump_rope: [
        "手腕發力甩繩，非整隻手臂",
        "腳尖輕跳，落地柔和",
        "保持核心穩定，視線向前",
        "記錄持續時間與組數"
    ],
    treadmill: [
        "先熱身 5 分鐘，再進入主訓練配速",
        "身體微前傾，步幅自然，勿緊握扶手",
        "坡度可依目標調整（燃脂／臀腿）",
        "記錄時間、速度、坡度，App 會自動計算里程"
    ]
};

const EXPERT_TIPS_BY_RECORD_TYPE = {
    treadmill: [
        "熱身後再加速，循序漸進",
        "身體放鬆、步幅自然，視線向前",
        "記錄時間、速度與坡度",
        "App 會依速度與時間計算里程"
    ],
    time_reps: [
        "保持姿勢穩定，核心全程收緊",
        "用計時器記錄每組持續秒數",
        "組間充分休息後再開始下一組",
        "記錄組數與時間，追蹤進步"
    ],
    bodyweight: [
        "動作全程控制，避免借力或甩動",
        "記錄時填寫體重，方便追蹤 volume 與 PR",
        "力竭時可用彈力帶輔助或負重進階",
        "呼吸配合：用力時吐氣"
    ],
    weight: [
        "保持核心穩定，動作全程控制",
        "頂點充分收縮目標肌肉",
        "下降階段慢而受控（約 2–3 秒）",
        "呼吸配合：用力時吐氣"
    ]
};

const EXPERT_TIPS_BY_MUSCLE_GROUP = {
    "胸部": [
        "肩胛穩定、胸挺，避免肩關節過度前移",
        "用胸肌發力，避免用手臂代勞",
        "頂點擠壓胸肌 1 秒",
        "下降慢而受控，保持肌肉張力"
    ],
    "背部": [
        "肩胛先下壓後縮，再啟動拉動",
        "拉向髖部或腹部，避免用手臂代勞",
        "核心 bracing，保持背部中立",
        "回程慢 2–3 秒，感受背肌拉伸"
    ],
    "腿部": [
        "膝蓋與腳趾同向，核心 bracing",
        "控制下蹲深度，勿讓腰椎代償",
        "站起時髖部與膝蓋協調伸展",
        "下降慢而受控，避免彈性借力"
    ],
    "手臂": [
        "手肘位置固定，僅前臂活動",
        "避免身體搖晃或聳肩借力",
        "頂點擠壓目標肌群 1 秒",
        "下降慢 2–3 秒"
    ],
    "肩膀": [
        "核心穩定，避免聳肩",
        "小重量高控制，感受三角肌發力",
        "手肘軌跡固定，勿甩動",
        "下降慢而受控"
    ],
    "核心": [
        "脊柱中立，避免腰椎過度代償",
        "用腹肌發力，呼吸均勻不憋氣",
        "範圍由小到大，先掌握控制再加重",
        "每組專注質量而非速度"
    ],
    "全身": [
        "全身協調發力，核心全程穩定",
        "依動作類型記錄重量、時間或次數",
        "組間充分休息，保持動作品質",
        "循序漸進，避免疲勞時姿勢變形"
    ],
    "有氧": [
        "先熱身，再進入主訓練強度",
        "保持穩定節奏與均勻呼吸",
        "依目標調整時間、速度或坡度",
        "記錄各組數據，追蹤耐力進步"
    ]
};

function getExpertTips(nameOrEx) {
    const ex = typeof nameOrEx === 'string'
        ? (getExerciseByName(nameOrEx) || { name: nameOrEx, muscle_group: '全身' })
        : (nameOrEx || { name: '', muscle_group: '全身' });

    if (ex.id && EXPERT_TIPS_BY_ID[ex.id]) {
        return EXPERT_TIPS_BY_ID[ex.id];
    }

    const displayName = getExerciseDisplay(ex);
    const recordType = typeof getExerciseRecordType === 'function'
        ? getExerciseRecordType(ex.name || displayName)
        : 'weight';

    const group = ex.muscle_group
        || (typeof getMuscleGroup === 'function' ? getMuscleGroup(displayName) : null)
        || '全身';

    // 跑步機／計時類動作優先用記錄類型提示
    if (recordType === 'treadmill' || recordType === 'time_reps') {
        if (EXPERT_TIPS_BY_RECORD_TYPE[recordType]) {
            return EXPERT_TIPS_BY_RECORD_TYPE[recordType];
        }
    }

    // 自訂動作或未逐個編寫的動作：用肌群通用提示
    if (EXPERT_TIPS_BY_MUSCLE_GROUP[group]) {
        return EXPERT_TIPS_BY_MUSCLE_GROUP[group];
    }

    if (EXPERT_TIPS_BY_RECORD_TYPE[recordType]) {
        return EXPERT_TIPS_BY_RECORD_TYPE[recordType];
    }

    return EXPERT_TIPS_BY_RECORD_TYPE.weight;
}

function useExerciseFromLibrary(name) {
    const addToCurrent = window._libraryAddToCurrent;
    const setModal = document.getElementById('workoutSetModal');
    const isEditingSet = setModal && !setModal.classList.contains('hidden');
    const ex = getExerciseByName(name) || {name: name};
    const displayName = getExerciseDisplay(ex);

    if (isEditingSet) {
        // Special: adding to the Workout Set editor instead of current workout
        if (!editingSetExercises.find(n => n.toLowerCase() === displayName.toLowerCase())) {
            editingSetExercises.push(displayName);
        }
        renderEditingSetExercises();
        hideLibraryModal();
        return;
    }

    if (window._libraryAddToHistory) {
        hideLibraryModal();
        if (typeof addExerciseToHistory === 'function') {
            addExerciseToHistory(displayName);
        }
        window._libraryAddToHistory = false;
        return;
    }

    hideLibraryModal();
    if (addToCurrent && currentWorkout) {
        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
            currentWorkout.exercises.push({name: displayName, sets: []});
            renderCurrentWorkout();
        }
    } else {
        if (!currentWorkout) startNewWorkout();
        if (!currentWorkout.exercises.find(e => e.name === displayName)) {
            currentWorkout.exercises.push({name: displayName, sets: []});
            renderCurrentWorkout();
        }
    }
}

function showAddCustomExercise() {
    hideLibraryModal();
    const modal = document.getElementById('customExerciseModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.zIndex = String(LIBRARY_CHILD_MODAL_Z);
    }
    const nameInput = document.getElementById('custom-name');
    if (nameInput) nameInput.focus();
}

function hideCustomExerciseModal() {
    const modal = document.getElementById('customExerciseModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    // Reopen library if needed
    setTimeout(() => {
        const lib = document.getElementById('libraryModal');
        if (lib && !lib.classList.contains('hidden')) return;
    }, 10);
}

function saveCustomExercise() {
    let name = document.getElementById('custom-name').value.trim();
    const category = document.getElementById('custom-category').value;
    if (!name) return;
    const ex = getExerciseByName(name);
    if (ex) name = ex.name; // normalize to canonical bilingual if matches
    if (exerciseLibrary.find(e => e.name.toLowerCase() === name.toLowerCase())) {
        alert('動作已存在');
        return;
    }
    exerciseLibrary.push({name, category});
    saveWorkoutData();
    hideCustomExerciseModal();
    showLibraryModal(window._libraryAddToCurrent, !!window._libraryAddToHistory);
}