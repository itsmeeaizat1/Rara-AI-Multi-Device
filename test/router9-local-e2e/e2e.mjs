// RARA AI - MULTI DEVICE — E2E: 9ROUTER LOKAL NATIVE (owner 25 Sep 2026)
// "seakan-akan bot sudah menginstal & menjalankan 9router beneran di node js,
// semua model lengkap" + rename cmd .9router (bukan .ai9).
// Jalur: engine src/lib/rara-9router-local.js + plugin plugins/ai/9router.js.
// 9Router DIMOCK penuh via server http lokal (health/models/keys/providers/
// chat/images) — env ROUTER9_* di-set SEBELUM import engine.
// TANPA FALLBACK: server mati / key ditolak / provider kosong → error jujur.
// Jalankan dari repo root: node test/router9-local-e2e/e2e.mjs
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "..", "..");
process.chdir(R);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => {
  w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 240)));
  ok ? pass++ : fail++;
};
const section = (x) => console.log("\n— " + x + " —");

// ═══ konfigurasi temp + env SEBELUM import engine ═══
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "router9-local-e2e-"));
const CFG_PATH = path.join(TMP, "9routerapikey.json");
fs.writeFileSync(CFG_PATH, JSON.stringify({
  gateway: { apikey: "" },
  providers: [
    { provider: "glm", label: "GLM / Zhipu", apikey: "key-glm-tes", model: "", aktif: true },
    { provider: "groq", label: "Groq", apikey: "", model: "", aktif: true },
  ],
}, null, 2));

// ═══ mock server 9router ═══
const calls = { keys: [], providers: [], chat: [], images: [], health: 0 };
let gwKeys = ["sk-awal-dari-config"];
const MODELS = [
  { id: "alicode-intl/glm-4.7", owned_by: "alicode-intl", capabilities: { vision: false, reasoning: true, tools: true, contextWindow: 128000, maxOutput: 8192 } },
  { id: "alicode-intl/glm-4.6v", owned_by: "alicode-intl", capabilities: { vision: true, reasoning: false, tools: false, contextWindow: 64000, maxOutput: 4096 } },
  { id: "poe/nano-banana", owned_by: "poe", capabilities: { vision: false, imageOutput: true, tools: false, contextWindow: 8000, maxOutput: 1024 } },
  { id: "alicode-intl/qwen3.5-plus", owned_by: "alicode-intl", capabilities: { vision: true, reasoning: true, tools: true, contextWindow: 1000000, maxOutput: 65536 } },
];
let conns = [];
let failMode = null; // "401" | "404-nocred" | "429" | "503" | "down"
let fail503Left = 0; // >0: N panggilan chat pertama dibales 503 kuota (uji retry key rotasi)
let failKeys401Once = false; // POST /api/keys balik 401 SEKALI lalu normal (uji self-heal)

