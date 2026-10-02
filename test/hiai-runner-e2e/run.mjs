// E2E hiai-runner — rewiring fitur .hiai ke engine Rara (gap porting 2 Okt 2026)
// Jalankan dari ROOT repo: node test/hiai-runner-e2e/run.mjs
// Konteks: prompt.txt .hiai nyuruh AI pakai tool run_plugin/list_plugins/
// read_plugin_guide/check_plugin_risk/run_eval + download_media + riwayat chat,
// tapi registry HIROBOT (utils/plugins.js, utils/connection.js,
// scrapers/src/{x,tiktok,ig}.js) gak pernah ke-port — semua itu direwire ke
// registry & scraper resmi Rara. Suite ini ngecek wiring-nya.
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIAI runner rewiring e2e ───");

// ── 1. engine + registry Rara ke-import & terisi ─────────────────────────
const mcp = await import("../../src/lib/hiai/mcp.js");
ok("engine mcp ke-import", typeof mcp.execPluginCommand === "function" && typeof mcp.resolvePlugin === "function");
const registry = await import("../../src/lib/rara-plugins.js");
const path = await import("path");
await registry.loadPlugins(path.resolve("plugins"));
ok("registry Rara terisi", registry.getPluginCount() > 100, `count=${registry.getPluginCount()}`);

// ── 2. resolvePlugin sekarang lewat registry Rara ─────────────────────────
const rt = await mcp.resolvePlugin("tiktok");
ok("resolvePlugin('tiktok') ketemu lewat registry Rara", !!rt.plugin && rt.pluginName.includes("tiktokdl"), JSON.stringify(rt.pluginName));
ok("plugin bentuk Rara ({config, handler})", !!rt.plugin?.config?.name && typeof rt.plugin?.handler === "function");
const rmiss = await mcp.resolvePlugin("commandxyzngasal");
ok("command ngasal → null jujur", rmiss.plugin === null && rmiss.pluginName === "");

// ── 3. shape adapter: access / requirements / risk ────────────────────────
const evalRes = await mcp.resolvePlugin("eval");

ok("pluginAccessLevel: .eval = owner", mcp.pluginAccessLevel(evalRes.plugin) === "owner");
ok("pluginRequirements baca config Rara", mcp.pluginRequirements(evalRes.plugin).group === false);
// blocked pattern: exec / session / creds gak boleh jalan lewat AI
const rsk = mcp.classifyPluginRisk("exec.js", { config: { name: "exec", alias: [] } });
ok("classifyPluginRisk hard-floor exec → blocked", rsk.level === "blocked", JSON.stringify(rsk.level));
const rskLow = mcp.classifyPluginRisk("sticker.js", { config: { name: "sticker", alias: ["s"] } });
ok("classifyPluginRisk sticker → low", rskLow.level === "low");
const rskHigh = mcp.classifyPluginRisk("kick.js", { config: { name: "kick", alias: [] } });
ok("classifyPluginRisk kick → high (butuh persetujuan)", rskHigh.level === "high");

// ── 4. execPluginCommand: konteks & guard ──────────────────────────────────
// tanpa WA context → error jelas (bukan crash import modul hantu)
let err = null;
try { await mcp.execPluginCommand("menu"); } catch (e) { err = e; }
ok("tanpa konteks WA → error jelas", !!err && /Konteks WA tidak tersedia/.test(err.message), err?.message);
// AI-loop guard: hiai/agent gak boleh jalan dari dalam agent
mcp.setCurrentContext(
  { user: { id: "bot@s.whatsapp.net" }, sendMessage: async () => ({}) },
  { sender: "t@s.whatsapp.net", key: { participant: "t@s.whatsapp.net" }, message: {} },
  "t@s.whatsapp.net", true, "Asia/Jakarta", true
);
let loopErr = null;
try { await mcp.execPluginCommand("hiai"); } catch (e) { loopErr = e; }
ok("AI-loop guard: .hiai ditolak dari dalam agent", !!loopErr && /AI agent|loop/i.test(loopErr.message), loopErr?.message);
let notFound = null;
try { await mcp.execPluginCommand("commandxyzngasal"); } catch (e) { notFound = e; }
ok("command ngasal → pesan not found (bukan modul hantu)", !!notFound && /not found|tidak ditemukan/i.test(notFound.message), notFound?.message);

