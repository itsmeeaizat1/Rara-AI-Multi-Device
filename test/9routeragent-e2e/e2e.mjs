// RARA AI - MULTI DEVICE — E2E: 9ROUTERAGENT LOKAL (AI coding agent via 9router
// LOKAL, owner 6 Okt 2026 — ".ocode tetap v2, buat lg cmd baru .9routeragent")
// Verifikasi: adapter localChat9Router (mapping + model ngikut otak agent),
// gate router lokal, gate owner, popup izin per file (.9routeragentizin),
// laporan, undo, model persist, status card.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; }
  else { fail++; console.error("  \u274c " + name, info !== undefined ? JSON.stringify(info) : ""); }
}

// ── workspace temp (repo root palsu) ──
const ws = fs.mkdtempSync(path.join(os.tmpdir(), "r9agent-e2e-"));
const bk = path.join(ws, "storage", "ocode", "backups");
fs.writeFileSync(path.join(ws, "fitur.js"), "export function halo() {\n  return 'halo';\n}\n");
fs.mkdirSync(path.join(ws, "src", "lib", "config", "apikey"), { recursive: true });
fs.writeFileSync(path.join(ws, "src", "lib", "config", "apikey", "apikeys.json"), '{"router9v2":"sk-rahasia"}');
fs.writeFileSync(path.join(ws, ".env"), "SECRET=1");

const agent = await import(R + "/src/lib/rara-ocode-agent.js");
const brain = await import(R + "/src/lib/rara-agent-brain.js");
agent._setOcodePathsForTest({ root: ws, backupDir: bk });

function wrap(txt) { return "```ocode\n" + txt + "\n```"; }

// ═══ SECTION 1: adapter localChat9Router — mapping ke router9Chat lokal ═══
console.log("\n— section 1: adapter 9router lokal —");
{
  const captured = [];
  agent._setOcodeLocalChatForTest(async (cfg) => { captured.push(cfg); return { text: "OK" }; });
  brain.setBrainModel("alicode-intl/uji");
  const rr = await agent.localChat9Router({
    messages: [
      { role: "system", content: "KAMU AGENT." },
      { role: "user", content: "Tugas: uji" },
      { role: "assistant", content: "aksi pertama" },
      { role: "user", content: "HASIL AKSI: x" },
    ],
    maxTokens: 123, temperature: 0.2,
  });
  t("1a. hasil chat diteruskan utuh", rr?.text === "OK", rr);
  t("1b. system diekstrak dari messages", captured[0]?.system === "KAMU AGENT.", captured[0]?.system);
  t("1c. user terakhir = pesan aktif", captured[0]?.user === "HASIL AKSI: x", captured[0]?.user);
  t("1d. history = tengah (tanpa system/user-aktif)", captured[0]?.history?.length === 2 && captured[0].history[0].content === "Tugas: uji", captured[0]?.history);
  t("1e. model default NGIKUT otak agent (getBrainModel)", captured[0]?.model === "alicode-intl/uji", captured[0]?.model);
  t("1f. maxTokens + temperature diteruskan", captured[0]?.maxTokens === 123 && captured[0]?.temperature === 0.2, captured[0]);
  // model eksplisit menang atas otak
  await agent.localChat9Router({ messages: [{ role: "user", content: "tes" }], model: "gemini/gemini-3.8-flash" });
  t("1g. model eksplisit menang atas default", captured[1]?.model === "gemini/gemini-3.8-flash", captured[1]?.model);
  brain._resetBrainForTest();
}

