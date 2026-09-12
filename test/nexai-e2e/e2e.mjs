// E2E NexAI (apinex.bond) — request owner 12 Sep 2026: "tmbah ai multi
// provider baru nexai". Scraper di-inject via seam setNexaiHttp (gak kena
// live server), katalog model + 1 chat diuji LIVE (zero-cost free model).
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
fs.rmSync("/tmp/nexai-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/nexai-e2e-db/nova.json");
const db = getDatabase();

const {
  nexaiChat, nexaiModels, normNexaiModel, getNexaiKey,
  setNexaiHttp, resetNexaiHttp, resetNexaiModelsCache, NEXAI_DEFAULT_MODEL,
} = await import(R + "/src/scraper/nexai.js");
const { config, handler } = await import(R + "/plugins/ai/nexai.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

// ═══ 1. config ═══
out("— config —");
t("1a. plugin nexai kategori ai + cmd utama doang", config.name === "nexai" && config.category === "ai");
t("1b. default model = free/glm-5.3-flash (GLM zero-cost)", NEXAI_DEFAULT_MODEL === "free/glm-5.3-flash");
t("1c. alias glm → free/glm-5.3-flash", normNexaiModel("glm") === "free/glm-5.3-flash");
t("1d. alias luna → free/gpt-5.6-luna", normNexaiModel("luna") === "free/gpt-5.6-luna");
t("1e. id utuh tetep (case-insensitive)", normNexaiModel("Claude-Opus-5") === "claude-opus-5");
t("1f. key nexai kebaca dari apikeys.json", getNexaiKey().startsWith("sk-apx"));

// ═══ 2. scraper — transport mock ═══
out("\n— scraper (mock) —");
const calls = [];
let behavior = {};
const mockHttp = async (url, headers, body, timeoutMs) => {
  calls.push({ url, headers, body });
  const act = behavior[url] || (() => ({ status: 200, json: { choices: [{ message: { content: "ok" } }] } }));
  const r = act(headers, body); // { status, json: obj } — dibungkus jadi Response-like
  return { status: r.status, json: async () => r.json };
};
setNexaiHttp(mockHttp);

// 2a. parse content normal
behavior["https://api.apinex.bond/v1/chat/completions"] = () => ({
  status: 200,
  json: { choices: [{ message: { role: "assistant", content: "Halo! Ada yang bisa saya bantu?" } }] },
});
const c1 = await nexaiChat("halo", { model: "glm" });
t("2a. chat: reply kebaca", c1 === "Halo! Ada yang bisa saya bantu?");
t("2b. chat: default model GLM dipakai (alias glm resolve)", calls.at(-1)?.body && JSON.parse(calls.at(-1).body).model === "free/glm-5.3-flash");
t("2c. chat: Bearer key di header", (calls.at(-1)?.headers?.Authorization || "").startsWith("Bearer sk-"));

// 2b. system prompt ikut kekirim
await nexaiChat("tes", { systemPrompt: "kamu Nova AI" });
t("2d. systemPrompt masuk messages", (() => {
  const b = JSON.parse(calls.at(-1).body);
  return b.messages[0]?.role === "system" && b.messages[0]?.content === "kamu Nova AI" && b.messages.at(-1)?.role === "user";
})());

// 2c. reasoning_content fallback (GLM/deepseek kadang content kosong)
behavior["https://api.apinex.bond/v1/chat/completions"] = () => ({
  status: 200,
  json: { choices: [{ message: { role: "assistant", content: "", reasoning_content: "jawaban dari reasoning" } }] },
});
t("2e. content kosong → reasoning_content dipakai", (await nexaiChat("halo")) === "jawaban dari reasoning");

// 2d. billing error → pesan sopan + saran model free
behavior["https://api.apinex.bond/v1/chat/completions"] = () => ({
  status: 402,
  json: { error: { message: "Insufficient balance", type: "billing_error" } },
});
try { await nexaiChat("tes", { model: "glm-5.3" }); t("2f. billing error dilempar", false); }
catch (e) { t("2f. billing error → pesan saldo + saran free", /saldo/i.test(e.message) && /free/i.test(e.message), e.message); }

// 2e. model gak dikenal
behavior["https://api.apinex.bond/v1/chat/completions"] = () => ({
  status: 404,
  json: { error: { message: "Model 'kucing' not found", type: "not_found_error" } },
});
try { await nexaiChat("tes", { model: "kucing" }); t("2g. model unknown dilempar", false); }
catch (e) { t("2g. model unknown → arahin .nexai list", /nexai list/i.test(e.message), e.message); }

// 2f. prompt kosong
try { await nexaiChat("   "); t("2h. prompt kosong ditolak", false); }
catch (e) { t("2h. prompt kosong ditolak", /kosong/i.test(e.message)); }

// 2g. katalog — parse + tanda free
behavior["https://apinex.bond/api/public/models"] = () => ({
  status: 200,
  json: { models: [
    { id: "free/glm-5.3-flash", provider: "Free", name: "GLM-5.3 Flash", contextWindow: "1M", dollarsPer1M: 0.75, health: "live" },
    { id: "glm-5.3", provider: "Zhipu", name: "GLM-5.3", contextWindow: "1M", dollarsPer1M: 0.15, health: "live" },
  ] },
});
const cat = await nexaiModels();
t("2i. katalog: free/ ditandain free", cat.models[0].free === true && cat.models[1].free === false);
t("2j. katalog: live", cat.live === true);

// 2h. katalog down → fallback statik (reset cache dulu biar gak nempel mock)
resetNexaiModelsCache();
behavior["https://apinex.bond/api/public/models"] = () => { throw new Error("down"); };
const cat2 = await nexaiModels();
t("2k. katalog down → fallback statik 23 model", cat2.live === false && cat2.models.length >= 20 && cat2.models.some((m) => m.id === "free/glm-5.3-flash"));
resetNexaiHttp();

// ═══ 3. katalog LIVE (endpoint publik tanpa key) ═══
out("\n— katalog LIVE —");
resetNexaiModelsCache();
const live = await nexaiModels();
t("3a. LIVE katalog publik kebaca", live.live === true && live.models.length >= 20, `n=${live.models.length}`);
t("3b. LIVE ada model free", live.models.filter((m) => m.free).length >= 5);
t("3c. LIVE glm-5.3-flash-free ada", live.models.some((m) => m.id === "free/glm-5.3-flash"));

// ═══ 4. handler flow ═══
out("\n— handler —");
const replies = [];
function mockM(args) {
  return {
    command: "nexai", args, text: args.join(" "), prefix: ".",
    chat: "6288888@s.whatsapp.net", sender: "6288888@s.whatsapp.net", pushName: "Tester",
    isGroup: false, isOwner: false,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = { sendMessage: async () => {} };

// 4a. no-arg → list model live
await handler(mockM([]), { sock: sockMock, db });
const r1 = replies.at(-1) || "";
t("4a. no-arg: list model muncul", norm(r1).includes("gratis") && norm(r1).includes("free/glm-5.3-flash"), norm(r1).slice(0, 100));
t("4b. no-arg: model aktif default glm", norm(r1).includes("free/glm-5.3-flash (default)"));
t("4c. no-arg: model berbayar + harga tampil", norm(r1).includes("glm-5.3") && norm(r1).includes("$"));
t("4d. no-arg: sumber live ditulis", norm(r1).includes("apinex.bond"));

// 4b. .nexai model glm → persist
await handler(mockM(["model", "glm"]), { sock: sockMock, db });
const r2 = replies.at(-1) || "";
t("4e. model glm → saved free/glm-5.3-flash", norm(r2).includes("free/glm-5.3-flash") && db.setting("nexaiModel")["6288888@s.whatsapp.net"] === "free/glm-5.3-flash");
t("4f. label biaya free", norm(r2).includes("free (zero-cost)"));

// 4c. .nexai model ngawur → error + arahin list
await handler(mockM(["model", "hp-terbaik"]), { sock: sockMock, db });
const r3 = replies.at(-1) || "";
t("4g. model ngawur ditolak + arahin list", norm(r3).includes("nexai list"), norm(r3).slice(0, 80));

// 4d. .nexai list → sama kayak no-arg
await handler(mockM(["list"]), { sock: sockMock, db });
const r4 = replies.at(-1) || "";
t("4h. .nexai list jalan", norm(r4).includes("gratis") && norm(r4).includes("apinex.bond"));

// 4e. chat — mock transport biar deterministik
setNexaiHttp(async () => ({ status: 200, json: async () => ({ choices: [{ message: { content: "Jawaban dari NexAI mock." } }] }) }));
await handler(mockM(["apa itu fotosintesis?"]), { sock: sockMock, db });
const r5 = replies.at(-1) || "";
t("4i. chat: jawaban bot dibalas", r5.includes("Jawaban dari NexAI mock."), r5.slice(0, 80));

// 4f. .nexai reset — sesi baru
await handler(mockM(["reset"]), { sock: sockMock, db });
const r6 = replies.at(-1) || "";
t("4j. reset: sesi baru dimulai", norm(r6).includes("baru dimulai"));
resetNexaiHttp();

// ═══ 5. chat LIVE (model free zero-cost) ═══
out("\n— chat LIVE —");
// free model APInex kadang cold start lama — 1 retry wajar
let live1 = "";
try {
  live1 = await nexaiChat("balas dengan kata: siap", { model: "free/gpt-5.6-luna", timeoutMs: 90000 });
} catch (e1) {
  try { live1 = await nexaiChat("balas dengan kata: siap", { model: "free/gpt-5.6-luna", timeoutMs: 90000 }); }
  catch (e2) { t("5a. LIVE chat free/gpt-5.6-luna jalan", false, e2.message); }
}
if (live1) t("5a. LIVE chat free/gpt-5.6-luna jalan", live1.length > 0, live1.slice(0, 60));
// glm-5.3-flash kadang cold start lama (>60s pertama kali) — 1 retry wajar
let live2 = "";
try {
  live2 = await nexaiChat("balas singkat: halo", { model: NEXAI_DEFAULT_MODEL, timeoutMs: 90000 });
} catch (e1) {
  try { live2 = await nexaiChat("balas singkat: halo", { model: NEXAI_DEFAULT_MODEL, timeoutMs: 90000 }); }
  catch (e2) { t("5b. LIVE chat default free/glm-5.3-flash jalan", false, e2.message); }
}
if (live2) t("5b. LIVE chat default free/glm-5.3-flash jalan", live2.length > 0, live2.slice(0, 60));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
