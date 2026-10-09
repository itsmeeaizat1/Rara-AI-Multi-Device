// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-botdoctor.js — DOKTER BOT PRIBADI (26 Sep 2026, ide owner no.2 dari
// sesi "fitur masa depan": "bot baca log pinglog + error + ramalert, kalau
// ada pola aneh dia diagnosa sendiri dan ngasih laporan gejala → dugaan
// akar → saran patch"). Beda dari ramalert (alert mentah satu kejadian),
// botdoctor itu ANALISIS POLA 24 jam lalu ditulis gaya dokter.
//
// Sumber data: numpang tick rara-pinglog.js (20 dtk) → noteBotDoctorTick().
// Ring buffer sampel 24 jam (cap 4320) → db.data.botdoctor.samples.
// Riwayat diagnosa (cap 14) → db.data.botdoctor.reports.
// Jadwal malam → db.data.botdoctor.sched { on, jam "HH:MM" WIB, lastDate }.
// Anti-cycle: lib ini GAK import apa pun dari rara-pinglog.js (pinglog yang
// manggil noteBotDoctorTick) — CPU dihitung lokal (rumus sama).
// Senyap-proof: noteBotDoctorTick gak pernah lempar (gak ganggu tick ping).

import os from "node:os";
import { getDatabase } from "./rara-database.js";
import config from "../../config.js";

const SAMPLE_CAP = 4320; // 24 jam × tick 20 dtk
const DAY_MS = 24 * 3600 * 1000;
const REPORT_CAP = 14;

let docTimer = null;
let _ownerJidImpl = null;
export function _setDoctorOwnerJidForTest(fn) { _ownerJidImpl = fn; }
export function _clearDoctorOwnerJidForTest() { _ownerJidImpl = null; }

function ownerJid() {
  if (typeof _ownerJidImpl === "function") return _ownerJidImpl();
  try {
    const raw = Array.isArray(config?.owner) ? config.owner[0] : config?.owner;
    const num = String(raw || "").replace(/\D/g, "");
    return num ? `${num}@s.whatsapp.net` : null;
  } catch { return null; }
}

export function ensureBotDoctorState(db) {
  if (!db.data.botdoctor || typeof db.data.botdoctor !== "object") db.data.botdoctor = {};
  const st = db.data.botdoctor;
  if (!Array.isArray(st.samples)) st.samples = [];
  if (!Array.isArray(st.reports)) st.reports = [];
  if (!st.sched || typeof st.sched !== "object") st.sched = { on: false, jam: "23:00", lastDate: "" };
  if (typeof st.sched.on !== "boolean") st.sched.on = false;
  if (typeof st.sched.jam !== "string" || !/^\d{2}:\d{2}$/.test(st.sched.jam)) st.sched.jam = "23:00";
  if (typeof st.sched.lastDate !== "string") st.sched.lastDate = "";
  return st;
}

function cpuPct() {
  const cores = (os.cpus?.() || []).length || 1;
  const load = os.loadavg?.()?.[0] || 0;
  return Math.min(999, Math.round((load / cores) * 100));
}

// dipanggil rara-pinglog.js tiap tick — sampel denyut bot
export function noteBotDoctorTick({ pingMs = -1, waOk = true, errs = 0, msgs = 0 } = {}) {
  try {
    const st = ensureBotDoctorState(getDatabase());
    st.samples.push({
      t: Date.now(), p: pingMs, w: waOk ? 1 : 0,
      e: Number(errs) || 0, m: Number(msgs) || 0,
      r: Math.round(process.memoryUsage().rss / 1048576),
      c: cpuPct(), u: Math.round(process.uptime()),
    });
    if (st.samples.length > SAMPLE_CAP) st.samples.splice(0, st.samples.length - SAMPLE_CAP);
  } catch { /* senyap-proof: jangan ganggu tick pinglog */ }
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function wibHour(t) {
  return Number(new Date(t).toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }));
}

