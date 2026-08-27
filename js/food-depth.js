// js/food-depth.js
// 可選 MiDaS 深度：冇筷子／碗口先開。手機下載模型會慢，失敗就提示再影。

let calorieDepthModelPromise = null;

function isCalorieDepthEnabled() {
    const el = document.getElementById('calorie-depth-toggle');
    return !!(el && el.checked);
}

async function maybeRunCalorieDepth(imageDataUrl, camera) {
    const missingScale = !(camera && (camera.has_chopsticks || camera.has_bowl_rim) && camera.scale_quality === 'good');
    if (!isCalorieDepthEnabled() || !missingScale || !imageDataUrl) {
        return { used: false, note: '' };
    }
    try {
        const map = await runMidasDepth(imageDataUrl);
        if (!map) return { used: false, note: '深度模型未能載入' };
        return {
            used: true,
            note: '已用 MiDaS 相對深度輔助份量（實驗）',
            relativeHeight: map.relativeHeight
        };
    } catch (e) {
        console.warn('[calories] MiDaS failed', e);
        return { used: false, note: '深度輔助失敗，請改用有筷子／碗口嘅 45° 相' };
    }
}

function applyDepthToGrams(items, depthResult) {
    if (!depthResult || !depthResult.used || !depthResult.relativeHeight) return items;
    const h = depthResult.relativeHeight;
    // 碗裝食物：相對高度高 → 份量略增；扁碟 → 略減
    const factor = h > 0.55 ? 1.12 : (h < 0.35 ? 0.9 : 1);
    return (items || []).map(function (it) {
        if (!it || it.fortified || it.cooking === 'drink' || it.cooking === 'oil') return it;
        const g = Math.round((Number(it.grams) || 0) * factor);
        if (g <= 0 || !it.grams) return it;
        const scale = g / it.grams;
        return Object.assign({}, it, {
            grams: g,
            calories: Math.round((Number(it.calories) || 0) * scale),
            protein_g: roundFoodMacro((Number(it.protein_g) || 0) * scale),
            carbs_g: roundFoodMacro((Number(it.carbs_g) || 0) * scale),
            fat_g: roundFoodMacro((Number(it.fat_g) || 0) * scale),
            portion: g + ' g'
        });
    });
}

async function runMidasDepth(dataUrl) {
    const pipeline = await loadTransformersPipeline();
    if (!pipeline) return null;
    const img = await dataUrlToImage(dataUrl);
    const out = await pipeline(img);
    const pred = out && (out.predicted_depth || out.depth || out);
    if (!pred) return null;
    let values = pred.data || pred;
    if (!values || !values.length) return null;
    let sum = 0;
    const n = values.length;
    const inner = [];
    // 中央 40% 當食物區
    const w = pred.width || Math.round(Math.sqrt(n));
    const h = pred.height || (n / w);
    for (let y = Math.floor(h * 0.3); y < Math.floor(h * 0.7); y++) {
        for (let x = Math.floor(w * 0.3); x < Math.floor(w * 0.7); x++) {
            inner.push(Number(values[y * w + x]) || 0);
        }
    }
    const arr = inner.length ? inner : Array.from(values).map(Number);
    arr.forEach(function (v) { sum += v; });
    const mean = sum / arr.length;
    let min = Infinity;
    let max = -Infinity;
    arr.forEach(function (v) {
        if (v < min) min = v;
        if (v > max) max = v;
    });
    const relativeHeight = (max - min) > 0 ? (mean - min) / (max - min) : 0.5;
    return { relativeHeight: relativeHeight };
}

async function loadTransformersPipeline() {
    if (calorieDepthModelPromise) return calorieDepthModelPromise;
    calorieDepthModelPromise = (async function () {
        const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        if (mod.env) {
            mod.env.allowLocalModels = false;
        }
        return await mod.pipeline('depth-estimation', 'Xenova/dpt-hybrid-midas');
    })();
    try {
        return await calorieDepthModelPromise;
    } catch (e) {
        calorieDepthModelPromise = null;
        throw e;
    }
}

function dataUrlToImage(dataUrl) {
    return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('depth image load failed')); };
        img.src = dataUrl;
    });
}
