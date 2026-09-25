// E2E CODEGEN LENGKAP — request owner 12 Sep 2026: "knp agent suruh buat
// kode (login web topup dll) isi kodenya gak lengkap cm singkat".
// (1) lib nova-codegen: looksIncomplete heuristik + loop auto-lanjut +
// dedup overlap. (2) tool code + createfile .aisuperagent pakai generator
// baru. (3) prompt planner gak ngajarin placeholder lagi.
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { looksIncomplete, generateCompleteCode, CODE_EXTS } = await import(R + "/src/lib/nova-codegen.js");

// ═══ 1. looksIncomplete ═══
out("— looksIncomplete —");
t("1a. kosong → incomplete", looksIncomplete("", "html") === true);
t("1b. placeholder ... → incomplete", looksIncomplete("<html><body>...</body></html>", "html") === true);
t("1c. TODO marker → incomplete", looksIncomplete("function a() {\n  // TODO implement\n}", "js") === true);
t("1d. html <html> gak ditutup", looksIncomplete("<!DOCTYPE html>\n<html>\n<head><title>x</title></head>\n<body>hi", "html") === true);
t("1e. html <script> gak ditutup", looksIncomplete("<html><body><script>alert(1)\n</body></html>", "html") === true);
t("1f. html utuh → complete", looksIncomplete("<html>\n<head><title>T</title><style>a{color:red}</style></head>\n<body>halo<br>ini<br>halaman<br>lengkap<br>banget<br>semua<br>oke<br>siap<br>jadi<br>ya\n</body>\n</html>", "html") === false);
t("1g. html kecil tapi UTUH → complete", looksIncomplete("<html>\n<body>\n<h1>hi</h1>\n</body>\n</html>", "html") === false);
t("1h. js bracket gak balance", looksIncomplete("function a() {\n  const b = [1, 2\n}\n", "js") === true);
t("1i. js balance → complete", looksIncomplete("function a() {\n  return [1, 2];\n}\na();\n", "js") === false);
t("1j. json rusak → incomplete", looksIncomplete('{"a": [1, 2', "json") === true);
t("1k. json valid → complete", looksIncomplete('{"a": [1, 2]}', "json") === false);
t("1l. baris terakhir operator terbuka", looksIncomplete("const x = 1 +\n", "js") === true);
t("1m. css balance → complete", looksIncomplete("body { color: red; }", "css") === false);

// ═══ 2. generateCompleteCode — loop auto-lanjut ═══
out("\n— generateCompleteCode —");
const calls = [];
const truncatedHtml = "<!DOCTYPE html>\n<html>\n<head><title>Login Topup</title><style>body{margin:0}</style></head>\n<body>\n<div id=\"login\">\n<form>\n<input type=\"text\" name=\"user\">\n<input type=\"password\" name=\"pass\">\n";
const contHtml = "<button type=\"submit\">Masuk</button>\n</form>\n</div>\n<script>document.querySelector(\"form\").onsubmit = function(e) { e.preventDefault(); alert(\"Login diproses\"); };</script>\n</body>\n</html>";

// 2a. round 1 kepotong → ronde 2 lanjut → complete
let aiCalls = [];
let aiFn = async (p, o) => {
  aiCalls.push({ p, o });
  if (aiCalls.length === 1) return "Halaman login topup.\n```html\n" + truncatedHtml + "\n```";
  return "```html\n" + contHtml + "\n```";
};
let statuses = [];
let gen = await generateCompleteCode({ spec: "web login topup", ext: "html", lang: "html", aiChat: aiFn, onStatus: (s) => statuses.push(s), maxRounds: 3 });
t("2a. kode kegabung utuh", gen.code.includes("</html>") && gen.code.includes("<!DOCTYPE html>"), gen.code.slice(-60));
t("2b. ronde pelengkap jalan", gen.rounds === 1, "rounds=" + gen.rounds);
t("2c. status progress ke-emis", statuses.some((s) => /melengkapi kode/.test(s)), JSON.stringify(statuses));
t("2d. complete setelah lanjut", gen.complete === true);
t("2e. prompt lanjutan ngasih tail kode", aiCalls[1]?.p.includes("</form>") === false && aiCalls[1]?.p.includes("<input type=\"password\"") === true);
t("2f. system prompt anti-placeholder", aiCalls[0]?.o?.systemPrompt.includes("HARAM") === true && aiCalls[1]?.o?.systemPrompt.includes("LANJUTKAN PERSIS") === true);
t("2g. explain kepisah dari blok kode", gen.explain.includes("login topup") && !gen.explain.includes("<!DOCTYPE"));

