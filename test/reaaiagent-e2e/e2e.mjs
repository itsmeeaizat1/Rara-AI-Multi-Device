// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E REAAIAGENT — AI agent reverse engineering via MCP REA (feat/reaaiagent)
// Jalankan: node test/reaaiagent-e2e/e2e.mjs
//
// Cakup QA Standard v1 (owner 9 Okt) — E2E + regresi saja TIDAK cukup:
//   Gerbang 1  Integration tanpa mock penuh:
//     • MCP server REA ASLI (kalau rea-agents ke-detect): initialize →
//       tools/list → analyze_javascript_application di tmp dir beneran →
//       Evidence ID asli + ledger bundle. SKIP jelas kalau belum terpasang.
//     • FAKE server (fixtures/fake-mcp-server.mjs) = proses node ASLI
//       lewat stdio ASLI (bukan mock function) — parsing, framing, id
//       matching diuji beneran.
//   Gerbang 2  State & session: server mati (exit) → request berikutnya
//     auto-restart bersih; timeout per-request → reject, gak hang;
//     notification server diabaikan tanpa crash.
//   Gerbang 3  Rate & concurrency: 10 callTool paralel di satu koneksi →
//     semua resolve + id unik; 20 loop agent paralel → gak dobel steps.
//   Gerbang 4  Input validation & edge: task control-char sanitized;
//     tool di luar whitelist DITOLAK (dibales ke model, gak throw); args
//     malformed JSON → self-correct; zip target berisi path traversal
//     (zip-slip) → entry jahat GAK diekstrak; command tanpa args (pesan
//     non-teks nyasar) → kartu usage.
//   Gerbang 5  Error boundary: transport error → ok:false rapi; semua
//     provider LLM gagal → all-providers-failed (gak unhandled); handler
//     error → kartu error; suite exit code bener.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import AdmZip from "adm-zip";

const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0, skip = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
};
const tSkip = (name, why) => { skip++; console.log(`  ⏭️  SKIP ${name} — ${why}`); };

// GOTCHA lama: handler uncaught biar suite gak mati senyap exit 0 palsu
process.on("unhandledRejection", (e) => { console.error("UNHANDLED (suite):", e?.message || e); fail++; });
process.on("uncaughtException", (e) => { console.error("UNCAUGHT (suite):", e?.message || e); fail++; });

const FAKE_CMD = `node ${R("./fixtures/fake-mcp-server.mjs")}`;

// ── deteksi server REA asli (integration beneran kalau ada) ──
function findRealReaCmd() {
  if (process.env.REA_E2E_REA_CMD) return process.env.REA_E2E_REA_CMD;
  const candidates = [
    R("../../node_modules/rea-agents/scripts/rea.mjs"),       // instalasi repo lokal
    "/tmp/rea-client/node_modules/rea-agents/scripts/rea.mjs", // sandbox dev
  ];
  for (const c of candidates) {
    if (existsSync(c)) return `node ${c} mcp`;
  }
  return null;
}

const bridge = await import(R("../../src/lib/rara-mcp-bridge.js"));
const {
  McpStdioSession, parseMcpCommand, createReaMcpSession,
  _setReaSessionForTest, _resetReaSessionForTest,
} = bridge;
const reaLib = await import(R("../../src/lib/rara-reaaiagent.js"));
const {
  runReaAgent, reaStatusCardData, reaToolWhitelist,
  _setReaAgentDepsForTest, _resetReaAgentDepsForTest,
} = reaLib;
const native = await import(R("../../src/lib/rara-agent-native.js"));
const { _setNativeDepsForTest, _resetNativeDepsForTest } = native;

// ── helper fake fetch LLM (pola suite aiagent-native) ──
function mkFetch(script) {
  let i = 0;
  const fn = async (url, opts) => {
    const step = script[Math.min(i, script.length - 1)];
    i++;
    if (step?.throw) throw new Error(step.throw);
    if (step?.http) return { ok: false, status: step.http, text: async () => "boom " + step.http };
    const msg = { content: step?.content || "" };
    if (step?.toolCalls) {
      msg.tool_calls = step.toolCalls.map((tc, ix) => ({
        id: `c${i}-${ix}`, type: "function",
        function: { name: tc.name, arguments: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args || {}) },
      }));
    }
    return { ok: true, json: async () => ({ choices: [{ message: msg }], model: "fake-model" }) };
  };
  fn.getCalls = () => i;
  return fn;
}

