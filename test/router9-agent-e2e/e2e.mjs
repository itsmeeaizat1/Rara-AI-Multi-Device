// E2E: .9router ag — agent mode 9Router (browsing + bikin kode/file)
// Jalankan dari ROOT repo: node test/router9-agent-e2e/e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { setAgentDeps } from "../../src/lib/rara-agent.js";

const R = path.resolve();
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + String(extra).slice(0, 160).replace(/\n/g, " | ") : ""}`); }
};
const section = (s) => console.log(`\n— ${s} —`);

// ═══ mock server 9router ═══
const calls = { chat: [], models: 0, keys: 0, providers: 0 };
let chatScript = []; // antrean balasan chat per pemanggilan
let gwKeys = ["sk-agent-mock"];
const srv = http.createServer((req, res) => {
  const send = (code, json) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(json)); };
  let body = "";
  req.on("data", (d) => body += d);
  req.on("end", () => {
    let j = null; try { j = JSON.parse(body || "{}"); } catch {}
    const cli = req.headers["x-9r-cli-token"] || "";
    if (req.url === "/api/health") return send(200, { ok: true });
    if (req.url === "/api/keys" && req.method === "GET") {
      if (!cli) return send(401, { error: "no cli token" });
      return send(200, { keys: gwKeys.map((k) => ({ key: k, name: "rara-bot" })) });
    }
    if (req.url === "/api/keys" && req.method === "POST") {
      calls.keys++; const key = "sk-agent-mock-new";
      gwKeys.push(key); return send(201, { key, name: j?.name || "?" });
    }
    if (req.url === "/api/providers" && req.method === "POST") { calls.providers++; return send(200, { ok: true }); }
    if (req.url === "/v1/models") {
      calls.models++;
      if (!(req.headers["authorization"] || "").startsWith("Bearer ")) return send(401, { error: "unauthorized" });
      return send(200, { data: [{ id: "alicode-intl/glm-4.7", owned_by: "alicode-intl" }, { id: "alicode-intl/glm-4.6v", owned_by: "alicode-intl" }] });
    }
    if (req.url === "/v1/chat/completions") {
      calls.chat.push({ model: j?.model, messages: j?.messages });
      const text = chatScript.shift() ?? "jawaban default mock";
      return send(200, { choices: [{ message: { content: text } }], model: j?.model });
    }
    send(404, { error: "not found" });
  });
});
await new Promise((r) => srv.listen(20129, "127.0.0.1", r)); // port beda biar gak bentrok 20128
process.env.ROUTER9_URL = "http://127.0.0.1:20129";
process.env.ROUTER9_NO_SPAWN = "1";
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "r9ag-home-"));
process.env.ROUTER9_DATA_DIR = tmpHome;
const cfgTmp = path.join(tmpHome, "9routerapikey.json");
fs.writeFileSync(cfgTmp, JSON.stringify({ gateway: { apikey: "" }, providers: [] }, null, 2));
process.env.ROUTER9_CONFIG = cfgTmp;

// database + modul
await import("../../src/lib/rara-database.js").then(async (m) => {
  process.env.DATABASE_PATH = path.join(tmpHome, "db.json");
  await m.initDatabase?.(process.env.DATABASE_PATH);
});
const { runAgent } = await import("../../src/lib/rara-agent.js");
const { buildExecutors } = await import("../../plugins/ai-agent/agent.js");
const { handler } = await import("../../plugins/ai/9router.js");

// ═══ harness pesan ═══
const mkM = ({ text = "", args = [], owner = true } = {}) => ({
  chat: "chat-test@g.us", sender: "sender-test@g.us", isOwner: owner, isImage: false, text,
  key: { remoteJid: "chat-test@g.us" },
  _args: args, _replies: [],
  reply: async (x) => { mkM._last = String(x); return {}; },
  react: async () => {},
  download: async () => Buffer.from("fake"),
});
const mkSock = () => ({ sendMessage: async (chat, msg) => { mkSock._last = msg?.text || ""; return { key: { id: "s1" } }; } });

section("1. engine runAgent: override AI per-call (bukan deps global)");
{
  let globalCalled = 0, localCalled = 0;
  const failGlobal = async () => { globalCalled++; throw new Error("deps global KEPIAKE — harusnya gak"); };
  setAgentDeps({ aiChat: failGlobal });
  const fakeAi = async (prompt, opts = {}) => {
    localCalled++;
    if (prompt.includes("BUKTI")) return "JAWABAN AKHIR DARI BUKTI";
    return JSON.stringify({ mode: "tools", tools: [{ tool: "browse", url: "https://contoh.com/artikel" }], voice: false });
    return "JAWABAN AKHIR DARI BUKTI";
  };
  let browsed = null;
  const res = await runAgent("browsing artikel contoh", {
    ai: fakeAi,
    execTools: { browse: async (x) => { browsed = x; return { ok: true, msg: "kebaca", evidence: "ISI HALAMAN: judul artikel contoh" }; } },
  });
  t("1a. adapter override kepake (deps global gak kesentuh)", localCalled > 0 && globalCalled === 0);
  t("1b. tool browse dijalankan executor stub", browsed?.url === "https://contoh.com/artikel", JSON.stringify(browsed));
  t("1c. jawaban akhir dari bukti tool", String(res?.answer || "").includes("JAWABAN AKHIR DARI BUKTI"), res?.answer?.slice?.(0, 80));
  setAgentDeps({}); // balikin biar suite lain gak kesiran
}

section("2. anti-loop: command '9router' dari dalam agent diblok");
{
  const ex = buildExecutors(mkM(), mkSock(), null, null, {}, null);
  const r = await ex.command({ cmd: "9router", args: "ag halo" });
  t("2a. .9router dari dalam agent → ditolak (loop)", r?.ok === false && /loop/i.test(r?.msg || ""), JSON.stringify(r));
  const r2 = await ex.command({ cmd: "raraagent", args: "halo" });
  t("2b. .raraagent juga masih keblok", r2?.ok === false && /loop/i.test(r2?.msg || ""));
}

section("3. plugin .9router ag end-to-end (mock server + deps stub)");
{
  chatScript = [
    JSON.stringify({ mode: "tools", tools: [{ tool: "browse", url: "https://situs.com/berita-gempa" }], voice: false }),
    "Ringkasan: gempa M5.2 di Jogja hari ini.",
  ];
  const m = mkM({ args: ["ag", "browsing", "berita", "gempa", "hari", "ini"] });
  const sock = mkSock();
  const browsedUrls = [];
  await handler(m, { sock, args: m._args, db: null, deps: { browse: async (x) => { browsedUrls.push(x?.url); return { ok: true, msg: "kebaca", evidence: "ISI BERITA: gempa M5.2 Jogja" }; } } });
  const all = (mkM._last || "") + (mkSock._last || "");
  t("3a. browse tool kepanggil dengan URL dari plan", browsedUrls.includes("https://situs.com/berita-gempa"), JSON.stringify(browsedUrls));
  t("3b. jawaban akhir kekirim + footer via 9Router Lokal", all.includes("Ringkasan") && all.includes("9Router Lokal"), all.slice(0, 120));
  t("3c. chat plan dikirim ke model pref (mock server)", (calls.chat[0]?.model || "").includes("glm"), calls.chat[0]?.model);
  t("3d. system prompt plan ikut kekirim ke 9router", typeof calls.chat[0]?.messages?.[0]?.content === "string" && calls.chat[0].messages.length >= 2, JSON.stringify(calls.chat[0]?.messages?.length));
}

section("4. jalur tanpa tugas + jalur error jujur");
{
  const m = mkM({ args: ["ag"] });
  await handler(m, { sock: mkSock(), args: m._args, db: null });
  t("4a. 'ag' tanpa tugas → petunjuk cara pakai", (mkM._last || "").includes("browsing berita gempa"), mkM._last?.slice(0, 100));

  chatScript = [];
  process.env.ROUTER9_URL = "http://127.0.0.1:1"; // server "mati"
  const m2 = mkM({ args: ["ag", "halo", "dunia"] });
  await handler(m2, { sock: mkSock(), args: m2._args, db: null, deps: {} });
  process.env.ROUTER9_URL = "http://127.0.0.1:20129";
  t("4b. 9router mati → error jujur 'belum jalan' (gak nyaru error riset)", (mkM._last || "").includes("belum jalan"), mkM._last?.slice(0, 140));
}

srv.close();
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
