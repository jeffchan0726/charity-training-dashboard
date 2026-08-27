// Unique Health / Unique Scale Excel（身體數據）→ 身體日誌

const UNIQUE_HEALTH_FIELDS = [
    { key: 'heightCm', header: '身高（cm）', label: '身高' },
    { key: 'age', header: '年齡（歲）', label: '年齡' },
    { key: 'weighedAt', header: '稱重時間', label: '稱重時間' },
    { key: 'weight', header: '體重（kg）(kg)', label: '體重' },
    { key: 'bf', header: '體脂率（%）', label: '體脂率' },
    { key: 'deviceMac', header: '設備mac', label: '設備' },
    { key: 'mineralKg', header: '礦物質量（Kg）(kg)', label: '礦物質量' },
    { key: 'obesityPct', header: '肥胖度（%）', label: '肥胖度' },
    { key: 'waterKg', header: '水分量（kg）(kg)', label: '水分量' },
    { key: 'proteinKg', header: '蛋白質含量（kg）(kg)', label: '蛋白質含量' },
    { key: 'subFatKg', header: '皮下脂肪量（kg）(kg)', label: '皮下脂肪量' },
    { key: 'bmi', header: 'BMI', label: 'BMI' },
    { key: 'fatKg', header: '脂肪量（kg）(kg)', label: '脂肪量' },
    { key: 'musclePct', header: '肌肉率（%）', label: '肌肉率' },
    { key: 'muscleKg', header: '肌肉量（kg）(kg)', label: '肌肉量' },
    { key: 'visceral', header: '內臟脂肪等級', label: '內臟脂肪' },
    { key: 'bmr', header: 'BMR', label: '基礎代謝' },
    { key: 'waterPct', header: '體水分率（%）', label: '體水分率' },
    { key: 'boneKg', header: '骨量（kg）(kg)', label: '骨量' },
    { key: 'proteinPct', header: '內蛋白質率（%）', label: '蛋白質率' },
    { key: 'smmPct', header: '骨骼肌率（%）', label: '骨骼肌率' },
    { key: 'lbmKg', header: '去脂體重（kg）(kg)', label: '去脂體重' },
    { key: 'heartRate', header: '心率（次/min）', label: '心率' },
    { key: 'bodyScore', header: '身體得分', label: '身體得分' },
    { key: 'bodyType', header: '身體類型', label: '身體類型' },
    { key: 'bodyAge', header: '身體年齡', label: '身體年齡' },
    { key: 'subFatPct', header: '皮下脂肪率', label: '皮下脂肪率' },
    { key: 'healthLevel', header: '健康等級', label: '健康等級' },
    { key: 'obesityLevel', header: '肥胖等級', label: '肥胖等級' },
    { key: 'fatControlKg', header: '脂肪控制量(kg)', label: '脂肪控制量' },
    { key: 'weightControlKg', header: '體重控制量(kg)', label: '體重控制量' },
    { key: 'muscleControlKg', header: '肌肉控制量(kg)', label: '肌肉控制量' },
    { key: 'standardWeightKg', header: '標準體重(kg)', label: '標準體重' },
    { key: 'idealWeightKg', header: '理想體重(kg)', label: '理想體重' },
    { key: 'bodyCellKg', header: '身體細胞量（kg）(kg)', label: '身體細胞量' },
    { key: 'ecwKg', header: '細胞外水量（kg）(kg)', label: '細胞外水量' },
    { key: 'icwKg', header: '細胞內水量（kg）(kg)', label: '細胞內水量' },
    { key: 'fatKgLeftArm', header: '左臂脂肪量（kg）(kg)', label: '左臂脂肪量' },
    { key: 'fatKgLeftLeg', header: '左腿脂肪量（kg）(kg)', label: '左腿脂肪量' },
    { key: 'fatKgRightArm', header: '右臂脂肪量（kg）(kg)', label: '右臂脂肪量' },
    { key: 'fatKgRightLeg', header: '右腿脂肪量（kg）(kg)', label: '右腿脂肪量' },
    { key: 'fatKgTrunk', header: '軀幹脂肪量（kg）(kg)', label: '軀幹脂肪量' },
    { key: 'fatPctLeftArm', header: '左臂脂肪率（%）', label: '左臂脂肪率' },
    { key: 'fatPctLeftLeg', header: '左腿脂肪率（%）', label: '左腿脂肪率' },
    { key: 'fatPctRightArm', header: '右臂脂肪率（%）', label: '右臂脂肪率' },
    { key: 'fatPctRightLeg', header: '右腿脂肪率（%）', label: '右腿脂肪率' },
    { key: 'fatPctTrunk', header: '軀幹脂肪率（%）', label: '軀幹脂肪率' },
    { key: 'muscleKgLeftArm', header: '左臂肌肉量（kg）(kg)', label: '左臂肌肉量' },
    { key: 'muscleKgLeftLeg', header: '左腿肌肉量（kg）(kg)', label: '左腿肌肉量' },
    { key: 'muscleKgRightArm', header: '右臂肌肉量（kg）(kg)', label: '右臂肌肉量' },
    { key: 'muscleKgRightLeg', header: '右腿肌肉量（kg）(kg)', label: '右腿肌肉量' },
    { key: 'muscleKgTrunk', header: '軀幹肌肉量（kg）(kg)', label: '軀幹肌肉量' },
    { key: 'smi', header: '骨骼肌質量指數', label: '骨骼肌質量指數' },
    { key: 'whr', header: '腰臀比', label: '腰臀比' },
    { key: 'musclePctLeftArm', header: '左手肌肉率', label: '左手肌肉率' },
    { key: 'musclePctLeftLeg', header: '左腿肌肉率', label: '左腿肌肉率' },
    { key: 'musclePctRightArm', header: '右手肌肉率', label: '右手肌肉率' },
    { key: 'musclePctRightLeg', header: '右腳肌肉率', label: '右腳肌肉率' },
    { key: 'musclePctTrunk', header: '軀幹肌肉率', label: '軀幹肌肉率' },
    { key: 'smmKg', header: '骨骼肌量(Kg)(kg)', label: '骨骼肌量' }
];

