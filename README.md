# Jeff 減脂 Recomp 挑戰 — 健身記錄 Web App

專業的個人健身 Workout Log 應用程式，支援豐富的即時訓練追蹤、PR 分析、個人化訓練組合，以及 Google Apps Script 雲端同步。

## 專案結構（GitHub 就緒）

```
recomp-challenge/
├── index.html                 # 主要應用（HTML + 剩餘核心邏輯 + init glue）
├── js/
│   ├── data.js                # EXERCISES, TRAINING_DAYS, categories, getExerciseByName 等
│   ├── utils.js               # 日期工具、storage、volume/1RM 計算、getAllExercisesFromHistory
│   ├── state.js               # 所有核心全域狀態 (current*, workoutHistory, charts, filters...)
│   ├── api.js                 # GAS 呼叫、background sync、loadWorkoutSets
│   ├── fullscreen.js          # 沉浸式訓練模式（enter/exit/toggleImmersiveTopCollapse）
│   ├── ui.js                  # 小型共用 UI helpers (updateSessionSummary, safeSetText...)
│   ├── ui-log.js              # 即時訓練 log UI (renderCurrentWorkout, add/delete/update sets)
│   ├── ui-history.js          # 歷史 + 編輯 (renderWorkoutHistory, history modals, delete)
│   ├── ui-calendar.js         # 月曆視圖 (renderCalendar, prev/nextMonth)
│   ├── ui-workoutsets.js      # 訓練組合 / 預設 (renderWorkoutSetsBar, edit sets, quick load)
│   ├── ui-library.js          # 動作庫 + 自訂動作 + expert tips (library modal, detail)
│   ├── ui-analysis.js         # 分析頁 (per-exercise analysis, charts, overall stats, insights)
│   ├── ui-calories.js         # 卡路里分析 UI
│   ├── food-db-hk.js          # 本地香港食物成分表第 6 版 + USDA 對照
│   ├── food-nutrition.js      # 配對、份量、炒餵加油、USDA 後備
│   └── food-depth.js          # 可選 MiDaS 深度輔助
├── css/
│   ├── input.css              # Tailwind 來源
│   └── tailwind.css           # 生產 build 輸出（必須執行 build）
├── tailwind.config.js
├── images/                    # 運動示範照片
├── Google_Apps_Script.txt     # 後端完整程式碼（部署到 Google Apps Script）
├── .gitignore
└── README.md
```

**注意**：這是進行中的架構重構（Option A）。目標是逐步將巨型單檔拆成模組，減少 global，方便維護。UI render 已大量抽取到 js/ui-*.js（data → utils → state → api → fullscreen → ui → … → food-db-hk → food-nutrition → food-depth → ui-calories）。script 按依賴順序載入。主 script 仍保留 init、事件、剩餘 glue 邏輯。

## 卡路里分析（食物影相）

流程：**Grok 認餵** → **本地香港食物成分表第 6 版**（中菜優先）→ 未匹配再查 **USDA API（免費）** → 炒／煎餵預設加 1–1.5 鍋湯勺油（約 240–360 kcal）。

影相：約 45° 頂視，筷子或碗口入鏡做尺。冇尺可選 MiDaS 深度輔助（實驗）。

1. 將最新 `Google_Apps_Script.txt` 貼去 Apps Script，**新增一個部署版本**。
2. 指令碼屬性：
   - `XAI_API_KEY`：Grok 認餵（必須，[console.x.ai](https://console.x.ai)）
   - 可選 `USDA_API_KEY`（[api.data.gov](https://api.data.gov)）；冇就用 DEMO_KEY
3. 登入 app 打開「卡路里分析」。相片只用於當次識別，唔會存去 Sheet。
