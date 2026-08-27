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
});

function uniqueHealthNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && !isNaN(v)) return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? String(v) : n;
}

function uniqueHealthWeighedAt(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && typeof XLSX !== 'undefined' && XLSX.SSF) {
        try {
            const parsed = XLSX.SSF.parse_date_code(v);
            if (parsed) {
                const p = function (n) { return String(n).padStart(2, '0'); };
                return parsed.y + '-' + p(parsed.m) + '-' + p(parsed.d) + ' ' +
                    p(parsed.H) + ':' + p(parsed.M) + ':' + p(Math.floor(parsed.S || 0));
            }
        } catch (e) {}
    }
    const s = String(v).trim().replace('T', ' ');
    return s.length >= 19 ? s.slice(0, 19) : s;
}

function parseUniqueHealthObjects(rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.map(function (row) {
        const rec = { source: 'unique-health', metrics: {} };
        Object.keys(row).forEach(function (header) {
            const raw = row[header];
            rec.metrics[header] = raw;
            const field = UNIQUE_HEALTH_HEADER_MAP[header];
            if (!field) return;
            rec[field.key] = field.key === 'weighedAt' || field.key === 'deviceMac' || field.key === 'bodyType'
                ? (field.key === 'weighedAt' ? uniqueHealthWeighedAt(raw) : (raw == null ? '' : String(raw)))
                : uniqueHealthNum(raw);
        });
        const at = rec.weighedAt || '';
        rec.date = at.slice(0, 10);
        rec.time = at.slice(11, 19);
        rec.id = 'uh_' + at.replace(/[^\d]/g, '');
        rec.weight = rec.weight != null ? Number(rec.weight) : null;
        rec.bf = rec.bf != null ? Number(rec.bf) : null;
        return rec;
    }).filter(function (r) { return r.date && (r.weight || r.bf); });
}

function parseUniqueHealthWorkbook(wb) {
    const name = (wb.SheetNames || []).find(function (n) { return String(n).indexOf('身體') >= 0; }) || wb.SheetNames[0];
    const sheet = wb.Sheets[name];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    return parseUniqueHealthObjects(rows);
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
            const wb = XLSX.read(data, { type: 'array', cellDates: true });
            const incoming = parseUniqueHealthWorkbook(wb);
            if (!incoming.length) {
                if (typeof showToast === 'function') showToast('檔案冇有效量度（要有稱重時間同體重／體脂）');
                return;
            }
            mergeUniqueHealthRecords(incoming);
            if (typeof showToast === 'function') showToast('已匯入 ' + incoming.length + ' 筆 Unique Health 全部欄位');
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('匯入失敗，請用 Unique Health 匯出嘅 xlsx');
        }
    };
    reader.readAsArrayBuffer(file);
}

function mergeUniqueHealthRecords(incoming) {
    const list = getBodyLog();
    const byId = {};
    list.forEach(function (e) {
        const id = e.id || ((e.weighedAt || (e.date + ' ' + (e.time || ''))).replace(/[^\d]/g, ''));
        byId[e.id || ('x_' + id)] = e;
    });
    incoming.forEach(function (rec) {
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
    if (typeof renderOverviewDashboard === 'function') renderOverviewDashboard();
}

function uniqueHealthFieldLabel(key) {
    const f = UNIQUE_HEALTH_FIELDS.find(function (x) { return x.key === key; });
    return f ? f.label : key;
}

function formatBodyMetric(key, val) {
    if (val == null || val === '') return '—';
    if (typeof val !== 'number') return String(val);
    const pct = /Pct$|bf|bmi|whr|smi/.test(key);
    const kg = /Kg$|weight/.test(key);
    if (key === 'weight' || key === 'bf') {
        return key === 'bf' ? val.toFixed(1) + '%' : val.toFixed(2) + ' kg';
    }
    if (key === 'heartRate') return Math.round(val) + ' bpm';
    if (key === 'bmr') return Math.round(val) + ' kcal';
    if (key === 'visceral' || key === 'bodyAge' || key === 'bodyScore' || key === 'age') return String(val);
    if (pct) return (Math.abs(val) >= 100 ? val.toFixed(1) : val.toFixed(1)) + '%';
    if (kg) return val.toFixed(2) + ' kg';
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 100) / 100);
}