const UNIQUE_HEALTH_PRIMARY = [
    'weight', 'bf', 'bmi', 'muscleKg', 'musclePct', 'smmKg', 'fatKg',
    'visceral', 'bmr', 'bodyScore', 'waterPct', 'waterKg', 'proteinKg',
    'boneKg', 'lbmKg', 'heartRate', 'bodyAge', 'whr'
];

const UNIQUE_HEALTH_HEADER_MAP = {};
UNIQUE_HEALTH_FIELDS.forEach(function (f) {
    UNIQUE_HEALTH_HEADER_MAP[f.header] = f;
    UNIQUE_HEALTH_HEADER_MAP[normalizeUniqueHeader(f.header)] = f;
});

function normalizeUniqueHeader(h) {
    return String(h || '')
        .replace(/^\uFEFF/, '')
        .replace(/\s+/g, '')
        .replace(/[（(]/g, '(')
        .replace(/[）)]/g, ')')
        .replace(/\(kg\)|\(cm\)|kg|cm|％|%/gi, '')
        .replace(/次\/min/gi, '')
        .toLowerCase();
}

function matchUniqueHealthField(header) {
    if (!header) return null;
    if (UNIQUE_HEALTH_HEADER_MAP[header]) return UNIQUE_HEALTH_HEADER_MAP[header];
    const n = normalizeUniqueHeader(header);
    if (UNIQUE_HEALTH_HEADER_MAP[n]) return UNIQUE_HEALTH_HEADER_MAP[n];

    const rules = [
        { key: 'weighedAt', tests: ['稱重時間', '称重时间', '測量時間', '测量时间', '稱重', '称重'] },
        { key: 'bf', tests: ['體脂率', '体脂率', '體脂', '体脂'] },
        { key: 'weight', tests: ['體重', '体重'], skip: ['標準', '标准', '理想', '控制', '去脂'] },
        { key: 'bmi', tests: ['bmi'] },
        { key: 'muscleKg', tests: ['肌肉量'], skip: ['左', '右', '軀', '躯', '手', '腳', '脚', '腿', '臂'] },
        { key: 'musclePct', tests: ['肌肉率'], skip: ['左', '右', '軀', '躯', '手', '腳', '脚', '腿', '臂', '骨骼'] },
        { key: 'smmKg', tests: ['骨骼肌量'] },
        { key: 'smmPct', tests: ['骨骼肌率'] },
        { key: 'visceral', tests: ['內臟脂肪', '内脏脂肪'] },
        { key: 'bmr', tests: ['bmr', '基礎代謝', '基础代谢'] },
        { key: 'waterPct', tests: ['體水分率', '体水分率'] },
        { key: 'waterKg', tests: ['水分量'] },
        { key: 'fatKg', tests: ['脂肪量'], skip: ['皮下', '左', '右', '軀', '躯', '控制'] },
        { key: 'heartRate', tests: ['心率'] },
        { key: 'bodyScore', tests: ['身體得分', '身体得分'] },
        { key: 'heightCm', tests: ['身高'] },
        { key: 'age', tests: ['年齡', '年龄'] }
    ];
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const skip = rule.skip && rule.skip.some(function (s) { return header.indexOf(s) >= 0; });
        if (skip) continue;
        if (rule.tests.some(function (t) { return n.indexOf(normalizeUniqueHeader(t)) >= 0 || header.indexOf(t) >= 0; })) {
            return UNIQUE_HEALTH_FIELDS.find(function (f) { return f.key === rule.key; }) || { key: rule.key, label: rule.key };
        }
    }
    return UNIQUE_HEALTH_FIELDS.find(function (f) {
        return n === normalizeUniqueHeader(f.header) || n.indexOf(normalizeUniqueHeader(f.label)) >= 0;
    }) || null;
}