const srv = http.createServer((req, res) => {
  const send = (code, json) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(json)); };
  let body = "";
  req.on("data", (d) => body += d);
  req.on("end", () => {
    let j = null; try { j = JSON.parse(body || "{}"); } catch {}
    const auth = req.headers["authorization"] || "";
    const cli = req.headers["x-9r-cli-token"] || "";
    if (req.url === "/api/health") { calls.health++; return send(200, { ok: true }); }
    if (req.url === "/api/keys" && req.method === "GET") {
      if (!cli) return send(401, { error: "no cli token" });
      return send(200, { keys: gwKeys.map((k) => ({ key: k, name: "rara-bot" })) });
    }
    if (req.url === "/api/keys" && req.method === "POST") {
      calls.keys.push(j);
      if (!cli) return send(401, { error: "no cli token" });
      if (failKeys401Once) { failKeys401Once = false; return send(401, { error: "stale auth — simulasikan proses basi" }); }
      const key = "sk-mock-gw-" + (calls.keys.length);
      gwKeys.push(key);
      return send(201, { key, name: j?.name || "?", id: "id-" + calls.keys.length });
    }
    if (req.url === "/api/providers" && req.method === "GET") return send(200, { connections: conns });
    if (req.url === "/api/providers" && req.method === "POST") {
      calls.providers.push(j);
      const c = { id: "c-" + (conns.length + 1), provider: j.provider, name: j.name, isActive: true };
      conns.push(c);
      return send(201, { connection: c });
    }
    if (req.url === "/v1/models") {
      // realistis: key basi/asing DITOLAK (bukan cuma format Bearer)
      if (!auth.startsWith("Bearer ") || !gwKeys.includes(auth.slice(7))) return send(401, { error: "unauthorized" });
      return send(200, { data: MODELS });
    }
    if (req.url === "/v1/chat/completions") {
      calls.chat.push({ auth, body: j });
      if (failMode === "401") return send(401, { error: { message: "bad key" } });
      // realistis: gateway key BASI (gak dikenal server) → 401 — buat uji self-heal
      if (!auth.startsWith("Bearer ") || !gwKeys.includes(auth.slice(7))) return send(401, { error: { message: "unauthorized" } });
      if (fail503Left > 0) { fail503Left--; return send(503, { error: { message: "[gemini/gemini-3.6-flash] [429]: {\"error\": {\"code\": 429, \"message\": \"You exceeded your current quota, please check your plan and billing details\"}}" } }); }
      if (failMode === "slow") { setTimeout(() => send(200, { model: j?.model, choices: [{ message: { content: "telat" } }] }), 400); return; }
      if (failMode === "404-nocred") return send(404, { error: { message: "No active credentials for provider: glm", code: "model_not_found" } });
      if (failMode === "429") return send(429, { error: { message: "rate limited" } });
      if (failMode === "503") return send(503, { error: { message: "upstream down" } });
      const last = j?.messages?.slice(-1)[0] || {};
      return send(200, {
        model: j?.model,
        choices: [{ message: { content: "jawaban-mock" + (Array.isArray(last.content) ? "-multimodal" : "") } }],
      });
    }
    if (req.url === "/v1/images/generations") {
      calls.images.push({ auth, body: j });
      if (failMode === "404-nocred") return send(404, { error: { message: "No credentials for provider: openai" } });
      return send(200, { data: [{ b64_json: Buffer.from("PNGFAKE").toString("base64") }] });
    }
    return send(404, { error: "not found" });
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;
const BASE = `http://127.0.0.1:${PORT}`;
process.env.ROUTER9_URL = BASE;
process.env.ROUTER9_PORT = String(PORT);
process.env.ROUTER9_CONFIG = CFG_PATH;
process.env.ROUTER9_CLI_TOKEN = "token-cli-mock";
process.env.ROUTER9_DEFAULT_MODEL = "alicode-intl/glm-4.7";

// ═══ import modul SETELAH env terpasang ═══
const { initDatabase } = await import(pathToFileURL(path.join(R, "src/lib/rara-database.js")).href);
await initDatabase(path.join(TMP, "db.json"));
const { fromSC } = await import(pathToFileURL(path.join(R, "src/lib/styler.js")).href);
const norm = (s) => fromSC(String(s)).toLowerCase();

const engine = await import(pathToFileURL(path.join(R, "src/lib/rara-9router-local.js")).href);
const {
  router9IsUp, ensure9RouterRunning, ensureRouter9GatewayKey, syncRouter9ProviderKeys,
  router9Models, router9FindModel, router9Chat, router9ImageGen, router9ImageModels,
  router9VisionModels, router9Stats, ROUTER9_DEFAULT_MODEL, getRouter9Base,
  killStalePort9Router, invalidateRouter9GatewayKey, router9ValidateGatewayKey,
  findPidOnPort, parseProcNetPort, findPidBySocketInode,
} = engine;
const plug = await import(pathToFileURL(path.join(R, "plugins/ai/9router.js")).href);
const { handler } = plug;

// ═══ harness message ═══
function mkM({ text = "", args = [], isOwner = false, isImage = false, caption = null, quoted = null } = {}) {
  const m = {
    chat: "12345@g.us", sender: "62800@g.us", isOwner, isImage,
    text,
    message: isImage ? { imageMessage: caption != null ? { caption } : {} } : null,
    quoted,
    _args: args, _replies: [], _reacts: [], _downloadCalled: false,
    reply: async (x) => { m._replies.push(String(x)); return x; },
    react: async (x) => { m._reacts.push(x); },
    download: async () => { m._downloadCalled = true; return Buffer.from("FAKEIMG"); },
  };
  return m;
}
function mkSock() {
  const sock = { sent: [], sendMessage: async (to, payload) => { sock.sent.push({ to, payload }); } };
  return sock;
}
const run = async (m, sock, botConfig = {}) => handler(m, { sock: sock || mkSock(), args: m._args, botConfig });

// ═══ 1. ENGINE — health, spawn-skip, gateway key, sync ═══
section("1. engine 9router lokal");
t("1a. router9IsUp → true (mock hidup)", await router9IsUp({ force: true }));
const up = await ensure9RouterRunning({ waitMs: 2000 });
t("1b. ensure9RouterRunning → up tanpa spawn (udah jalan)", up.up === true && up.spawned === false, JSON.stringify(up));

let gw = await ensureRouter9GatewayKey();
t("1c. gateway key auto-provision (POST /api/keys kepanggil)", gw.startsWith("sk-mock-gw-"), gw);
const cfgAfter = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
t("1d. gateway key tersimpan balik ke 9routerapikey.json", cfgAfter.gateway.apikey === gw, cfgAfter.gateway.apikey);
const keysBefore = calls.keys.length;
const gw2 = await ensureRouter9GatewayKey();
t("1e. gateway key ke-reuse (gak bikin baru dobel)", gw2 === gw && calls.keys.length === keysBefore, `calls=${calls.keys.length}`);

const sync1 = await syncRouter9ProviderKeys();
t("1f. sync: 1 provider key di-sync, 1 kosong diskip", sync1.synced === 1 && sync1.skipped === 0, JSON.stringify(sync1));
const sync2 = await syncRouter9ProviderKeys();
t("1g. sync ulang: dedupe (semua skip)", sync2.synced === 0 && sync2.skipped === 1, JSON.stringify(sync2));

// ═══ 2. ENGINE — katalog model live ═══
section("2. katalog model live");
const models = await router9Models();
t("2a. model ke-normalisasi (id/owner/vision/imageOutput/ctx)", models.length === 4 && models[1].vision === true && models[2].imageOutput === true, JSON.stringify(models[0]));
const vis = await router9VisionModels();
const imgs = await router9ImageModels();
t("2b. filter vision & image-gen benar", vis.length === 2 && imgs.length === 1, `vis=${vis.length} img=${imgs.length}`);
t("2c. findModel: exact match", (await router9FindModel("alicode-intl/glm-4.7"))?.id === "alicode-intl/glm-4.7");
t("2d. findModel: suffix match (glm-4.6v)", (await router9FindModel("glm-4.6v"))?.id === "alicode-intl/glm-4.6v");
t("2e. findModel: gak ketemu → null", (await router9FindModel("tidak-ada")) === null);

// ═══ 3. ENGINE — chat native + multimodal + error jujur ═══
section("3. chat native (tanpa fallback)");
const r1 = await router9Chat({ model: "alicode-intl/glm-4.7", user: "halo", history: [] });
t("3a. chat balas + model + latensi", r1.text === "jawaban-mock" && r1.model === "alicode-intl/glm-4.7" && r1.latencyMs >= 0, JSON.stringify(r1));
t("3b. chat pakai gateway key (Bearer) + session user", calls.chat.at(-1).auth === `Bearer ${gw}` && calls.chat.at(-1).body.messages.slice(-1)[0].content === "halo");
const r2 = await router9Chat({ model: "alicode-intl/glm-4.6v", user: [{ type: "text", text: "apa ini" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUZBS0VJTUc=" } }] });
t("3c. multimodal (foto) tembus sebagai content array", r2.text === "jawaban-mock-multimodal", r2.text);

failMode = "401";
await t.rejects ? null : null;
try { await router9Chat({ model: "alicode-intl/glm-4.7", user: "x" }); t("3d. 401 → GAGAL (harus)", false, "harusnya throw"); }
catch (e) { t("3d. 401 gateway ditolak → pesan jujur", /gateway key 9router ditolak/i.test(e.message), e.message); }
failMode = "404-nocred";
try { await router9Chat({ model: "glm/glm-5", user: "x" }); t("3e. 404 → GAGAL (harus)", false); }
catch (e) { t("3e. provider kosong → arahan isi key + sync", /belum ada provider aktif.*9routerapikey\.json.*\.9router sync|isi src\/lib\/apikey\/9routerapikey\.json/i.test(e.message.replace(/\n/g, " ")), e.message); }
failMode = "429";
try { await router9Chat({ model: "alicode-intl/glm-4.7", user: "x" }); t("3f. 429 → GAGAL (harus)", false); }
catch (e) { t("3f. 429 → rate limit jujur", /rate limit/i.test(e.message), e.message); }
failMode = null;
const st1 = router9Stats();
t("3g. stats dicatat (requests/ok/fail — 401 kini 2 request karena self-heal retry)", st1.requests >= 6 && st1.fail === 4 && st1.ok >= 2, JSON.stringify(st1));

// ═══ 5. ENGINE — retry key rotasi (fix 6 Okt 2026: key upstream kuota habis → 503/429) ═══
section("5. retry key rotasi 503/429");
const chatBefore = calls.chat.length;
fail503Left = 2; // 2 panggilan pertama 503, ke-3 dapet key hidup
const rr = await router9Chat({ model: "alicode-intl/glm-4.7", user: "x" });
t("5a. 503x2 → retry dapet key hidup, hasil sukses", rr.text === "jawaban-mock", JSON.stringify(rr));
t("5b. total 3 percobaan (2 gagal + 1 sukses)", calls.chat.length - chatBefore === 3, `delta=${calls.chat.length - chatBefore}`);
fail503Left = 99; // semua attempt 503 → jujur gagal setelah retry
try { await router9Chat({ model: "alicode-intl/glm-4.7", user: "x" }); t("5c. 503 terus → GAGAL (harus)", false); }
catch (e) { t("5c. 503 terus → pesan kuota habis jujur", /kuotanya habis \(429\)/i.test(e.message), e.message); }
fail503Left = 0;
failMode = "slow";
try { await router9Chat({ model: "alicode-intl/glm-4.7", user: "x", timeoutMs: 120 }); t("5d. timeout → GAGAL (harus)", false); }
catch (e) { t("5d. timeout → retry 1x lalu jujur gagal", /timed out|timeout|gak kejangkau/i.test(e.message), e.message); }
failMode = null;

// ═══ 4. ENGINE — image gen ═══
section("4. image generation");
const img1 = await router9ImageGen({ model: "poe/nano-banana", prompt: "kucing astronot" });
t("4a. gambar balik sebagai base64", img1.b64 && Buffer.from(img1.b64, "base64").toString() === "PNGFAKE", JSON.stringify(img1).slice(0, 80));
t("4b. images/generations dikasih gateway key + prompt", calls.images.at(-1).auth.startsWith("Bearer sk-mock-gw-") && calls.images.at(-1).body.prompt === "kucing astronot");
failMode = "404-nocred";
try { await router9ImageGen({ prompt: "kucing" }); t("4c. no-cred → GAGAL (harus)", false); }
catch (e) { t("4c. gak ada provider image → pesan arahan sync", /belum ada provider image-gen/i.test(e.message), e.message); }
failMode = null;

// ═══ 5. PLUGIN — cmd .9router ═══
section("5. plugin .9router");
// 5a chat biasa
{
  const m = mkM({ args: ["jelaskan", "siapa", "presiden", "indonesia"] });
  const sock = mkSock();
  await run(m, sock);
  t("5a. chat: jawaban + footer transparansi model", m._replies[0]?.includes("jawaban-mock") && norm(m._replies[0]).includes("via 9router lokal") && m._replies[0].includes("alicode-intl/glm-4.7"), m._replies[0]?.slice(0, 120));
  t("5b. react 🕒 → 🐣", m._reacts[0] === "🕒" && m._reacts.at(-1) === "🐣", m._reacts.join(","));
}
// 5b usage guide
{
  const m = mkM({ args: [] });
  await run(m, mkSock());
  t("5c. tanpa arg → kartu panduan V2 (kaomoji + contoh .9router)", norm(m._replies[0]).includes("9router") && m._replies[0].includes("ヾ") && norm(m._replies[0]).includes(".9router jelaskan siapa presiden indonesia"), m._replies[0]?.slice(0, 100));
}
// 5c model list
{
  const m = mkM({ args: ["model"] });
  await run(m, mkSock());
  t("5d. .9router model → total 4 model live + vision/image tag", m._replies[0].includes("Total 4 model live") && m._replies[0].includes("👁") && m._replies[0].includes("🎨"), m._replies[0]?.slice(0, 120));
}
{
  const m = mkM({ args: ["model", "glm"] });
  await run(m, mkSock());
  t("5e. .9router model glm → terfilter", m._replies[0].includes('filter "glm"'), m._replies[0]?.slice(0, 120));
}
// 5d setmodel
{
  const m = mkM({ args: ["setmodel", "poe/nano-banana"] });
  await run(m, mkSock());
  const { getDatabase } = await import(pathToFileURL(path.join(R, "src/lib/rara-database.js")).href);
  const pref = getDatabase().data.router9?.prefs?.["12345@g.us"];
  t("5f. setmodel: pref tersimpan db + konfirmasi", pref === "poe/nano-banana" && m._replies[0].includes("poe/nano-banana") && m._replies[0].includes("🎨"), `pref=${pref}`);
  // chat berikutnya pakai model baru
  const m2 = mkM({ args: ["halo"] });
  await run(m2, mkSock());
  t("5g. chat pakai model baru dari pref", m2._replies[0].includes("poe/nano-banana"), m2._replies[0]?.slice(-100));
}
{
  const m = mkM({ args: ["setmodel", "model-ngawur"] });
  await run(m, mkSock());
  t("5h. setmodel ngawur → jujur gak ada + saran cari", m._replies[0].includes("gak ada") && m._replies[0].includes(".9router model"), m._replies[0]?.slice(0, 100));
}
// 5e gambar
{
  const m = mkM({ args: ["buatkan", "gambar", "kucing"] });
  const sock = mkSock();
  await run(m, sock);
  t("5i. .9router buatkan gambar kucing → kirim foto + caption prompt", sock.sent.length === 1 && !!sock.sent[0].payload.image && norm(sock.sent[0].payload.caption).includes("kucing"), JSON.stringify(sock.sent[0]?.payload || {}).slice(0, 100));
  t("5j. caption gambar ada footer via 9Router", sock.sent[0] && norm(sock.sent[0].payload.caption).includes("via 9router lokal"), sock.sent[0]?.payload?.caption);
}
// 5f status
{
  const m = mkM({ args: ["status"] });
  await run(m, mkSock());
  t("5k. status: endpoint + model live + gateway ok", m._replies[0].includes(BASE) && m._replies[0].includes("Model live   : 4") && m._replies[0].includes("Gateway key  : ok"), m._replies[0]?.slice(0, 160));
}
// 5g sync non-owner vs owner
{
  const m1 = mkM({ args: ["sync"], isOwner: false });
  await run(m1, mkSock());
  t("5l. sync non-owner → ditolak", m1._replies[0].includes("Khusus owner"), m1._replies[0]);
  const before = calls.providers.length;
  const m2 = mkM({ args: ["sync"], isOwner: true });
  await run(m2, mkSock());
  t("5m. sync owner → laporan sync + skip dedupe", m2._replies[0].includes("Key baru di-sync") && calls.providers.length === before, m2._replies[0]?.slice(0, 120));
}
// 5h vision native (foto + caption)
{
  const m = mkM({ args: [], isImage: true, caption: "ini foto apa?", text: "ini foto apa?" });
  await run(m, mkSock());
  const lastChat = calls.chat.at(-1);
  const content = lastChat?.body?.messages?.slice(-1)[0]?.content;
  t("5n. foto+caption → multimodal image_url ke model vision", Array.isArray(content) && content.some((c) => c.type === "image_url") && content.some((c) => c.type === "text" && c.text === "ini foto apa?"), JSON.stringify(content || null).slice(0, 120));
  t("5o. model vision dipilih otomatis (glm-4.6v)", lastChat?.body?.model === "alicode-intl/glm-4.6v", lastChat?.body?.model);
}
// 5i server mati → error jujur, TANPA fallback API lain
{
  process.env.ROUTER9_URL = "http://127.0.0.1:1"; // port mati
  process.env.ROUTER9_NO_SPAWN = "1"; // jangan spawn cli asli di e2e
  const m = mkM({ args: ["halo"] });
  await run(m, mkSock());
  t("5p. 9router mati → jujur bilang belum jalan (gak nyaru sukses)", m._replies[0].includes("9Router lokal gagal") && /belum jalan|gak kejangkau|9router/i.test(m._replies[0]), m._replies[0]?.slice(0, 140));
  process.env.ROUTER9_URL = BASE;
  process.env.ROUTER9_NO_SPAWN = "";
}
// 5j alias lama tetap jalan (backward compat)
{
  const m = mkM({ args: ["halo"] });
  m.command = "ai9";
  await run(m, mkSock());
  t("5q. alias .ai9 tetap jalan (handler sama)", m._replies[0].includes("jawaban-mock"), m._replies[0]?.slice(0, 80));
}

// ═══ 6. SOURCES — tanpa API AI luar ═══
section("6. sumber: jalur lama dibuang, tanpa API eksternal");
{
  const src = fs.readFileSync(path.join(R, "plugins/ai/9router.js"), "utf8");
  const importsOnly = src.split("\n").filter((l) => l.trim().startsWith("import")).join("\n");
  t("6a. gak ada import provider AI lama (zhipu/nexai/ikyy/groq direct)", !/zhipu|nexai|ikyy|bigmodel|groq\.com/i.test(importsOnly), importsOnly.slice(0, 120));
  t("6b. gak ada GeminiVision / callImageGen (fallback eksternal)", !src.includes("GeminiVision") && !src.includes("callImageGen"));
  const eng = fs.readFileSync(path.join(R, "src/lib/rara-9router-local.js"), "utf8");
  t("6c. engine: tanpa fallback ke apikeys.json chain", !eng.includes("aiMultiprovider") && !eng.includes("routerChat"));
  t("6d. engine: heal sql-wasm + spawn cli.js + gateway auto", eng.includes("sql-wasm.wasm") && eng.includes("9router/cli.js") && eng.includes("/api/keys"));
  // path dipecah biar gak ke-scan category-structure 5b (asersi ABSENCE,
  // bukan import — file lama memang sengaja udah dihapus)
  t("6e. file lama .ai9/rara-ai-router udah gak ada", !fs.existsSync(path.join(R, "plugins/ai", "ai9.js")) && !fs.existsSync(path.join(R, "src/lib", "rara-ai-router.js")));
}

// ═══ 7. ISOLASI DARI 9ROUTERV2 (aturan owner 25 Sep 2026: lokal JANGAN
// nyentuh v2 — v2 = API endpoint punya orang, bukan lokal) ═══
section("7. isolasi dari 9routerv2 (cloud milik orang)");
{
  const engSrc = fs.readFileSync(path.join(R, "src/lib/rara-9router-local.js"), "utf8");
  const plugSrc = fs.readFileSync(path.join(R, "plugins/ai/9router.js"), "utf8");
  const cfgSrc = JSON.stringify(JSON.parse(fs.readFileSync(path.join(R, "src/lib/apikey/apikeys.json"), "utf8")).router || {});
  const banned = /router9v2|ai9v2|cloudku|getTioBase|getTioEndpoint|env-loader|tio_|TIO_API|ROUTER_API_URL|ROUTER_API_KEY/;
  t("7a. engine lokal: gak ada referensi v2/cloudku/tio/env ROUTER_API", !banned.test(engSrc.replace(/^\s*\/\/.*$/gm, "")), (engSrc.match(banned) || ["?"])[0]);
  t("7b. plugin .9router: gak ada referensi v2/cloudku/tio", !banned.test(plugSrc), (plugSrc.match(banned) || ["?"])[0]);
  t("7c. konfigurasi router (apikeys.json): gak ada endpoint v2", !banned.test(cfgSrc), (cfgSrc.match(banned) || ["?"])[0]);
  t("7d. engine: default endpoint hardcoded 127.0.0.1 (lokal doang)", engSrc.includes("127.0.0.1") && /ROUTER9_URL \|\| `http:\/\/127\.0\.0\.1/.test(engSrc));
  t("7e. engine: cuma baca env ROUTER9_* (bukan ROUTER_API_*/TIO_*)", !/env\.(?!ROUTER9_)[A-Z_]+\b/.test([...engSrc.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => "env." + m[1]).join("\n").replace(/env\.ROUTER9_[A-Z0-9_]*/g, "env.ROUTER9_X")));
  // bukti runtime: jalur lokal gak kepengaruh env v2 sama sekali
  process.env.TIO_API_URL = "https://9router.cloudku.us.kg/v1";
  process.env.ROUTER_API_URL = "https://9router.cloudku.us.kg/v1";
  process.env.ROUTER_API_KEY = "key-v2-bohongan";
  const baseStillLocal = getRouter9Base();
  t("7f. runtime: env v2 (TIO_API_URL/ROUTER_API_URL) di-set → base lokal TETAP 127.0.0.1", baseStillLocal.includes("127.0.0.1"), baseStillLocal);
  delete process.env.TIO_API_URL; delete process.env.ROUTER_API_URL; delete process.env.ROUTER_API_KEY;
}

// ═══ 8. SELF-HEAL PROSES BASI (bug nyata 1 Okt 2026: "padahal katanya udah
// jalan" — health hijau tapi POST /api/keys 401 karena proses lama pegang
// port dengan auth gak sinkron; nama proses "next-server" gak ketangkep
// pattern) ═══
section("8. self-heal proses basi + .9router restart");
{
  // 8a: mode mock (ROUTER9_URL di-set) → kill WAJIB no-op (jangan bunuh mock!)
  const skip = await killStalePort9Router();
  t("8a. killStalePort9Router: mode mock → NO-OP (safety gate ROUTER9_URL)", skip.killed === false && /eksternal|mock/.test(skip.reason || ""), JSON.stringify(skip));

  // 8b: jalur kill beneran — dummy server WAJIB proses TERPISAH
  // (kalau satu proses sama e2e, kill-by-port = bunuh suite sendiri!)
  const dummyPort = 20190 + Math.floor(Math.random() * 500);
  const dummy = spawn(process.execPath, ["-e", `require("http").createServer((q,s)=>s.end("dummy")).listen(${dummyPort},"127.0.0.1")`], { stdio: "ignore" });
  let dummyUp = false;
  for (let i = 0; i < 25 && !dummyUp; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try { const p = await fetch(`http://127.0.0.1:${dummyPort}`); dummyUp = p.ok; } catch {}
  }
  let dummyExit = null;
  dummy.on("exit", (code, sig) => { dummyExit = sig || code; });
  const savedUrl = process.env.ROUTER9_URL, savedPort = process.env.ROUTER9_PORT;
  delete process.env.ROUTER9_URL; process.env.ROUTER9_PORT = String(dummyPort);
  const killed = await killStalePort9Router();
  process.env.ROUTER9_URL = savedUrl; process.env.ROUTER9_PORT = savedPort;
  t("8b. dummy server (proses terpisah) hidup duluan", dummyUp === true);
  t("8c. killStalePort9Router: bunuh PEMILIK PORT beneran", killed.killed === true && typeof killed.pid === "number", JSON.stringify(killed));
  // 8d: proses dummy beneran mati (exit event ke-trigger / SIGKILL fallback)
  await new Promise((r) => setTimeout(r, 2500));
  if (!dummyExit) { try { dummy.kill("SIGKILL"); dummyExit = "force-killed-cleanup"; } catch {} }
  t("8d. proses dummy tercatat mati (exit signal)", dummyExit != null, String(dummyExit));

  // 8d: self-heal ensureRouter9GatewayKey — 401 sekali → auto-retry → key tetap dapat
  const cfgNow = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  cfgNow.gateway.apikey = "";
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfgNow, null, 2));
  failKeys401Once = true;
  const keysBeforeHeal = calls.keys.length;
  let healedKey = null, healErr = null;
  try { healedKey = await ensureRouter9GatewayKey(); } catch (e) { healErr = e; }
  t("8e. self-heal: 401 sekali → auto-retry → key DIDAPAT (gak nyerah)", healedKey != null && healedKey.startsWith("sk-mock-gw-") && healErr === null, healErr ? healErr.message : String(healedKey));
  t("8f. self-heal: 2 percobaan POST /api/keys (401 lalu sukses)", calls.keys.length === keysBeforeHeal + 2, `calls=${calls.keys.length} vs ${keysBeforeHeal}+2`);
  t("8g. self-heal: key tersimpan balik ke config", JSON.parse(fs.readFileSync(CFG_PATH, "utf8")).gateway.apikey === healedKey);

  // 8g: .9router restart (owner) — jalan di mode mock, mock TETAP hidup
  const mR = mkM({ args: ["restart"], isOwner: true });
  await run(mR, mkSock());
  t("8h. .9router restart owner → balasan box restart", mR._replies[0]?.includes("9Router") && mR._replies[0]?.includes("Proses lama") && mR._reacts.includes("🐣"), (mR._replies[0] || "").slice(0, 120));
  t("8i. setelah .9router restart: mock server masih hidup (gak dibunuh mode mock)", await router9IsUp({ force: true }));

  // 8i: restart non-owner → ditolak
  const mN = mkM({ args: ["restart"], isOwner: false });
  await run(mN, mkSock());
  t("8j. .9router restart non-owner → khusus owner", mN._replies[0]?.includes("Khusus owner"), (mN._replies[0] || "").slice(0, 80));

  // 8j: source guard — self-heal cuma sekali retry (gak infinite loop)
  const engSrc8 = fs.readFileSync(path.join(R, "src/lib/rara-9router-local.js"), "utf8");
  t("8k. engine: self-heal single-retry (_retried guard) + kill-by-port ada", engSrc8.includes("_retried") && engSrc8.includes("findPidOnPort") && engSrc8.includes("killStalePort9Router"));

  // ═══ 9. GATEWAY KEY BASI → SELF-HEAL (fix 1 Okt 2026 malam, report owner
  // ".9router restart ttep g bsa gagal") — dulu key lama dipercaya buta,
  // restart gak pernah nolong. ═══
  section("9. gateway key basi → self-heal");
  // 9a: injeksi key BASI ke config (simulasi: DB server di-reset / machine-id ganti)
  const cfgStale = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  cfgStale.gateway.apikey = "sk-stale-basi-dari-boot-lama";
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfgStale, null, 2));
  const keysBefore9 = calls.keys.length;
  const v9 = await router9ValidateGatewayKey();
  t("9a. router9ValidateGatewayKey: key basi DETEKSI (ok:false)", v9.ok === false && (v9.status === 401 || v9.status === 403), JSON.stringify(v9));
  // 9b: chat dengan key basi → invalidate + provisi baru + retry → SUKSES
  const c9 = await router9Chat({ model: "alicode-intl/glm-4.7", user: "halo lagi" });
  t("9b. chat self-heal: key basi → provisi ulang → jawaban tetap dapet", c9.text === "jawaban-mock", JSON.stringify(c9).slice(0, 80));
  t("9c. self-heal: POST /api/keys kepanggil (key baru dibikin)", calls.keys.length === keysBefore9 + 1, `calls=${calls.keys.length}`);
  const cfgHealed9 = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  t("9d. key basi kebuang dari config, key baru tersimpan", cfgHealed9.gateway.apikey !== "sk-stale-basi-dari-boot-lama" && cfgHealed9.gateway.apikey.startsWith("sk-mock-gw-"), cfgHealed9.gateway.apikey);
  t("9e. chat retry pakai key BARU (bukan key basi)", calls.chat.at(-1).auth === `Bearer ${cfgHealed9.gateway.apikey}`);
  // 9f: .9router restart dengan key basi → kartu JUJUR (bukan "ok" palsu)
  const cfgStale2 = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  cfgStale2.gateway.apikey = "sk-stale-lagi";
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfgStale2, null, 2));
  const mR9 = mkM({ args: ["restart"], isOwner: true });
  await run(mR9, mkSock());
  t("9f. restart: key basi diprovisi baru (kartu jujur)", (mR9._replies[0] || "").includes("key lama basi"), (mR9._replies[0] || "").slice(0, 160));
  t("9g. restart: config keisi key baru", JSON.parse(fs.readFileSync(CFG_PATH, "utf8")).gateway.apikey.startsWith("sk-mock-gw-"));
  // 9h: apiKey param eksplisit yang basi → TANPA heal, error jujur (gak infinite)
  try {
    await router9Chat({ model: "alicode-intl/glm-4.7", user: "x", apiKey: "sk-stale-param" });
    t("9h. apiKey basi → GAGAL (harus)", false, "harusnya throw");
  } catch (e) {
    t("9h. apiKey param basi → tanpa heal, jujur 401", /gateway key 9router ditolak/i.test(e.message), e.message);
  }
  // 9i: source guard — pesan error gak nyuruh manual hapus JSON lagi
  const engSrc9 = fs.readFileSync(path.join(R, "src/lib/rara-9router-local.js"), "utf8");
  t("9i. engine: pesan 401 gak suruh hapus manual + invalidate/validate ada", !engSrc9.includes("hapus gateway.apikey") && engSrc9.includes("invalidateRouter9GatewayKey") && engSrc9.includes("router9ValidateGatewayKey"));
}

