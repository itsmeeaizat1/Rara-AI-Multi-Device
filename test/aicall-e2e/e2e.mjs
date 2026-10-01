// E2E AICALL (17 Sep 2026) — plugin .aicall2 + service Go aicall/ (HTTP mock).
// Jalankan: node test/aicall-e2e/e2e.mjs
import { initDatabase } from "../../src/lib/rara-database.js";
import { fromSC } from "../../src/lib/styler.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

await initDatabase("/tmp/aicall-e2e-db.json");
const { config: aicallConfig, handler: aicallHandler, _setAicallFetchForTest, _clearAicallFetchForTest, _setAicallPusatKeyForTest, _clearAicallPusatKeyForTest, _setAicallAgentForTest, _clearAicallAgentForTest } = await import("../../plugins/owner/aicall2.js");

// default: gateway agent DIANGGAP KOSONG — seksi agent nulis mock sendiri.
// (tanpa ini, apikeys.json asli bisa bocorin tioApiKey ke tes lain)
_setAicallAgentForTest(() => ({ key: "", url: "", model: "ag/gemini-pro-agent" }));

// ── helper ──
async function mkM(text, { isOwner = true } = {}) {
  const sent = [];
  const reacts = [];
  return {
    m: {
      text,
      isOwner,
      reply: async (txt) => sent.push({ type: "reply", txt }),
      react: async (r) => reacts.push(r),
    },
    sent,
    reacts,
  };
}
// raraWrap bikin semua teks jadi smallcaps — asersi WAJIB dinormalkan balik
const box = (e) => fromSC((e.sent.find((s) => s.type === "reply") || { txt: "" }).txt);

// ═══ 1. config ═══
w("\n— config plugin .aicall2 —");
check("config ke-load (name aicall2, owner-only, enabled)", aicallConfig?.name === "aicall2" && aicallConfig?.isOwner === true && aicallConfig?.isEnabled === true);

// ═══ 2. usage + owner gate ═══
w("\n— usage & owner gate —");
{
  const e = await mkM("");
  await aicallHandler(e.m);
  check("tanpa arg → panduan cara pakai", box(e).includes("aicall2"));
}
{
  const e = await mkM("12345");
  await aicallHandler(e.m);
  check("nomor kependekan → panduan (bukan telepon)", box(e).toLowerCase().includes("cara pakai") || box(e).includes("628"));
}
{
  const e = await mkM("628123456789", { isOwner: false });
  await aicallHandler(e.m);
  check("non-owner → ditolak 🚫", box(e).toLowerCase().includes("owner") && e.reacts.includes("🚫"));
}

// ═══ 3. pasang panggilan (mock sukses) ═══
w("\n— .aicall2 <nomor> → POST /call —");
{
  let captured = null;
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, method: opts.method, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, number: "628123456789" }) };
  });
  const e = await mkM("+62 812-3456-789");
  await aicallHandler(e.m);
  check("nomor dinormalisasi (+62 812-3456-789 → 628123456789)", captured?.body?.number === "628123456789", JSON.stringify(captured?.body));
  check("POST ke /call", captured?.url?.endsWith("/call") && captured?.method === "POST", String(captured?.url));
  check("key pusat gemini/groq dikirim kalau ada", captured?.body && ("gemini_api" in captured.body) && ("groq_api" in captured.body), JSON.stringify(Object.keys(captured?.body || {})));
  check("reply konfirmasi menelepon", box(e).includes("628123456789") && box(e).toLowerCase().includes("menelepon"), box(e).slice(0, 80));
  check("react 🛠️ → 🐣", e.reacts.includes("🛠️") && e.reacts.includes("🐣"), e.reacts.join(","));
  _clearAicallFetchForTest();
}

