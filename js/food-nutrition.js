// js/food-nutrition.js
// 認餸之後：本地香港資料庫 → USDA API → 炒餸加油 fortify

const WOK_SPOON_OIL_G = 27;       // 香港炒鑊「1 湯匙」約 30 ml ≈ 27 g
const OIL_KCAL_PER_G = 9;         // 油脂 9 kcal/g
const OIL_PRESETS = {
    none: 0,
    light: 1,
    normal: 1.5,
    heavy: 2
};

function wokOilKcal(spoons) {
    const g = WOK_SPOON_OIL_G * (Number(spoons) || 0);
    return {
        grams: Math.round(g * 10) / 10,
        calories: Math.round(g * OIL_KCAL_PER_G),
        fat_g: Math.round(g * 10) / 10
    };
}

function getSelectedOilMode() {
    const el = document.querySelector('input[name="calorie-oil-mode"]:checked');
    return (el && el.value) ? el.value : 'normal';
}

function noteImpliesNoExtraOil(note) {
    const s = String(note || '');
    return /蒸|烚|灼|涼拌|無油|冇油|唔加油|不加油|清蒸/.test(s) && !/炒|煎/.test(s);
}

function noteImpliesLightOil(note) {
    return /少油|少啲油|少许油|少許油/.test(String(note || ''));
}

function resolveOilSpoons(mode, note, needsOil) {
    if (!needsOil) return 0;
    if (noteImpliesNoExtraOil(note)) return 0;
    if (mode === 'none') return 0;
    if (noteImpliesLightOil(note) && (mode === 'auto' || mode === 'normal')) return OIL_PRESETS.light;
    if (mode === 'auto') return OIL_PRESETS.normal;
    return OIL_PRESETS[mode] != null ? OIL_PRESETS[mode] : OIL_PRESETS.normal;
}

function itemLooksStirFry(item) {
    if (!item) return false;
    const name = String(item.name_zh || item.name || item.name_en || '');
    // 漢堡／三文治唔算炒餸，唔好加鑊油
    if (/漢堡|汉堡|burger|sandwich|三文治/.test(name)) return false;
    if (item.stir_fry || item.is_stir_fry) return true;
    const cooking = String(item.cooking || '').toLowerCase();
    if (cooking === 'stir_fry') return true;
    return /炒|乾炒|滑炒|爆炒/.test(name);
}