function uniqueHealthNum(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    if (typeof v === 'number' && !isNaN(v)) return v;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? null : n;
}

function uniqueHealthWeighedAt(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v.getTime())) {
        const p = function (n) { return String(n).padStart(2, '0'); };
        return v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate()) + ' ' +
            p(v.getHours()) + ':' + p(v.getMinutes()) + ':' + p(v.getSeconds());
    }
    if (typeof v === 'number' && v > 20000 && v < 80000 && typeof XLSX !== 'undefined' && XLSX.SSF) {
        try {
            const parsed = XLSX.SSF.parse_date_code(v);
            if (parsed) {
                const p = function (n) { return String(n).padStart(2, '0'); };
                return parsed.y + '-' + p(parsed.m) + '-' + p(parsed.d) + ' ' +
                    p(parsed.H || 0) + ':' + p(parsed.M || 0) + ':' + p(Math.floor(parsed.S || 0));
            }
        } catch (e) {}
    }
    const s = String(v).trim().replace('T', ' ').replace(/\//g, '-');
    const m = s.match(/(\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/);
    if (m) {
        const d = m[1].split('-').map(function (x, i) { return i === 0 ? x : String(x).padStart(2, '0'); }).join('-');
        const t = (m[2] || '00:00:00');
        const tp = t.split(':').map(function (x) { return String(x).padStart(2, '0'); });
        while (tp.length < 3) tp.push('00');
        return d + ' ' + tp.join(':');
    }
    return s;
}

function parseUniqueHealthObjects(rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.map(function (row) {
        const rec = { source: 'unique-health', metrics: {} };
        Object.keys(row).forEach(function (header) {
            if (String(header).indexOf('__EMPTY') === 0) return;
            const raw = row[header];
            rec.metrics[header] = raw;
            const field = matchUniqueHealthField(header);
            if (!field) return;
            if (field.key === 'weighedAt') rec.weighedAt = uniqueHealthWeighedAt(raw);
            else if (field.key === 'deviceMac' || field.key === 'bodyType') rec[field.key] = raw == null ? '' : String(raw);
            else rec[field.key] = uniqueHealthNum(raw);
        });
        const at = rec.weighedAt || '';
        rec.date = (at.match(/^\d{4}-\d{2}-\d{2}/) || [])[0] || '';
        rec.time = at.slice(11, 19);
        rec.id = 'uh_' + at.replace(/[^\d]/g, '');
        if (rec.weight != null) rec.weight = Number(rec.weight);
        if (rec.bf != null) rec.bf = Number(rec.bf);
        if (isNaN(rec.weight)) rec.weight = null;
        if (isNaN(rec.bf)) rec.bf = null;
        return rec;
    }).filter(function (r) {
        const w = r.weight;
        const okWeight = w != null && w > 20 && w < 400;
        const okBf = r.bf != null && r.bf > 1 && r.bf < 80;
        return r.date && (okWeight || okBf);
    });
}

function uniqueHealthHeaderRowIndex(aoa) {
    const max = Math.min(aoa.length, 12);
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < max; i++) {
        const row = aoa[i] || [];
        let score = 0;
        row.forEach(function (cell) {
            const s = String(cell || '');
            if (/稱重|称重|測量時間|测量时间/.test(s)) score += 5;
            if (/體脂|体脂/.test(s)) score += 4;
            if (/體重|体重/.test(s)) score += 3;
            if (/BMI/i.test(s)) score += 1;
        });
        if (score > bestScore) {
            bestScore = score;
            best = i;
        }
    }
    return bestScore >= 5 ? best : (bestScore >= 3 ? best : 0);
}

