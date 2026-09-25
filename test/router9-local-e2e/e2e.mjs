// NOVA AI WHATSAPP BOT — E2E: 9ROUTER LOKAL NATIVE (owner 25 Sep 2026)
// "seakan-akan bot sudah menginstal & menjalankan 9router beneran di node js,
// semua model lengkap" + rename cmd .9router (bukan .ai9).
// Jalur: engine src/lib/nova-9router-local.js + plugin plugins/ai/9router.js.
// 9Router DIMOCK penuh via server http lokal (health/models/keys/providers/
// chat/images) — env ROUTER9_* di-set SEBELUM import engine.
// TANPA FALLBACK: server mati / key ditolak / provider kosong → error jujur.
// Jalankan dari repo root: node test/router9-local-e2e/e2e.mjs
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
      return send(200, { keys: gwKeys.map((k) => ({ key: k, name: "nova-bot" })) });
    }
    if (req.url === "/api/keys" && req.method === "POST") {
      calls.keys.push(j);
      if (!cli) return send(401, { error: "no cli token" });
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
      if (!auth.startsWith("Bearer ")) return send(401, { error: "unauthorized" });
      return send(200, { data: MODELS });
    }
    if (req.url === "/v1/chat/completions") {
      calls.chat.push({ auth, body: j });
      if (failMode === "401") return send(401, { error: { message: "bad key" } });
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
const { initDatabase } = await import(pathToFileURL(path.join(R, "src/lib/nova-database.js")).href);
await initDatabase(path.join(TMP, "db.json"));
const { fromSC } = await import(pathToFileURL(path.join(R, "src/lib/styler.js")).href);
const norm = (s) => fromSC(String(s)).toLowerCase();

const engine = await import(pathToFileURL(path.join(R, "src/lib/nova-9router-local.js")).href);
const {
  router9IsUp, ensure9RouterRunning, ensureRouter9GatewayKey, syncRouter9ProviderKeys,
  router9Models, router9FindModel, router9Chat, router9ImageGen, router9ImageModels,
  router9VisionModels, router9Stats, ROUTER9_DEFAULT_MODEL, getRouter9Base,
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
t("3g. stats dicatat (requests/ok/fail)", st1.requests >= 5 && st1.fail === 3 && st1.ok >= 2, JSON.stringify(st1));

// ═══ 4. ENGINE — image gen ═══
section("4. image generation");
const img1 = await router9ImageGen({ model: "poe/nano-banana", prompt: "kucing astronot" });
t("4a. gambar balik sebagai base64", img1.b64 && Buffer.from(img1.b64, "base64").toString() === "PNGFAKE", JSON.stringify(img1).slice(0, 80));
t("4b. images/generations dikasih gateway key + prompt", calls.images.at(-1).auth === `Bearer ${gw}` && calls.images.at(-1).body.prompt === "kucing astronot");
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
  const { getDatabase } = await import(pathToFileURL(path.join(R, "src/lib/nova-database.js")).href);
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
  const eng = fs.readFileSync(path.join(R, "src/lib/nova-9router-local.js"), "utf8");
  t("6c. engine: tanpa fallback ke apikeys.json chain", !eng.includes("aiMultiprovider") && !eng.includes("routerChat"));
  t("6d. engine: heal sql-wasm + spawn cli.js + gateway auto", eng.includes("sql-wasm.wasm") && eng.includes("9router/cli.js") && eng.includes("/api/keys"));
  t("6e. file lama .ai9/nova-ai-router udah gak ada", !fs.existsSync(path.join(R, "plugins/ai/ai9.js")) && !fs.existsSync(path.join(R, "src/lib/nova-ai-router.js")));
}

// ═══ 7. ISOLASI DARI 9ROUTERV2 (aturan owner 25 Sep 2026: lokal JANGAN
// nyentuh v2 — v2 = API endpoint punya orang, bukan lokal) ═══
section("7. isolasi dari 9routerv2 (cloud milik orang)");
{
  const engSrc = fs.readFileSync(path.join(R, "src/lib/nova-9router-local.js"), "utf8");
  const plugSrc = fs.readFileSync(path.join(R, "plugins/ai/9router.js"), "utf8");
  const cfgSrc = fs.readFileSync(path.join(R, "src/lib/apikey/9routerapikey.json"), "utf8");
  const banned = /router9v2|ai9v2|cloudku|getTioBase|getTioEndpoint|env-loader|tio_|TIO_API|ROUTER_API_URL|ROUTER_API_KEY/;
  t("7a. engine lokal: gak ada referensi v2/cloudku/tio/env ROUTER_API", !banned.test(engSrc.replace(/^\s*\/\/.*$/gm, "")), (engSrc.match(banned) || ["?"])[0]);
  t("7b. plugin .9router: gak ada referensi v2/cloudku/tio", !banned.test(plugSrc), (plugSrc.match(banned) || ["?"])[0]);
  t("7c. konfigurasi 9routerapikey.json: gak ada endpoint v2", !banned.test(cfgSrc), (cfgSrc.match(banned) || ["?"])[0]);
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

srv.close();
w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