// ─── DIAGNOSA (murni, dites e2e): samples 24 jam → temuan ───
export function diagnoseBotHealth(samples = [], now = Date.now()) {
  const day = samples.filter((s) => Number(now) - s.t <= DAY_MS);
  const findings = [];
  if (!day.length) {
    return {
      score: 100,
      findings: [{ tingkat: "info", gejala: "Belum ada sampel dalam 24 jam terakhir", dugaan: "bot baru dinyalakan atau pinglog lagi mati", saran: "tunggu beberapa jam biar ada data yang bisa dianalisis" }],
    };
  }

  // 1. RESTART CHURN — uptime turun = proses mati & idup lagi
  let restarts = 0;
  for (let i = 1; i < day.length; i++) if (day[i].u + 60 < day[i - 1].u) restarts++;
  if (restarts >= 3) findings.push({ tingkat: "waspada", gejala: `bot restart ${restarts} kali dalam 24 jam`, dugaan: "kemungkinan OOM di VPS atau watchdog yang agresif", saran: "cek log pm2 (pm2 logs) & memori sistem saat bot mati sendiri" });
  else if (restarts > 0) findings.push({ tingkat: "info", gejala: `bot sempat restart ${restarts} kali dalam 24 jam`, dugaan: "wajar kalau emang ada deploy atau restart manual", saran: "abaikan kalau memang habis deploy" });

  // 2. RAM CREEP — bandingin sepertiga awal vs akhir (memory leak)
  const sorted = [...day].sort((a, b) => a.t - b.t);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const first = avg(sorted.slice(0, third).map((s) => s.r));
  const last = avg(sorted.slice(-third).map((s) => s.r));
  const spanH = Math.max(0.1, (sorted[sorted.length - 1].t - sorted[0].t) / 3600e3);
  const slope = (last - first) / spanH; // MB per jam
  if (slope >= 80) findings.push({ tingkat: "waspada", gejala: `RAM naik konsisten ~${Math.round(slope)} MB/jam (${Math.round(first)} MB → ${Math.round(last)} MB dalam ${Math.round(spanH)} jam)`, dugaan: "kemungkinan memory leak di interval/listener baru atau penumpukan sesi yang gak dibersihin", saran: "audit timer & interval yang terakhir ditambahin; kalau makin bengkak, restart di jam sepi sambil dilacak modul mana yang nambah" });
  else if (slope >= 25) findings.push({ tingkat: "info", gejala: `RAM pelan-pelan naik ~${Math.round(slope)} MB/jam`, dugaan: "bisa cache normal, bisa awal leak", saran: "pantau tren besok — kalau terus naik linear, curiga leak" });

  // 3. LATENSI PER JAM — "latensi naik tiap jam X" → cek scheduler jam itu
  const withPing = day.filter((s) => s.p >= 0);
  if (withPing.length >= 12) {
    const overall = avg(withPing.map((s) => s.p));
    const byHour = {};
    for (const s of withPing) { const h = wibHour(s.t); (byHour[h] ||= []).push(s.p); }
    const bad = Object.entries(byHour)
      .map(([h, arr]) => ({ h: Number(h), m: avg(arr), n: arr.length }))
      .filter((x) => x.n >= 3 && x.m > Math.max(overall * 1.5, overall + 300))
      .sort((a, b) => b.m - a.m)[0];
    if (bad) findings.push({ tingkat: "info", gejala: `latensi WA melonjak di sekitar jam ${String(bad.h).padStart(2, "0")}.00 WIB (rata-rata ${Math.round(bad.m)} ms vs ${Math.round(overall)} ms biasanya)`, dugaan: "kemungkinan ada tugas berat terjadwal di jam itu, atau jaringan VPS lagi sibuk", saran: `cocokkan scheduler yang jalan sekitar jam ${String(bad.h).padStart(2, "0")} — geser ke jam sepi kalau mengganggu` });
  }

  // 4. KONEKSI WA GOYAH — w: 0→1 = reconnect
  let reconnects = 0;
  let drops = 0;
  for (let i = 1; i < day.length; i++) { if (!day[i - 1].w && day[i].w) reconnects++; if (!day[i].w) drops++; }
  if (reconnects >= 3) findings.push({ tingkat: "waspada", gejala: `koneksi WA putus-nyambung ${reconnects} kali dalam 24 jam`, dugaan: "jaringan VPS gak stabil atau sesi WA bermasalah", saran: "cek log koneksi & watchdog; kalau terus, coba pairing ulang di jam sepi" });
  else if (reconnects > 0) findings.push({ tingkat: "info", gejala: `koneksi WA sempat drop ${reconnects} kali`, dugaan: "reconnect watchdog jalan sebagaimana mestinya", saran: "aman — pantau kalau makin sering" });

  // 5. ERROR 24 JAM
  const totalErr = day.reduce((a, s) => a + (Number(s.e) || 0), 0);
  if (totalErr >= 50) findings.push({ tingkat: "waspada", gejala: `${totalErr} error terdeteksi dalam 24 jam`, dugaan: "ada modul yang berulang kali gagal — bukan sekali kejadian", saran: "cari error yang SAMA muncul berulang di log, itu akarnya" });
  else if (totalErr > 0) findings.push({ tingkat: "info", gejala: `${totalErr} error dalam 24 jam`, dugaan: "wajar untuk bot aktif", saran: "cukup dipantau" });

  // 6. CPU KRONIS
  const cpu = avg(day.map((s) => s.c || 0));
  if (cpu >= 70) findings.push({ tingkat: "waspada", gejala: `CPU rata-rata ${Math.round(cpu)}% hampir seharian`, dugaan: "ada proses yang makan CPU terus (load sistem = bot + aicall + 9router)", saran: "cek proses boros di VPS (htop) dan bagi beban" });

  // SKOR: waspada -12, info -3
  let score = 100;
  for (const f of findings) score -= f.tingkat === "kritis" ? 30 : f.tingkat === "waspada" ? 12 : 3;
  return { score: Math.max(0, Math.min(100, Math.round(score))), findings };
}