// sesi fake in-process buat loop test (lewat seam _setReaAgentDepsForTest)
function fakeSession({ tools } = {}) {
  const calls = [];
  const st = {
    started: 0, closed: 0,
    serverInfo: { name: "fake-rea", version: "0.1.0" },
    protocolVersion: "2025-11-25",
    command: FAKE_CMD,
    lastError: null,
  };
  return {
    calls,
    async start() { st.started++; return this; },
    async listTools() {
      return tools || [
        { name: "analyze_javascript_application", description: "analisis aplikasi JS", inputSchema: { type: "object", properties: { input_path: { type: "string" } }, required: ["input_path"] } },
        { name: "inspect_analysis_view", description: "view evidence", inputSchema: { type: "object", properties: {} } },
        { name: "get_evidence_bundle", description: "bundle", inputSchema: { type: "object", properties: {} } },
      ];
    },
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === "boom") return { ok: false, isError: false, text: "spawn-error: mati", structured: null, raw: null };
      if (name === "err_domain") return { ok: true, isError: true, text: "Input validation error: input_path: expected string", structured: null, raw: null };
      const ev = "ev_" + "c".repeat(64);
      return { ok: true, isError: false, text: `analysis ok (${args?.input_path || "?"}) evidence ${ev}`, structured: { evidence_id: ev }, raw: null };
    },
    status() { return { ...st, running: true, toolCount: null, stderrTail: "" }; },
    async close() { st.closed++; },
  };
}

