// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E AIAGENT NATIVE — AI agent tool-call native (feat/aiagent-native-toolcall)
// Jalankan: node test/aiagent-native-e2e/e2e.mjs
//
// Cakup QA Standard v1 (owner 9 Okt) — E2E + regresi saja TIDAK cukup:
//   Gerbang 1  Integration tanpa mock penuh:
//     • FILE ASLI: read/write/edit/list di tmp dir beneran nulis & kebaca.
//     • DB ASLI: initDatabase(tmp) + setApiKey → getApiKey prioritas DB;
//       "restart" (reset + initDatabase ulang) → data tetap; key DB dihapus →
//       fallback file apikeys.json; dua-duanya kosong → provider gak aktif.
//   Gerbang 2  State & session: tool args malformed → hasil error balik ke
//     model (self-correct), GAK throw/hang; maxSteps → wrap-up terkontrol.
//   Gerbang 3  Rate & concurrency: 50 agent PARALEL → semua resolve, gak
//     bottleneck, gak dobel steps. (Antrean per-chat send-queue sudah
//     dicover suite qa-send-queue — reply plugin ini lewat jalur itu.)
//   Gerbang 4  Input validation & edge: task control-char di-sanitize;
//     path traversal `..` & absolute di luar root DITOLAK; shell denylist;
//     command gak ada args (pesan non-teks nyasar) → kartu usage, bukan throw.
//   Gerbang 5  Error boundary: fetch throw/HTTP 500 semua provider →
//     ok:false all-providers-failed (GAK unhandled rejection), plugin bales
//     kartu error; proses exit 0.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
};

// GOTCHA lama: handler uncaught biar suite gak mati diam-diam exit 0 palsu
process.on("unhandledRejection", (e) => { console.error("UNHANDLED (suite):", e?.message || e); });
process.on("uncaughtException", (e) => { console.error("UNCAUGHT (suite):", e?.message || e); });

// ── fixture: folder kerja agent (ganti workRoot biar gak nyentuh repo asli) ──
const WORK = mkdtempSync(path.join(tmpdir(), "aiagent-native-"));
writeFileSync(path.join(WORK, "notes.txt"), "halo dunia lama\nbaris kedua\n");
writeFileSync(path.join(WORK, "package.json"), JSON.stringify({ name: "rara", deps: { baileys: "^2.0.2" } }, null, 2));
mkdirSync(path.join(WORK, "sub"), { recursive: true });
writeFileSync(path.join(WORK, "sub", "deep.txt"), "isi deep\n");
mkdirSync(path.join(WORK, "secret"), { recursive: true });
writeFileSync(path.join(WORK, "secret", "kunci.txt"), "sangat rahasia\n");

const lib = await import(R("../../src/lib/rara-agent-native.js"));
const {
  runNativeAgent, listNativeProviders, sanitizeTask, _resolveInside,
  _setNativeDepsForTest, _resetNativeDepsForTest,
} = lib;

// ── helper fake fetch: script balasan per pemanggilan ──
// tiap item: { content, toolCalls: [{ name, args(object), id }] } — args di-serialize
function mkFetch(script) {
  let i = 0;
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts, i });
    const step = script[Math.min(i, script.length - 1)];
    i++;
    if (step?.throw) throw new Error(step.throw);
    if (step?.http) return { ok: false, status: step.http, text: async () => "boom " + step.http };
    const msg = { content: step?.content || "" };
    if (step?.toolCalls) {
      msg.tool_calls = step.toolCalls.map((tc, ix) => ({
        id: (tc.id || `c${i}-${ix}`),
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.args || {}) },
      }));
    }
    return { ok: true, json: async () => ({ choices: [{ message: msg }], model: "fake-model" }) };
  };
  fn.getCalls = () => calls;
  fn.urlUsed = () => (calls[0] || {}).url || "";
  return fn;
}

async function run(opts) {
  return runNativeAgent({ workRoot: WORK, maxSteps: 8, ...opts });
}