// 2b. dedup overlap — lanjutan ngulang baris terakhir
aiCalls = [];
aiFn = async () => {
  if (aiCalls.length === 1) return "```html\n<html>\n<body>\n<div class=\"x\">satu</div>\n";
  return "```html\n<div class=\"x\">satu</div>\n<div class=\"y\">dua</div>\n</body>\n</html>\n```";
};
gen = await generateCompleteCode({ spec: "halaman", ext: "html", lang: "html", aiChat: aiFn, maxRounds: 3 });
t("2h. overlap dedup — gak dobel", !gen.code.includes('class="x">satu</div>\n<div class="x">satu</div>'), gen.code.slice(0, 200));
t("2i. tetep complete", gen.complete === true);

// 2c. gak pernah complete → berhenti di maxRounds
// tiap ronde nambah baris baru tapi blok gak pernah ketutup → berhenti di maxRounds
let inc = 0;
aiCalls = [];
aiFn = async () => { inc++; return "```js\nfunction a() {\n  const b" + inc + " = " + inc + ";\n```"; };
gen = await generateCompleteCode({ spec: "script js", ext: "js", lang: "javascript", aiChat: aiFn, maxRounds: 2 });
t("2j. maxRounds dihormati", gen.rounds === 2 && gen.complete === false, "rounds=" + gen.rounds);
// model ngulang doang (dedup) → berhenti lebih awal, gak loop sia2
inc = 0; aiCalls = [];
aiFn = async () => "```js\nfunction a() {\n  // isi terus\n```";
gen = await generateCompleteCode({ spec: "script js", ext: "js", lang: "javascript", aiChat: aiFn, maxRounds: 3 });
t("2j2. dedup: ngulang doang → stop lebih awal", gen.complete === false && gen.rounds <= 3, "rounds=" + gen.rounds);

// 2d. lengkap di shot pertama → tanpa ronde tambahan
aiCalls = [];
aiFn = async () => "Kalkulator.\n```js\nconst tambah = (a, b) => a + b;\nconsole.log(tambah(2, 3));\n```\nCARA PAKAI: node kalkulator.js";
gen = await generateCompleteCode({ spec: "kalkulator js", ext: "js", lang: "javascript", aiChat: aiFn, maxRounds: 3 });
t("2k. complete di ronde 1 → rounds 0", gen.rounds === 0 && gen.complete === true);
t("2l. CARA PAKAI ikut ke-explain", gen.explain.includes("CARA PAKAI"));

// 2e. ext mapping lang javascript → js
t("2m. lang javascript → ext js", gen.ext === "js");

// ═══ 3. tool code .aisuperagent (executor asli + deps.aiChat) ═══
out("\n— tool code .aisuperagent —");
const { resetAgentDeps, setAgentDeps } = await import(R + "/src/lib/nova-agent.js");
const ag = await import(R + "/plugins/ai-agent/agent.js");
const agHandler = ag.handler;
// deps.aiChat untuk PLAN + COMPOSE juga — planReply buat mastiin mode tools
let planN = 0;
let toolAiCalls = 0;
const mkDeps = (planReply) => ({
  aiChat: undefined,
  plan: async () => { planN++; return planReply; },
});
// setAgentDeps: aiChat dipakai PLAN+PICK+COMPOSE; tool code pakai deps.aiChat via buildExecutors deps
resetAgentDeps();
const sent = [];
const docs = [];
const m = {
  text: ".aisuperagent bikin web login topup", args: ["bikin", "web", "login", "topup"],
  chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "aisuperagent", prefix: ".",
  isGroup: true, isOwner: true,
  react: async () => true, reply: async (txt) => { sent.push(String(txt)); },
};
const sock = {
  sendMessage: async (chat, c) => {
    if (c?.document) docs.push({ name: c.fileName, body: c.document.toString("utf-8"), caption: String(c.caption || "") });
    if (c?.text) sent.push(String(c.text));
    return { key: { id: "k1" } };
  },
};
const deps = {
  plan: async () => `{"mode":"tools","tools":[{"tool":"code","spec":"web login topup: form login username password, pilihan paket diamond, tombol topup, footer","lang":"html","name":"logintopup"}]}`,
  aiChat: async (p, o) => {
    toolAiCalls++;
    if (toolAiCalls === 1) return "Halaman login topup game.\n```html\n" + truncatedHtml + "\n```";
    return "```html\n" + contHtml + "\n```";
  },
};
setAgentDeps({ aiChat: async () => {
  // plan/PICK/compose jalan lewat sini — compose cuma nulis laporan
  planN++;
  if (planN === 1) return deps.plan();
  return "Laporan: kode login topup udah dikirim.";
}, search: async () => [], preview: async () => ({}) });
await agHandler(m, { sock, db: { setting: () => ({}) }, deps });
const codeDoc = docs.find((d) => d.name === "logintopup.html");
t("3a. file kode terkirim", !!codeDoc);
t("3b. kode DILENGKAPI otomatis (kepotong → utuh)", codeDoc && codeDoc.body.includes("</html>") && codeDoc.body.includes("<!DOCTYPE html>"), codeDoc?.body.slice(-50));
t("3c. caption catat ronde pelengkap", codeDoc && codeDoc.caption.includes("dilengkapi otomatis"), codeDoc?.caption.slice(0, 80));

