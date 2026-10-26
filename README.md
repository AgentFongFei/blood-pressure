# 血壓紀錄網頁

輸入日期、姓名、最高血壓、最低血壓、心率並存到雲端資料庫（Firebase Firestore），
下方可選擇姓名與期間，看血壓與心率的折線圖，或用表格檢視、編輯、刪除紀錄。網頁放在 GitHub Pages，電腦關機也能使用。

## 第一次設定（約 10 分鐘）

### 1. 建立 Firebase 專案
1. 到 <https://console.firebase.google.com/> 用 Google 帳號登入，按「建立專案」，名稱隨意（例如 `bp-record`），Google Analytics 可以關掉。
2. 左側「資料庫和儲存空間 → Firestore」→「建立資料庫」→ 位置選 `asia-east1（台灣）` → 選「以正式版模式啟動」。
3. 進入 Firestore 的「規則」分頁，把本專案 `firestore.rules` 的內容整段貼上，
   把 `你的Email@gmail.com` 改成你自己的 Google 帳號（家人要用就用逗號加進去），按「發布」。
4. 左側「安全性 → Authentication」→「開始使用」→「登入方式」→ 啟用「Google」→ 儲存。其他登入方式（電子郵件/密碼、匿名等）不要開。
5. Authentication →「設定」→「授權網域」→ 新增 `<你的 GitHub 帳號>.github.io`。

### 2. 取得網頁設定
1. 專案總覽旁的齒輪 →「專案設定」→「一般」→ 最下方「你的應用程式」→ 點 `</>`（網頁）圖示，取個暱稱後註冊。
2. 複製畫面上的 `firebaseConfig = { ... }`，貼到 `firebase-config.js` 裡對應的欄位。

### 3. 開啟 GitHub Pages
儲存庫 → Settings → Pages → Source 選「Deploy from a branch」，Branch 選 `main`、資料夾 `/ (root)` → Save。
約 1 分鐘後網址會是 `https://<你的 GitHub 帳號>.github.io/<儲存庫名稱>/`。

## 檔案
- `index.html`、`style.css`、`app.js`：網頁本體
- `firebase-config.js`：Firebase 連線設定
- `firestore.rules`：資料庫權限規則（只有名單內的帳號能讀寫）

## 安全性
- `firebase-config.js` 裡的 apiKey 不是密碼，公開是正常的；真正擋住別人的是 Firestore 規則。
- 規則只放行「已驗證 Email」且在名單內的帳號，你的 Email 只寫在 Firebase 主控台，不要 commit 到這個公開儲存庫。
- 修改 `firestore.rules` 後，記得把內容貼回主控台（並填回你的 Email）再按「發布」，主控台的版本才是實際生效的。
- 不要把 Firestore 切成「測試模式」，那會讓任何人都能讀寫。
