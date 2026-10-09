// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-boot-doctor.js — Cek kesehatan fitur otomatis saat bot NYALA/RESTART
// (request owner 17 Sep 2026: "fitur system yg bsa deteksi fitur ini apikey
// expired, endpoint down, fitur eror yg otomatis kirim ke dm owner pas botnya
// prtama kali run atau restart").
//
// Cara kerja:
// 1. initBootDoctor(sock) dipanggil dari connection.js pas koneksi "open".
// 2. Delay 15 dtk (nunggu plugin/db siap) → jalankan SEMUA probe paralel.
// 3. Tiap key/apikeys.json diuji ke endpoint ASLI yang dipakai fiturnya
//    (registry di bawah) → klasifikasi:
//      ok            → sehat
//      key_invalid   → APIKEY EXPIRED / SALAH (401/403 atau body invalid key)
//      quota         → KUOTA ABIS / perlu top-up (402 / body quota)
//      ratelimit     → RATE-LIMIT (429)
//      endpoint_err  → HTTP 4xx lain (endpoint pindah / param berubah)
//      down          → 5xx / timeout / DNS mati
//      nokey         → key kosong (fitur auto-skip/fallback — bukan error)
// 4. Laporan dikelompokin → DM owner (throttle 30 mnt biar crash-guard restart
//    loop gak spam DM; laporan BERUBAH selalu dikirim).
// 5. `.bootdoctor` (plugins/bot/bootdoctor.js) — cek manual + status.
//
// GOTCHA: probe AI chat (min1ai/searchapi/sensenova/inception) makan 1 request
// kecil per boot — wajar buat validasi key, throttled biar gak boros.

import fs from "fs";
import path from "path";
import config from "../../config.js";
import { getApiKey } from "./rara-api-keys.js";
import { getApiKeys } from "./config/env-loader.js";
import { getDatabase } from "./rara-database.js";
import { raraWrap } from "./rara-menu-style.js";
import { sendNotifCard } from "./rara-notif-card.js";
import { getTioBase } from "./config/env-loader.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "bootdoctor.json");
const THROTTLE_MS = 30 * 60 * 1000; // anti-spam DM pas restart loop
const PROBE_TIMEOUT_MS = 12000;
const BOOT_DELAY_MS = 15000;
const CONCURRENCY = 6;

let sockInstance = null;
let doctorHttp = null; // seam e2e
let stateFileForTest = null;
let sentHook = null; // seam e2e: capture laporan terkirim