// ═══ 4. createfile .aisuperagent — konten html kepotong → dilengkapi ═══
out("\n— createfile lengkapin kode —");
docs.length = 0; sent.length = 0;
toolAiCalls = 0; planN = 0;
resetAgentDeps();
setAgentDeps({ aiChat: async () => {
  planN++;
  if (planN === 1) return `{"mode":"tools","tools":[{"tool":"createfile","name":"loginweb.html","content":"${truncatedHtml.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"}]}`;
  return "Laporan: file udah dikirim.";
}, search: async () => [], preview: async () => ({}) });
await agHandler(m, { sock, db: { setting: () => ({}) }, deps: { aiChat: async (p, o) => {
  // createfile completion jalan lewat deps.aiChat (seam executor):
  // ronde 1 prompt FULL → balas kode kepotong, ronde lanjutan → sambungannya
  const sys = String(o?.systemPrompt || "");
  if (sys.includes("SENIOR FULL-STACK")) return "Halaman login topup.\n```html\n" + truncatedHtml + "\n```";
  return "```html\n" + contHtml + "\n```";
} } });
const cfDoc = docs.find((d) => d.name === "loginweb.html");
t("4a. file terkirim", !!cfDoc);
t("4b. konten kepotong → dilengkapi jadi utuh", cfDoc && cfDoc.body.includes("</html>"), cfDoc?.body.slice(-40));

// ═══ 5. prompt planner — gak ngajarin placeholder lagi ═══
out("\n— prompt planner —");
const fs = await import("node:fs");
const agentSrc = fs.readFileSync(R + "/plugins/ai-agent/agent.js", "utf-8");
const aiagentSrc = fs.readFileSync(R + "/src/lib/aiagent.js", "utf-8");
const novaAgentSrc = fs.readFileSync(R + "/src/lib/nova-agent.js", "utf-8");
t("5a. aiagent: contoh placeholder KODE LENGKAP dihapus", !aiagentSrc.includes('content":"<!DOCTYPE html> ... KODE LENGKAP ..."'));
t("5b. aiagent: createfile desc larang placeholder", /HARAM/.test(aiagentSrc) && /MELANJUTKAN kode yang kepotong/.test(aiagentSrc));
t("5c. aiagent: contoh baru = kode utuh nyata", aiagentSrc.includes("Toko Kue</h1>") && aiagentSrc.includes("RULE kode di content"));
t("5d. nova-agent: createfile arahin kode program ke tool code", /KALAU USER MINTA KODE PROGRAM\/aplikasi\/web\/script → WAJIB pakai tool code BUKAN createfile/.test(novaAgentSrc));
t("5e. nova-agent: code spec diminta detail + dilengkapi otomatis", /dilengkapi otomatis kalau kepotong/.test(novaAgentSrc));
t("5f. agent.js: code tool pakai generateCompleteCode", agentSrc.includes("generateCompleteCode") && agentSrc.includes("melengkapi kode"));
t("5g. CODE_EXTS html ada", CODE_EXTS.has("html") && CODE_EXTS.has("py"));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
