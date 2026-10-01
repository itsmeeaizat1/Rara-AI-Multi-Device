// RARA AI WHATSAPP BOT — E2E: OPENCODE 9ROUTER (AI coding agent via chat, owner 21 Sep 2026)
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

const agent = await import(R + "/src/lib/rara-ocode-agent.js");
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
  const { getDatabase, initDatabase } = await import(R + "/src/lib/rara-database.js");
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocode-e2e-db-"));
  await initDatabase(path.join(dbDir, "db"));
  const { _setRouter9v2KeyForTest } = await import(R + "/src/scraper/router9v2.js");
  _setRouter9v2KeyForTest("sk-test");
  agent._setOcodePathsForTest({ root: ws, backupDir: bk });
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'hai\';"}'),
    wrap('{"action":"done","summary":"ubah ke hai","files":["fitur.js"]}'),
  ]));
  const plugin = await import(R + "/plugins/ai-agent/ocode.js");
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

  // tugas jalan → popup izin per file → klik Ijinkan → laporan + summary
  replies.length = 0;
  m = mkM(["ubah", "halo", "jadi", "hai"], true);
  const sent = [];
  const sockMock = { sendMessage: async (jid, p) => { sent.push(p); return { key: { id: "x" } }; } };
  const taskP = plugin.handler(m, { sock: sockMock, args: ["ubah", "halo", "jadi", "hai"] });
  // tunggu popup izin muncul (agent jalan async — poll max 5 dtk)
  let popup = null;
  for (let k = 0; k < 50 && !popup; k++) {
    await new Promise((res) => setTimeout(res, 100));
    popup = sent.find((p) => p?.interactiveMessage);
  }
  t("5c0. popup izin muncul pas mau edit", !!popup, sent.length);
  const popupStr = JSON.stringify(popup || {});
  t("5c1. popup nyebut file + tombol ijinkan/tolak", /fitur\.js/.test(popup?.interactiveMessage?.body?.text || "") && popupStr.includes("ocodeizin ya") && popupStr.includes("ocodeizin tidak"), popupStr.slice(0, 120));
  // klik "Ijinkan" → resolve pending approval
  const mIzin = mkM(["izin", "ya"], true);
  await plugin.handler(mIzin, { sock: sockMock, args: ["izin", "ya"] });
  // GOTCHA: judul box ke-smallcaps (ɪᴢɪɴ) — cari teks isi, bukan judul
  t("5c2. klik izin ya → konfirmasi diijinkan", /diijinkan/i.test(replies.join("\n")), replies.slice(-3));
  await taskP;
  const report = replies.filter((x) => !/izin/i.test(x)).join("\n");
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

// ═══ SECTION 6: gate izin per file (lib) ═══
console.log("\n— section 6: gate izin per file —");
{
  const fiturPath = path.join(ws, "fitur.js");
  const reset = () => fs.writeFileSync(fiturPath, "export function halo() {\n  return 'halo';\n}\n");
  reset();

  // 6a-6b: diijinkan → file keedit + onApproval kebawa info file
  let asked = [];
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'ok\';"}'),
    wrap('{"action":"done","summary":"ok","files":["fitur.js"]}'),
  ]));
  r = await agent.runOcodeAgent({ task: "tes izin", onApproval: async (info) => { asked.push(info.path); return { allowed: true }; } });
  t("6a. onApproval dipanggil buat file editan", asked.length === 1 && asked[0] === "fitur.js", asked);
  t("6b. diijinkan → file beneran berubah", fs.readFileSync(fiturPath, "utf8").includes("return 'ok';"));

  // 6c-6d: ditolak → file utuh + denied dilaporkan ke owner
  reset();
  asked = [];
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'bocor\';"}'),
    wrap('{"action":"done","summary":"ditolak","files":[]}'),
  ]));
  r = await agent.runOcodeAgent({ task: "tes tolak", onApproval: async (info) => { asked.push(info.path); return { allowed: false }; } });
  t("6c. ditolak → file TIDAK berubah", fs.readFileSync(fiturPath, "utf8").includes("return 'halo';"));
  t("6d. file ditolak dilaporkan di denied", (r.denied || []).includes("fitur.js"), r.denied);

  // 6e: 1 file ditanya SEKALI per tugas walau agent nyoba 2x
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"edit","path":"fitur.js","find":"return \'halo\';","replace":"return \'a\';"}'),
    wrap('{"action":"edit","path":"fitur.js","find":"return \'a\';","replace":"return \'b\';"}'),
    wrap('{"action":"done","summary":"cache","files":["fitur.js"]}'),
  ]));
  asked = [];
  r = await agent.runOcodeAgent({ task: "tes cache izin", onApproval: async (info) => { asked.push(info.path); return { allowed: true }; } });
  t("6e. izin 1x per file per tugas (2 aksi = 1 tanya)", asked.length === 1 && r.iterations === 3, { asked, iter: r.iterations });

  // 6f: izin gak ditanya buat path yang memang diblokir (blacklist) — langsung ERROR
  asked = [];
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"write","path":".env","content":"HACK=1"}'),
    wrap('{"action":"done","summary":"env","files":[]}'),
  ]));
  r = await agent.runOcodeAgent({ task: "tes env", onApproval: async (info) => { asked.push(info.path); return { allowed: true }; } });
  t("6f. path diblokir gak minta izin (langsung ERROR jail)", asked.length === 0 && fs.readFileSync(path.join(ws, ".env"), "utf8") === "SECRET=1", asked);
}

