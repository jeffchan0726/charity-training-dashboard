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
    if (/漢堡|汉堡|burger|sandwich|三文治/.test(name)) return false;
    if (item.stir_fry || item.is_stir_fry) return true;
    const cooking = String(item.cooking || '').toLowerCase();
    if (cooking === 'stir_fry') return true;
    return /炒|乾炒|滑炒|爆炒/.test(name);
}
