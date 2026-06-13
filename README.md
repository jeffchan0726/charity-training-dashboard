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
│   └── ui-analysis.js         # 分析頁 (per-exercise analysis, charts, overall stats, insights)
├── css/
│   ├── input.css              # Tailwind 來源
│   └── tailwind.css           # 生產 build 輸出（必須執行 build）
├── tailwind.config.js
├── images/                    # 運動示範照片
├── Google_Apps_Script.txt     # 後端完整程式碼（部署到 Google Apps Script）
├── .gitignore
└── README.md
```

**注意**：這是進行中的架構重構（Option A）。目標是逐步將巨型單檔拆成模組，減少 global，方便維護。UI render 已大量抽取到 js/ui-*.js（data → utils → state → api → fullscreen → ui → ui-log → ui-history → ui-calendar → ui-workoutsets → ui-library → ui-analysis）。script 按依賴順序載入。主 script 仍保留 init、事件、剩餘 glue 邏輯。

## 完全新手專用：一步一步教你整 GitHub + 上線（超詳細版）

如果你係**完全新手**，完全冇用過 GitHub、Git、Google Apps Script，請跟以下步驟慢慢嚟。每一步我都會盡量講到最清楚。

**重要提示**：
- 你而家嘅資料夾係 `D:\Myweb\recomp-challenge`（或者你自己放嘅位置）。
- 整完之後，你嘅網頁可以免費上網畀人用（用 GitHub Pages）。
- 但登入同雲端儲存**一定要部署後端**，否則只係本地版。

---

### 第一部分：建立 GitHub 帳號（如果你冇帳號）

1. 打開瀏覽器，輸入 `github.com`
2. 點右上角 **Sign up**
3. 輸入你嘅電郵地址
4. 建立密碼
5. 輸入用戶名（例如 `jeff-recomp-log`）
6. 完成驗證（會有 email 嚟，要 click 入面嘅連結）
7. 之後會問你幾個問題，隨便揀都得
8. 最後會見到你嘅 GitHub 主頁

---

### 第二部分：建立一個新 Repo（儲存庫）

1. 登入 GitHub 後，點右上角嘅 **+** 號 → **New repository**
2. Repository name：輸入一個容易記嘅名字，例如 `recomp-challenge` 或 `jeff-fitness-log`
3. Description（可選）：`Jeff 減脂 Recomp 訓練記錄 App`
4. **Visibility**：選 **Public**（公開）或 Private（私人）
5. **重要**：下面有幾個框：
   - **Add a README file** → **唔好勾**（因為我哋之後會自己上傳）
   - **Add .gitignore** → 選 **None**
   - **Choose a license** → 可選或 None
6. 最後按綠色大按鈕 **Create repository**

建立完成後，你會見到一個空白頁面，上面會有好多指示。

---

### 第三部分：準備你嘅本地檔案（最重要嘅安全步驟）

打開你嘅 `recomp-challenge` 資料夾（用檔案總管）：

**一定要檢查以下幾樣嘢：**

1. **paycode.png** — 呢個係你自己嘅收款二維碼，**千祈唔好上傳去 GitHub**！
   - .gitignore 已經幫你忽略咗，但如果你用網頁上傳，要**手動唔好拖佢入去**。

2. **images** 資料夾 — 確保入面有 18 張 .jpg 圖片（如果唔夠，Library 同動作詳情會冇圖）。

3. 打開 `index.html`（用記事本或 VS Code）：
   - 按 `Ctrl + F`，搜尋 `APPS_SCRIPT_URL`
   - 你會見到類似呢行：
     ```js
     const APPS_SCRIPT_URL = "https://script.google.com/macros/s/【請替換成你自己嘅ID】/exec";
     ```
   - 暫時留低，之後部署完後端先改（見下面）。

---

### 第四部分：上傳檔案到 GitHub（兩種方法，選一種）

#### 方法 A：最簡單（完全新手推薦）—— 用 GitHub 網頁直接拖放上傳

1. 返去你個 GitHub repo 頁面（剛建立嗰個）。
2. 喺中間空白位置，搵到藍色字 **uploading an existing file**，點擊佢。
   （或者上面有個按鈕 "Add file" → "Upload files"）
3. 現在會出現一個大框，話 "Drag files here"。
4. **正確做法**：
   - 用檔案總管打開 `recomp-challenge` 資料夾
   - **選取入面所有檔案同資料夾**（index.html、js 資料夾、css、images、Google_Apps_Script.txt、manifest.json、sw.js、tailwind.config.js、.gitignore、README.md）
   - **唔好選 paycode.png**
   - 直接拖去 GitHub 嘅大框入面
5. 下面會出現 "Commit changes" 區：
   - Commit message 寫：`Initial upload: Recomp Charity Workout Log`
   - 下面嗰個 "Commit directly to the main branch" 保持預設
6. 按綠色 **Commit changes**

等幾秒，檔案就全部上傳咗。

**優點**：唔使裝任何嘢  
**缺點**：之後改檔案要重複拖放

#### 方法 B：用 Git 指令上傳（學一次，用一世，推薦）

**步驟 1：安裝 Git**

1. 打開瀏覽器去 `https://git-scm.com/download/win`
2. 自動會下載 Git for Windows 安裝檔
3. 雙擊打開安裝程式：
   - 一直按 **Next**
   - 喺 "Choosing the default editor" 保持預設或選 "Use Notepad++"（如果你有）
   - 其他全部用預設設定就得
   - 最後按 **Install**，裝完按 **Finish**

