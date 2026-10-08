// RARA — E2E: MINI DASHBOARD OWNER WEB (25 Sep 2026, fitur "bot masa depan" no.5)
// Server HTTP beneran (port random) + db nyata (temp dir) — bukan mock rerata:
// fetch asli ke 401/200, JSON shape, HTML statis, idempotensi, stop, plugin.
// Skill 5.5: server WAJIB di-stop di akhir biar proses exit (bukan exit 124).
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-dashboard-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const lib = await import(R + "/src/lib/rara-dashboard.js");
const {
  initDashboardServer, stopDashboardServer, getDashboardStatus,
  regenDashboardToken, setDashboardPort, setDashboardEnabled,
  buildDashboardStats, ensureDashboardConfig,
  _getDashboardServerForTest, _setDashboardSockForTest, _resetDashboardForTest,
} = lib;
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const { handler, config } = await import(R + "/plugins/owner/dashboard.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 260))); ok ? pass++ : fail++; };

// helper fetch bawa timeout (skill: async harus terminate)
async function jget(url, opts = {}, ms = 4000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, ...opts });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: r.status, headers: r.headers, text, json };
  } finally { clearTimeout(t); }
}

function mkM(text, opts = {}) {
  const m = {
    text, args: text.trim().split(/\s+/).slice(1),
    reply: async (t) => { m.replies.push(String(t)); return t; },
    react: async () => {},
    replies: [], isGroup: !!opts.isGroup,
  };
  return m;
}
const { fromSC } = await import(R + "/src/lib/styler.js"); // fromSC kanonik (glyph IPA di luar [ᴀ-ᴢ])

const section = (t) => w("\n" + t);

// ══ 1. config default ════════════════════════════════════════════════════════
section("1. config persist (db.setting) — auto token, port, enabled");

let cfg = ensureDashboardConfig();
check("1a. token dibuat otomatis (hex 48)", /^[a-f0-9]{48}$/.test(cfg.token), cfg.token);
check("1b. port default 8081 / env", cfg.port === 8081, cfg.port);
check("1c. enabled default true", cfg.enabled === true);
const tok1 = cfg.token;

cfg = ensureDashboardConfig();
check("1d. idempoten — token gak berubah", cfg.token === tok1);

const db = getDatabase();
check("1e. persist di settings store", (db.setting("dashboard") || {}).token === tok1);

// ══ 2. server + auth ════════════════════════════════════════════════════════
section("2. server HTTP + token auth");

await _resetDashboardForTest();
db.setting("dashboard", { token: tok1, port: 18000 + Math.floor(Math.random() * 2000), enabled: true }); // port random biar gak nabrak suite lain
const srv = await initDashboardServer();
check("2a. server jalan", Boolean(srv && srv.listening));
const port = srv.address().port;
const base = "http://127.0.0.1:" + port;

const r401 = await jget(base + "/api/stats");
check("2b. tanpa token → 401", r401.status === 401, r401.status);
const r401b = await jget(base + "/api/stats?token=salahbanget");
check("2c. token salah → 401", r401b.status === 401, r401b.status);
const r401c = await jget(base + "/?token=hehe");
check("2d. halaman root token salah → 401 gate", r401c.status === 401 && /token wajib/i.test(r401c.text), r401c.status);

const r200 = await jget(base + "/api/stats?token=" + tok1);
check("2e. token bener → 200 JSON", r200.status === 200 && r200.json?.ok === true, r200.status + " " + r200.text.slice(0, 80));

const rBear = await jget(base + "/api/stats", { headers: { Authorization: "Bearer " + tok1 } });
check("2f. header Bearer juga diterima", rBear.status === 200 && rBear.json?.ok === true, rBear.status);

// ══ 3. bentuk data ═══════════════════════════════════════════════════════════
section("3. /api/stats — bentuk data + jujur kosong");