async function resolveMealNutrition(analysis, options) {
    const opts = options || {};
    const note = opts.note || '';
    const oilMode = opts.oilMode || getSelectedOilMode();
    const visionItems = Array.isArray(analysis && analysis.items) ? analysis.items : [];

    const resolved = [];
    const usdaQueries = [];

    visionItems.forEach(function (raw, idx) {
        const nameZh = String(raw.name_zh || raw.name || '').trim();
        const nameEn = String(raw.name_en || raw.en || '').trim();
        const grams = estimateItemGrams(raw);
        const hit = lookupHkFood(nameZh) || lookupHkFood(nameEn);

        if (hit && hit.kind === 'dish') {
            const dishGrams = hit.item.parts.reduce(function (s, p) { return s + (p.grams || 0); }, 0) || 400;
            const scale = grams > 0 && dishGrams > 0 ? grams / dishGrams : 1;
            expandHkDish(hit.item, scale).forEach(function (row) {
                row.fromVision = nameZh || nameEn;
                resolved.push(row);
            });
            return;
        }

        if (hit && hit.kind === 'food') {
            const row = scaleNutrients(hit.item, grams || hit.item.typical_g || 100);
            row.stir_fry = itemLooksStirFry(raw);
            row.fromVision = nameZh || nameEn;
            resolved.push(row);
            return;
        }

        usdaQueries.push({
            idx: idx,
            name_zh: nameZh,
            name_en: nameEn,
            grams: grams || 100,
            cooking: raw.cooking,
            is_stir_fry: itemLooksStirFry(raw)
        });
    });

    if (usdaQueries.length && typeof callAppsScript === 'function') {
        try {
            const usdaRes = await callAppsScript('lookupUsdaNutrition', {
                queries: usdaQueries.map(function (q) {
                    return { query: q.name_en || q.name_zh, grams: q.grams };
                })
            });
            const rows = (usdaRes && usdaRes.foods) || [];
            usdaQueries.forEach(function (q, i) {
                const u = rows[i];
                if (u && u.calories != null) {
                    resolved.push({
                        id: 'usda_' + i,
                        name: q.name_zh || u.description || q.name_en,
                        en: u.description || q.name_en,
                        grams: q.grams,
                        calories: Math.round(Number(u.calories) || 0),
                        protein_g: roundFoodMacro(u.protein_g),
                        carbs_g: roundFoodMacro(u.carbs_g),
                        fat_g: roundFoodMacro(u.fat_g),
                        fiber_g: roundFoodMacro(u.fiber_g),
                        sodium_mg: Math.round(Number(u.sodium_mg) || 0),
                        source: 'usda-sr',
                        cooking: q.cooking,
                        stir_fry: q.is_stir_fry,
                        portion: q.grams + ' g',
                        fromVision: q.name_zh || q.name_en
                    });
                } else {
                    resolved.push(fallbackUnknownItem(q));
                }
            });
        } catch (e) {
            usdaQueries.forEach(function (q) { resolved.push(fallbackUnknownItem(q)); });
        }
    } else {
        usdaQueries.forEach(function (q) { resolved.push(fallbackUnknownItem(q)); });
    }

    const mealName = String((analysis && analysis.meal_name) || '');
    const needsOil = !/漢堡|汉堡|burger|sandwich|三文治/.test(mealName) && (
        visionItems.some(itemLooksStirFry) ||
        resolved.some(function (it) { return it && it.stir_fry && it.dishId; }) ||
        /炒|乾炒|滑炒|爆炒/.test(mealName)
    );
    const spoons = resolveOilSpoons(oilMode, note, needsOil);
    if (spoons > 0) {
        const oil = wokOilKcal(spoons);
        resolved.push({
            id: 'wok_oil',
            name: '炒餸鑊油（' + spoons + ' 湯匙）',
            en: 'wok cooking oil',
            grams: oil.grams,
            calories: oil.calories,
            protein_g: 0,
            carbs_g: 0,
            fat_g: oil.fat_g,
            fiber_g: 0,
            sodium_mg: 0,
            source: 'fortify-oil',
            cooking: 'oil',
            stir_fry: true,
            portion: spoons + ' 湯匙（約 ' + oil.grams + ' g）',
            fortified: true
        });
    }

    const totals = resolved.reduce(function (acc, it) {
        acc.calories += Number(it.calories) || 0;
        acc.protein_g += Number(it.protein_g) || 0;
        acc.carbs_g += Number(it.carbs_g) || 0;
        acc.fat_g += Number(it.fat_g) || 0;
        return acc;
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    totals.calories = Math.round(totals.calories);
    totals.protein_g = roundFoodMacro(totals.protein_g);
    totals.carbs_g = roundFoodMacro(totals.carbs_g);
    totals.fat_g = roundFoodMacro(totals.fat_g);

    return {
        items: resolved,
        totals: totals,
        oilSpoons: spoons,
        needsOil: needsOil
    };
}

function fallbackUnknownItem(q) {
    return {
        id: 'unknown',
        name: q.name_zh || q.name_en || '未知名食物',
        en: q.name_en || '',
        grams: q.grams,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        source: 'unmatched',
        cooking: q.cooking,
        stir_fry: q.is_stir_fry,
        portion: (q.grams || 0) + ' g',
        unmatched: true
    };
}

function estimateItemGrams(raw) {
    const g = Number(raw.grams || raw.estimated_grams || 0);
    if (g > 5 && g < 3000) return Math.round(g);
    const portion = String(raw.portion || '');
    const m = portion.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (m) return Math.round(Number(m[1]));
    return 0;
}

function sourceLabel(src) {
    if (src === 'hk-cfs-fcd6') return '香港成分表第6版';
    if (src === 'usda-sr') return 'USDA';
    if (src === 'hk-local-recipe') return '本地組合';
    if (src === 'fortify-oil') return '炒餸加油';
    if (src === 'unmatched') return '未配對';
    return src || '';
}

function cameraScaleHint(camera) {
    if (!camera) return { ok: false, text: '未偵測到筷子／碗口。請用 45° 頂視再影，尺在畫面入面。' };
    const q = String(camera.scale_quality || '');
    const has = camera.has_chopsticks || camera.has_bowl_rim;
    if (q === 'good' && has) return { ok: true, text: '已用筷子／碗口作尺。' };
    if (has) return { ok: true, text: '見到尺，份量信心中等。' };
    return { ok: false, text: '相片缺少筷子或碗口，份量容易唔準。' };
}