**步驟 2：打開 PowerShell 去到你嘅資料夾**

1. 按 Windows 鍵，輸入 `PowerShell`，開 **Windows PowerShell**
2. 輸入以下指令，按 Enter（假設你嘅資料夾喺 D 碟）：

```powershell
cd D:\Myweb\recomp-challenge
```

（如果你放咗喺其他位置，例如 C 碟或桌面，就改路徑，例如 `cd C:\Users\你嘅用戶名\Desktop\recomp-challenge`）

輸入完按 Enter，應該會跳去你嘅資料夾。

**步驟 3：初始化 Git 並上傳**

喺 PowerShell 入面，一條一條輸入以下指令（每條輸入完按 Enter，等佢完成先輸入下一條）：

```powershell
# 1. 初始化 git（第一次先用）
git init

# 2. 加所有檔案（.gitignore 會自動忽略 paycode.png）
git add .

# 3. 檢查狀態（應該見到 paycode.png 冇出現）
git status

# 4. 建立第一次提交
git commit -m "Initial commit: Recomp Charity 模組化版本"

# 5. 連接你嘅 GitHub repo（改成你自己個 repo 網址）
git remote add origin https://github.com/你的用戶名/你建立嘅repo名稱.git

# 6. 改主要分支名為 main
git branch -M main

# 7. 上傳去 GitHub（第一次要加 -u）
git push -u origin main
```

**如果出現要登入嘅視窗**：
- 會彈出瀏覽器要你登入 GitHub
- 或者要你輸入用戶名同密碼（新版 Git 可能要用 Personal Access Token，Google "github personal access token" 跟教學整一個）

上傳成功後，你會見到 "Everything up-to-date" 或類似訊息。

---

### 第五部分：開啟 GitHub Pages（讓你嘅網頁有網址）

1. 返去 GitHub 你個 repo 頁面
2. 點擊上面 **Settings**（設定）
3. 左邊欄向下搵，點 **Pages**
4. 在 "Build and deployment" 區域：
   - Source 選 **Deploy from a branch**
   - Branch 選 **main**
   - Folder 選 **/ (root)**
5. 按右邊 **Save**
6. 下面會出現一條黃色或綠色訊息，話 "Your site is published at..."
7. 複製嗰個網址，例如：
   `https://你的用戶名.github.io/你嘅repo名稱/`

