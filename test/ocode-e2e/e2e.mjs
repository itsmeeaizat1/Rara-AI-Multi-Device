// NOVA AI WHATSAPP BOT — E2E: OPENCODE 9ROUTER (AI coding agent via chat, owner 21 Sep 2026)
// Verifikasi: loop agent (read→edit→done), path jail, blacklist rahasia, backup+undo,
// lock 1 tugas, abort stop, gate owner, teks polos = ringkasan, plugin report.
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
const ws = fs.mkdtempSync(path.join(os.tmpdir(), "ocode-e2e-"));
const bk = path.join(ws, "storage", "ocode", "backups");
fs.writeFileSync(path.join(ws, "fitur.js"), "export function halo() {\n  return 'halo';\n}\n");
fs.mkdirSync(path.join(ws, "src", "lib", "config", "apikey"), { recursive: true });
fs.writeFileSync(path.join(ws, "src", "lib", "config", "apikey", "apikeys.json"), '{"router9v2":"sk-rahasia"}');
fs.writeFileSync(path.join(ws, ".env"), "SECRET=1");

const agent = await import(R + "/src/lib/nova-ocode-agent.js");
agent._setOcodePathsForTest({ root: ws, backupDir: bk });

function wrap(txt) { return "```ocode\n" + txt + "\n```"; }
function mkChat(script) {
  let i = 0;
  return async (cfg) => {
    const step = script[Math.min(i, script.length - 1)];
    i++;
    // verifikasi messages benar dikirim (system prompt ada, hasil aksi dibalikin)
    if (i > 1) {
      const last = cfg.messages[cfg.messages.length - 1];
      if (!/HASIL AKSI/.test(last.content)) throw new Error("e2e: hasil aksi gak dibalikin ke model");
    }
    return { text: typeof step === "function" ? step(cfg) : step, model: "test", latencyMs: 1 };
  };
}

// ═══ SECTION 1: loop agent happy path (read → edit → done) ═══
console.log("\n— section 1: loop agent —");
agent._setOcodeChatForTest(mkChat([
  wrap('{"action":"read","path":"fitur.js"}'),
  wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'halo dunia\';"}'),
  wrap('{"action":"done","summary":"Fitur diubah jadi halo dunia.","files":["fitur.js"]}'),
]));
let r = await agent.runOcodeAgent({ task: "ubah halo jadi halo dunia" });
t("1a. agent selesai tanpa error", !r.error, r.error);
t("1b. 3 iterasi (read→edit→done)", r.iterations === 3, r.iterations);
t("1c. file beneran berubah", fs.readFileSync(path.join(ws, "fitur.js"), "utf8").includes("halo dunia"));
t("1d. changed list nyebut fitur.js", (r.changed || []).includes("fitur.js"), r.changed);
t("1e. summary kebawa dari done", /halo dunia/.test(r.summary || ""), r.summary);
t("1f. backup otomatis dibuat", fs.existsSync(bk) && fs.readdirSync(bk).length > 0);

// ═══ SECTION 2: path jail + blacklist rahasia ═══
console.log("\n— section 2: keamanan —");
const luar = path.join(path.dirname(ws), "evil.txt");
agent._setOcodeChatForTest(mkChat([
  wrap('{"action":"write","path":"../evil.txt","content":"hacked"}'),
  wrap('{"action":"read","path":"src/lib/config/apikey/apikeys.json"}'),
  wrap('{"action":"write","path":".env","content":"HACK=1"}'),
  wrap('{"action":"run","cmd":"rm -rf /"}'),
  wrap('{"action":"done","summary":"tes blokir","files":[]}'),
]));
r = await agent.runOcodeAgent({ task: "tes blokir" });
t("2a. path jail: ../ DIBLOKIR (gak ada file di luar)", !fs.existsSync(luar));
t("2b. apikeys.json GAK bisa dibaca agent", !/halo dunia|sk-rahasia/.test(String(r.summary)), r.summary?.slice(0, 40));
t("2c. .env gak bisa ditulis", fs.readFileSync(path.join(ws, ".env"), "utf8") === "SECRET=1");
t("2d. shell aksi DITOLAK (mode aman)", r.iterations === 5 && !r.error, r);
t("2e. backup dir gak ikut ke-hitung file berubah", (r.changed || []).length === 0, r.changed);

// ═══ SECTION 3: undo restore ═══
console.log("\n— section 3: undo —");
{
  const u = agent.undoLast(ws);
  t("3a. undoLast balikin file terakhir", u.ok && u.restored.includes("fitur.js"), u);
  t("3b. isi file KEMBALI ke asli", fs.readFileSync(path.join(ws, "fitur.js"), "utf8").includes("return 'halo';"));
  t("3c. listBackups keisi", agent.listBackups(ws).length > 0);
}