// ═══ 3b. grok (xAI) — otak percakapan default (owner 17 Sep "pakai grok dlu") ═══
w("\n— grok key dari pusat → provider grok dikirim —");
{
  let captured = null;
  _setAicallPusatKeyForTest((name) => (name === "grok" || name === "xai" ? "xai-test-key-123" : (name === "gemini" ? "" : "")));
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, number: "628123456789" }) };
  });
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("key grok pusat dikirim + ai_provider=grok", captured?.body?.grok_api === "xai-test-key-123" && captured?.body?.ai_provider === "grok", JSON.stringify(captured?.body));
  check("key gemini kosong → gak dikirim", !("gemini_api" in (captured?.body || {})), JSON.stringify(captured?.body));
  _clearAicallPusatKeyForTest();
  _clearAicallFetchForTest();
}

// ═══ 3b2. key groq pusat (tanpa xai) → provider groq ═══
w("\n— key groq pusat → ai_provider=groq —");
{
  let captured = null;
  _setAicallPusatKeyForTest((name) => (name === "groq" ? "gsk-test-key-456" : (name === "gemini" ? "" : "")));
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, number: "628123456789" }) };
  });
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("key groq tanpa xai → ai_provider=groq + groq_api STT", captured?.body?.ai_provider === "groq" && captured?.body?.groq_api === "gsk-test-key-456", JSON.stringify(captured?.body));
  check("gak ada key xai → grok_api gak dikirim", !("grok_api" in (captured?.body || {})), JSON.stringify(captured?.body));
  _clearAicallPusatKeyForTest();
  _clearAicallFetchForTest();
}

// ═══ 3b3. tanpa key grok → fallback AGENT (gateway 9router, owner 26 Sep) ═══
w("\n— tanpa key grok, key agent ada → ai_provider=agent —");
{
  let captured = null;
  _setAicallPusatKeyForTest((name) => (name === "groq" ? "gsk-test-key-456" : ""));
  _setAicallAgentForTest(() => ({ key: "tio-test-key-789", url: "https://9router.cloudku.us.kg/v1/chat/completions", model: "ag/gemini-pro-agent" }));
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, number: "628123456789" }) };
  });
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("gak ada key grok + agent ada → ai_provider=agent", captured?.body?.ai_provider === "agent", JSON.stringify(captured?.body));
  check("agent_url + agent_key + agent_model dikirim", captured?.body?.agent_url === "https://9router.cloudku.us.kg/v1/chat/completions" && captured?.body?.agent_key === "tio-test-key-789" && captured?.body?.agent_model === "ag/gemini-pro-agent", JSON.stringify(captured?.body));
  check("persona Aina dikirim sebagai system_prompt", typeof captured?.body?.system_prompt === "string" && captured.body.system_prompt.includes("Aina") && captured.body.system_prompt.includes("saya"), (captured?.body?.system_prompt || "").slice(0, 60));
  check("groq_api tetap dikirim buat STT whisper", captured?.body?.groq_api === "gsk-test-key-456", JSON.stringify(captured?.body));
  _clearAicallPusatKeyForTest();
  _setAicallAgentForTest(() => ({ key: "", url: "", model: "ag/gemini-pro-agent" }));
  _clearAicallFetchForTest();
}
{
  // grok + agent dua-duanya kosong → tetap jatuh ke groq (regresi urutan)
  let captured = null;
  _setAicallPusatKeyForTest((name) => (name === "groq" ? "gsk-test-key-456" : ""));
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, number: "628123456789" }) };
  });
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("gak ada grok & gak ada agent → tetap groq", captured?.body?.ai_provider === "groq", JSON.stringify(captured?.body));
  _clearAicallPusatKeyForTest();
  _clearAicallFetchForTest();
}