function aoaToObjects(aoa) {
    const hi = uniqueHealthHeaderRowIndex(aoa);
    const headers = (aoa[hi] || []).map(function (h, i) { return String(h || '').trim() || ('col' + i); });
    const out = [];
    for (let r = hi + 1; r < aoa.length; r++) {
        const line = aoa[r] || [];
        if (!line.some(function (c) { return c !== '' && c != null; })) continue;
        const obj = {};
        headers.forEach(function (h, i) { obj[h] = line[i]; });
        out.push(obj);
    }
    return out;
}

function parseUniqueHealthWorkbook(wb) {
    if (!wb || !wb.SheetNames || !wb.SheetNames.length) return [];
    const names = wb.SheetNames.slice();
    names.sort(function (a, b) {
        const sa = /身體|身体|數據|数据/.test(a) ? 0 : 1;
        const sb = /身體|身体|數據|数据/.test(b) ? 0 : 1;
        return sa - sb;
    });
    let best = [];
    names.forEach(function (name) {
        const sheet = wb.Sheets[name];
        if (!sheet) return;
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        const rows = aoaToObjects(aoa);
        const parsed = parseUniqueHealthObjects(rows);
        if (parsed.length > best.length) best = parsed;
    });
    return best;
}

function decodeUniqueHealthText(buf) {
    const utf8 = new TextDecoder('utf-8').decode(buf);
    if (/稱重|称重|體重|体重|體脂|体脂/.test(utf8) && utf8.indexOf('\uFFFD') < 0) return utf8;
    const encodings = ['gbk', 'gb18030', 'big5'];
    for (let i = 0; i < encodings.length; i++) {
        try {
            const t = new TextDecoder(encodings[i]).decode(buf);
            if (/稱重|称重|體重|体重|體脂|体脂/.test(t)) return t;
        } catch (e) {}
    }
    return utf8;
}

function parseUniqueHealthBuffer(buf) {
    if (typeof XLSX === 'undefined') return [];
    const attempts = [];
    try { attempts.push(XLSX.read(buf, { type: 'array', cellDates: true })); } catch (e) {}
    try { attempts.push(XLSX.read(buf, { type: 'array' })); } catch (e) {}
    try {
        const text = decodeUniqueHealthText(buf);
        attempts.push(XLSX.read(text, { type: 'string' }));
    } catch (e) {}
    let best = [];
    attempts.forEach(function (wb) {
        const parsed = parseUniqueHealthWorkbook(wb);
        if (parsed.length > best.length) best = parsed;
    });
    return best;
}

function triggerUniqueHealthImport() {
    const el = document.getElementById('unique-health-file');
    if (el) el.click();
}

function onUniqueHealthFile(ev) {
    const file = ev && ev.target && ev.target.files && ev.target.files[0];
    if (ev && ev.target) ev.target.value = '';
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        if (typeof showToast === 'function') showToast('匯入元件未載入，請重新整理');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const incoming = parseUniqueHealthBuffer(data);
            if (!incoming.length) {
                if (typeof showToast === 'function') showToast('認唔到 Unique Health 欄位。請用 App 入面「匯出 Excel／身體數據」嗰個 xlsx');
                return;
            }
            mergeUniqueHealthRecords(incoming);
            if (typeof showToast === 'function') showToast('已匯入本機 ' + incoming.length + ' 筆 Unique Health 紀錄');
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('匯入失敗，請用 Unique Health 匯出嘅 xlsx');
        }
    };
    reader.readAsArrayBuffer(file);
}

function mergeUniqueHealthRecords(incoming, options) {
    options = options || {};
    const list = getBodyLog();
    const byId = {};
    list.forEach(function (e) {
        const id = e.id || ((e.weighedAt || (e.date + ' ' + (e.time || ''))).replace(/[^\d]/g, ''));
        byId[e.id || ('x_' + id)] = e;
    });
    incoming.forEach(function (rec) {
        if (!rec) return;
        if (!rec.id) rec.id = 'uh_' + String(rec.weighedAt || rec.date || '').replace(/[^\d]/g, '');
        byId[rec.id] = rec;
    });
    const merged = Object.keys(byId).map(function (k) { return byId[k]; });
    merged.sort(function (a, b) {
        return String(b.weighedAt || b.date || '').localeCompare(String(a.weighedAt || a.date || ''));
    });
    localStorage.setItem(getAppStorageKey('bodyLog'), JSON.stringify(merged.slice(0, 365)));
    const latest = merged[0];
    if (latest && latest.weight) {
        if (typeof rememberBodyWeightKg === 'function') rememberBodyWeightKg(latest.weight);
        else lastBodyWeightKg = latest.weight;
    }
    renderBodyLog();
    if (typeof applyAutoProteinGoal === 'function') applyAutoProteinGoal();
    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
    if (options.sync !== false) syncBodyLogToSheet(incoming);
}