// ── 5. tool runner.js: 5 tool hantu sekarang hidup ─────────────────────────
// pola suite hiaiagent: loader tools jalan lewat runAgent
try {
  await mcp.runAgent({ user: { id: "bot@s.whatsapp.net" } }, { sender: "t@s.whatsapp.net", chat: "t@s.whatsapp.net", react: async () => {}, reply: async () => {} }, "tes", {});
} catch {}
const tools = mcp.listTools();
ok("tools ke-load", Array.isArray(tools) && tools.length > 0, `len=${tools?.length}`);
for (const t of ["run_plugin", "list_plugins", "read_plugin_guide", "check_plugin_risk", "run_eval"]) {
  ok(`tool "${t}" terdaftar`, tools.includes(t));
}

// ── 6. download map + facebook ──────────────────────────────────────────────
ok("DOWNLOAD_PLATFORM_MAP facebook → .facebookdl", mcp.DOWNLOAD_PLATFORM_MAP?.facebook?.command === "facebookdl");
ok("semua platform ke-map ke command Rara", ["tiktok", "instagram", "youtube", "youtube_audio", "twitter", "facebook"].every(k => !!mcp.DOWNLOAD_PLATFORM_MAP?.[k]?.command));

// ── 7. chatlog adapter: store Rara (Map) ────────────────────────────────────
const chatlog = await import("../../src/lib/hiai/chatlog.js");
const fakeMsg = (id, text, fromMe) => ({
  key: { id, remoteJid: "123@g.us", fromMe, participant: fromMe ? null : "6281@w.net" },
  message: { conversation: text },
  messageTimestamp: Math.floor(Date.now() / 1000)
});
const per = new Map();
per.set("m1", fakeMsg("m1", "tes halo", false));
per.set("m2", fakeMsg("m2", ".menu", false));
const store = { messages: new Map([["123@g.us", per]]), chats: new Map([["123@g.us", { id: "123@g.us", subject: "Grup Tes" }]]) };
const hist = await chatlog.readChatHistory({ user: { id: "bot@s.whatsapp.net" } }, "123@g.us", { store });
ok("readChatHistory jalan di store Map Rara", typeof hist?.text === "string" && /tes halo/.test(hist.text) && hist.shown >= 1, JSON.stringify(hist).slice(0, 90));
// buildGroupContext = fungsi riwayat yang dipakai runAgent (context grup) — cek via readChatHistory shape + subject
ok("subject grup Map kebaca via readChatHistory", hist?.subject === "Grup Tes", JSON.stringify(hist?.subject));
const gctx = await chatlog.buildGroupContext({ user: { id: "bot@s.whatsapp.net" } }, { sender: "6281@w.net", key: { remoteJid: "123@g.us" } }, { store, limit: 10 });
ok("buildGroupContext jalan di store Map Rara", typeof gctx === "string" && /tes halo/.test(gctx), typeof gctx);

// ── 8. prompt gak nyebut tool hantu download_facebook lagi ──────────────────
const fs = await import("fs");
const promptTxt = fs.readFileSync(new URL("../../src/lib/hiai/prompt.txt", import.meta.url), "utf8");
ok("prompt: download_media nyebut platform facebook", /download_media \(platform:[^)]*facebook/.test(promptTxt));
ok("prompt: tool download_facebook terpisah udah dibuang", !/download_facebook \(/.test(promptTxt));

console.log(`─── Hasil: ${pass}/${total} ───`);
if (pass !== total) process.exit(1);
process.exit(0); // watcher registry/plugin gak otomatis mati (pola suite lain)