// ═══ SECTION 4: teks polos = ringkasan + lock + stop ═══
console.log("\n— section 4: fallback & abort —");
agent._setOcodeChatForTest(mkChat(["Ini jawaban polos tanpa protokol."]));
r = await agent.runOcodeAgent({ task: "jawab aja" });
t("4a. jawaban polos → jadi summary, gak error", /jawaban polos/.test(r.summary || ""), r.summary);

// lock: chat gede yang gak selesai → spawn kedua harus ditolak
let release;
const gate = new Promise((res) => { release = res; });
agent._setOcodeChatForTest(async () => { await gate; return { text: "ngantuk" }; });
const slow = agent.runOcodeAgent({ task: "tugas lama" });
await new Promise((res) => setTimeout(res, 50));
t("4b. lock: tugas kedua DITOLAK saat ada yang jalan", (await agent.runOcodeAgent({ task: "numpang" })).error === "masih ada tugas berjalan");
const st = agent.stopOcode();
t("4c. stopOcode saat jalan → ok", st.ok === true);
release();
await slow;

// ═══ SECTION 5: plugin .ocode (gate owner + report + model) ═══
console.log("\n— section 5: plugin —");
{
  // GOTCHA: getDatabase() throw kalau belum init — wajib initDatabase(path
  // temp) DULU sebelum manggil handler plugin (di bot asli index.js udah init).
  const { getDatabase, initDatabase } = await import(R + "/src/lib/nova-database.js");
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocode-e2e-db-"));
  await initDatabase(path.join(dbDir, "db"));
  const { _setRouter9v2KeyForTest } = await import(R + "/src/scraper/router9v2.js");
  _setRouter9v2KeyForTest("sk-test");
  agent._setOcodePathsForTest({ root: ws, backupDir: bk });
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'hai\';"}'),
    wrap('{"action":"done","summary":"ubah ke hai","files":["fitur.js"]}'),
  ]));
  const plugin = await import(R + "/plugins/owner/ocode.js");
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
  t("5a. non-owner DITOLAK tegas", /khusus owner/i.test(replies[0] || ""), replies[0]);

  // tanpa args → help
  replies.length = 0;
  m = mkM([], true);
  await plugin.handler(m, { sock: null, args: [] });
  // GOTCHA: judul reply ke-smallcaps — asersi pakai teks isi yang gak ke-transform
  t("5b. .ocode tanpa tugas → panduan", /suruh aku ngoding/i.test(replies[0] || ""), replies[0]?.slice(0, 60));

  // tugas jalan → laporan + summary
  replies.length = 0;
  m = mkM(["ubah", "halo", "jadi", "hai"], true);
  const sent = [];
  await plugin.handler(m, {
    sock: { sendMessage: async (jid, p) => { sent.push(p); return { key: { id: "x" } }; } },
    args: ["ubah", "halo", "jadi", "hai"],
  });
  const report = replies.join("\n");
  t("5c. laporan selesai muncul", /Laporan|Selesai/i.test(report), report.slice(0, 60));
  t("5d. laporan nyebut file berubah + hint undo", /fitur\.js/.test(report) && /undo/.test(report), report.slice(0, 120));
  t("5e. isi file beneran keganti 'hai'", fs.readFileSync(path.join(ws, "fitur.js"), "utf8").includes("return 'hai';"));
  t("5f. ringkasan agent dikirim", replies.length >= 2 && /ubah ke hai/.test(replies[replies.length - 1]), replies.length);

  // .ocode undo via plugin
  replies.length = 0;
  m = mkM(["undo"], true);
  await plugin.handler(m, { sock: null, args: ["undo"] });
  t("5g. .ocode undo balikin perubahan", /restore|di-restore|Backup/i.test(replies[0] || ""), replies[0]?.slice(0, 60));

  // .ocode model <id> persist
  replies.length = 0;
  m = mkM(["model", "glm/glm-5"], true);
  await plugin.handler(m, { sock: null, args: ["model", "glm/glm-5"] });
  t("5h. model persist di db", getDatabase().data?.ocode?.model === "glm/glm-5", getDatabase().data?.ocode);

  // stop saat idle
  replies.length = 0;
  m = mkM(["stop"], true);
  await plugin.handler(m, { sock: null, args: ["stop"] });
  t("5i. .ocode stop saat idle → info gak ada tugas", /gak ada tugas/i.test(replies[0] || ""), replies[0]?.slice(0, 50));

  _setRouter9v2KeyForTest(undefined);
}

agent._resetOcodeForTest();
try { fs.rmSync(ws, { recursive: true, force: true }); } catch {}
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
