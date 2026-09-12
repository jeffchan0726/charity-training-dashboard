// js/lazy-libs.js — Chart.js / SheetJS 只在需要時載入
(function (global) {
    var version = global.APP_ASSET_VERSION || '2.4.1';
    var loading = {};

    function loadScriptOnce(src, flag) {
        if (global[flag]) return Promise.resolve();
        if (loading[src]) return loading[src];
        loading[src] = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + version;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
        });
        return loading[src];
    }

    global.ensureChartJs = function () {
        if (typeof Chart !== 'undefined') return Promise.resolve();
        return loadScriptOnce('lib/chart.umd.min.js', 'Chart').then(function () {
            if (typeof Chart === 'undefined') throw new Error('Chart.js 未載入');
        });
    };

    global.ensureXlsx = function () {
        if (typeof XLSX !== 'undefined') return Promise.resolve();
        return loadScriptOnce('lib/xlsx.full.min.js', 'XLSX').then(function () {
            if (typeof XLSX === 'undefined') throw new Error('xlsx 未載入');
        });
    };
})(window);