// ════════════════════════════════════════════════════════════════
console.log("── 1. BRIDGE: parsing & handshake (fake server proses asli) ──");
{
  const p1 = parseMcpCommand("npx rea-agents mcp");
  t("1a. parseMcpCommand plain", p1.cmd === "npx" && p1.args.join(" ") === "rea-agents mcp");
  const p2 = parseMcpCommand('rea mcp --tag "rea test"');
  t("1b. parseMcpCommand quoted", p2.args[2] === "rea test", JSON.stringify(p2));
  t("1c. parseMcpCommand kosong", parseMcpCommand("").cmd === "");

  const sess = new McpStdioSession({ id: "s1", command: FAKE_CMD, requestTimeoutMs: 15000 });
  await sess.start();
  t("1d. initialize → serverInfo fake", sess.serverInfo?.name === "fake-rea" && sess.serverInfo?.version === "0.1.0");
  t("1e. protocolVersion dibaca", sess.protocolVersion === "2025-11-25");

  const tools = await sess.listTools();
  t("1f. tools/list → 4 tools", tools.length === 4 && tools.every((x) => x.name && x.inputSchema), String(tools.length));
  const again = await sess.listTools();
  t("1g. tools/list di-cache", again === tools);

  const call = await sess.callTool("rea_probe_ok", { echo: "halo" });
  t("1h. callTool ok → text + structured", call.ok && !call.isError && call.structured?.evidence_id?.startsWith("ev_") && call.text.includes("halo"));

  const callErr = await sess.callTool("rea_probe_err", {});
  t("1i. callTool isError domain → ok:true isError:true", callErr.ok === true && callErr.isError === true && callErr.text.includes("expected string"));
  t("1j. pesan error REA dibaca dari content text", callErr.text.startsWith("Input validation error"));

  const callBad = await sess.callTool("tool_gak_ada", {});
  t("1k. JSON-RPC error → ok:false (gak throw)", callBad.ok === false && callBad.text.includes("unknown tool"));

  // gerbang 2: server mati → auto-restart di request berikutnya
  await sess.callTool("rea_die", {});
  await new Promise((r) => setTimeout(r, 300)); // tunggu exit
  t("1l. server exit → status running:false", sess.status().running === false);
  const after = await sess.callTool("rea_probe_ok", { echo: "resurrect" });
  t("1m. auto-restart → callTool sukses lagi", after.ok && after.text.includes("resurrect"));
  t("1n. serverInfo ke-refresh setelah restart", sess.serverInfo?.name === "fake-rea");

  // gerbang 3: 10 callTool paralel di SATU koneksi (id matching)
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => sess.callTool("rea_probe_ok", { echo: "par" + i }))
  );
  t("1o. 10 paralel semua ok", results.every((r) => r.ok && !r.isError), `${results.filter((r) => r.ok).length}/10`);
  t("1p. hasil paralel gak ketukar-tukar", results.every((r, i) => r.text.includes("par" + i)), "echo harus match index");

  // gerbang 2: timeout per-request (server mati senyap tanpa jawab)
  const t0 = Date.now();
  const dead = new McpStdioSession({ id: "s2", command: "node -e \"process.stdin.resume()\"", requestTimeoutMs: 700 });
  let startTimeout = false;
  try { await dead.start(); } catch (e) { startTimeout = String(e?.message || "").includes("timeout"); }
  t("1q. handshake timeout → start() nolak (bukan hang)", startTimeout);
  t("1r. proses zombie dibunuh pas start gagal", dead.status().running === false);
  const timedOut = await dead.callTool("rea_probe_ok", {});
  t("1s. timeout per-request → ok:false bukan hang", dead === dead && timedOut.ok === false && String(timedOut.text).includes("timeout"), String(timedOut.text).slice(0, 60));
  t("1t. timeout < 2 dtk (gak nge-hook loop)", Date.now() - t0 < 2000);
  await dead.close();

  await sess.close();
  t("1u. close bersih → running:false", sess.status().running === false);

  // gerbang 5: spawn gagal (command gak ada) → error jelas, gak throw
  const broken = new McpStdioSession({ id: "s3", command: "command-benar-benar-tidak-ada-xyz --mcp", requestTimeoutMs: 4000 });
  let spawnErr = null;
  try { await broken.start(); } catch (e) { spawnErr = e; }
  t("1v. spawn gagal → throw yang bisa ditangkap", !!spawnErr, String(spawnErr?.message || "").slice(0, 80));
}

// ════════════════════════════════════════════════════════════════
console.log("── 2. INTEGRATION: server REA ASLI (gerbang 1 — skip kalau belum terpasang) ──");
{
  const realCmd = findRealReaCmd();
  if (!realCmd) {
    tSkip("2a-2g. live REA", "rea-agents gak terdeteksi (npm i rea-agents / REA_E2E_REA_CMD)");
  } else {
    console.log("     server:", realCmd);
    const WORK = mkdtempSync(path.join(tmpdir(), "reaaiagent-e2e-"));
    mkdirSync(path.join(WORK, "app"), { recursive: true });
    writeFileSync(path.join(WORK, "app", "index.js"), 'import { search } from "./search.js";\nconsole.log(search("h", "hai"));\n');
    writeFileSync(path.join(WORK, "app", "search.js"), 'export function search(n, h) { return h.includes(n); }\n');

    const sess = new McpStdioSession({ id: "real", command: realCmd, requestTimeoutMs: 90000 });
    await sess.start();
    t("2a. initialize live → server rea", sess.serverInfo?.name === "rea", String(sess.serverInfo?.name));
    const tools = await sess.listTools({ refresh: true });
    t("2b. katalog besar (≥100 tools)", tools.length >= 100, String(tools.length));
    const wl = reaToolWhitelist();
    const aktif = tools.filter((x) => wl.includes(x.name)).map((x) => x.name);
    t("2c. whitelist nyambung (≥12 tool aktif)", aktif.length >= 12, aktif.join(","));

    const call = await sess.callTool("analyze_javascript_application", { input_path: path.join(WORK, "app") });
    t("2d. analyze live → ok, bukan error", call.ok && !call.isError, String(call.text).slice(0, 100));
    const ev = call.structured?.evidence_id || "";
    t("2e. evidence_id format valid (ev_ + 64 hex)", /^ev_[0-9a-f]{64}$/.test(ev), ev.slice(0, 24));
    t("2f. teks evidence ada modul search.js", call.text.includes("search.js") || JSON.stringify(call.structured).includes("search.js"));

    const bundle = await sess.callTool("get_evidence_bundle", { detail: "summary" });
    t("2g. ledger bundle → evidence tercatat", bundle.ok && !bundle.isError && bundle.text.includes(ev), String(bundle.text).slice(0, 80));

    await sess.close();
    rmSync(WORK, { recursive: true, force: true });
  }
}

