// js/boot.js — 組裝 partials，再按順序載入 app scripts（GitHub Pages 相對路徑）
(function () {
    var VERSION = '2.4.16';
    var PARTIALS = [
        'partials/overview.html',
        'partials/schedule.html',
        'partials/supplement.html',
        'partials/training.html',
        'partials/millennium.html',
        'partials/me.html',
        'partials/calories.html',
        'partials/log.html',
        'partials/modals.html'
    ];
    var SCRIPTS = [
        'js/data.js',
        'js/exercise-gif-map.js',
        'js/utils.js',
        'js/state.js',
        'js/api.js',
        'js/lazy-libs.js',
        'js/fullscreen.js',
        'js/ui.js',
        'js/ui-log.js',
        'js/ui-history.js',
        'js/ui-calendar.js',
        'js/ui-workoutsets.js',
        'js/ui-library.js',
        'js/ui-analysis.js',
        'js/ui-yugong.js',
        'js/food-nutrition.js',
        'js/food-depth.js',
        'js/ui-calories.js',
        'js/unique-health.js',
        'js/ui-habits.js',
        'js/ui-app.js',
        'js/app-boot.js',
        'js/ui-mobile.js'
    ];

    function withV(url) {
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VERSION;
    }

    function loadScriptsInOrder(srcs) {
        return new Promise(function (resolve, reject) {
            var left = srcs.length;
            if (!left) { resolve(); return; }
            var failed = false;
            srcs.forEach(function (src) {
                var s = document.createElement('script');
                s.src = withV(src);
                s.async = false;
                s.onload = function () {
                    if (failed) return;
                    if (--left === 0) resolve();
                };
                s.onerror = function () {
                    if (failed) return;
                    failed = true;
                    reject(new Error('Failed to load ' + src));
                };
                document.body.appendChild(s);
            });
        });
    }

    function fetchText(url) {
        return fetch(withV(url)).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
            return res.text();
        });
    }

    function showBootError(err) {
        var el = document.getElementById('app-boot-error');
        if (!el) return;
        el.classList.remove('hidden');
        el.textContent = '畫面載入失敗，請重新整理。' + (err && err.message ? ' (' + err.message + ')' : '');
    }

    window.__appBoot = fetchText;
    window.APP_ASSET_VERSION = VERSION;

    Promise.all(PARTIALS.map(fetchText)).then(function (chunks) {
        var host = document.getElementById('app-panels');
        if (host) host.innerHTML = chunks.join('\n');
        return loadScriptsInOrder(SCRIPTS);
    }).then(function () {
        var splash = document.getElementById('app-boot-splash');
        if (splash) splash.classList.add('hidden');
        window.dispatchEvent(new Event('app-ready'));
    }).catch(function (err) {
        console.error(err);
        showBootError(err);
    });
})();