// ═══ SECTION 7: aksi MCP (request owner 25 Sep 2026 — server MCP via .mcp
// kebaca ocode juga: prompt dinamis + aksi mcp + hasil jadi konteks) ═══
{
  console.log("\n— section 7: aksi mcp —");
  const calls = [];
  let sysSeen = "";
  agent._setOcodeMcpForTest({
    call: async (server, tool, args) => {
      calls.push({ server, tool, args });
      if (server === "docs" && tool === "caridok") return "Baileys sendMessage signature: (jid, content, options)";
      throw new Error("server gak ada");
    },
    tools: [
      { server: "docs", tool: "caridok", desc: "cari dokumentasi library" },
      { server: "memory", tool: "recall", desc: "inget konteks tugas lama" },
    ],
  });
  // 7a: daftar tool MCP ke-inject ke system prompt
  let hasilAksiSeen = "";
  agent._setOcodeChatForTest(mkChat([
    (cfg) => { sysSeen = cfg.messages[0].content; return wrap('{"action":"mcp","server":"docs","tool":"caridok","args":{"libraryName":"baileys"}}'); },
    (cfg) => { hasilAksiSeen = cfg.messages[cfg.messages.length - 1].content; return wrap('{"action":"done","summary":"dokumentasi baileys udah kebaca.","files":[]}'); },
  ]));
  calls.length = 0;
  r = await agent.runOcodeAgent({ task: "cek cara pakai sendMessage baileys" });
  t("7a. tool MCP ke-inject ke system prompt", /mcp\.docs\.caridok/.test(sysSeen) && /TOOL MCP TERPASANG/.test(sysSeen), sysSeen.slice(-200));
  t("7b. aksi mcp jalan — server+tool+args nyampe", calls.length === 1 && calls[0].server === "docs" && calls[0].tool === "caridok" && calls[0].args?.libraryName === "baileys", calls);
  t("7c. hasil tool MCP dibalikin ke model (loop lanjut)", r.iterations === 2 && /baileys/.test(r.summary || ""), { iter: r.iterations, sum: r.summary });
  t("7d. hasil mcp jadi konteks di pesan HASIL AKSI", /MCP docs\.caridok OK/.test(hasilAksiSeen) && /sendMessage signature/.test(hasilAksiSeen), hasilAksiSeen.slice(0, 160));

  // 7e: server gak ada → ERROR jujur, agent gak mati
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"mcp","server":"hantu","tool":"x","args":{}}'),
    wrap('{"action":"done","summary":"selesai.","files":[]}'),
  ]));
  r = await agent.runOcodeAgent({ task: "tes server hantu" });
  t("7e. server MCP gak ada → error jujur, loop tetap lanjut", !r.error && r.iterations === 2, { err: r.error, iter: r.iterations });

  // 7f: field mcp gak lengkap → ERROR informatif
  agent._setOcodeChatForTest(mkChat([
    wrap('{"action":"mcp","server":"docs"}'),
    wrap('{"action":"done","summary":"ok","files":[]}'),
  ]));
  r = await agent.runOcodeAgent({ task: "tes mcp rusak" });
  t("7f. aksi mcp tanpa tool → ERROR field", !r.error && r.iterations === 2, r.error);

  // 7g: TANPA server MCP terpasang → prompt TANPA blok TOOL MCP
  agent._setOcodeMcpForTest({ call: null, tools: [] });
  sysSeen = "";
  agent._setOcodeChatForTest(mkChat([
    (cfg) => { sysSeen = cfg.messages[0].content; return wrap('{"action":"done","summary":"done aja.","files":[]}'); },
  ]));
  r = await agent.runOcodeAgent({ task: "tanpa mcp" });
  t("7g. tanpa server MCP → prompt polos tanpa blok TOOL", !/TOOL MCP TERPASANG/.test(sysSeen), sysSeen.slice(-100));

  // 7h: default (seam gak dipasang, db belum init) → gak crash, tools []
  agent._resetOcodeForTest();
  agent._setOcodePathsForTest({ root: ws, backupDir: bk });
  agent._setOcodeChatForTest(mkChat([wrap('{"action":"done","summary":"default ok.","files":[]}')]));
  r = await agent.runOcodeAgent({ task: "default tanpa seam" });
  t("7h. default mcp (db belum init) gak crash", !r.error, r.error);
}

agent._resetOcodeForTest();
try { fs.rmSync(ws, { recursive: true, force: true }); } catch {}
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