// ═══════════════════════════════════════════════════════════════
// REGISTRY — APIKEY probes (URL & param VERBATIM dari pemakaian fitur)
// features: daftar singkat fitur yang kena dampak (dari _note_ apikeys.json)
// ═══════════════════════════════════════════════════════════════
const KEY_PROBES = [
  {
    key: "min1ai", label: "1Min.ai",
    features: "otak AI #1 rantai .raraai, aiagent, fallback AI",
    method: "POST",
    url: () => "https://api.1min.ai/api/chat-with-ai",
    headers: k => ({ "Content-Type": "application/json", "API-KEY": k }),
    body: () => JSON.stringify({ type: "UNIFY_CHAT_WITH_AI", model: "qwen3-8b", promptObject: { prompt: "ping" } }),
  },
  {
    key: "ikyyxd", label: "IkyyXD",
    features: "rantai AI cadangan, .ikyydl, .snaptikdouyin",
    url: k => `https://api.ikyyxd.my.id/ai/gemini?text=ping&apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "zelapi", label: "ZelAPI",
    features: "semua suite z, .jktai/.jkt48, fallback .sdxl",
    url: k => `https://zelapi.eu.cc/search/dns?domain=zelapi.eu.cc&apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "haidar", label: "HaidarAPIs",
    features: ".alldl .txt2vid .tts .img2style .nano-banana + game factory",
    timeoutMs: 30000, // TTS beneran generate audio — sabar dikit
    url: k => `https://api.haidarxd.my.id/api/v1/ai/text2speech?text=ping&voice=Gadis&apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "cuki", label: "Cuki API",
    features: ".gita .gpt4o .nayaai .pakustad .lahelu",
    url: k => `https://api.cuki.biz.id/api/ai/gita?apikey=${encodeURIComponent(k)}&q=ping`,
  },
  {
    key: "fazzcode", label: "Fazzcode",
    features: ".airoleplaychat .fazzroleplay",
    method: "POST",
    url: () => "https://api.fazzcode.eu.cc/ai/chatbot-role",
    headers: k => ({ "Content-Type": "application/json", Authorization: `Bearer ${k}` }),
    body: () => JSON.stringify({ message: "ping" }),
  },
  {
    key: "searchapi", label: "SearchAPI.io",
    features: ".googleaimode",
    method: "POST",
    url: () => "https://www.searchapi.io/api/v1/search?engine=google_ai_mode&q=ping",
    headers: k => ({ "Content-Type": "application/json", Authorization: `Bearer ${k}` }),
    body: () => JSON.stringify({ q: "ping" }),
  },
  {
    key: "groqkey", label: "Groq",
    features: "rantai AI RaraAI + fitur AI satuan",
    url: k => "https://api.groq.com/openai/v1/models",
    headers: k => ({ Authorization: `Bearer ${k}` }),
  },
  {
    key: "google", label: "Google AI Studio",
    features: "gemini standalone + fitur AI otomatis",
    url: k => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`,
  },
  {
    key: "tioApiKey", label: "9Router v2 (Tio)",
    features: "otak AI .raraai rantai, .aitio, aigroupchat (alias .aigrup), smartreply, fun-ai",
    url: k => getTioBase() + "/v1/models", // satu pintu env-loader (bisa 9router lokal)
    headers: k => ({ Authorization: `Bearer ${k}` }),
  },
  {
    key: "sensenova", label: "SenseNova",
    features: "AI multiprovider",
    method: "POST",
    url: () => "https://token.sensenova.ai/v1/chat/completions",
    headers: k => ({ "Content-Type": "application/json", Authorization: `Bearer ${k}` }),
    body: () => JSON.stringify({ model: "SenseChat-5", messages: [{ role: "user", content: "ping" }] }),
  },
  {
    key: "inception", label: "Inception Labs",
    features: "AI multiprovider",
    method: "POST",
    url: () => "https://api.inceptionlabs.ai/v1/chat/completions",
    headers: k => ({ "Content-Type": "application/json", Authorization: `Bearer ${k}` }),
    // mercury (v1) cuma buat akun pre-Feb-2026 — akun baru wajib mercury-2
    body: () => JSON.stringify({ model: "mercury-2", messages: [{ role: "user", content: "ping" }] }),
  },
  {
    key: "openWeatherKey", label: "OpenWeatherMap",
    features: ".hujannotif nowcast + cuaca",
    url: k => `https://api.openweathermap.org/data/2.5/weather?q=Jakarta&appid=${encodeURIComponent(k)}`,
  },
  {
    key: "anabot", label: "Anabot",
    features: ".izen",
    url: k => `https://anabot.my.id/api/tools/izenLOL?url=https://wa.me&apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "neoxr", label: "NeoXR",
    features: "maker/asupan/AI anime",
    url: k => `https://api.neoxr.eu/api/asupan?username=ping&apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "fgsi", label: "FGSI API",
    features: ".img2img .enchantvideo",
    url: k => `https://fgsi.dpdns.org/api/ai/image/img2img?apikey=${encodeURIComponent(k)}`,
  },
  {
    key: "obscura", label: "ObscuraWorks",
    features: ".amdata .nik scraper",
    url: k => `https://api.obscuraworks.org/api/tools/amdata?apikey=${encodeURIComponent(k)}&url=https://wa.me`,
  },
  {
    key: "firefly", label: "Firefly",
    features: "tts .crikk .deepai pinterest",
    url: k => `https://firefly.maiku.my.id/api/crikk?apikey=${encodeURIComponent(k)}&text=ping&voice=id-ID-ArdiNeural`,
  },
  {
    key: "kuroneko", label: "KuroNeko",
    features: "scraper utama downloader/upload",
    url: k => `https://sylvatica.my.id/api/ai/tts?apikey=${encodeURIComponent(k)}&text=ping&voice=ardi`,
  },
  {
    key: "savenow", label: "SaveNow",
    features: "fallback .alldl (audio/video)",
    url: k => `https://p.savenow.to/api/v2/download?format=mp3&url=ping&apikey=${encodeURIComponent(k)}`,
  },
];