const s = r200.json;
check("3a. bot block lengkap", s.bot && ["name", "version", "waStatus", "waJid", "platform", "node"].every((k) => k in s.bot), JSON.stringify(s.bot));
check("3b. system block + angka sehat", s.system && Number.isFinite(s.system.uptimeSec) && s.system.ramPct >= 0 && s.system.ramTotalGb > 0, JSON.stringify(s.system));
check("3c. users block jujur kosong (db baru)", s.users.users === 0 && s.users.groups === 0 && s.users.premium === 0, JSON.stringify(s.users));
check("3d. activity block ada semua key", ["messagesSent", "messagesReceived", "scheduledSent", "dailyResets"].every((k) => k in s.activity), JSON.stringify(s.activity));
check("3e. health block (belum ada cek → null)", s.health.ok === null && s.health.summary === "-", JSON.stringify(s.health));
check("3f. dashboard block port+enabled", s.dashboard.port > 0 && s.dashboard.enabled === true, JSON.stringify(s.dashboard));

// data live berubah? counter naik → stats naik
db.incrementStat("messagesSent", 5);
db.incrementStat("messagesReceived", 2);
const r3 = await jget(base + "/api/stats?token=" + tok1);
check("3g. data live — counter db kebaca di API", r3.json.activity.messagesSent === 5 && r3.json.activity.messagesReceived === 2, JSON.stringify(r3.json.activity));

db.data.users["123@s.whatsapp.net"] = { name: "budi" };
db.data.users["456@s.whatsapp.net"] = { name: "siti" };
db.data.premium = ["123@s.whatsapp.net"];
const r4 = await jget(base + "/api/stats?token=" + tok1);
check("3h. user terdaftar kehitung", r4.json.users.users === 2, r4.json.users.users);
check("3i. premium kehitung", r4.json.users.premium === 1, r4.json.users.premium);

// ══ 4. route lain ════════════════════════════════════════════════════════════
section("4. route pulse / root / 404 / 405");

const rp = await jget(base + "/api/pulse?token=" + tok1);
check("4a. /api/pulse kecil ok", rp.status === 200 && rp.json.ok === true && typeof rp.json.time === "number");
const rroot = await jget(base + "/?token=" + tok1);
check("4b. root → HTML dashboard", rroot.status === 200 && /Rara Owner Dashboard/.test(rroot.text) && /api\/stats/.test(rroot.text), rroot.status);
check("4c. HTML: data via textContent (anti-XSS)", /textContent/.test(rroot.text) && !/innerHTML/.test(rroot.text));
check("4d. HTML: auto-refresh 5 dtk", /setInterval\(load, 5000\)/.test(rroot.text));
check("4e. HTML: gak ada CDN eksternal", !/src="http|href="http/.test(rroot.text));
check("4f. CSP header ketat", /default-src 'none'/.test(rroot.headers.get("content-security-policy") || ""), rroot.headers.get("content-security-policy"));
const r404 = await jget(base + "/ngapain?token=" + tok1);
check("4g. path gak dikenal → 404", r404.status === 404, r404.status);
const r405 = await jget(base + "/api/stats?token=" + tok1, { method: "POST", body: "x" });
check("4h. POST → 405 method not allowed", r405.status === 405, r405.status);

// ══ 5. idempotensi + restart ════════════════════════════════════════════════
section("5. idempotensi + regen + port");

const srv2 = await initDashboardServer();
check("5a. init dobel → server sama (idempoten)", srv2 === srv);
check("5b. status running + url", getDashboardStatus().running === true && getDashboardStatus().port > 0);

const tok2 = regenDashboardToken();
const rOld = await jget(base + "/api/stats?token=" + tok1);
const rNew = await jget(base + "/api/stats?token=" + tok2);
check("5c. regen: token lama MATI", rOld.status === 401, rOld.status);
check("5d. regen: token baru JALAN", rNew.status === 200, rNew.status);

const rpBad = await setDashboardPort("bukan-angka");
check("5e. port invalid ditolak jujur", rpBad.ok === false && /1-65535/.test(rpBad.msg), rpBad.msg);
const rp0 = await setDashboardPort(0);
check("5f. port 0 ditolak (falsy trap: 0 bukan port valid)", rp0.ok === false, JSON.stringify(rp0));

// ══ 6. on/off runtime ════════════════════════════════════════════════════════
section("6. on/off runtime (server hidup-mati)");

