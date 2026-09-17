// E2E BOOT DOCTOR (17 Sep 2026) — cek kesehatan fitur pas bot nyala/restart.
// Fitur: nova-boot-doctor.js (probe apikey + endpoint gratis, klasifikasi,
// laporan DM owner + throttle) + plugins/owner/bootdoctor.js (.bootdoctor).
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

const libUrl = pathToFileURL(path.join(REPO, "src/lib/nova-boot-doctor.js")).href;
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

respond("api.termai.cc", 429, "rate limit");
res = await mod.runBootDoctor();
let termai = res.find(r => r.label === "Termai");
t("HTTP 429 → ratelimit", termai?.status === "ratelimit", JSON.stringify(termai));

respond("api.termai.cc", 402, "quota exceeded");
res = await mod.runBootDoctor();
termai = res.find(r => r.label === "Termai");
t("HTTP 402 → quota", termai?.status === "quota", JSON.stringify(termai));

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
  { label: "Cuki API", features: ".gita .gpt4o", kind: "key", status: "key_invalid", httpStatus: 401 },
  { label: "Termai", features: ".logicbell", kind: "key", status: "quota", httpStatus: 402 },
  { label: "MAGMA Indonesia", features: "gunung api", kind: "endpoint", status: "down", error: "timeout" },
  { label: "Pollinations", features: ".sdxl", kind: "endpoint", status: "endpoint_err", httpStatus: 404 },
  { label: "ZelAPI", features: "suite z", kind: "key", status: "ok" },
  { label: "Open-Meteo", features: "cuaca", kind: "endpoint", status: "ok" },
  { label: "Betabotz", features: ".togif", kind: "key", status: "nokey" },
];
let report = mod.buildBootReport(fixture);
const R = norm(report);
t("laporan tanpa garis drawing box (aturan owner)", !/[│╭╮╰]/.test(report), "masih ada garis");
t("laporan ada header Boot Doctor", R.includes("boot doctor"), R.slice(0, 60));
t("laporan sebut APIKEY EXPIRED untuk key_invalid", R.includes("apikey expired"), R.slice(0, 120));
t("laporan sebut ENDPOINT DOWN", R.includes("endpoint down"), R.slice(0, 120));
const reportAllOk = mod.buildBootReport(res.map(r => ({ ...r, status: "ok", error: undefined })));
const ROK = norm(reportAllOk);
t("semua sehat → pesan sehat 🎉", ROK.includes("sehat") && !ROK.includes("expired"), ROK.slice(0, 120));
t("laporan itung key kosong (fixture 1 nokey)", R.includes("key kosong"), R.slice(0, 160));
t("laporan kasih hint ganti key + .reloadkey", R.includes("reloadkey") || R.includes("sehat"), R.slice(0, 140));

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
const plugUrl = pathToFileURL(path.join(REPO, "plugins/owner/bootdoctor.js")).href;
const plug = await import(plugUrl);
t("plugin export named config + handler", typeof plug.config === "object" && typeof plug.handler === "function");
t("plugin default export utuh", plug.default?.pluginConfig?.name === "bootdoctor");
t("plugin owner-only + isEnabled", plug.config.isOwner === true && plug.config.isEnabled === true);
t("alias .doctor .healthcheck ada", plug.config.alias.includes("doctor") && plug.config.alias.includes("healthcheck"));

w("\n— 7. hook terpasang di connection.js —");
const connSrc = fs.readFileSync(path.join(REPO, "src/connection.js"), "utf8");
t("connection.js manggil initBootDoctor pas open", connSrc.includes("nova-boot-doctor.js") && connSrc.includes("initBootDoctor(sock)"), "hook gak ketemu");

fs.rmSync(tmpState, { force: true });
w("\n═══════ BOOT DOCTOR E2E: " + pass + " pass · " + fail + " fail ═══════\n");
process.exit(fail ? 1 : 0);