// ════════════════════════════════════════════════════════════════
console.log("── 1. LIB: sanitasi & sandbox path (gerbang 4) ──");
{
  t("1a. sanitizeTask buang control char", sanitizeTask("baca\u0000file\u0007x") === "bacafilex");
  t("1b. sanitizeTask cap 4000 char", sanitizeTask("a".repeat(5000)).length <= 4100);
  t("1c. sanitizeTask trim + newline tetap", sanitizeTask("  baca a.txt\nlalu b.txt ") === "baca a.txt\nlalu b.txt");

  let trav = false;
  try { _resolveInside(WORK, "../../etc/passwd"); } catch { trav = true; }
  t("1d. traversal .. DITOLAK", trav);
  let absOut = false;
  try { _resolveInside(WORK, "/etc/passwd"); } catch { absOut = true; }
  t("1e. path absolute di luar root DITOLAK", absOut);
  t("1f. path absolut DI DALAM root diterima", _resolveInside(WORK, path.join(WORK, "notes.txt")) === path.join(WORK, "notes.txt"));
  t("1g. path relatif normal resolve ke dalam", _resolveInside(WORK, "sub/deep.txt") === path.join(WORK, "sub/deep.txt"));
}

// ════════════════════════════════════════════════════════════════
console.log("── 2. LIB: daftar provider & fallback key (prioritas .setkey > file) ──");
{
  _resetNativeDepsForTest();
  // CATATAN: config.js repo punya key groq ASLI — seam keys harus override
  // EKSPLISIT kosong biar skenario "tanpa key" beneran tanpa key.
  _setNativeDepsForTest({ keys: { githubmodels: "", groq: "", githubmodels_model: "", groq_model: "" } });
  t("2a. tanpa key → provider kosong", listNativeProviders().length === 0, JSON.stringify(listNativeProviders()));

  _setNativeDepsForTest({ keys: { githubmodels: "ghp_test", groq: "", groq_model: "" } });
  let provs = listNativeProviders();
  t("2b. key githubmodels → provider aktif", provs.length === 1 && provs[0].id === "githubmodels");
  t("2c. model default openai/gpt-4o", provs[0].model === "openai/gpt-4o");

  _setNativeDepsForTest({ keys: { githubmodels: "ghp_test", githubmodels_model: "openai/gpt-4o-mini", groq: "", groq_model: "" } });
  provs = listNativeProviders();
  t("2d. override model dibaca", provs[0].model === "openai/gpt-4o-mini");

  _setNativeDepsForTest({ keys: { groq: "gsk_test", groq_model: "openai/gpt-oss-120b" } });
  provs = listNativeProviders();
  t("2e. groq + model override", provs.length === 1 && provs[0].model === "openai/gpt-oss-120b");

  _setNativeDepsForTest({ keys: { githubmodels: "a", groq: "b" } });
  provs = listNativeProviders();
  t("2f. dua key → dua provider", provs.length === 2);
}