// ═══ SECTION 2: runOcodeAgent + chatOverride lokal (loop penuh) ═══
console.log("\n— section 2: loop agent via adapter lokal —");
{
  let i = 0;
  const script = [
    wrap('{"action":"read","path":"fitur.js"}'),
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'halo lokal\';"}'),
    wrap('{"action":"done","summary":"editan lokal sukses.","files":["fitur.js"]}'),
  ];
  let userKe2 = "";
  agent._setOcodeLocalChatForTest(async (cfg) => {
    if (i > 0) userKe2 = cfg.user; // user aktif iterasi ke-2 = HASIL AKSI
    const step = script[Math.min(i, script.length - 1)];
    i++;
    return { text: step, model: "uji-lokal", latencyMs: 1 };
  });
  const r = await agent.runOcodeAgent({
    task: "ubah halo jadi halo lokal",
    model: "alicode-intl/uji",
    chat: agent.localChat9Router,
  });
  t("2a. loop selesai tanpa error", !r.error, r.error);
  t("2b. 3 iterasi (read→edit→done)", r.iterations === 3, r.iterations);
  t("2c. file beneran berubah", fs.readFileSync(path.join(ws, "fitur.js"), "utf8").includes("halo lokal"));
  t("2d. hasil aksi dibalikin sebagai user aktif", /HASIL AKSI/.test(userKe2 || ""), userKe2?.slice(0, 40));
  t("2e. backup otomatis dibuat", fs.existsSync(bk) && fs.readdirSync(bk).length > 0);
}

// ═══ SECTION 3: plugin .9routeragent (gate owner + router + izin + laporan) ═══
console.log("\n— section 3: plugin —");
const { getDatabase, initDatabase } = await import(R + "/src/lib/rara-database.js");
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "r9agent-e2e-db-"));
await initDatabase(path.join(dbDir, "db"));
const plugin = await import(R + "/plugins/ai-agent/9routeragent.js");
plugin._setRouter9AgentGateForTest(async () => true);

fs.writeFileSync(path.join(ws, "fitur.js"), "export function halo() {\n  return 'halo';\n}\n");
agent._setOcodePathsForTest({ root: ws, backupDir: bk });

function mkChat(script) {
  let i = 0;
  return async (cfg) => {
    const step = script[Math.min(i, script.length - 1)];
    i++;
    return { text: typeof step === "function" ? step(cfg) : step, model: "lokal", latencyMs: 1 };
  };
}
const replies = [];
const reactions = [];
const mkM = (args, isOwner) => ({
  isOwner, chat: "628owner@s.whatsapp.net", args,
  react: async (e) => { reactions.push(e); return e; },
  reply: async (txt) => { replies.push(String(txt)); return txt; },
});

// non-owner ditolak
let m = mkM(["edit", "fitur"], false);
await plugin.handler(m, { sock: null, args: ["edit", "fitur"] });
t("3a. non-owner DITOLAK tegas", /khusus owner/i.test(replies[0] || ""), replies[0]);

// tanpa args → help
replies.length = 0;
m = mkM([], true);
await plugin.handler(m, { sock: null, args: [] });
t("3b. tanpa tugas → panduan 9router lokal", /suruh aku ngoding/i.test(replies[0] || "") && /9router lokal/i.test(replies[0] || ""), replies[0]?.slice(0, 60));

// gate router lokal MATI → pesan jujur
replies.length = 0;
plugin._setRouter9AgentGateForTest(async () => false);
m = mkM(["tes", "tugas"], true);
await plugin.handler(m, { sock: null, args: ["tes", "tugas"] });
t("3c. 9router lokal mati → pesan .9router status/restart", /9Router LOKAL belum jalan/i.test(replies[0] || ""), replies[0]);
plugin._setRouter9AgentGateForTest(async () => true);