function isBodyLogUserLoggedIn() {
    return typeof currentUser !== 'undefined' && !!currentUser;
}

function syncBodyLogToSheet(entries) {
    if (!entries || !entries.length) return;
    if (!isBodyLogUserLoggedIn() || typeof callAppsScript !== 'function') {
        if (typeof showToast === 'function') showToast('已存本機。登入後先至寫入 Google Sheet');
        return;
    }
    const payload = entries.map(function (e) {
        return {
            id: e.id,
            weighedAt: e.weighedAt,
            date: e.date,
            time: e.time,
            source: e.source,
            weight: e.weight,
            bf: e.bf,
            createdAt: e.createdAt || Date.now(),
            record: e
        };
    });
    callAppsScript('saveBodyLogEntries', { entries: payload }).then(function (res) {
        if (res && res.status === 'error') {
            if (typeof showToast === 'function') {
                showToast('Google Sheet 未能寫入：' + (res.message || '請重新部署 Apps Script'));
            }
            return;
        }
        if (typeof showToast === 'function') {
            showToast('已寫入 Google Sheet（' + (res.saved || entries.length) + ' 筆身體數據）');
        }
    }).catch(function () {
        if (typeof showToast === 'function') showToast('Google Sheet 未能寫入，本機紀錄仍然保留');
    });
}

function loadBodyLogsFromSheet() {
    if (!isBodyLogUserLoggedIn() || typeof callAppsScript !== 'function') return;
    callAppsScript('getBodyLogs', {}).then(function (res) {
        if (!res || res.status === 'error' || !Array.isArray(res.entries)) return;
        mergeUniqueHealthRecords(res.entries, { sync: false });
    }).catch(function () {});
}

function uniqueHealthFieldLabel(key) {
    const f = UNIQUE_HEALTH_FIELDS.find(function (x) { return x.key === key; });
    return f ? f.label : key;
}

function formatBodyMetric(key, val) {
    if (val == null || val === '') return '—';
    if (typeof val !== 'number') return String(val);
    if (key === 'bf') return val.toFixed(1) + '%';
    if (key === 'weight') return val.toFixed(2) + ' kg';
    if (key === 'heartRate') return Math.round(val) + ' bpm';
    if (key === 'bmr') return Math.round(val) + ' kcal';
    if (key === 'bmi') return val.toFixed(1);
    if (key === 'whr' || key === 'smi') return val.toFixed(2);
    if (key === 'visceral' || key === 'bodyAge' || key === 'bodyScore' || key === 'age' ||
        key === 'healthLevel' || key === 'obesityLevel' || key === 'bodyType') {
        return String(val);
    }
    if (/Pct$/i.test(key) || key === 'obesityPct' || key === 'subFatPct') return val.toFixed(1) + '%';
    if (/Kg/i.test(key)) return val.toFixed(2) + ' kg';
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 100) / 100);
}

const BODY_LOG_SECTIONS = [
    { title: '基本', keys: ['weight', 'bf', 'bmi', 'lbmKg', 'bodyScore', 'bodyAge', 'heartRate', 'heightCm', 'age'] },
    { title: '體成分', keys: ['muscleKg', 'musclePct', 'smmKg', 'smmPct', 'fatKg', 'visceral', 'waterKg', 'waterPct', 'proteinKg', 'proteinPct', 'boneKg', 'mineralKg', 'subFatKg', 'subFatPct'] },
    { title: '代謝／控制', keys: ['bmr', 'obesityPct', 'fatControlKg', 'weightControlKg', 'muscleControlKg', 'standardWeightKg', 'idealWeightKg', 'bodyCellKg', 'ecwKg', 'icwKg', 'healthLevel', 'obesityLevel', 'bodyType', 'smi', 'whr'] },
    { title: '分段脂肪', keys: ['fatKgLeftArm', 'fatKgRightArm', 'fatKgLeftLeg', 'fatKgRightLeg', 'fatKgTrunk', 'fatPctLeftArm', 'fatPctRightArm', 'fatPctLeftLeg', 'fatPctRightLeg', 'fatPctTrunk'] },
    { title: '分段肌肉', keys: ['muscleKgLeftArm', 'muscleKgRightArm', 'muscleKgLeftLeg', 'muscleKgRightLeg', 'muscleKgTrunk', 'musclePctLeftArm', 'musclePctRightArm', 'musclePctLeftLeg', 'musclePctRightLeg', 'musclePctTrunk'] }
];
