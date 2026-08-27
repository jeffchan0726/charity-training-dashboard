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
        if (!map) return { used: false, note: '\u6df1\u5ea6\u6a21\u578b\u672a\u80fd\u8f09\u5165' };
        return {
            used: true,
            note: '\u5df2\u7528 MiDaS \u76f8\u5c0d\u6df1\u5ea6\u8f14\u52a9\u4efd\u91cf\uff08\u5be6\u9a57\uff09',
            relativeHeight: map.relativeHeight
        };
    } catch (e) {
        console.warn('[calories] MiDaS failed', e);
        return { used: false, note: '\u6df1\u5ea6\u8f14\u52a9\u5931\u6557\uff0c\u8acb\u6539\u7528\u6709\u7b77\u5b50\uff0f\u7897\u53e3\u5605 45\u00b0 \u76f8' };
    }
}