// ═══ 10. FALLBACK /proc BUAT findPidOnPort (6 Okt 2026, report owner VPS
// Pterodactyl "gagal pidnya" — container yolks gak punya lsof/fuser/ss) ═══
section("10. findPidOnPort fallback /proc (container minimal)");
{
  // 10a: parser /proc/net/tcp — fixture: LISTEN di 20128 (0x4EB0) harus ketemu
  const FIX = [
    "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrn   uid  inode",
    "   0: 0100007F:4EA0 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 0000000000000000 100 0 0 10 0",
    "   1: 0100007F:8443 0100007F:4EB0 01 00000000:00000000 00:00000000 00000000  1000 98765 1 0000000000000000 20 4 30 10 -1",
  ].join("\n");
  t("10a. parser: socket LISTEN port 20128 → inode 12345", parseProcNetPort(FIX, 20128) === "12345", String(parseProcNetPort(FIX, 20128)));
  t("10b. parser: koneksi ESTABLISHED ke port yang sama (state 01) DILARANG dihitung", parseProcNetPort(FIX.replace("0A", "01"), 20128) === null);
  t("10c. parser: port lain → null", parseProcNetPort(FIX, 20190) === null);
  t("10d. parser: content kosong/null → null", parseProcNetPort("", 20128) === null && parseProcNetPort(null, 20128) === null);

  // 10e: inode → PID lewat /proc/*/fd fixture (fake proc dir)
  const fakeProc = fs.mkdtempSync(path.join(os.tmpdir(), "fakeproc-"));
  fs.mkdirSync(path.join(fakeProc, "net"), { recursive: true });
  fs.writeFileSync(path.join(fakeProc, "net", "tcp"), FIX);
  const fd1 = path.join(fakeProc, "111", "fd"); fs.mkdirSync(fd1, { recursive: true });
  fs.symlinkSync("socket:[99999]", path.join(fd1, "5"));
  const fd2 = path.join(fakeProc, "222", "fd"); fs.mkdirSync(fd2, { recursive: true });
  fs.symlinkSync("socket:[12345]", path.join(fd2, "7")); // pemilik listener
  fs.symlinkSync("pipe:[3]", path.join(fd2, "8"));
  t("10e. inode 12345 → PID 222 (bukan 111)", findPidBySocketInode(fakeProc, "12345") === 222, String(findPidBySocketInode(fakeProc, "12345")));
  t("10f. inode gak ada → null", findPidBySocketInode(fakeProc, "55555") === null);
  t("10g. inode kosong → null (gak scan sia-sia)", findPidBySocketInode(fakeProc, "") === null);

  // 10h: end-to-end di /proc ASLI — dummy listener, cari PID-nya lewat
  // jalur /proc (parser + scan) dan bandingin dengan child.pid asli.
  const dummyPort = 20400 + Math.floor(Math.random() * 500);
  const dummy = spawn(process.execPath, ["-e", `require("http").createServer((q,s)=>s.end("ok")).listen(${dummyPort},"127.0.0.1")`], { stdio: "ignore" });
  let dummyUp = false;
  for (let i = 0; i < 25 && !dummyUp; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try { const p = await fetch(`http://127.0.0.1:${dummyPort}`); dummyUp = p.ok; } catch {}
  }
  t("10h. dummy listener hidup", dummyUp === true);
  const realTcp = fs.readFileSync("/proc/net/tcp", "utf8");
  const inode = parseProcNetPort(realTcp, dummyPort);
  t("10i. /proc asli: inode listener ketemu", inode !== null, String(inode));
  t("10j. /proc asli: PID = child.pid beneran", findPidBySocketInode("/proc", inode) === dummy.pid, `cari=${findPidBySocketInode("/proc", inode)} vs asli=${dummy.pid}`);
  // 10k: findPidOnPort utuh (tool + fallback) nemu PID yang sama
  const pidUtuh = await findPidOnPort(dummyPort);
  t("10k. findPidOnPort(penuh) → PID dummy", pidUtuh === dummy.pid, `cari=${pidUtuh} vs asli=${dummy.pid}`);
  try { dummy.kill("SIGKILL"); } catch {}
  try { fs.rmSync(fakeProc, { recursive: true, force: true }); } catch {}

  // 10l: engine source — urutan tool dulu baru /proc (lsof tetap #1 biar cepet)
  const engSrc10 = fs.readFileSync(path.join(R, "src/lib/rara-9router-local.js"), "utf8");
  const posLsof = engSrc10.indexOf('"lsof"');
  const posProc = engSrc10.indexOf('findPidBySocketInode(procDir, parseProcNetPort(content, port))');
  t("10l. engine: /proc jadi fallback TERAKHIR (lsof/fuser/ss duluan)", posLsof > 0 && posProc > posLsof);
}

srv.close();
w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