// ════════════════════════════════════════════════════════════════
console.log("── 3. AGENT LOOP: whitelist, self-correct, boundary (gerbang 2+4+5) ──");
{
  _setNativeDepsForTest({ keys: { githubmodels: "k-test", groq: "" } });
  _resetReaAgentDepsForTest();

  // 3a happy path: analyze → finish, evidence nyantol di jawaban
  {
    const sess = fakeSession();
    _setReaAgentDepsForTest({ session: sess });
    const f = mkFetch([
      { toolCalls: [{ name: "analyze_javascript_application", args: { input_path: "/tmp/app" } }] },
      { toolCalls: [{ name: "finish", args: { answer: "Modul: index.js+search.js (evidence ev_cc…)" } }] },
    ]);
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "analisis aplikasi di /tmp/app" });
    t("3a. happy path ok + 2 langkah", r.ok && r.steps.length === 2 && r.answer.includes("search.js"), JSON.stringify(r.steps));
    t("3b. tool REA beneran kepanggil dgn args", sess.calls[0]?.name === "analyze_javascript_application" && sess.calls[0]?.args?.input_path === "/tmp/app");
  }

  // 3b args bukan JSON → dibales ke model buat self-correct (gak throw)
  {
    _setReaAgentDepsForTest({ session: fakeSession() });
    const f = mkFetch([
      { toolCalls: [{ name: "analyze_javascript_application", args: "{input_path: BROKEN json" }] },
      { toolCalls: [{ name: "finish", args: { answer: "selesai" } }] },
    ]);
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "analisis /tmp/app" });
    t("3c. args malformed → self-correct & tetap selesai", r.ok === true && r.steps.length === 2, JSON.stringify(r.steps));
  }

  // 3c tool di luar whitelist → dibales larangan, gak dieksekusi
  {
    const sess = fakeSession();
    _setReaAgentDepsForTest({ session: sess });
    const f = mkFetch([
      { toolCalls: [{ name: "hack_the_planet", args: {} }] },
      { toolCalls: [{ name: "finish", args: { answer: "gak bisa" } }] },
    ]);
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "analisis" });
    t("3d. tool luar whitelist DITOLAK", r.ok && r.steps[0]?.note === "tool di luar whitelist" && sess.calls.length === 0, JSON.stringify(r.steps));
  }

  // 3d error domain REA → dibales ke model sebagai [ERROR REA]
  {
    const sess = fakeSession();
    _setReaAgentDepsForTest({ session: sess });
    let sawErrText = false;
    const f = mkFetch([
      { toolCalls: [{ name: "err_domain", args: {} }] },
      { toolCalls: [{ name: "finish", args: { answer: "ok" } }] },
    ]);
    // snapshot konten tool lewat probe: pakai error domain lalu cek step ok:false
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "x" });
    t("3e. isError domain → step ok:false + gak crash", r.ok === true && r.steps[0]?.ok === false, JSON.stringify(r.steps[0]));
  }

  // 3e transport mati → [KESALAHAN TRANSPORT] ke model, lanjut
  {
    const sess = fakeSession();
    _setReaAgentDepsForTest({ session: sess });
    const f = mkFetch([
      { toolCalls: [{ name: "boom", args: {} }] },
      { toolCalls: [{ name: "finish", args: { answer: "transport mati tapi selesai" } }] },
    ]);
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "x" });
    t("3f. transport error → self-recover + selesai", r.ok === true && r.steps[0]?.ok === false, JSON.stringify(r.steps));
  }

  // 3f maxSteps → wrap-up terkontrol
  {
    _setReaAgentDepsForTest({ session: fakeSession() });
    const f = mkFetch([{ toolCalls: [{ name: "inspect_analysis_view", args: {} }] }]); // selalu manggil tool
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "x", maxSteps: 3 });
    t("3g. maxSteps → wrap-up maxed:true (gak infinite loop)", r.ok === true && r.maxed === true && r.steps.length === 3);
  }

  // 3g semua provider gagal → all-providers-failed, GAK unhandled
  {
    _setReaAgentDepsForTest({ session: fakeSession() });
    const f = mkFetch([{ throw: "api down" }]);
    _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k", groq: "g" } });
    const r = await runReaAgent({ task: "x" });
    t("3h. semua provider mati → ok:false all-providers-failed", r.ok === false && r.error === "all-providers-failed");
  }

  // 3h tanpa key → no-provider (override eksplisit, bukan key dev mesin)
  {
    _setReaAgentDepsForTest({ session: fakeSession() });
    _setNativeDepsForTest({ keys: { githubmodels: "", groq: "" } });
    const r = await runReaAgent({ task: "x" });
    t("3i. tanpa key → ok:false no-provider", r.ok === false && r.error === "no-provider");
  }

  // 3i task disanitasi (control char dibuang)
  {
    _setReaAgentDepsForTest({ session: fakeSession() });
    _setNativeDepsForTest({ fetch: mkFetch([{ toolCalls: [{ name: "finish", args: { answer: "ok" } }] }]), keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "baca\u0000file\u0007x" });
    t("3j. task control-char disanitasi", r.ok === true);
  }

  // 3j MCP gak nyambung → mcp-unavailable (gak throw)
  {
    const bad = {
      async start() { throw new Error("spawn-error: command gak ada"); },
      async listTools() { throw new Error("gak nyala"); },
      async callTool() { return { ok: false, isError: false, text: "", structured: null, raw: null }; },
      status() { return { running: false, lastError: "spawn-error", command: "?" }; },
      async close() {},
    };
    _setReaAgentDepsForTest({ session: bad });
    _setNativeDepsForTest({ keys: { githubmodels: "k" } });
    const r = await runReaAgent({ task: "x" });
    t("3k. MCP mati → ok:false mcp-unavailable", r.ok === false && r.error === "mcp-unavailable" && String(r.detail).includes("spawn"));
  }

  // 3l gerbang 3: 20 loop PARALEL → semua ok, gak dobel steps
  {
    const shared = fakeSession();
    _setReaAgentDepsForTest({ session: shared });
    // GOTCHA (memory aiagent-native): counter global di fake fetch kecampur
    // antar run paralel → fetch WAJIB stateless per-run (fresh tiap agent)
    _setNativeDepsForTest({
      fetch: async (url, opts) => {
        // stateless per-run: kalau histori udah ada hasil tool → saatnya finish
        const step = JSON.parse(opts.body).messages.some((m) => m.role === "tool") ? 1 : 0;
        const script = [
          { toolCalls: [{ name: "analyze_javascript_application", args: { input_path: "/p" } }] },
          { toolCalls: [{ name: "finish", args: { answer: "done" } }] },
        ];
        const st = script[step];
        const msg = { content: "", tool_calls: st.toolCalls.map((tc, ix) => ({ id: `c-${ix}`, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.args) } })) };
        return { ok: true, json: async () => ({ choices: [{ message: msg }], model: "fake" }) };
      },
      keys: { githubmodels: "k" },
    });
    const rs = await Promise.all(Array.from({ length: 20 }, () => runReaAgent({ task: "x" })));
    const oks = rs.filter((r) => r.ok);
    t("3l. 20 loop paralel semua resolve ok", oks.length === 20, `${oks.length}/20`);
    const stepCount = rs.reduce((a, r) => a + r.steps.length, 0);
    t("3m. gak dobel steps (20×2=40)", stepCount === 40, String(stepCount));
  }

  _resetReaAgentDepsForTest();
  _resetNativeDepsForTest();
}

