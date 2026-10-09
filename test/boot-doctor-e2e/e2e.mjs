// E2E BOOT DOCTOR (17 Sep 2026) — cek kesehatan fitur pas bot nyala/restart.
// Fitur: rara-boot-doctor.js (probe apikey + endpoint gratis, klasifikasi,
// laporan DM owner + throttle) + plugins/bot/bootdoctor.js (.bootdoctor).
// Jalankan dari repo root: node test/boot-doctor-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 200))); ok ? pass++ : fail++; };

const libUrl = pathToFileURL(path.join(REPO, "src/lib/rara-boot-doctor.js")).href;
const { fromSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);
const norm = (s) => fromSC(String(s)).toLowerCase();
const mod = await import(libUrl);

// ── se SEBELUM tes: state file tmp + http mock ──
const tmpState = path.join(os.tmpdir(), "bootdoctor-test-" + Date.now() + ".json");
mod._setBootDoctorStateFileForTest(tmpState);

// fetch mock: map host → {status, body, okHeaders}
const RESP = {};
let lastRequests = [];
mod._setDoctorHttpForTest(async (url, opts = {}) => {
  const u = String(url);
  lastRequests.push({ url: u, opts });
  const host = u.replace(/^https?:\/\//, "").split("/")[0];
  const r = RESP[host];
  if (!r) return new Response("{}", { status: 200 });
  return new Response(r.body || "", { status: r.status });
});
const respond = (host, status, body) => { RESP[host] = { status, body }; };

w("\n— 1. klasifikasi HTTP status —");
respond("api.ikyyxd.my.id", 200, '{"success":true}');
let res = await mod.runBootDoctor();
let ikyy = res.find(r => r.label === "IkyyXD");
t("HTTP 200 + body sukses → ok", ikyy?.status === "ok", JSON.stringify(ikyy));

respond("api.cuki.biz.id", 401, '{"error":"Invalid API key"}');
res = await mod.runBootDoctor();
let cuki = res.find(r => r.label === "Cuki API");
t("HTTP 401 → key_invalid", cuki?.status === "key_invalid", JSON.stringify(cuki));

respond("api.cuki.biz.id", 200, '{"status":"error","message":"apikey kadaluarsa"}');
res = await mod.runBootDoctor();
cuki = res.find(r => r.label === "Cuki API");
t("HTTP 200 tapi body 'apikey kadaluarsa' → key_invalid", cuki?.status === "key_invalid", JSON.stringify(cuki));

// termai dibuang dari registry 1 Okt 2026 (free-tier limit, fitur dimigrasi ke
// rara-uploader) — klasifikasi 429/402 sekarang diuji lewat Cuki API
respond("api.cuki.biz.id", 429, "rate limit");
res = await mod.runBootDoctor();
let cuki429 = res.find(r => r.label === "Cuki API");
t("HTTP 429 → ratelimit", cuki429?.status === "ratelimit", JSON.stringify(cuki429));

respond("api.cuki.biz.id", 402, "quota exceeded");
res = await mod.runBootDoctor();
let cuki402 = res.find(r => r.label === "Cuki API");
t("HTTP 402 → quota", cuki402?.status === "quota", JSON.stringify(cuki402));

t("entry Termai dibuang dari registry (migrasi 1 Okt)", !res.some(r => r.label === "Termai"));

respond("magma.esdm.go.id", 500, "server error");
res = await mod.runBootDoctor();
let magma = res.find(r => r.label === "MAGMA Indonesia");
t("HTTP 5xx → down", magma?.status === "down", JSON.stringify(magma));

respond("example.org", 404, "not found");
w("\n— 2. probe timeout/DNS mati → down —");
mod._setDoctorHttpForTest(async () => { throw Object.assign(new Error("fetch failed"), { name: "TimeoutError" }); });
res = await mod.runBootDoctor();
let usgs = res.find(r => r.label === "USGS");
t("network timeout → down + reason", usgs?.status === "down" && usgs?.error === "timeout", JSON.stringify(usgs));
mod._setDoctorHttpForTest(async (url, opts = {}) => {
  const u = String(url);
  lastRequests.push({ url: u, opts });
  const host = u.replace(/^https?:\/\//, "").split("/")[0];
  const r = RESP[host];
  if (!r) return new Response("{}", { status: 200 });
  return new Response(r.body || "", { status: r.status });
});

w("\n— 3. laporan: kelompok + format (fixture mix) —");
const fixture = [
  { label: "Cuki API", features: ".gita .gpt4o", kind: "key", keyName: "cuki", host: "api.cuki.biz.id", status: "key_invalid", httpStatus: 401 },
  { label: "Termai", features: ".logicbell", kind: "key", keyName: "termai", host: "api.termai.cc", status: "quota", httpStatus: 402 },
  { label: "MAGMA Indonesia", features: "gunung api", kind: "endpoint", host: "magma.esdm.go.id", status: "down", error: "timeout" },
  { label: "Pollinations", features: ".sdxl", kind: "endpoint", status: "endpoint_err", httpStatus: 404 },
  { label: "ZelAPI", features: "suite z", kind: "key", status: "ok" },
  { label: "Open-Meteo", features: "cuaca", kind: "endpoint", status: "ok" },
  { label: "StemSplit", features: ".vocalremover", kind: "key", status: "nokey" },
  { label: "Legacy IP-Gated API", features: "legacy fixture", kind: "key", keyName: "legacy", host: "legacy.example", status: "ip_gate", httpStatus: 403, gateIp: "64.34.92.83" },
];
let report = mod.buildBootReport(fixture);
const R = norm(report);
t("laporan tanpa garis drawing box (aturan owner)", !/[│╭╮╰]/.test(report), "masih ada garis");
t("laporan ada header Boot Doctor", R.includes("boot doctor"), R.slice(0, 60));
t("laporan sebut APIKEY EXPIRED untuk key_invalid", R.includes("apikey expired"), R.slice(0, 120));
t("laporan: ip_gate → kategori 'IP BOT BELUM DIWHITELIST'", R.includes("belum diwhitelist"), R.slice(0, 200));
t("laporan ip_gate: key valid, gak disuruh ganti key", R.includes("tidak perlu ganti key"), R.slice(0, 300));
t("laporan ip_gate: IP bot ditunjuk", R.includes("64.34.92.83"), R.slice(0, 300));
t("laporan: ip_gate GAK masuk hint key bermasalah (key-nya valid)",
  !(R.includes("key bermasalah") && R.match(/key bermasalah[^]*legacy/)), R.slice(0, 400));
t("laporan sebut ENDPOINT DOWN", R.includes("endpoint down"), R.slice(0, 120));
const reportAllOk = mod.buildBootReport(res.map(r => ({ ...r, status: "ok", error: undefined })));
const ROK = norm(reportAllOk);
t("semua sehat → pesan sehat 🎉", ROK.includes("sehat") && !ROK.includes("expired"), ROK.slice(0, 120));
t("laporan itung key kosong (fixture 1 nokey)", R.includes("key kosong"), R.slice(0, 160));
t("laporan kasih hint ganti key + .reloadkey", R.includes("reloadkey") || R.includes("sehat"), R.slice(0, 140));
// FIX 19 Sep: laporan wajib nyebut NAMA SITUS (domain endpoint) + nama key apikeys.json
t("laporan nyebut domain rest api yg di-probe (api.cuki.biz.id)", R.includes("api.cuki.biz.id"), R.slice(0, 200));
t("laporan nyebut nama key persis apikeys.json (key apikeys.json: cuki)", R.includes("key apikeys.json: cuki"), R.slice(0, 200));
t("hint ganti key nyebut DAFTAR key bermasalah (cuki, termai)", R.includes("cuki, termai"), R.slice(0, 240));
// FIX 19 Sep (owner: g bsa bedain nama rest api vs nama fitur) — label eksplisit
t("baris rest api & fitur DIPISAH label eksplisit (Rest API:)", R.includes("rest api:"), R.slice(0, 240));
t("baris fitur berlabel (Fitur kena dampak:)", R.includes("fitur kena dampak:"), R.slice(0, 240));
t("endpoint gratis diberi label (tanpa key)", R.includes("tanpa key"), R.slice(0, 240));
// FIX OWNER 20 Sep: tiap info satu baris sendiri + jarak antar item + jam detik bawah
// revisi 9 Okt: gaya promosi AI — item kini pakai bullet ▪ + label *bold*
t("revisi 9 Okt: item pakai bullet ▪ + label bold (gaya promo AI)", /▪ \*cuki api\*/i.test(R) && !/•/.test(R), R.slice(0, 240));
t("revisi: Rest API & Key apikeys.json DIPISAH dua baris", !/rest api:[^]*·[^]*key apikeys/i.test(R) && /rest api: api\.cuki\.biz\.id/i.test(fromSC(R)), R.slice(0, 260));
t("revisi: ada JARAK (baris kosong) antar item dalam kategori", /\n\n[^\n]*:/i.test(fromSC(R).replace(/\n\n[^\n]*\(/g, "\nX(")), fromSC(R).slice(0, 300));
t("revisi: jam + DETIK di bawah (🕒 HH.MM.SS), gak nempel di atas", /🕒 \d\d\.\d\d\.\d\d/.test(R) && !R.includes("WIB"), R.slice(-200));

w("\n— 4. throttle + kirim DM owner —");
// reset state baru
fs.rmSync(tmpState, { force: true });
let sentReports = [];
mod._setBootDoctorSockForTest({ sendMessage: async (jid, payload) => sentReports.push({ jid, payload }) });
mod._setBootDoctorSentHookForTest(r => sentReports.push({ hook: r }));

let out1 = await mod.runAndReport({ send: true });
t("boot 1: laporan terkirim ke DM owner", out1.sent === true && sentReports.length >= 1, JSON.stringify(out1).slice(0, 120));
const jid1 = sentReports.find(s => s.jid)?.jid;
t("DM dituju ke JID owner @s.whatsapp.net", typeof jid1 === "string" && jid1.endsWith("@s.whatsapp.net"), jid1);

// boot 2 langsung (laporan sama, < 30 mnt) → GAK kirim (anti-spam restart loop)
const out2 = await mod.runAndReport({ send: true });
t("boot 2 mnt berikut (laporan sama) → DIBISUIN throttle", out2.sent === false, "harusnya false");

// laporaan BERUBAH → kirim walau throttle
respond("api.cuki.biz.id", 200, '{"success":true}');
const out3 = await mod.runAndReport({ send: true });
t("laporan berubah → tetap dikirim walau < 30 mnt", out3.sent === true);

// toggle off → gak kirim
mod.setBootDoctorEnabled(false);
const out4 = await mod.runAndReport({ send: true });
t("toggle off → gak kirim DM", out4.sent === false);
mod.setBootDoctorEnabled(true);
const st = mod.getBootDoctorStatus();
t("status: enabled + lastRun + lastSummary terisi", st.enabled === true && st.lastRun > 0 && st.lastSummary.length > 0, JSON.stringify(st).slice(0, 140));

w("\n— 5. registry & kirim DM beneran (mock sock) —");
lastRequests = [];
await mod.runBootDoctor();
const hosts = lastRequests.map(r => r.url.replace(/^https?:\/\//, "").split("/")[0]);
t("probe 22 apikey endpoint + 10 endpoint gratis", lastRequests.length >= 30, "jumlah: " + lastRequests.length);
t("ada probe Bearer (groq/fazzcode/tio)", lastRequests.some(r => r.opts?.headers?.Authorization?.startsWith("Bearer")), "header Bearer gak kesamber");
t("ada probe API-KEY (min1ai)", lastRequests.some(r => r.opts?.headers?.["API-KEY"]), "header API-KEY gak kesamber");
t("key kosong di pusat (fishaudio/autoresbot) di-resolve kosong → probe jadi nokey", mod._resolveKeyForTest("fishaudio") === "" && mod._resolveKeyForTest("autoresbot") === "", "resolver harusnya kosong utk key yang emang kosong");
t("key terisi di pusat ter-resolve (min1ai/zelapi)", mod._resolveKeyForTest("min1ai").length > 10 && mod._resolveKeyForTest("zelapi").length > 3, "key pusat gak kebaca");

w("\n— 6. import plugin .bootdoctor (named export) —");
const plugUrl = pathToFileURL(path.join(REPO, "plugins/bot/bootdoctor.js")).href;
const plug = await import(plugUrl);
t("plugin export named config + handler", typeof plug.config === "object" && typeof plug.handler === "function");
t("plugin default export utuh", plug.default?.pluginConfig?.name === "bootdoctor");
t("plugin owner-only + isEnabled", plug.config.isOwner === true && plug.config.isEnabled === true);
t("alias .doctor .healthcheck ada", plug.config.alias.includes("doctor") && plug.config.alias.includes("healthcheck"));

w("\n— 7. hook terpasang di connection.js —");
const connSrc = fs.readFileSync(path.join(REPO, "src/connection.js"), "utf8");
t("connection.js manggil initBootDoctor pas open + flag firstPairing", connSrc.includes("rara-boot-doctor.js") && connSrc.includes("initBootDoctor(sock, { firstPairing: !alreadyRegistered })"), "hook gak ketemu");

w("\n— 8. seksi SALURAN WA (finalisasi 25 Sep) —");
// 8a: backward compat — buildBootReport TANPA extraLines → gak ada seksi saluran
const noExtra = norm(mod.buildBootReport(fixture));
t("8a. tanpa extraLines → laporan polos TANPA seksi saluran", !noExtra.includes("saluran wa"), noExtra.slice(-120));
// 8b: extraLines → seksi SALURAN WA muncul
const withExtra = norm(mod.buildBootReport(fixture, ["baris tes saluran"]));
t("8b. extraLines → seksi 📡 SALURAN WA muncul + baris masuk", withExtra.includes("saluran wa") && withExtra.includes("baris tes saluran"), withExtra.slice(-200));
// 8c: runAndReport TANPA db init → fallback jujur (boot doctor gak boleh mati)
fs.rmSync(tmpState, { force: true });
mod._setBootDoctorSockForTest(null);
const outSal1 = await mod.runAndReport({ send: false });
const R1 = norm(outSal1.report);
t("8c. runAndReport tanpa db → seksi saluran fallback jujur 'gak bisa dicek'", R1.includes("saluran wa") && R1.includes("gak bisa dicek"), R1.slice(-200));
// 8d: db init + state hub → modul kebaca di laporan
const { initDatabase, getDatabase } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-database.js")).href);
await initDatabase(path.join(os.tmpdir(), "bootdoctor-saluran-db-" + Date.now() + ".json"));
const dbr = getDatabase();
const { ensureHubState } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-saluran-hub.js")).href);
const hub = ensureHubState(dbr);
hub.autopost.on = true; hub.autopost.jam = "09:30"; hub.autopost.topic = "tips bot";
hub.react.on = true;
hub.reply.on = true; hub.reply.rules.push({ key: "menu", text: "ketik .menu", hits: 0 });
dbr.setting("saluranNotify_premiumAdd", true);
dbr.save?.();
mod._setBootDoctorSockForTest({ sendMessage: async () => true });
const outSal2 = await mod.runAndReport({ send: false });
const R2 = norm(outSal2.report);
t("8d. autopost ON 09:30 + topic kebaca di laporan", R2.includes("autopost") && R2.includes("09:30") && R2.includes("tips bot"), R2.slice(-300));
t("8e. auto-react ON kebaca", R2.includes("auto-react") && /on/.test(R2.slice(R2.indexOf("auto-react"), R2.indexOf("auto-react") + 40)), R2.slice(-240));
t("8f. auto-reply 1 rule kebaca", R2.includes("auto-reply") && R2.includes("1 rule"), R2.slice(-240));
t("8g. autobroadcast 1/15 event ON kebaca (serverCreated = event ke-15)", R2.includes("autobroadcast") && /1\/1[0-9]/.test(R2), R2.slice(-240));
t("8h. seksi saluran gak ganggu klasifikasi utama (endpoint down tetep ada)", R2.includes("endpoint down"), R2.slice(0, 160));


// ── 9. SEKALI SAJA PAS PAIRING PERTAMA (fix 9 Okt: hemat limit fitur) ──
w("\n— 9. auto-cek boot sekali saja (pairing pertama) —");
const sab = mod.shouldAutoBootCheck;
t("9a. shouldAutoBootCheck terekspor", typeof sab === "function");
if (typeof sab === "function") {
  t("9b. state kosong (fresh install) → jalan", sab({}, false) === true);
  t("9c. udah autoBootDone + boot biasa → SKIP (hemat kuota)", sab({ autoBootDone: true }, false) === false, "harus false");
  t("9d. udah autoBootDone TAPI pairing pertama (re-pair) → jalan sekali lagi", sab({ autoBootDone: true }, true) === true);
  t("9e. enabled false (bootdoctor off) → SKIP total walau pairing pertama", sab({ enabled: false }, true) === false && sab({ enabled: false }, false) === false);
  t("9f. enabled true + belum pernah → jalan", sab({ enabled: true, autoBootDone: false }, false) === true);
}
const libSrc = fs.readFileSync(path.join(REPO, "src/lib/rara-boot-doctor.js"), "utf8");
t("9g. initBootDoctor pakai guard shouldAutoBootCheck SEBELUM setTimeout probe", /if \(!shouldAutoBootCheck\(st, firstPairing\)\)/.test(libSrc), "guard gak ketemu");
t("9h. setelah auto run pertama, autoBootDone dicatet ke state", /autoBootDone = true/.test(libSrc), "persist flag gak ketemu");
t("9i. connection.js deteksi pairing pertama dari creds.registered", connSrc.includes("state.creds.registered === true") && connSrc.includes("firstPairing: !alreadyRegistered"), "deteksi pairing gak ketemu");
const plugSrc = fs.readFileSync(path.join(REPO, "plugins/bot/bootdoctor.js"), "utf8");
t("9j. kartu status nunjukin mode sekali-pairing (label bold gaya promo)", plugSrc.includes("*Mode:* sekali saat pairing pertama"), "baris mode gak ketemu");
t("9k. pesan .bootdoctor off gak lagi bilang 'cek tetap jalan pas boot'", !plugSrc.includes("Cek tetap jalan pas boot"), "pesan lama masih ada");
t("9l. getBootDoctorStatus expose autoBootDone", "autoBootDone" in mod.getBootDoctorStatus());
t("9m. kartu status gaya promo: seksi *STATUS* + bullet ▪ + divider", plugSrc.includes("🩺 *STATUS*") && plugSrc.includes("▪ *Auto-cek pas boot:*") && plugSrc.includes("📊 *RIWAYAT*"), "struktur promo gak ketemu");
t("9n. semua kartu handler bebas '— ' dobel-dash nyambung di judul seksi", !/"\*[A-Z ]+ — \*"/.test(plugSrc));

fs.rmSync(tmpState, { force: true });
w("\n═══════ BOOT DOCTOR E2E: " + pass + " pass · " + fail + " fail ═══════\n");
process.exit(fail ? 1 : 0);