// ═══ 3c. .aicall2 ai <grok|agent|groq|gemini> — ganti otak live ═══
w("\n— .aicall2 ai grok/groq/gemini —");
{
  let captured = null;
  _setAicallPusatKeyForTest((name) => (name === "grok" || name === "xai" ? "xai-test-key-123" : name === "groq" ? "gsk-test-key-456" : ""));
  _setAicallAgentForTest(() => ({ key: "tio-test-key-789", url: "https://9router.cloudku.us.kg/v1/chat/completions", model: "ag/gemini-pro-agent" }));
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, engine: "edgetts", voice: "Puck" }) };
  });
  const e = await mkM("ai grok");
  await aicallHandler(e.m);
  check(".aicall2 ai grok → POST /config {ai_provider:grok, grok_api}", captured?.body?.ai_provider === "grok" && captured?.body?.grok_api === "xai-test-key-123", JSON.stringify(captured?.body));
  check("konfirmasi otak grok", box(e).toLowerCase().includes("grok"), box(e).slice(0, 80));
  const eA = await mkM("ai agent");
  await aicallHandler(eA.m);
  check(".aicall2 ai agent → POST /config {ai_provider:agent, agent_url, agent_key}", captured?.body?.ai_provider === "agent" && captured?.body?.agent_url === "https://9router.cloudku.us.kg/v1/chat/completions" && captured?.body?.agent_key === "tio-test-key-789", JSON.stringify(captured?.body));
  check("konfirmasi otak agent + persona Aina", box(eA).toLowerCase().includes("agent") && box(eA).toLowerCase().includes("aina"), box(eA).slice(0, 90));
  _setAicallAgentForTest(() => ({ key: "", url: "", model: "ag/gemini-pro-agent" }));
  const e2 = await mkM("ai gemini");
  await aicallHandler(e2.m);
  check(".aicall2 ai gemini → POST /config {ai_provider:gemini} tanpa grok_api", captured?.body?.ai_provider === "gemini" && !("grok_api" in captured.body), JSON.stringify(captured?.body));
  const e3 = await mkM("ai groq");
  await aicallHandler(e3.m);
  check(".aicall2 ai groq → POST /config {ai_provider:groq, groq_api}", captured?.body?.ai_provider === "groq" && captured?.body?.groq_api === "gsk-test-key-456", JSON.stringify(captured?.body));
  _clearAicallPusatKeyForTest();
  _clearAicallFetchForTest();
}
{
  const e = await mkM("ai abc");
  await aicallHandler(e.m);
  check(".aicall2 ai ngawur → hint grok/agent/groq/gemini", box(e).toLowerCase().includes("grok") && box(e).toLowerCase().includes("agent") && box(e).toLowerCase().includes("groq") && box(e).toLowerCase().includes("gemini"));
}
{
  // key grok belum ada di pusat → tetap konfirmasi tapi kasih warning key
  _setAicallPusatKeyForTest(() => "");
  _setAicallFetchForTest(async () => ({ status: 200, json: async () => ({ ok: true, engine: "edgetts", voice: "Puck" }) }));
  const e = await mkM("ai grok");
  await aicallHandler(e.m);
  check("key grok kosong → warning taruh key di pusat", box(e).toLowerCase().includes("apikeys.json"), box(e).slice(0, 120));
  _clearAicallPusatKeyForTest();
  _clearAicallFetchForTest();
}

// ═══ 4. service down ═══
w("\n— service Go down —");
{
  _setAicallFetchForTest(null);
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("service down → pesan jelas arahkan VPS/INTEGRATION.md", box(e).toLowerCase().includes("tidak bisa dihubungi") && box(e).toLowerCase().includes("integration"), box(e).slice(0, 90));
  check("service down → react ❌", e.reacts.includes("❌"), e.reacts.join(","));
  _clearAicallFetchForTest();
}