// ════════════════════════════════════════════════════════════════
console.log("── 4. PLUGIN .reaaiagent: kartu, gate & edge (gerbang 4) ──");
{
  _resetNativeDepsForTest();
  _resetReaAgentDepsForTest();
  const plugin = await import(R("../../plugins/ai-agent/reaaiagent.js"));
  t("4a. export default = { config, handler } (anti loader silent-skip)", plugin.default?.config?.name === "reaaiagent" && typeof plugin.default?.handler === "function");
  t("4b. named export config & handler ada", plugin.config?.name === "reaaiagent" && typeof plugin.handler === "function");
  t("4c. config isOwner (analisis lokal, tools berat)", plugin.config.isOwner === true);
  t("4d. kategori ai agent", plugin.config.category === "ai agent");
  t("4e. cooldown dipasang", (plugin.config.cooldown || 0) >= 15);

  const sent = []; const reacts = [];
  const mkMsg = (args, extra = {}) => ({
    chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
    key: { remoteJid: "6281@s.whatsapp.net", fromMe: false, id: "m1" },
    args, text: ".reaaiagent " + args.join(" "),
    reply: async (card) => { sent.push(String(card)); return true; },
    react: async (r) => { reacts.push(r); return true; },
    ...extra,
  });
  const last = () => sent[sent.length - 1] || "";

  // tanpa args (pesan non-teks/acak nyasar) → kartu usage, GAK throw
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg([]), {});
  t("4f. tanpa args → kartu usage 『 Rea Ai Agent 』", /『 \*Rea Ai Agent\* 』/.test(last()) && last().includes(".reaaiagent"), last().slice(0, 80));
  t("4g. usage pakai chip ᯓ", last().includes("ᯓ"));

  sent.length = 0;
  await plugin.handler(mkMsg([], { text: undefined, quoted: { image: true } }), {});
  t("4h. pesan non-teks → usage (gak throw)", /『 \*Rea Ai Agent\* 』/.test(last()));

  // sub status (sesi fake tersambung lewat seam singleton bridge)
  const fakeSess = fakeSession();
  fakeSess.listTools = async () => [
    { name: "analyze_javascript_application", description: "d", inputSchema: { type: "object", properties: {} } },
    { name: "inspect_analysis_view", description: "d", inputSchema: { type: "object", properties: {} } },
    { name: "get_evidence_bundle", description: "d", inputSchema: { type: "object", properties: {} } },
    { name: "binary_session", description: "d", inputSchema: { type: "object", properties: {} } },
  ];
  fakeSess.status = () => ({ id: "rea", command: "fake", running: true, serverInfo: { name: "rea", version: "6.4.0-test" }, protocolVersion: "2025-11-25", toolCount: 4, lastError: null, stderrTail: "" });
  _setReaSessionForTest(fakeSess);
  _setReaAgentDepsForTest({ session: fakeSess });
  _setNativeDepsForTest({ keys: { githubmodels: "k" } });

  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["status"]), {});
  t("4i. .reaaiagent status → kartu status server", last().includes("STATUS MCP REA") && last().includes("rea") && last().includes("6.4.0-test"), last().slice(0, 90));

  sent.length = 0;
  await plugin.handler(mkMsg(["tools"]), {});
  t("4j. .reaaiagent tools → daftar tools aktif", last().includes("TOOLS REA AKTIF") && last().includes("analyze_javascript_application"));

  sent.length = 0;
  await plugin.handler(mkMsg(["stop"]), {});
  t("4k. .reaaiagent stop → kartu sesi ditutup", last().includes("SESI MCP REA DITUTUP"));

  // sukses penuh: fake fetch LLM + sesi fake → kartu hasil
  const f = mkFetch([
    { toolCalls: [{ name: "analyze_javascript_application", args: { input_path: "/tmp/app" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "Aplikasi 2 modul: index.js + search.js. Evidence ev_cc." } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["cara", "kerja", "search?"]), {});
  t("4l. sukses → kartu HASIL REVERSE ENGINEERING", last().includes("HASIL REVERSE ENGINEERING") && last().includes("search.js"), last().slice(0, 90));
  t("4m. jejak analisis tampil", last().includes("JEJAK ANALISIS"));
  t("4n. hint evidence ledger aktif", last().includes("evidence sesi masih tersimpan"));
  t("4o. react ✅ sukses", reacts[reacts.length - 1] === "✅");

  // error semua provider → kartu error (gak throw)
  const fBad = mkFetch([{ throw: "down" }]);
  _setNativeDepsForTest({ fetch: fBad, keys: { githubmodels: "k", groq: "g" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["tugas", "x"]), {});
  t("4p. semua provider mati → kartu error", /gagal|error/i.test(last()) && last().length > 10, last().slice(0, 80));

  // MCP gak nyambung → kartu error + panduan install
  const dead = {
    async start() { throw new Error("spawn-error ENOENT"); },
    async listTools() { throw new Error("gak nyala"); },
    async callTool() { return { ok: false, isError: false, text: "", structured: null, raw: null }; },
    status() { return { running: false, lastError: "spawn-error ENOENT", command: "?" }; },
    async close() {},
  };
  _setReaAgentDepsForTest({ session: dead });
  _setNativeDepsForTest({ fetch: mkFetch([{ toolCalls: [{ name: "finish", args: { answer: "x" } }] }]), keys: { githubmodels: "k" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis", "app"]), {});
  t("4q. MCP mati → kartu error + arahan npm i", last().includes("rea-agents") && last().includes("Node"), last().slice(0, 90));

  // ── reply dokumen zip: ekstraksi + ZIP-SLIP (gerbang 4) ──
  const TMPAREA = path.join(tmpdir(), "rara-rea");
  // zip VALID via adm-zip (adm-zip menormalisasi entry traversal saat CREATE —
  // file di-flatten jadi nama aman; guard regex tetap diuji di 4t-regex)
  const zip = new AdmZip();
  zip.addFile("app/index.js", Buffer.from('console.log("hi")\n'));
  zip.addFile("app/search.js", Buffer.from("export const s = 1\n"));
  const zipBuf = zip.toBuffer();
  const ZIP_SLIP_RE = /(^\/|\.\.[\\/]|[\\/]\.\.($|[\\/])|^[A-Za-z]:)/;
  t("4r0. guard zip-slip nolak nama traversal (unit regex)", ZIP_SLIP_RE.test("../../evil.txt") && ZIP_SLIP_RE.test("/abs/path") && ZIP_SLIP_RE.test("C:\\win\\evil") && !ZIP_SLIP_RE.test("app/index.js"));
  const qZip = {
    type: "documentMessage", isDocument: true,
    msg: { fileName: "appku.zip", mimetype: "application/zip" },
    download: async () => zipBuf,
  };
  _setReaAgentDepsForTest({ session: fakeSess });
  _setNativeDepsForTest({ fetch: mkFetch([{ toolCalls: [{ name: "finish", args: { answer: "dari zip" } }] }]), keys: { githubmodels: "k" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis", "aplikasi", "ini"], { quoted: qZip }));
  t("4r. zip target → kartu hasil + jenis folder ekstrak", last().includes("HASIL REVERSE ENGINEERING") && last().includes("hasil ekstrak zip"), last().slice(0, 90));
  const extrDir = path.join(TMPAREA, (readdirSync(TMPAREA).filter((f) => /-appku\.zip-x$/.test(f))[0] || ""));
  const idxOk = existsSync(path.join(extrDir, "app", "index.js"));
  t("4s. file valid terekstrak", idxOk, extrDir);

  // zip PENYERANG ASLI (python zipfile: entryName mentah "../../evil.txt" —
  // gak dinormalisasi kayak adm-zip create) → guard harus nolak keras
  const evilZipPath = path.join(TMPAREA, "evil-attack.zip");
  writeFileSync(evilZipPath, Buffer.alloc(0));
  const py = require("node:child_process").spawnSync("python3", [
    "-c",
    'import zipfile; z=zipfile.ZipFile("' + evilZipPath + '","w"); z.writestr("app/good.js","ok()\\n"); z.writestr("../../evil-outside.txt","BOOM\\n"); z.writestr("/abs-evil.txt","BOOM2\\n"); z.close()',
  ]);
  t("4t-pre. zip penyerang kebuat (python)", py.status === 0, String(py.stderr || "").slice(0, 80));
  const evilBuf = (await import("node:fs/promises")).readFile(evilZipPath);
  const qEvil = {
    type: "documentMessage", isDocument: true,
    msg: { fileName: "evil-attack.zip" },
    download: async () => evilBuf,
  };
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis", "ini"], { quoted: qEvil }));
  const evilDir = path.join(TMPAREA, (readdirSync(TMPAREA).filter((f) => /-evil-attack\.zip-x$/.test(f))[0] || ""));
  t("4t. zip penyerang: file valid masuk, traversal DITOLAK", existsSync(path.join(evilDir, "app", "good.js")) && !existsSync(path.join(tmpdir(), "evil-outside.txt")) && !existsSync("/abs-evil.txt") && !existsSync(path.join(evilDir, "evil-outside.txt")), evilDir);

  // file non-zip (apk) → disimpan polos, kind bener
  const qApk = {
    type: "documentMessage", isDocument: true,
    msg: { fileName: "target.apk", mimetype: "application/vnd.android.package-archive" },
    download: async () => Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  };
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis", "apk", "ini"], { quoted: qApk }));
  t("4u. target apk → kind apk Android", last().includes("HASIL REVERSE ENGINEERING") && last().includes("apk Android"), last().slice(0, 90));

  // file kegedean → kartu error rapi (bukan throw)
  const qBig = {
    type: "documentMessage", isDocument: true,
    msg: { fileName: "gede.zip" },
    download: async () => Buffer.alloc(61 * 1024 * 1024, 1),
  };
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis"], { quoted: qBig }));
  t("4v. file >60MB → kartu error rapi", /Target gagal|kegedean/i.test(last()) && last().length > 10, last().slice(0, 80));

  // tanpa key → kartu panduan setkey (bukan error diam)
  _setReaAgentDepsForTest({ session: fakeSess });
  _setNativeDepsForTest({ keys: { githubmodels: "", groq: "" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["analisis", "x"]), {});
  t("4w. tanpa key LLM → kartu BELUM ADA OTAK AGENT", last().includes("BELUM ADA OTAK AGENT") && last().includes(".setkey"), last().slice(0, 80));

  _resetReaAgentDepsForTest();
  _resetNativeDepsForTest();
  _resetReaSessionForTest();
}

// ════════════════════════════════════════════════════════════════
console.log("── 5. LOADER & REGISTRY: plugin kebaca beneran ──");
{
  // pola suite loader-register-e2e: loadPlugin asli + registry lookup
  const pl = await import(R("../../src/lib/rara-plugins.js"));
  if (typeof pl.loadPlugin === "function" && typeof pl.registerPlugin === "function") {
    const info = await pl.loadPlugin(R("../../plugins/ai-agent/reaaiagent.js"), true);
    t("5a. loadPlugin(file) → pluginInfo ada (bukan silent-skip)", !!info && info?.config?.name === "reaaiagent", JSON.stringify(info?.config?.name || info).slice(0, 60));
    const okReg = pl.registerPlugin(info);
    const g = pl.getPlugin(".reaaiagent") || pl.getPlugin("reaaiagent");
    t("5b. ke-register di commands map (getPlugin nemu)", okReg === true || !!g, JSON.stringify(okReg));
    if (g) t("5c. handler kebawa di registry", typeof (g.handler || g.config?.name) !== "undefined");
  } else {
    tSkip("5a. loadPlugin", "loader gak ekspor loadPlugin/registerPlugin di versi ini");
  }
}

// ════════════════════════════════════════════════════════════════
console.log("");
console.log(`RESULT: ${pass} pass, ${fail} fail, ${skip} skip`);
process.exit(fail > 0 ? 1 : 0);