// tugas jalan → popup izin per file → klik Ijinkan → laporan + summary
agent._setOcodeLocalChatForTest(mkChat([
  wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'hai\';"}'),
  wrap('{"action":"done","summary":"editan lokal sukses.","files":["fitur.js"]}'),
]));
replies.length = 0;
m = mkM(["ubah", "halo", "jadi", "hai"], true);
const sent = [];
const sockMock = { sendMessage: async (jid, p) => { sent.push(p); return { key: { id: "x" } }; } };
const taskP = plugin.handler(m, { sock: sockMock, args: ["ubah", "halo", "jadi", "hai"] });
let popup = null;
for (let k = 0; k < 50 && !popup; k++) {
  await new Promise((res) => setTimeout(res, 100));
  popup = sent.find((p) => p?.interactiveMessage);
}
t("3d. popup izin muncul pas mau edit", !!popup, sent.length);
const popupStr = JSON.stringify(popup || {});
t("3e. popup nyebut file + tombol .9routeragentizin", /fitur\.js/.test(popup?.interactiveMessage?.body?.text || "") && popupStr.includes("9routeragentizin ya") && popupStr.includes("9routeragentizin tidak"), popupStr.slice(0, 120));
const mIzin = mkM(["izin", "ya"], true);
await plugin.handler(mIzin, { sock: sockMock, args: ["izin", "ya"] });
t("3f. izin ya → konfirmasi diijinkan", /diijinkan/i.test(replies.join("\n")), replies.slice(-3));
await taskP;
const report = replies.filter((x) => !/izin/i.test(x)).join("\n");
t("3g. laporan selesai muncul", /Laporan|Selesai/i.test(report), report.slice(0, 60));
t("3h. laporan nyebut model 9router lokal + hint undo", /9router lokal/i.test(report) && /undo/.test(report), report.slice(0, 160));
t("3i. isi file beneran keganti 'hai'", fs.readFileSync(path.join(ws, "fitur.js"), "utf8").includes("return 'hai';"));
t("3j. ringkasan agent dikirim", replies.length >= 2 && /editan|hai/i.test(replies[replies.length - 1] || ""), replies.length);

// status card
replies.length = 0;
m = mkM(["status"], true);
await plugin.handler(m, { sock: null, args: ["status"] });
const st = replies[0] || "";
t("3k. status nunjukin 9ROUTER LOKAL + gateway otomatis", /9ROUTER LOKAL|9router lokal/i.test(st) && /gateway otomatis/i.test(st), st.slice(0, 120));
t("3l. status nyebut model ngikut otak agent", /9router otak model/i.test(st), st.slice(0, 160));

// undo via plugin
replies.length = 0;
m = mkM(["undo"], true);
await plugin.handler(m, { sock: null, args: ["undo"] });
t("3m. .9routeragent undo balikin perubahan", /restore|di-restore|Backup/i.test(replies[0] || ""), replies[0]?.slice(0, 60));

// model persist
replies.length = 0;
m = mkM(["model", "gemini/gemini-3.8-flash"], true);
await plugin.handler(m, { sock: null, args: ["model", "gemini/gemini-3.8-flash"] });
t("3n. model persist di db (router9agent)", getDatabase().data?.router9agent?.model === "gemini/gemini-3.8-flash", getDatabase().data?.router9agent);
t("3o. router9AgentModel baca db", plugin.router9AgentModel(getDatabase()) === "gemini/gemini-3.8-flash");

// default model = otak agent saat db kosong
getDatabase().data.router9agent = {};
brain.setBrainModel("otak/x");
t("3p. default model ngikut getBrainModel", plugin.router9AgentModel(getDatabase()) === "otak/x", plugin.router9AgentModel(getDatabase()));
brain._resetBrainForTest();

// stop saat idle
replies.length = 0;
m = mkM(["stop"], true);
await plugin.handler(m, { sock: null, args: ["stop"] });
t("3q. stop saat idle → info gak ada tugas", /gak ada tugas/i.test(replies[0] || ""), replies[0]?.slice(0, 50));

// ═══ SECTION 4: lock shared ocode + 9routeragent (1 tugas global) ═══
console.log("\n— section 4: lock bersama —");
{
  let release;
  const gate = new Promise((res) => { release = res; });
  agent._setOcodeLocalChatForTest(async () => { await gate; return { text: "ngantuk" }; });
  const slow = agent.runOcodeAgent({ task: "tugas lama", chat: agent.localChat9Router });
  await new Promise((res) => setTimeout(res, 50));
  const second = await agent.runOcodeAgent({ task: "numpang", chat: agent.localChat9Router });
  t("4a. tugas kedua DITOLAK saat 9routeragent jalan", second.error === "masih ada tugas berjalan", second);
  const st = agent.stopOcode();
  t("4b. stopOcode membatalkan tugas jalan", st.ok === true, st);
  release();
  await slow;
}

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