// ═══════════════════════════════════════════════════════════════
// REGISTRY — ENDPOINT GRATIS (tanpa key) yang fitur otomatis andalkin
// ═══════════════════════════════════════════════════════════════
const FREE_PROBES = [
  { label: "BMKG Gempa", features: "notifikasi gempa .disaster", url: "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json" },
  { label: "USGS", features: "gempa global fallback", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson" },
  { label: "GDACS", features: "EWS multi-bencana .dsw", url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" },
  { label: "MAGMA Indonesia", features: "gunung api .disaster", url: "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas" },
  { label: "JMA (Jepang)", features: "gempa fallback EWS", url: "https://www.jma.go.jp/bosai/quake/data/list.json" },
  { label: "EMSC", features: "gempa fallback EWS", url: "https://www.seismicportal.eu/fdsnws/event/1/query?limit=5&format=json&orderby=time" },
  { label: "Open-Meteo", features: "cuaca .weather .wsw .hujannotif", url: "https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.816&current=temperature_2m" },
  { label: "MET Norway", features: "cuaca fallback", url: "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-6.2&lon=106.816" },
  { label: "Google Translate", features: ".translate autotranslate", url: "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=ping" },
  { label: "Pollinations", features: ".sdxl image gen gratis", url: "https://image.pollinations.ai/prompt/ping?width=64&height=64&nologo=true" },
];

// ═══════════════════════════════════════════════════════════════
// KLASIFIKASI
// ═══════════════════════════════════════════════════════════════
const RE_KEY_INVALID = /(invalid api|invalid key|api[_ ]?key.*(salah|invalid|expired|tidak ditemukan|not found)|unauthorized|banned apikey|apikey kadaluarsa|silakan daftar|akses ditolak)/i;
const RE_QUOTA = /(quota|kuota|limit exceeded|rate limit habis|kehabis)/i;

// Provider tertentu dapat mengembalikan HTTP 403 karena gerbang IP whitelist.
// Itu berbeda dari key expired, jadi dipisahkan ke kategori ip_gate.
const RE_IP_GATE = /(ip tidak diwhitelist|whitelist ip|ip belum diwhitelist|whitelist ip anda)/i;

function classifyHttp(status, bodyText) {
  const tGate = String(bodyText || "").slice(0, 600);
  if (RE_IP_GATE.test(tGate)) return "ip_gate";
  if (status === 401 || status === 403) return "key_invalid";
  if (status === 402) return "quota";
  if (status === 429) return "ratelimit";
  if (status === 422) return "ok"; // validasi param dummy ditolak — key lolos auth
  if (status >= 500) return "down";
  const t = String(bodyText || "").slice(0, 600);
  if (RE_KEY_INVALID.test(t)) return "key_invalid";
  if (RE_QUOTA.test(t)) return "quota";
  if (status >= 400) return "endpoint_err";
  return "ok";
}


// Resolver key: db runtime (.setkey) > PUSAT apikeys.json flat > registry lama.
// (registry getApiKey cuma kenal 20 nama — haidar/zelapi/termai/dll gak ada
// di situ, jadi WAJIB baca pusat langsung biar SEMUA key ke-probe.)
function resolveKey(name) {
  try {
    const db = getDatabase();
    if (db?.db?.data?.apiKeys?.[name]) return String(db.db.data.apiKeys[name]);
  } catch {}
  try {
    const flat = getApiKeys();
    if (flat?.[name] && String(flat[name]).trim()) return String(flat[name]).trim();
  } catch {}
  try {
    return getApiKey(name) || "";
  } catch {
    return "";
  }
}

// FIX 19 Sep 2026 (owner: "boot doctor ga nyebut nama rest api atau dr
// endpoint yg mananya"): laporan dulu cuma "label — fitur — HTTP kode".
// Owner gak bisa tau key yg expired itu milik SITUS REST API yang mana
// (nama key di apikeys.json beda dari nama brandnya, cth key "cuki" =
// api.cuki.biz.id). Sekarang tiap item nyebut DOMAIN endpoint yang
// di-probe + nama key persis di apikeys.json.
function hostOf(url) {
  try { return new URL(url).host; } catch { return ""; }
}

async function probeOne(probe, isKeyProbe) {
  const result = {
    label: probe.label, features: probe.features || "",
    kind: isKeyProbe ? "key" : "endpoint",
    keyName: isKeyProbe ? probe.key : "",
    host: "",
  };
  try {
    const key = isKeyProbe ? resolveKey(probe.key) : "";
    if (isKeyProbe && !key) {
      result.status = "nokey";
      return result;
    }
    const url = typeof probe.url === "function" ? probe.url(key) : (probe.url || undefined);
    result.host = hostOf(url);
    const headers = probe.headers ? probe.headers(key) : {};
    const http = doctorHttp || fetch;
    const res = await http(url, {
      method: probe.method || "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RaraBootDoctor/1.0", ...headers },
      body: probe.body ? probe.body(key) : undefined,
      signal: AbortSignal.timeout(probe.timeoutMs || PROBE_TIMEOUT_MS),
      redirect: "manual",
    });
    let bodyText = "";
    try { bodyText = await res.text(); } catch {}
    result.status = classifyHttp(res.status, bodyText);
    result.httpStatus = res.status;
    if (result.status === "ip_gate") {
      const ipMatch = bodyText.match(/"ip"\s*:\s*"([0-9.]+)"/) || bodyText.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      if (ipMatch) result.gateIp = ipMatch[1];
    }
  } catch (e) {
    result.status = "down";
    result.error = (e?.name === "TimeoutError" || e?.name === "AbortError") ? "timeout" : (e?.cause?.code || e?.message || "network error").slice(0, 60);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════
export async function runBootDoctor() {
  const results = [];
  const queue = [
    ...KEY_PROBES.map(p => [p, true]),
    ...FREE_PROBES.map(p => [p, false]),
  ];
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const [probe, isKey] = queue[idx++];
      results.push(await probeOne(probe, isKey));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

// ═══════════════════════════════════════════════════════════════
// LAPORAN (line-free — aturan owner, tanpa garis │/╭/╰)
// ═══════════════════════════════════════════════════════════════
const CATEGORY_META = {
  ip_gate: { title: "KEY VALID — IP BOT BELUM DIWHITELIST di REST API", icon: "🟠", order: 1 },
  key_invalid: { title: "APIKEY EXPIRED / SALAH — butuh ganti key", icon: "❌", order: 2 },
  quota: { title: "KUOTA ABIS / perlu top-up", icon: "⚠", order: 3 },
  ratelimit: { title: "RATE-LIMIT (key valid, kena limit)", icon: "⚠", order: 4 },
  down: { title: "ENDPOINT DOWN", icon: "🔴", order: 5 },
  endpoint_err: { title: "ERROR LAIN (endpoint bermasalah)", icon: "🟡", order: 6 },
};

export function buildBootReport(results, extraLines = []) {
  // REVISI 9 Okt (owner: "tampilan chat bootdoctor dibikin markdown rapih,
  // khas gaya chat promosi telegram yg dibuat AI") — laporan kini penuh
  // markup: judul seksi *bold* + emoji, bullet ▪ per item, divider ━ pendek,
  // label-value bold sebaris. Konten/label ASLI dipertahankan (Rest API:,
  // Key apikeys.json:, Fitur kena dampak:, dsb) biar E2E & kebiasaan owner
  // gak berubah — cuma tampilan. GOTCHA: WA hard-wrap garis panjang tanpa
  // spasi → divider dibatasi pendek (14 kar), gak disamakan dgn lebar body.
  const byStatus = {};
  for (const r of results) (byStatus[r.status] ||= []).push(r);

  const DIV = "━━━━━━━━━━━━━━";
  const lines = [];
  const problemCount = 0;

  lines.push("🩺 *LAPORAN KESEHATAN FITUR*");
  lines.push("Bot baru nyala — semua apikey + endpoint dicek sekali jalan");
  lines.push("*Total diperiksa: " + results.length + "* (apikey + endpoint gratis)");
  lines.push(DIV);

  const problems = Object.entries(CATEGORY_META).sort((a, b) => a[1].order - b[1].order);
  let bad = 0;
  const badKeys = []; // nama key apikeys.json yg key_invalid/quota — buat hint gabungan
  for (const [status, meta] of problems) {
    const items = byStatus[status] || [];
    if (!items.length) continue;
    bad += items.length;
    lines.push("");
    lines.push(meta.icon + " *" + meta.title + "* — *" + items.length + " DITEMUKAN*");
    lines.push(DIV);
    let first = true;
    for (const it of items) {
      if (!first) lines.push("");
      first = false;
      lines.push("▪ *" + it.label + "*");
      if (it.keyName) {
        lines.push("*Rest API: " + (it.host || "-") + "*");
        lines.push("*Key apikeys.json: " + it.keyName + "*");
      } else if (it.host) {
        lines.push("*Rest API: " + it.host + " (tanpa key)*");
      }
      let dampak = "*Fitur kena dampak: " + (it.features || "-");
      if (it.error) dampak += " — " + it.error;
      else if (it.httpStatus) dampak += " — HTTP " + it.httpStatus;
      lines.push(dampak + "*");
      if (status === "ip_gate") {
        // key beneran valid — yang ditolak cuma IP bot. Whitelist di profile
        // dashboard REST API provider terkait.
        lines.push("*Key valid & dikenal — ketik .bootdoctor tidak perlu ganti key*");
        if (it.gateIp) lines.push("*IP bot yang kena gerbang: " + it.gateIp + "*");
        lines.push("*Solusi: whitelist IP bot di profile dashboard rest api (VIP) — fitur aktif otomatis setelahnya*");
      }
    }
    if (status === "key_invalid" || status === "quota") {
      badKeys.push(...items.filter(it => it.keyName).map(it => it.keyName));
    }
  }

  // hint GABUNAN sekali (dulu per-kategori — key expired & quota kepisah)
  if (badKeys.length) {
    lines.push("");
    lines.push("💡 *Key bermasalah di apikeys.json: " + badKeys.join(", ") + "*");
    lines.push("*Ganti valuenya lalu ketik .reloadkey — aktif tanpa restart*");
  }

  const okKeys = (byStatus.ok || []).filter(r => r.kind === "key").length;
  const okEps = (byStatus.ok || []).filter(r => r.kind === "endpoint").length;
  const nokey = (byStatus.nokey || []).length;
  lines.push("");
  lines.push("✅ *Sehat: " + okKeys + " apikey OK · " + okEps + " endpoint OK*");
  if (nokey) lines.push("ℹ *Key kosong (fitur auto-skip/fallback): " + nokey + "*");
  if (!bad) {
    lines.push("");
    lines.push("*Semua fitur sehat, gak ada yang perlu diganti 🎉*");
  }

  // seksi SALURAN WA (finalisasi 25 Sep — extraLines dari rara-saluran-hub;
  // muncul baik laporan sehat maupun ada masalah, SELALU sebelum penutup)
  if (Array.isArray(extraLines) && extraLines.length) {
    lines.push("");
    lines.push("📡 *SALURAN WA*");
    lines.push(DIV);
    for (const l of extraLines) lines.push(l);
  }

  // jam + tanggal + DETIK paling bawah (contoh owner: "🕒 16.13:12, 20 Sep")
  const t = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const d = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
  lines.push("");
  lines.push("🕒 " + t + ", " + d);
  if (bad) {
    lines.push("*Ketik .bootdoctor buat cek ulang · .reloadkey setelah ganti key*");
  }

  return raraWrap("Boot Doctor", lines);
}

// ═══════════════════════════════════════════════════════════════
// STATE (throttle + dedupe biar restart loop gak spam DM)
// ═══════════════════════════════════════════════════════════════
function stateFile() { return stateFileForTest || STATE_FILE; }

function loadState() {
  try {
    if (fs.existsSync(stateFile())) return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {}
  return { enabled: true, lastSent: 0, lastHash: "", lastRun: 0, lastSummary: "" };
}

function saveState(state) {
  try {
    const dir = path.dirname(stateFile());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("[bootdoctor] save state:", e.message);
  }
}

function simpleHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h);
}

export function shouldSendReport(reportText) {
  const st = loadState();
  if (st.enabled === false) return false;
  const hash = simpleHash(reportText);
  const changed = hash !== st.lastHash;
  const fresh = Date.now() - (st.lastSent || 0) < THROTTLE_MS;
  return changed || !fresh;
}

// ═══════════════════════════════════════════════════════════════
// INIT — dipanggil connection.js pas "open"
// ═══════════════════════════════════════════════════════════════
function getOwnerJid() {
  const num = config.owner?.number?.[0] || config.owner?.[0] || "";
  const clean = String(num).replace(/[^0-9]/g, "");
  return clean ? clean + "@s.whatsapp.net" : "";
}

export async function runAndReport({ send = true } = {}) {
  const results = await runBootDoctor();
  // FINALISASI SALURAN 25 Sep: laporan kesehatan kini SEKALIGUS cek semua
  // modul Saluran WA (resolve/autopost/react/reply/autobroadcast). Lazy
  // import — boot doctor gak boleh mati gara-gara modul saluran/db kagak
  // siap pas bot baru nyala. Gagal → baris jujur, gak diem.
  let saluranLines;
  try {
    const { buildSaluranHealthLines } = await import("./rara-saluran-hub.js");
    saluranLines = await buildSaluranHealthLines(sockInstance);
  } catch (e) {
    saluranLines = ["Saluran: gak bisa dicek saat ini (" + String(e?.message || e).slice(0, 80) + ")"];
  }
  const report = buildBootReport(results, saluranLines);
  const st = loadState();
  st.lastRun = Date.now();
  st.lastSummary = results.filter(r => r.status !== "ok" && r.status !== "nokey").map(r => r.label + "=" + r.status).join(", ") || "semua sehat";
  const hash = simpleHash(report);
  const willSend = send && shouldSendReport(report);
  if (willSend) {
    const jid = getOwnerJid();
    if (sockInstance && jid) {
      try {
        // DESAIN 19 Sep 2026 (owner: "notif bot doctor g pakai desain skrg kyk
        // desain .play") — DM laporan kini pakai banner preview card branding
        // Rara (thumbnail channel-banner renderLarger), isi teks tetap utuh.
        // FIX 6 Okt 2026 (owner: thumbnail Boot Doctor kebesaran, maunya
        // kayak .menu + bisa dicustom dari asset) — kartu header image asli
        // via sendNotifCard; custom gambar: assets/image/notif/bootdoctor.jpg
        await sendNotifCard(sockInstance, jid, report, { name: "bootdoctor" });
      } catch (e) {
        console.error("[bootdoctor] kirim DM gagal:", e.message);
      }
    }
    if (sentHook) { try { sentHook(report); } catch {} }
    st.lastSent = Date.now();
    st.lastHash = hash;
  }
  saveState(st);
  return { results, report, sent: willSend };
}

// FIX 9 Okt 2026 (owner: "bootdoctor gak usah cek berkali-kali — bisa
// menghabiskan limit fitur; cukup sekali saat pairing pertama, sisanya
// manual"): auto-probe di boot kini SEKALI SAJA. autoBootDone dicatet
// setelah run pertama → boot/restart berikutnya SKIP TOTAL (probe gak
// jalan = kuota 22 apikey fitur aman). Pairing ulang (creds belum
// registered saat boot = firstPairing) selalu dianggap pairing pertama
// → jalan sekali lagi. Manual .bootdoctor kapan pun tetap bebas.
export function shouldAutoBootCheck(st, firstPairing) {
  if (st && st.enabled === false) return false; // .bootdoctor off = gak probe sama sekali
  if (st && st.autoBootDone && !firstPairing) return false; // udah pernah → skip
  return true; // pairing pertama / belum pernah jalan
}

export function initBootDoctor(sock, { firstPairing = false } = {}) {
  sockInstance = sock;
  const st = loadState();
  if (!shouldAutoBootCheck(st, firstPairing)) {
    console.log("[bootdoctor] auto-cek boot dilewati — " +
      (st.enabled === false
        ? "dimatikan via .bootdoctor off"
        : "udah jalan pas pairing pertama (hemat limit fitur; cek manual: .bootdoctor)"));
    return;
  }
  setTimeout(async () => {
    try {
      await runAndReport();
      const s2 = loadState();
      s2.autoBootDone = true; // tandai → boot/restart berikutnya gak probe lagi
      saveState(s2);
      console.log("[bootdoctor] cek kesehatan fitur selesai — auto-cek boot cuma sekali, selanjutnya manual .bootdoctor");
    } catch (e) {
      console.error("[bootdoctor] gagal:", e.message);
    }
  }, BOOT_DELAY_MS);
}

export function getBootDoctorStatus() {
  const st = loadState();
  return {
    enabled: st.enabled !== false,
    autoBootDone: !!st.autoBootDone,
    lastRun: st.lastRun,
    lastSent: st.lastSent,
    lastSummary: st.lastSummary,
  };
}

export function setBootDoctorEnabled(v) {
  const st = loadState();
  st.enabled = !!v;
  saveState(st);
  return st.enabled;
}

// ═══════════════════════════════════════════════════════════════
// SEAM E2E
// ═══════════════════════════════════════════════════════════════
export function _setDoctorHttpForTest(fn) { doctorHttp = fn; }
export function _resolveKeyForTest(name) { return resolveKey(name); }
export function _setBootDoctorStateFileForTest(p) { stateFileForTest = p; }
export function _setBootDoctorSockForTest(s) { sockInstance = s; }
export function _setBootDoctorSentHookForTest(fn) { sentHook = fn; }