// ─── KARTU LAPORAN (plain text, pola ramalert/bootdoctor — tanpa bingkai) ───
export function buildDoctorCard(result = {}, now = Date.now()) {
  const d = new Date(now);
  const jam = d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replaceAll(":", ".");
  const tgl = d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
  // REVISI 9 Okt (owner): kartu ikut gaya promosi AI — judul seksi *bold*,
  // label-value bold sebaris, divider pendek (nyambung sama bootdoctor).
  const DIV = "━━━━━━━━━━━━━━";
  const lines = [
    `🩺 *DOKTER BOT — DIAGNOSA 24 JAM*`,
    DIV,
    `*Selesai: 🕒 ${jam}, ${tgl}*`,
    `*Skor kesehatan: ${result.score}/100*`,
  ];
  const f = result.findings || [];
  if (!f.length) {
    lines.push(``, `✅ *Semua vital sehat — RAM stabil, koneksi WA kuat, tanpa error yang berarti. Besok dicek lagi 🎉*`);
  } else {
    lines.push(``, `🔍 *TEMUAN (${f.length})*`, DIV);
    for (const x of f) {
      const tanda = x.tingkat === "kritis" ? "🚨" : x.tingkat === "waspada" ? "⚠️" : "ℹ️";
      lines.push(`${tanda} *${x.tingkat.toUpperCase()} — ${x.gejala}*`);
      lines.push(`*Dugaan: ${x.dugaan}*`);
      lines.push(`*Saran: ${x.saran}*`);
      lines.push(``);
    }
    if (lines[lines.length - 1] === ``) lines.pop();
  }
  return lines.join("\n");
}

// ─── LAPORAN SEKARANG (+ simpan riwayat) ───
export async function runBotDoctorNow({ now = Date.now(), save = false } = {}) {
  const st = ensureBotDoctorState(getDatabase());
  const result = diagnoseBotHealth(st.samples, now);
  const card = buildDoctorCard(result, now);
  if (save) {
    st.reports.push({ t: now, score: result.score, temuan: result.findings.length, ringkas: result.findings.map((x) => `${x.tingkat}: ${x.gejala}`).slice(0, 5) });
    if (st.reports.length > REPORT_CAP) st.reports.splice(0, st.reports.length - REPORT_CAP);
  }
  return { result, card };
}

// ─── KEPUTUSAN KIRIM HARIAN (murni, dites e2e; pola briefing) ───
export function evaluateDailyCheck({ on = false, jam = "23:00", lastDate = "", now = Date.now() } = {}) {
  if (!on) return { shouldRun: false, today: "" };
  const d = new Date(now);
  const hm = d.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
  const today = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  if (hm !== jam) return { shouldRun: false, today };
  if (lastDate === today) return { shouldRun: false, today };
  return { shouldRun: true, today };
}

// eksekusi di tiap tick scheduler — DM owner, dedupe per hari (claim duluan)
export async function processBotDoctorTick(sock, now = Date.now()) {
  const st = ensureBotDoctorState(getDatabase());
  const verdict = evaluateDailyCheck({ on: st.sched.on, jam: st.sched.jam, lastDate: st.sched.lastDate, now });
  if (!verdict.shouldRun) return false;
  st.sched.lastDate = verdict.today;
  const { card } = await runBotDoctorNow({ now, save: true });
  try {
    const jid = ownerJid();
    if (sock?.sendMessage && jid) await sock.sendMessage(jid, { text: card });
  } catch { /* gagal kirim → besok jam sama coba lagi (lastDate udah di-claim... jujur: laporan tersimpan di riwayat) */ }
  return true;
}

export function initBotDoctorScheduler(sock) {
  if (docTimer) return;
  docTimer = setInterval(() => { processBotDoctorTick(sock).catch(() => {}); }, 60 * 1000);
  docTimer.unref?.();
}

export function stopBotDoctorScheduler() {
  if (docTimer) { clearInterval(docTimer); docTimer = null; }
}