等 30 秒 ~ 2 分鐘，然後用瀏覽器打開呢個網址測試。

**注意**：第一次可能要等耐啲先見到內容。

---

### 第六部分：部署後端（Google Apps Script）—— 最關鍵一步

呢一步係**最難**但**必須做**，否則登入同儲存數據唔會去到雲端。

**前置**：
- 你要有 Google 帳號（Gmail 就得）
- 如果冇，喺 accounts.google.com 註冊一個

**詳細步驟**：

1. 打開 [Google Sheets](https://sheets.google.com)（sheets.google.com）
2. 點左上角 **空白**（建立新試算表）
3. 改個名：`Recomp_Workout_Data`
4. 喺上面選單，點 **擴充功能**（Extensions）→ **Apps Script**
5. 會開新分頁，入面係程式碼編輯器
6. 左邊所有程式碼**全部刪除**（Ctrl+A 然後 Delete）
7. 打開你電腦入面 `recomp-challenge` 資料夾嘅 `Google_Apps_Script.txt`
   - 用記事本開
   - 全選（Ctrl+A）→ 複製（Ctrl+C）
8. 返去 Apps Script 分頁，**貼上**（Ctrl+V）
9. 上面按藍色 **儲存** 圖示（或按 Ctrl+S），起個名例如 `RecompBackend`
10. 現在部署：
    - 右上角有個藍色 **部署** 按鈕 → 點 **新增部署作業**
    - 類型：選 **網頁應用程式**
    - 說明：可以打 "Recomp 後端"
    - **執行身份**：選 **我**
    - **存取對象**：選 **任何人（包括匿名）**
    - 按 **部署**
11. 第一次會彈出「需要授權」：
    - 點 **授權存取**
    - 選擇你嘅 Google 帳號
    - 下面會有「進階」→ 點「前往 RecompBackend（不安全）」
    - 點 **允許**
12. 授權完成後，會見到一個對話框，入面有 `/exec` 結尾嘅長網址。
    - **全部複製**（用滑鼠選取 → Ctrl+C）

---

### 第七部分：把後端網址放返去你嘅程式

1. 返去你電腦 `recomp-challenge` 資料夾
2. 用記事本或 VS Code 開 `index.html`
3. 按 `Ctrl + F`，搜尋 `APPS_SCRIPT_URL`
4. 將下面呢行改做你剛剛複製嘅網址：
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/你剛複製嘅長ID/exec";
   ```
5. 儲存檔案

**之後要上傳返 GitHub**：
- 如果你用網頁方法：再去 GitHub repo → Add file → Upload files，拖返新嘅 index.html
- 如果你用 Git 方法：再開 PowerShell，cd 到資料夾，然後：
  ```powershell
  git add .
  git commit -m "chore: 更新 APPS_SCRIPT_URL"
  git push
  ```

---

### 第八部分：測試

1. 去你嘅 GitHub Pages 網址（之前複製嗰個）
2. 試登入（用任何用戶名 + 4-6 位數字 PIN，例如 `test1234`）
3. 登入後試「開始新訓練」→ 加幾組重量同次數 → 按「完成訓練」
4. 去「Log」分頁 → Analysis，看有冇數據
5. 重新整理頁面，檢查數據仲喺度（證明去到雲端）

如果成功，恭喜！你已經有自己嘅免費訓練記錄網頁啦！

---

### 常見新手問題

- **上傳後見到 404 或空白頁**：確認你係上傳咗 `index.html` 喺最外層（root），唔係放喺子資料夾入面。
- **登入後冇反應或同步失敗**：後端 URL 冇正確更新，或者後端未重新部署。
- **圖片冇顯示**：images 資料夾冇成功上傳。
- **之後想改程式**：改完本地檔案，要再 upload 一次 + 如果改咗後端就要重新部署新版本。

---

有咩一步唔明，**截圖 + 講清楚你而家做到邊一步**，我再詳細教你。

之後如果你想，我可以再幫你喺 README 入面再加多啲截圖式說明，或者教你點樣用 GitHub Desktop（圖形介面，更易用）。

## GitHub 部署完整指南（推薦流程）

本項目係一個**純靜態 PWA**，可以免費用 GitHub Pages 即刻上線。但完整功能（登入 + 雲端同步）**必須**部署 Google Apps Script 後端。

### 步驟 0：上傳前重要準備（強烈建議）

1. **替換 APPS_SCRIPT_URL（最重要！）**
   - 打開 `index.html`，搜尋 `APPS_SCRIPT_URL`
   - 目前係一個真實 URL，**公開 repo 前必須改做 placeholder**：
     ```js
     const APPS_SCRIPT_URL = "https://script.google.com/macros/s/【你的ID】/exec"; // ← 之後改成你自己嘅
     ```
   - 或者暫時留空，之後再改（見下面步驟）。

2. 確保 `paycode.png` **唔會被 commit**（.gitignore 已經設定好）。

3. 確認 `images/` 資料夾入面有全部 18 張圖（Library 同 Analysis 靠佢哋）。

### 步驟 1：上傳到 GitHub

```bash
# 在 recomp-challenge 資料夾執行
git init
git add .
git status          # 檢查 paycode.png 是否顯示為 ignored（應該要）
git commit -m "feat: 模組化重構完成 + 完整功能 (js/ 12 模組 + PWA + 分析)"
git remote add origin https://github.com/你的用戶名/你的-repo-名稱.git
git branch -M main
git push -u origin main
```

**提示**：
- Windows PowerShell 用戶一樣可以用以上指令。
- 之後每次改 code，只需 `git add .` → `git commit -m "描述"` → `git push`

### 步驟 2：開啟 GitHub Pages（免費 Hosting）

1. 去你個 GitHub repo 頁面。
2. 點擊上方 **Settings** → 左邊欄搵 **Pages**。
3. 在 "Build and deployment"：
   - Source 選擇 **Deploy from a branch**
   - Branch 選擇 `main`
   - Folder 選擇 `/ (root)`
4. 按 **Save**。
5. 等 1–2 分鐘，下面會出現一個綠色連結，例如：
   `https://你的用戶名.github.io/你的-repo-名稱/`
6. 打開連結測試（建議用無痕模式或手機）。

**注意**：GitHub Pages 預設係 HTTPS，PWA 功能會正常運作。

### 步驟 3：部署 Google Apps Script 後端（必須做，否則冇登入同雲端同步）

1. 開一個**全新** Google Sheet，建議命名 `Recomp_Workout_Data`。
2. 選單：**擴充功能 → Apps Script**。
3. 刪除所有預設程式碼，把 `Google_Apps_Script.txt` **全部內容** 貼上。
4. 儲存專案（給個名稱例如 `RecompBackend`）。
5. 右上角按 **部署** → **新增部署作業**：
   - 類型選「網頁應用程式」
   - 執行身份：**我**
   - 存取對象：**任何人（包括匿名）**
6. 按「部署」，第一次會要授權（跟隨 Google 指示）。
7. 授權完成後，會見到 `/exec` 網址，**複製晒佢**。
8. 返到 `index.html`，搵 `APPS_SCRIPT_URL`，貼上你自己個網址。
9. **重要**：之後每次修改 `Google_Apps_Script.txt`，都要重新部署：
   - 部署 → 管理部署版本 → **新增版本** → 部署
   - 複製新 `/exec` 網址更新前端。

### 步驟 4：更新 Tailwind CSS（正式上線前）

雖然 `css/tailwind.css` 已經 commit 咗，但如果你改過 Tailwind class，最好 rebuild：

```bash
cd recomp-challenge
npx tailwindcss -i ./css/input.css -o ./css/tailwind.css --minify
```

之後 `git add css/tailwind.css && git commit -m "chore: rebuild tailwind" && git push`

### 步驟 5：本地測試（推薦上線前做）

```bash
cd recomp-challenge

# 方法一（最簡單）
python -m http.server 8000

# 方法二
npx serve .
```

然後瀏覽器打開 `http://localhost:8000`。

**測試重點**：
- 登入（用自己設定嘅 PIN）
- 開始訓練 + 加組數
- 完成訓練（檢查雲端有冇記錄）
- 去 Analysis 頁睇圖表
- 開 Library 睇動作圖片

### 常見問題 & 注意事項

- **登入失敗 / PIN 問題**：確保後端同前端都用最新版嘅 normalize 邏輯（PIN 永遠係字串）。
- **圖片唔顯示**：檢查 `images/` 有冇全部 18 張圖 + git 有冇 push 到。
- **同步失敗（顯示「稍後同步」）**：99% 係 `APPS_SCRIPT_URL` 冇更新或後端未重新部署新版本。
- **GitHub Pages 顯示舊版本**：等幾分鐘，或試 force refresh（Ctrl + Shift + R）。
- **PWA 安裝**：喺手機 Chrome / Safari 開 GitHub Pages 連結，應該會出現「安裝」提示。
- **每次改 code 都要重新 build Tailwind**？開發時可以用 CDN 臨時測試，上線前一定要 rebuild 一次。
- **想私人 repo**：一樣可以用以上流程，GitHub Pages 都支援私人 repo（但要付費 plan 先有 Pages）。

### 推薦 GitHub repo 設定

- 開啟 Issues（俾人回報問題）
- 加 Topics：`fitness` `workout-log` `pwa` `google-apps-script` `tailwind`
- 設定 License（例如 MIT）
- 喺 About 入面貼埋你個 GitHub Pages 連結

---

有問題歡迎聯絡。強烈建議跟足上方「GitHub 部署完整指南」操作。

## 重要修復：PIN Leading Zero

- 前端輸入欄位已改為 `type="text"` + `inputmode="numeric"` + `pattern`，並即時過濾只保留數字。
- JavaScript `normalizePin()` 永遠返回字串，絕不使用 parseInt。
- **後端 (GAS)**：寫入 Users 表時強制使用：
  ```js
  const pinCell = userSheet.getRange(row, 2);
  pinCell.setValue(String(cleanPin));   // 傳字串
  pinCell.setNumberFormat('@');         // 強制文字格式
  ```
- 比較時兩邊都做 `String(...).replace(/\D/g,'')`，確保 "0123" 可以正確登入。

> **部署相關完整教學**已整合到上方「GitHub 部署完整指南」一節。  
> 包括上傳 GitHub、開 GitHub Pages、部署後端、更新 APPS_SCRIPT_URL、rebuild Tailwind、本地測試、常見問題等。建議直接參考該節。

## 主要功能

- 用戶系統（用戶名 a-z0-9 + 4-6 位 PIN）
- 豐富 Workout Log（多組數、重量、註記、體積自動計算）
- 即時訓練模式（休息計時器已完全移除）
- 個人紀錄 (PR) 自動偵測與分析圖表
- 自訂訓練組合（Workout Sets），完全由用戶自訂 + Google Apps Script 雲端儲存
- 每用戶資料雲端儲存（GAS）

## 代碼質素筆記

- 前端大量內聯 JS + 樣式（適合單檔部署）。
- **進行中架構重構（A）**：已完整抽取 data/utils/state/api/fullscreen + 所有主要 UI 分組（log/history/calendar/workoutsets/library/analysis）到獨立 js/ui-*.js。script 載入順序正確，無重複定義，跨模組依賴靠 global state。主 script 只剩 init + 剩餘非 UI 邏輯。
- 已清理大量 [DEBUG] / [DATE DEBUG] console（B 大掃除方向）。
- 後端已移除不必要的 console.log，保留少量關鍵 debug。

## License

個人專案，歡迎參考修改。

---

有問題歡迎聯絡。記得執行 Tailwind build + 正確部署 GAS 後端。