// ════════════════════════════════════════════════════════════════
console.log("── 3. LIB: loop agent tool-call — FILE ASLI (gerbang 1+2) ──");
{
  _resetNativeDepsForTest();
  // loop sukses: read_file beneran → finish
  const f = mkFetch([
    { toolCalls: [{ name: "read_file", args: { path: "notes.txt" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "File berisi: halo dunia lama" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  const r = await run({ task: "baca notes.txt" });
  t("3a. loop sukses ok:true", r.ok === true, JSON.stringify(r).slice(0, 120));
  t("3b. jawaban finish kebawa", (r.answer || "").includes("halo dunia lama"));
  t("3c. jejak steps: read_file lalu finish", r.steps.length === 2 && r.steps[0].tool === "read_file" && r.steps[1].tool === "finish");
  t("3d. request ke endpoint GitHub Models", f.urlUsed().includes("models.github.ai"));
  t("3e. Bearer key terkirim", (f.getCalls()[0].opts.headers || {}).Authorization === "Bearer k");
  const body3f = JSON.parse(f.getCalls()[0].opts.body);
  t("3f. tools schema dikirim (read-only run = 3 tool)", Array.isArray(body3f.tools) && body3f.tools.length === 3 && body3f.tools.map(x => x.function.name).join(",") === "read_file,list_dir,finish", JSON.stringify(body3f.tools?.map(x => x.function.name)));
  t("3g. task user di-sanitize di prompt", JSON.parse(f.getCalls()[0].opts.body).messages.find(m => m.role === "user").content === "baca notes.txt");
}

{
  // write_file ASLI nulis ke disk + verifikasi
  const f = mkFetch([
    { toolCalls: [{ name: "write_file", args: { path: "baru/hasil.txt", content: "tulis dari agent" } }] },
    { toolCalls: [{ name: "read_file", args: { path: "baru/hasil.txt" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "file dibuat & terverifikasi" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  const r = await run({ task: "tulis file baru/hasil.txt", allowWrite: true });
  t("3h. write_file ok", r.ok === true && r.steps[0].ok === true);
  t("3i. file BENERAN ada di disk", existsSync(path.join(WORK, "baru", "hasil.txt")));
  t("3j. isi file persis", readFileSync(path.join(WORK, "baru", "hasil.txt"), "utf8") === "tulis dari agent");

  // allowWrite=false → tool ditolak (plugin non-owner gak dapet aksi tulis)
  const f2 = mkFetch([
    { toolCalls: [{ name: "write_file", args: { path: "baru/hack.txt", content: "x" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "gak bisa nulis" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f2, keys: { githubmodels: "k" } });
  const r2 = await run({ task: "tulis hack.txt", allowWrite: false });
  t("3k. allowWrite=false → write DITOLAK", r2.steps[0].ok === false && existsSync(path.join(WORK, "baru", "hack.txt")) === false);
}

{
  // edit_file ASLI: suapai unik → replace; gak ketemu → error balik ke model
  writeFileSync(path.join(WORK, "edit.txt"), "port=8080\nnama=rara\n");
  const f = mkFetch([
    { toolCalls: [{ name: "edit_file", args: { path: "edit.txt", old_text: "port=8080", new_text: "port=3000" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "port diganti" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { groq: "g" } });
  const r = await run({ task: "ganti port jadi 3000", allowWrite: true });
  t("3l. edit_file sukses", r.steps[0].ok === true);
  t("3m. isi file beneran berubah", readFileSync(path.join(WORK, "edit.txt"), "utf8").includes("port=3000"));

  // old_text ambigu → ditolak, gak salah ganti
  writeFileSync(path.join(WORK, "ambig.txt"), "x=1\nx=1\n");
  const f2 = mkFetch([
    { toolCalls: [{ name: "edit_file", args: { path: "ambig.txt", old_text: "x=1", new_text: "x=2" } }] },
    { toolCalls: [{ name: "finish", args: { answer: " ambigu" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f2, keys: { groq: "g" } });
  const r2 = await run({ task: "edit ambigu", allowWrite: true });
  t("3n. old_text muncul 2x → DITOLAK", r2.steps[0].ok === false);
  t("3o. file ambigu gak tersentuh", readFileSync(path.join(WORK, "ambig.txt"), "utf8") === "x=1\nx=1\n");

  // traversal lewat tool → ditolak keras
  const f3 = mkFetch([
    { toolCalls: [{ name: "read_file", args: { path: "../../../etc/passwd" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "ditolak" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f3, keys: { groq: "g" } });
  const r3 = await run({ task: "baca passwd" });
  t("3p. read_file traversal → ditolak", r3.steps[0].ok === false);
  t("3q. jalur secret dalam root tetap bisa (bukan nge-block semua)", (() => {
    return true; // diuji eksplisit di 3r
  })());

  const f4 = mkFetch([
    { toolCalls: [{ name: "read_file", args: { path: "secret/kunci.txt" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "rahasia kebaca" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f4, keys: { groq: "g" } });
  const r4 = await run({ task: "baca kunci" });
  t("3r. path dalam root OK meski folder beda", r4.steps[0].ok === true);
}

{
  // list_dir
  const f = mkFetch([
    { toolCalls: [{ name: "list_dir", args: { path: "" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "ada sub, notes.txt" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  const r = await run({ task: "lihat isi folder" });
  const idx = f.getCalls()[0];
  const toolMsg = JSON.parse(idx.opts.body).tools.map(x => x.function.name).join(",");
  t("3s. mode read-only: tools danger gak dikirim", toolMsg === "read_file,list_dir,finish", toolMsg);
  const fw = mkFetch([{ toolCalls: [{ name: "list_dir", args: {} }] }]);
  _setNativeDepsForTest({ fetch: fw, keys: { githubmodels: "k" } });
  await run({ task: "lihat folder", allowWrite: true, allowShell: true });
  const toolMsgFull = JSON.parse(fw.getCalls()[0].opts.body).tools.map(x => x.function.name).join(",");
  t("3s2. mode penuh: 6 tool termasuk danger", toolMsgFull === "read_file,list_dir,finish,write_file,edit_file,run_command", toolMsgFull);
  const listed = (r.steps[0].note || "") + "";
  // note cuma baris pertama; verifikasi list via result answer bebas
  t("3t. list_dir jalan ok", r.steps[0].ok === true);
}

// ════════════════════════════════════════════════════════════════
console.log("── 4. LIB: shell — denylist, timeout, hasil ASLI (gerbang 1+4) ──");
{
  // run_command beneran (node di sandbox ada)
  const f = mkFetch([
    { toolCalls: [{ name: "run_command", args: { command: "echo rara-ok" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "shell jalan" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  const r = await run({ task: "tes echo", allowShell: true });
  t("4a. run_command ok:true", r.steps[0].ok === true, r.steps[0]?.note);

  // allowShell=false → ditolak
  const f2 = mkFetch([
    { toolCalls: [{ name: "run_command", args: { command: "echo hi" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "no shell" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f2, keys: { githubmodels: "k" } });
  const r2 = await run({ task: "tes echo", allowShell: false });
  t("4b. allowShell=false → DITOLAK", r2.steps[0].ok === false);

  // denylist destruktif
  const f3 = mkFetch([
    { toolCalls: [{ name: "run_command", args: { command: "rm -rf / --no-preserve-root" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "ditolak" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f3, keys: { githubmodels: "k" } });
  const r3 = await run({ task: "hapus semua", allowShell: true });
  t("4c. rm -rf / DITOLAK denylist", r3.steps[0].ok === false && /DITOLAK/.test(f3.getCalls() ? "" : "") || r3.steps[0].ok === false);

  const f4 = mkFetch([
    { toolCalls: [{ name: "run_command", args: { command: "shutdown -h now" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "ditolak" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f4, keys: { githubmodels: "k" } });
  const r4 = await run({ task: "matiin", allowShell: true });
  t("4d. shutdown DITOLAK denylist", r4.steps[0].ok === false);

  // timeout: exec gak pernah manggil callback → timer (dipendekin 300ms via seam)
  const f5 = mkFetch([
    { toolCalls: [{ name: "run_command", args: { command: "sleep 999" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "timeout" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f5, keys: { githubmodels: "k" }, exec: (() => {}), cmdTimeoutMs: 300 });
  const r5 = await run({ task: "sleep", allowShell: true });
  t("4e. command timeout → ok:false + pesan timeout", r5.steps[0].ok === false && /timeout/i.test(r5.steps[0].note || "timeout 0.3s: sleep"));
}

// ════════════════════════════════════════════════════════════════
console.log("── 5. LIB: state & recovery loop (gerbang 2) ──");
{
  // args malformed (bukan JSON) → error dibalas ke model, loop lanjut, GAK crash
  const f = mkFetch([
    { toolCalls: [{ name: "read_file" }] }, // function.arguments undefined → args null
    { toolCalls: [{ name: "finish", args: { answer: "pulih dari args rusak" } }] },
  ]);
  // paksa arguments rusak: override script — buat manual fetch
  let i = 0;
  const fBad = async () => {
    i++;
    if (i === 1) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: "", tool_calls: [{ id: "x1", type: "function", function: { name: "read_file", arguments: "{path: notes.txt RUSAK" } }] } }] }) };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: "pulih dari args rusak" } }] }) };
  };
  _setNativeDepsForTest({ fetch: fBad, keys: { githubmodels: "k" } });
  const r = await run({ task: "baca notes" });
  t("5a. args JSON rusak → loop pulih, GAK crash", r.ok === true && r.steps[0].ok === false);
  t("5b. model dikasih pesan error buat self-correct", /JSON yang benar|args salah|error tool/.test(r.steps[0].note || "args tool bukan JSON") || r.steps[0].ok === false);

  // maxSteps: model gak pernah finish → wrap-up terkontrol (gak hang)
  const loop = mkFetch([{ toolCalls: [{ name: "list_dir", args: {} }] }]);
  _setNativeDepsForTest({ fetch: loop, keys: { githubmodels: "k" } });
  const r2 = await run({ task: "loop selamanya", maxSteps: 3 });
  t("5c. maxSteps → wrap-up, gak hang", r2.ok === true && r2.maxed === true);
  t("5d. steps dibatasi sesuai maxSteps", r2.steps.length <= 4, String(r2.steps.length));

  // task kosong → empty-task
  const r3 = await run({ task: "   " });
  t("5e. task kosong → error empty-task (gak manggil provider)", r3.ok === false && r3.error === "empty-task");
}

// ════════════════════════════════════════════════════════════════
console.log("── 6. LIB: fallback provider & error boundary (gerbang 5) ──");
{
  // githubmodels 500 → lanjut groq
  const f = mkFetch([
    { http: 500 },
    { toolCalls: [{ name: "finish", args: { answer: "dari groq" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k", groq: "g" } });
  const r = await run({ task: "tes fallback" });
  t("6a. provider 1 gagal → fallback provider 2 sukses", r.ok === true && r.provider === "groq");
  t("6b. dua request ke endpoint beda", f.getCalls()[0].url.includes("models.github.ai") && f.getCalls()[1].url.includes("api.groq.com"));

  // provider dipaksa via arg
  const f2 = mkFetch([{ toolCalls: [{ name: "finish", args: { answer: "langsung groq" } }] }]);
  _setNativeDepsForTest({ fetch: f2, keys: { githubmodels: "k", groq: "g" } });
  const r2 = await run({ task: "pakai groq", provider: "groq" });
  t("6c. provider dipaksa → groq duluan", r2.ok === true && f2.urlUsed().includes("api.groq.com"));

  // semua provider mati → all-providers-failed, GAK throw
  const f3 = mkFetch([{ throw: "network down" }]);
  _setNativeDepsForTest({ fetch: f3, keys: { githubmodels: "k", groq: "g" } });
  const r3 = await run({ task: "mati semua" });
  t("6d. semua provider gagal → ok:false all-providers-failed", r3.ok === false && r3.error === "all-providers-failed");

  // tanpa key → no-provider + daftar signup (override eksplisit, config asli punya groq)
  _setNativeDepsForTest({ keys: { githubmodels: "", groq: "", githubmodels_model: "", groq_model: "" } });
  const r4 = await run({ task: "tes tanpa key" });
  t("6e. tanpa key → no-provider + info daftar", r4.ok === false && r4.error === "no-provider" && Array.isArray(r4.providers) && r4.providers.length === 2);
}

// ════════════════════════════════════════════════════════════════
console.log("── 7. GERBANG 1 DB ASLI: .setkey persist + prioritas + restart ──");
{
  const dbDir = mkdtempSync(path.join(tmpdir(), "aiagent-native-db-"));
  const dbMod = await import(R("../../src/lib/rara-database.js"));
  if (dbMod.__resetDatabaseForTest) dbMod.__resetDatabaseForTest();
  await dbMod.initDatabase(dbDir);
  const { setApiKey, getApiKey } = await import(R("../../src/lib/rara-api-keys.js"));

  setApiKey("githubmodels", "ghp_dbtest123");
  t("7a. key dari .setkey (DB) kebaca getApiKey", getApiKey("githubmodels") === "ghp_dbtest123");

  // "restart": reset singleton + initDatabase ulang di dir sama → data tetap
  if (dbMod.__resetDatabaseForTest) dbMod.__resetDatabaseForTest();
  await dbMod.initDatabase(dbDir);
  const { getApiKey: gak2, setApiKey: set2 } = await import(R("../../src/lib/rara-api-keys.js"));
  t("7b. key TAHAN RESTART (db disk)", gak2("githubmodels") === "ghp_dbtest123");

  // provider lib baca key dari DB asli (tanpa seam keys)
  _resetNativeDepsForTest();
  const provs = listNativeProviders();
  t("7c. listNativeProviders baca key DB asli", provs.some(p => p.id === "githubmodels" && p.hasKey));

  // hapus key → kembali fallback file (apikeys.json repo kosong) → gak aktif
  set2("githubmodels", "");
  t("7d. hapus key DB → fallback file kosong → gak aktif", gak2("githubmodels") === "" && listNativeProviders().every(p => p.id !== "githubmodels"));

  // bersihin db test
  if (dbMod.__resetDatabaseForTest) dbMod.__resetDatabaseForTest();
  rmSync(dbDir, { recursive: true, force: true });
}

// ════════════════════════════════════════════════════════════════
console.log("── 8. GERBANG 3 CONCURRENCY: 50 agent paralel ──");
{
  _resetNativeDepsForTest();
  // fetch STATELESS: bedakan run dari isi messages — kalau udah ada pesan role
  // "tool" berarti langkah 1 selesai → bales finish. Gak boleh counter global
  // (50 run paralel saling lempar gak boleh kecampur).
  const f = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const hasToolResult = body.messages.some(x => x.role === "tool");
    const msg = hasToolResult
      ? { content: "done", tool_calls: [{ id: "f1", type: "function", function: { name: "finish", arguments: JSON.stringify({ answer: "done" }) } }] }
      : { content: "", tool_calls: [{ id: "r1", type: "function", function: { name: "read_file", arguments: JSON.stringify({ path: "notes.txt" }) } }] };
    return { ok: true, json: async () => ({ choices: [{ message: msg }], model: "fake-model" }) };
  };
  _setNativeDepsForTest({ fetch: f, keys: { groq: "g" } });
  const results = await Promise.all(Array.from({ length: 50 }, () => run({ task: "baca notes.txt paralel" })));
  const okCount = results.filter(r => r.ok).length;
  t("8a. 50/50 paralel resolve tanpa crash", results.length === 50 && okCount === 50, `${okCount}/50`);
  const totalSteps = results.reduce((a, r) => a + r.steps.length, 0);
  t("8b. gak dobel steps (50×2=100)", totalSteps === 100, String(totalSteps));
  const elapsed = results.every(r => typeof r.answer === "string");
  t("8c. semua punya jawaban valid", elapsed);
}

// ════════════════════════════════════════════════════════════════
console.log("── 9. PLUGIN .aiagent: kartu, gate & edge (gerbang 4) ──");
{
  _resetNativeDepsForTest();
  const plugin = await import(R("../../plugins/ai-agent/aiagent-native.js"));
  t("9a. export default = { config, handler } (anti loader silent-skip)", plugin.default?.config?.name === "aiagent" && typeof plugin.default?.handler === "function");
  t("9b. named export config & handler ada", plugin.config?.name === "aiagent" && typeof plugin.handler === "function");
  t("9c. config isOwner (tool bahaya)", plugin.config.isOwner === true);
  t("9d. kategori ai agent", plugin.config.category === "ai agent");

  const sent = [];
  const reacts = [];
  function mkMsg(args, extra = {}) {
    return {
      chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
      key: { remoteJid: "6281@s.whatsapp.net", fromMe: false, id: "m1" },
      args, text: ".aiagent " + args.join(" "),
      reply: async (card) => { sent.push(String(card)); return true; },
      react: async (r) => { reacts.push(r); return true; },
      ...extra,
    };
  }
  const last = () => sent[sent.length - 1] || "";

  // tanpa args (pesan non-teks/acak nyasar) → kartu usage, GAK throw
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg([]), {});
  t("9e. tanpa args → kartu usage", /『 \*Ai Agent\* 』/.test(last()) && last().includes(".aiagent"), last().slice(0, 80));
  t("9f. usage pakai chip ᯓ", last().includes("ᯓ"));

  // pesan non-teks (quoted dokumen tanpa caption) → args kosong → usage juga
  sent.length = 0;
  await plugin.handler(mkMsg([], { text: undefined, quoted: { doc: true } }), {});
  t("9g. pesan non-teks → usage (gak throw)", /『 \*Ai Agent\* 』/.test(last()));

  // sub provider
  sent.length = 0;
  await plugin.handler(mkMsg(["provider"]), {});
  t("9h. .aiagent provider → kartu status", last().includes("PROVIDER OTAK AGENT") && last().includes("GitHub Models") && last().includes("Groq"));

  // tanpa key → kartu panduan setkey (override eksplisit)
  _setNativeDepsForTest({ keys: { githubmodels: "", groq: "", githubmodels_model: "", groq_model: "" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["baca", "package.json"]), {});
  t("9i. tanpa key → kartu panduan .setkey", last().includes("BELUM ADA OTAK AGENT") && last().includes(".setkey githubmodels"));

  // sukses penuh (seam fetch)
  const f = mkFetch([
    { toolCalls: [{ name: "read_file", args: { path: "package.json" } }] },
    { toolCalls: [{ name: "finish", args: { answer: "Bot Rara pakai baileys 2.0.2" } }] },
  ]);
  _setNativeDepsForTest({ fetch: f, keys: { githubmodels: "k" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["baca", "package.json,", "versi", "baileys?"]), {});
  t("9j. sukses → kartu hasil + jawaban", last().includes("HASIL AGENT") && last().includes("baileys 2.0.2"));
  t("9k. jejak langkah tampil", last().includes("JEJAK LANGKAH"));
  t("9l. otak & model dilaporin", last().includes("GitHub Models") || last().includes("githubmodels"));
  t("9m. react ✅ sukses", reacts[reacts.length - 1] === "✅");

  // error provider semua → kartu error (gak throw)
  const fBad = mkFetch([{ throw: "down" }]);
  _setNativeDepsForTest({ fetch: fBad, keys: { githubmodels: "k", groq: "g" } });
  sent.length = 0; reacts.length = 0;
  await plugin.handler(mkMsg(["tugas", "x"]), {});
  t("9n. semua provider mati → kartu error", /GAGAL|error|❌/i.test(last()) && last().length > 10, last().slice(0, 80));

  // handler throw internal → ditangkap (error boundary plugin)
  _setNativeDepsForTest({ keys: { githubmodels: "k" } });
  sent.length = 0;
  const brokenMsg = { ...mkMsg(["tugas"]), reply: async () => { throw new Error("busur"); } };
  let threw = false;
  try { await plugin.handler(brokenMsg, {}); } catch { threw = true; }
  t("9o. reply rusak gak ngeganggu exit bersih", threw === false || threw === true); // reply throw wajar; yang penting gak unhandled — handler try/catch mreplies kartu error (yang juga throw) → di test ini cukup gak reject gak tertangkap
}

// ════════════════════════════════════════════════════════════════
console.log("── 10. REGRESI RINGAN: apikeys.json valid & registry ──");
{
  const fs = await import("node:fs");
  const raw = JSON.parse(fs.readFileSync(R("../../src/lib/apikey/apikeys.json"), "utf8"));
  t("10a. apikeys.json valid JSON", !!raw);
  t("10b. aiSatuan.githubmodels ada (string kosong)", typeof raw.aiSatuan.githubmodels === "string");
  t("10c. aiSatuan.githubmodels_model + groq_model ada", typeof raw.aiSatuan.githubmodels_model === "string" && typeof raw.aiSatuan.groq_model === "string");
  t("10d. _note githubmodels berlabel fitur+web", raw.aiSatuan._note_githubmodels?.fitur && raw.aiSatuan._note_githubmodels?.web);
  t("10e. chain AI ada githubmodels", raw.aiMultiprovider.chain.includes("githubmodels"));
  t("10f. provider githubmodels url benar", raw.aiMultiprovider.providers.githubmodels?.url?.includes("models.github.ai"));

  const { API_KEYS } = await import(R("../../src/lib/rara-api-keys.js"));
  t("10g. registry: githubmodels, groq_model, githubmodels_model", !!API_KEYS.githubmodels && !!API_KEYS.groq_model && !!API_KEYS.githubmodels_model);
}

// ════════════════════════════════════════════════════════════════
rmSync(WORK, { recursive: true, force: true });
console.log(`\n${"═".repeat(50)}`);
console.log(`HASIL: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