const roff = await setDashboardEnabled(false);
check("6a. off sukses", roff.ok === true && roff.msg === "dimatikan", JSON.stringify(roff));
await new Promise((r) => setTimeout(r, 150));
let dead = false;
try { await jget(base + "/api/pulse?token=" + tok2, {}, 1500); } catch { dead = true; }
check("6b. server beneran mati (fetch gagal)", dead === true);
check("6c. status.running false setelah off", getDashboardStatus().running === false);
check("6d. config enabled=false persist", getDatabase().setting("dashboard").enabled === false);

const ron = await setDashboardEnabled(true);
check("6e. on lagi → server baru jalan", ron.ok === true && getDashboardStatus().running === true, JSON.stringify(ron));
const rAfter = await jget("http://127.0.0.1:" + getDashboardStatus().port + "/api/pulse?token=" + tok2);
check("6f. pulse jalan lagi di port baru", rAfter.status === 200 && rAfter.json.ok === true, rAfter.status);

// ══ 7. plugin .dashboard (WA) ════════════════════════════════════════════════
section("7. plugin .dashboard — command WA (owner-only)");

check("7a. config plugin benar", config.name === "dashboard" && config.isOwner === true && Array.isArray(config.alias));
check("7b. alias lama terdaftar", config.alias.includes("dashowner"));

const mGrp = mkM(".dashboard token", { isGroup: true });
await handler(mGrp);
const grpReply = fromSC(mGrp.replies[0] || "");
check("7c. token di GRUP ditolak", /chat pribadi/i.test(grpReply) && !mGrp.replies[0].includes(tok2), grpReply.slice(0, 120));

const mTok = mkM(".dashboard token");
await handler(mTok);
const tokReply = mTok.replies.join("\n");
check("7d. token di DM dikirim DALAM CODE FENCE (kebal smallcaps)", tokReply.includes("```\n" + tok2 + "\n```"), tokReply.slice(0, 150));
check("7e. guide desain lama 『 *Dashboard* 』 (plain text, tanpa kaomoji)", /『 \*Dashboard\* 』/.test(tokReply) && !/୨୧/.test(tokReply) && !/dashboard!!/.test(tokReply), tokReply.slice(0, 100));

const mSt = mkM(".dashboard");
await handler(mSt);
check("7f. status default nampilin state jalan + port", fromSC(mSt.replies[0]).includes(String(getDashboardStatus().port)), mSt.replies[0].slice(0, 160));
check("7g. status DM kasih token dalam fence", mSt.replies[0].includes("```\n" + tok2 + "\n```"));

const mGrpSt = mkM(".dashboard", { isGroup: true });
await handler(mGrpSt);
check("7h. status di GRUP: token disamarkan", !mGrpSt.replies[0].includes(tok2) && mGrpSt.replies[0].includes("•••"), mGrpSt.replies[0].slice(0, 160));

const mPort = mkM(".dashboard port");
await handler(mPort);
check("7i. .dashboard port tanpa angka → contoh", fromSC(mPort.replies[0]).includes("port 9090"), mPort.replies[0].slice(0, 160));

// ══ 8. wiring statis ════════════════════════════════════════════════════════
section("8. wiring statis (scheduler + engine + plugin)");

const ix = fs.readFileSync(path.join(R, "index.js"), "utf8");
check("8a. schedulerInits 'Dashboard' kepasang", ix.includes('"Dashboard"') && ix.includes("rara-dashboard.js"));
const eng = fs.readFileSync(path.join(R, "src/lib/rara-dashboard.js"), "utf8");
check("8b. engine: timingSafeEqual dipakai", eng.includes("timingSafeEqual"));
check("8c. engine: port sibuk gak crash (resolve null)", /once\("error"/.test(eng) && eng.includes("resolve(null)"));
check("8d. engine: bind 0.0.0.0 + header nosniff", eng.includes('"0.0.0.0"') && eng.includes("nosniff"));

// ══ 9. cleanup — server WAJIB mati biar exit 0 (skill 5.5) ══════════════════
section("9. cleanup");
const stopOk = await stopDashboardServer();
check("9a. stopDashboardServer bersih", stopOk === true && _getDashboardServerForTest() === null);
await new Promise((r) => setTimeout(r, 150));
let dead2 = false;
try { await jget("http://127.0.0.1:" + getDashboardStatus().port + "/api/pulse?token=" + tok2, {}, 1500); } catch { dead2 = true; }
check("9b. semua koneksi tertutup", dead2 === true);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail > 0 ? 1 : 0);