// ═══ 5. status ═══
w("\n— .aicall2 status —");
{
  _setAicallFetchForTest(async () => ({
    status: 200,
    json: async () => ({ ok: true, connected: true, uptime: "1h2m3s", provider: "groq", groq_chat_model: "openai/gpt-oss-20b", model: "gemini-3.1-flash-lite", engine: "edgetts", voice: "id-ID-GadisNeural", owners: 1, commands: false }),
  }));
  const e = await mkM("status");
  await aicallHandler(e.m);
  check("status render: terhubung + engine + suara", box(e).toLowerCase().includes("terhubung") && box(e).toLowerCase().includes("edgetts") && box(e).toLowerCase().includes("id-id-gadisneural"), box(e).slice(0, 120));
  check("status render: otak AI provider", box(e).toLowerCase().includes("otak ai") && box(e).toLowerCase().includes("groq"), box(e).slice(0, 160));
  check("status react 🛠️ → 🐣", e.reacts.includes("🛠️") && e.reacts.includes("🐣"), e.reacts.join(","));
  _clearAicallFetchForTest();
}
{
  // service hidup tapi sesi WA belum tertaut
  _setAicallFetchForTest(async () => ({
    status: 200,
    json: async () => ({ ok: true, connected: false, uptime: "10s", model: "-", engine: "edgetts", voice: "id-ID-GadisNeural", owners: 1 }),
  }));
  const e = await mkM("status");
  await aicallHandler(e.m);
  check("sesi belum tertaut → arahkan pairing code", box(e).toLowerCase().includes("belum tertaut") && box(e).toLowerCase().includes("pairing"), box(e).slice(0, 120));
  _clearAicallFetchForTest();
}

// ═══ 6. engine / voice live ═══
w("\n— .aicall2 engine / .aicall2 voice —");
{
  let captured = null;
  _setAicallFetchForTest(async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { status: 200, json: async () => ({ ok: true, engine: "geminitts", voice: "Puck" }) };
  });
  const e = await mkM("engine geminitts");
  await aicallHandler(e.m);
  check("engine valid → POST /config", captured?.url?.endsWith("/config") && captured?.body?.engine === "geminitts", JSON.stringify(captured));
  check("konfirmasi engine baru", box(e).toLowerCase().includes("geminitts"), box(e).slice(0, 80));
  const e2 = await mkM("voice id-ID-GadisNeural");
  await aicallHandler(e2.m);
  check("voice → POST /config {voice}", captured?.body?.voice === "id-ID-GadisNeural", JSON.stringify(captured));
  _clearAicallFetchForTest();
}
{
  const e = await mkM("engine abc");
  await aicallHandler(e.m);
  check("engine ngawur → daftar opsi (tanpa fetch)", box(e).toLowerCase().includes("edgetts"));
}
{
  const e = await mkM("voice");
  await aicallHandler(e.m);
  check("voice tanpa nama → hint daftar suara", box(e).toLowerCase().includes("gadisneural") || box(e).toLowerCase().includes("suara"), box(e).slice(0, 80));
}

// ═══ 6b. .aicall2 ai agent TANPA key gateway → warning jujur ═══
w("\n— .aicall2 ai agent tanpa key 9router —");
{
  _setAicallPusatKeyForTest(() => "");
  _setAicallAgentForTest(() => ({ key: "", url: "", model: "ag/gemini-pro-agent" }));
  _setAicallFetchForTest(async (url, opts) => ({ status: 200, json: async () => ({ ok: true }) }));
  const e = await mkM("ai agent");
  await aicallHandler(e.m);
  check("tanpa key agent → warning tioApiKey kosong", box(e).toLowerCase().includes("tioapikey") || box(e).toLowerCase().includes("belum ada"), box(e).slice(0, 110));
  _clearAicallPusatKeyForTest();
  _clearAicallAgentForTest();
  _clearAicallFetchForTest();
}

// ═══ 7. /call balikin error dari service (misal sesi WA mati) ═══
w("\n— service hidup, panggilan gagal —");
{
  _setAicallFetchForTest(async () => ({
    status: 500,
    json: async () => ({ ok: false, error: "sesi WhatsApp AI Call belum terhubung" }),
  }));
  const e = await mkM("628123456789");
  await aicallHandler(e.m);
  check("error service diteruskan ke owner + react ❌", box(e).toLowerCase().includes("gagal") && box(e).toLowerCase().includes("sesi whatsapp") && e.reacts.includes("❌"), box(e).slice(0, 100));
  _clearAicallFetchForTest();
}

w(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
