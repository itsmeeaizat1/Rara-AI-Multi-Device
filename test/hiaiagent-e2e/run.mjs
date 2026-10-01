// E2E hiaiagent — engine agent MCP + plugin
// Jalankan dari ROOT repo: node test/hiaiagent-e2e/run.mjs
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIAI e2e ───");

// 1. engine ke-import + API publik
const mcp = await import("../../src/lib/hiai/mcp.js");
ok("engine mcp ke-import", typeof mcp.runAgent === "function");
ok("API runAgent/resetSession/listTools/countTools/setContext ada", ["runAgent","resetSession","listTools","countTools","setContext","MODELS","getApiKeys"].every((k) => k in mcp));
ok("getApiKeys balikin array (apikeys.json hiai + env AI_KEYS gabungan)", Array.isArray(mcp.getApiKeys()));
ok("MODELS ada isinya", mcp.MODELS && Object.keys(mcp.MODELS).length > 0, JSON.stringify(Object.keys(mcp.MODELS || {})));

// 2. runAgent duluo (loader tools jalan lewat runAgent) — tanpa API key → jujur gak ngelempar
let threw = false, res;
try {
  mcp.setContext({ conn: { user: { id: "bot@s.whatsapp.net" } }, m: { sender: "t@s.whatsapp.net", chat: "t@s.whatsapp.net" }, jid: "t@s.whatsapp.net", isOwner: true, isROwner: true, timezone: "Asia/Jakarta" });
  res = await mcp.runAgent({ user: { id: "bot@s.whatsapp.net" } }, { sender: "t@s.whatsapp.net", chat: "t@s.whatsapp.net", react: async () => {}, reply: async () => {} }, "tes halo", {});
} catch (e) { threw = true; }
ok("runAgent gak ngelempar (jujur gagal kalau gak ada key)", !threw && res && typeof res === "object", threw ? "throw" : typeof res);

// 3. tools auto-load dari folder tools/ (10 tool port, tanpa plugin.js)
const tools = mcp.listTools();
ok("tools ke-load dinamis (string keys)", Array.isArray(tools) && tools.length >= 8 && tools.every((t) => typeof t === "string" && t.length > 0), `len=${tools?.length}`);
ok("countTools konsisten", mcp.countTools() === tools.length);
const toolNames = tools.join(",");
ok("tool group/web/memory ada", /group|web|memory/.test(toolNames.toLowerCase()), toolNames.slice(0, 90));

// 4. matchParticipant shim
const { matchParticipant, decodeJid } = await import("../../src/lib/hiai/hi-shim.js");
ok("decodeJid lid→pn domain", decodeJid("123@lid") === "123@lid");
ok("matchParticipant cocok jid", matchParticipant(null, { id: "628123@s.whatsapp.net" }, "628123@s.whatsapp.net") === true);

// 5. hi-db roundtrip
const db = (await import("../../src/lib/hiai/hi-db.js")).default;
db.data.hiaiTest = { n: Date.now() };
db.write();
const db2 = (await import("../../src/lib/hiai/hi-db.js")).default;
ok("hi-db write/read roundtrip", db2.read().hiaiTest?.n === db.data.hiaiTest.n);

// 6. plugin config & handler
const mod = await import("../../plugins/ai-agent/hiaiagent.js");
ok("plugin config & handler ter-ekspor", !!mod.config?.name && typeof mod.handler === "function");
ok("cmd hiaiagent (beda dari ai/raraagent/mcp)", mod.config.name === "hiaiagent" && !["ai", "raraagent", "mcp"].includes(mod.config.name));
ok("owner-only (anti penyalahgunaan)", mod.config.isOwner === true);
ok("alias gak bentrok raraagent/mcp/ai", (mod.config.alias || []).every((a) => !["ai", "raraagent", "mcp", "aichat"].includes(a)), JSON.stringify(mod.config.alias));

// 7. REGRESI BUG (30 Sep 2026): "Cannot read properties of undefined (reading
// '<jid>')" di ensureChatSlot/getSession — akar: db.data.chats sendiri belum
// tentu ada (db fresh/JSON tanpa key "chats"), ensureChatSlot cuma cek db.data
// lalu langsung index db.data.chats[jid] tanpa cek db.data.chats dulu.
// Reproduksi persis skenario user: hapus key chats, panggil getSession.
delete db.data.chats;
db.write();
let threwChatSlot = false, sess;
try {
  sess = mcp.getSession("628174887770@s.whatsapp.net");
} catch (e) { threwChatSlot = true; }
ok("getSession gak throw walau db.data.chats belum ada (fresh db)", !threwChatSlot && Array.isArray(sess), threwChatSlot ? "THREW" : typeof sess);
ok("db.data.chats ke-inisialisasi otomatis jadi object", typeof db.data.chats === "object" && db.data.chats !== null);
ok("slot jid ke-buat dengan aiSessionChat array", Array.isArray(db.data.chats["628174887770@s.whatsapp.net"]?.aiSessionChat));
// resetSession juga harus aman walau slot belum ada
delete db.data.chats;
let threwReset = false;
try { mcp.resetSession("000@s.whatsapp.net"); } catch (e) { threwReset = true; }
ok("resetSession gak throw walau chats belum ada & jid belum ada slot", !threwReset);

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
