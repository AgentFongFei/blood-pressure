import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const COLLECTION = "bp_records";

let records = [];
let unsubscribe = null;
let bpChart = null;
let pulseChart = null;

function showNotice(text) {
  $("notice").textContent = text;
  $("notice").hidden = !text;
}

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
$("date").value = todayString();

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  showNotice("尚未設定資料庫：請把 Firebase 設定貼到 firebase-config.js（步驟見 README）。");
  $("loginBtn").disabled = true;
  $("saveBtn").disabled = true;
  throw new Error("firebaseConfig is empty");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

$("loginBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    showNotice("登入失敗：" + err.message);
  }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  $("loginBtn").hidden = !!user;
  $("logoutBtn").hidden = !user;
  $("userLabel").textContent = user ? user.email : "";
  $("saveBtn").disabled = !user;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }

  if (!user) {
    records = [];
    render();
    showNotice("請先用 Google 登入，才能讀取與儲存紀錄。");
    return;
  }
  showNotice("");
  unsubscribe = onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      records.sort((a, b) => a.date.localeCompare(b.date));
      render();
    },
    (err) => {
      showNotice(err.code === "permission-denied"
        ? "這個帳號沒有權限讀取資料，請確認 firestore.rules 裡的 Email 名單。"
        : "讀取資料失敗：" + err.message);
    }
  );
});

$("recordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const record = {
    date: $("date").value,
    name: $("name").value.trim(),
    systolic: Number($("systolic").value),
    diastolic: Number($("diastolic").value),
    pulse: Number($("pulse").value),
    createdAt: serverTimestamp(),
  };
  if (!record.date || !record.name) return;

  $("saveBtn").disabled = true;
  $("saveMsg").textContent = "儲存中…";
  try {
    await addDoc(collection(db, COLLECTION), record);
    $("saveMsg").textContent = "已儲存 ✓";
    $("systolic").value = "";
    $("diastolic").value = "";
    $("pulse").value = "";
    $("nameFilter").value = record.name;
    render();
  } catch (err) {
    $("saveMsg").textContent = "儲存失敗：" + err.message;
  } finally {
    $("saveBtn").disabled = false;
    setTimeout(() => { $("saveMsg").textContent = ""; }, 3000);
  }
});

$("nameFilter").addEventListener("change", render);

$("recordRows").addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (!confirm("確定要刪除這筆紀錄嗎？")) return;
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (err) {
    alert("刪除失敗：" + err.message);
  }
});

function render() {
  const names = [...new Set(records.map((r) => r.name))].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  $("nameList").innerHTML = names.map((n) => `<option value="${escapeHtml(n)}">`).join("");

  const filter = $("nameFilter");
  const current = filter.value;
  filter.innerHTML = names.length
    ? names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")
    : `<option value="">（尚無資料）</option>`;
  filter.value = names.includes(current) ? current : (names[0] || "");

  const rows = records.filter((r) => r.name === filter.value);
  $("emptyMsg").hidden = rows.length > 0 || !names.length;

  const labels = rows.map((r) => r.date);
  drawCharts(labels, rows);

  $("recordRows").innerHTML = rows.slice().reverse().map((r) => `
    <tr>
      <td>${r.date}</td><td>${r.systolic}</td><td>${r.diastolic}</td><td>${r.pulse}</td>
      <td><button class="del" data-id="${r.id}">刪除</button></td>
    </tr>`).join("");
}

function drawCharts(labels, rows) {
  const style = getComputedStyle(document.documentElement);
  const text = style.getPropertyValue("--muted").trim();
  const grid = style.getPropertyValue("--border").trim();
  const scales = (unit) => ({
    x: { ticks: { color: text }, grid: { color: grid } },
    y: { ticks: { color: text }, grid: { color: grid }, title: { display: true, text: unit, color: text } },
  });
  const options = (unit) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { labels: { color: text } } },
    scales: scales(unit),
  });
  const line = (label, data, color) => ({
    label, data,
    borderColor: color, backgroundColor: color,
    borderWidth: 2, pointRadius: 3, tension: 0.2,
  });

  const bpData = {
    labels,
    datasets: [
      line("最高血壓", rows.map((r) => r.systolic), "#dc2626"),
      line("最低血壓", rows.map((r) => r.diastolic), "#2563eb"),
    ],
  };
  const pulseData = {
    labels,
    datasets: [line("心率", rows.map((r) => r.pulse), "#16a34a")],
  };

  if (bpChart) { bpChart.data = bpData; bpChart.update(); }
  else bpChart = new Chart($("bpChart"), { type: "line", data: bpData, options: options("mmHg") });

  if (pulseChart) { pulseChart.data = pulseData; pulseChart.update(); }
  else pulseChart = new Chart($("pulseChart"), { type: "line", data: pulseData, options: options("次/分") });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
