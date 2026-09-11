// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai-fallback.js — RUTE AI buat fitur AI satuan + rantai internal
//
// REQUEST OWNER 11 Sep 2026: "aku mah ai satuan jgn ada fallback jadi kyk
// .deepseek tetep jalur deepseek gak ada fallback meskipun itu blm disetkey
// atau down".
// → aiFallbackChat() sekarang STRICT SATU RUTE per brand (.deepseek → Haidar
//   deepseek doang; .gpt4o → Haidar mateai doang; dst). Key belum diset /
//   provider down → THROW — GAK ada rantai keselain brand.
// → aiChainChat() = rantai penuh LAMA (gemini→mercury→sensenova→haidar→ikyy→
//   xemoz→kuroneko), DIPINDAH ke sini dan cuma dipakai fitur INTERNAL yang
//   butuh "AI apa pun yang aktif" (nova-bencana, nova-vision-chain, autonovaai).
//
// Rantai prioritas:
//   0. Gemini NATIVE generativelanguage.googleapis.com (key: apikeys.json novaai.google)
//      → BEGITU owner isi key Google AI Studio baru, SEMUA fitur otomatis pindah ke
//        Gemini (provider resmi, cepat, stabil) tanpa ubah kode. Key kosong/expired →
//        skip otomatis (key invalid dicache sampai restart biar gak nambah latency).
//   1. MERCURY (Inception Labs) api.inceptionlabs.ai
//   1.5 SENSENOVA (SenseTime) token.sensenova.ai — multimodal vision, 256K ctx — dLLM difusi 5-10× lebih cepat
//      dari model sekelas (key: apikeys.json novaai.inception, fallback env
//      INCEPTION_API_KEY). OpenAI-compatible, mercury-2, 128K context, tools+json mode.
//   2. HaidarApis  /api/v1/ai/gemini?message=   (key: apikeys.json aiSatuan.haidar)
//   3. IkyyXD      callIkyy() — internal chain gemini→cici→gpt5→gemma (key: aiSatuan.ikyyxd)
//   4. Xemoz       deepseek-v3.2-thinking (free, tanpa key)
//
// Semua sumber gagal → throw (pemanggil tampilkan error standar).
// Persona: identitas command tetep kepake (mis. .llamav2 → "Kamu adalah Llama AI").

const HAIDAR_BASE = "https://api.haidarxd.my.id/api/v1/ai";
const XEMOZ_DS = "https://api-xemoz-official.my.id/api/ai/deepseek-v3.2-thinking.php";

// ── Model Haidar per-brand (param & bentuk response beda-beda) ──
// key → { ep: endpoint, param: nama param, pick: cara ekstrak teks }
const HAIDAR_MODELS = {
  gemini:   { ep: "gemini",  param: "message", pick: d => d?.text },
  claude:   { ep: "claude",  param: "message", pick: d => d?.content },
  gpt5:     { ep: "gpt55",   param: "message", pick: d => d?.reply },
  gpt4:     { ep: "gpt54",   param: "message", pick: d => d?.reply },
  gpt4o:    { ep: "mateai",  param: "message", pick: d => d?.reply },
  deepseek: { ep: "deepsek", param: "message", pick: d => d?.answer },
  googleai: { ep: "googleai", param: "text",  pick: d => d?.answer || d?.text || d?.reply },
};

function buildPrompt(prompt, { persona = "", systemPrompt = "", historyBlock = "", quoted = "" } = {}) {
  const sys = systemPrompt || (persona ? `Kamu adalah ${persona}. Jawab natural dan singkat, pakai bahasa yang sama dengan user (default bahasa Indonesia).` : "");
  const parts = [sys, historyBlock].filter(Boolean);
  if (quoted) parts.push(`[User membalas pesan ini — jadikan konteks]: ${String(quoted).slice(0, 500)}`);
  parts.push(prompt);
  const head = parts.slice(0, -1).join("\n\n");
  return head ? `${head}\n\n${prompt}` : prompt;
}

function cleanText(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null" ? s : "";
}

// ── PRIORITAS 0: Gemini native (apikeys.json novaai.google — key Google AI Studio) ──
// Key invalid → dicache mati sampai restart bot (gak nambah latency tiap request)
let __geminiKeyDead = false;

async function viaGeminiNative(fullPrompt) {
  if (__geminiKeyDead) throw new Error("key gemini invalid (dicache mati)");
  let key = "";
  try {
    const { getApiKeys } = await import("./config/env-loader.js");
    key = getApiKeys()?.google || "";
  } catch {}
  if (!key) throw new Error("key google kosong");

  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 400 || res.status === 403) {
      // key invalid/expired — tandai mati biar request berikutnya gak nyoba lagi
      __geminiKeyDead = true;
      throw new Error(`gemini key invalid (HTTP ${res.status})`);
    }
    if (!res.ok) continue; // 404/429/500 → coba model berikutnya
    const data = await res.json().catch(() => ({}));
    const text = cleanText(data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "");
    if (text) return text;
    throw new Error("gemini balas kosong");
  }
  throw new Error("gemini HTTP gagal semua model");
}

// ── PRIORITAS 1: Mercury (Inception Labs) — diffusion LLM super cepat ──
// (apikeys.json novaai.inception; override env INCEPTION_API_KEY.
//  Key invalid → dicache mati sampai restart biar gak nambah latency)
let __mercuryKeyDead = false;
const MERCURY_URL = "https://api.inceptionlabs.ai/v1/chat/completions";

export async function viaMercury(fullPrompt) {
  if (__mercuryKeyDead) throw new Error("key mercury invalid (dicache mati)");
  let key = process.env.INCEPTION_API_KEY || "";
  if (!key) {
    try {
      const { getApiKeys } = await import("./config/env-loader.js");
      key = getApiKeys()?.inception || "";
    } catch {}
  }
  if (!key) throw new Error("key inception kosong");
  const res = await fetch(MERCURY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "mercury-2",
      messages: [{ role: "user", content: fullPrompt }],
      max_tokens: 2048,
      stream: false,
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 401 || res.status === 403) {
    // key invalid/expired — tandai mati biar request berikutnya gak nyoba lagi
    __mercuryKeyDead = true;
    throw new Error(`mercury key invalid (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`mercury HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const text = cleanText(data?.choices?.[0]?.message?.content || "");
  if (text) return text;
  throw new Error("mercury balas kosong");
}

/** 2. HaidarApis — model sesuai brand command (fallback: gemini) */
async function viaHaidar(fullPrompt, model = "gemini") {
  let key = "";
  try {
    const { getHaidarKey } = await import("./config/env-loader.js");
    key = getHaidarKey();
  } catch {}
  if (!key) throw new Error("key haidar kosong");
  const spec = HAIDAR_MODELS[model] || HAIDAR_MODELS.gemini;
  const res = await fetch(
    `${HAIDAR_BASE}/${spec.ep}?apikey=${encodeURIComponent(key)}&${spec.param}=${encodeURIComponent(fullPrompt)}`,
    {
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    }
  );
  if (!res.ok) throw new Error(`haidar HTTP ${res.status}`);
  const json = await res.json();
  if (json?.status === "error" || json?.error) throw new Error("haidar error response");
  const text = cleanText(spec.pick(json?.data));
  if (!text) throw new Error("haidar balas kosong");
  return text;
}

/** 2. IkyyXD (callIkyy — punya rantai internal sendiri) */
async function viaIkyy(prompt, { persona = "", systemPrompt = "", historyBlock = "" } = {}) {
  const { callIkyy } = await import("./nova-ai-service.js");
  const sys = systemPrompt || (persona ? `Kamu adalah ${persona}. Jawab natural dan singkat, pakai bahasa yang sama dengan user (default bahasa Indonesia).` : "");
  const fullSys = [sys, historyBlock].filter(Boolean).join("\n\n");
  const r = await callIkyy(prompt, fullSys ? { systemPrompt: fullSys } : {});
  const text = cleanText(typeof r === "string" ? r : r?.text || r?.reply);
  if (!text) throw new Error("ikyy balas kosong");
  return text;
}

/** 3. Xemoz deepseek-v3.2-thinking (free) */
async function viaXemoz(fullPrompt) {
  const res = await fetch(`${XEMOZ_DS}?${new URLSearchParams({ pesan: fullPrompt })}`, {
    signal: AbortSignal.timeout(60000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`xemoz HTTP ${res.status}`);
  const data = await res.json();
  const text = cleanText(data?.result?.reply || data?.response || (typeof data?.result === "string" ? data.result : ""));
  if (!text) throw new Error("xemoz balas kosong");
  return text;
}

/**
 * aiChainChat — rantai PENUH multi-API (gemini→mercury→sensenova→haidar→ikyy→
 * xemoz→kuroneko). Cuma buat fitur INTERNAL (bencana, vision chain, autonovaai)
 * yang butuh "AI apa pun yang aktif". Command AI satuan GAK boleh pakai ini
 * (owner 11 Sep: satuan strict tanpa fallback — pakai aiFallbackChat).
 * @param {string} prompt  pertanyaan user
 * @param {Object} opts
 * @param {string} [opts.persona]      identitas command, mis. "Llama AI" → system prompt otomatis
 * @param {string} [opts.systemPrompt] system prompt custom (override persona)
 * @param {string} [opts.model]          brand Haidar (gemini/claude/gpt5/gpt4/gpt4o/deepseek/googleai)
 * @param {string} [opts.sessionKey]     key sesi nova-ai-session.js ("satuan:628xx") — aktifin ingatan obrolan
 * @param {string} [opts.userName]       nama user buat label riwayat
 * @param {string} [opts.quoted]         teks pesan yang di-reply user (jadi konteks)
 * @returns {Promise<string>} jawaban AI
 * @throws kalau SEMUA sumber gagal (message gabungan per-sumber)
 */
export async function aiChainChat(prompt, opts = {}) {
  const model = opts.model || "gemini"; // brand haidar: gemini/claude/gpt5/gpt4/gpt4o/deepseek/googleai

  // ── SESSION: muat riwayat obrolan user ini (nova-ai-session.js) ──
  let historyBlock = "";
  if (opts.sessionKey) {
    try {
      const { foldHistory } = await import("./nova-ai-session.js");
      historyBlock = foldHistory(opts.sessionKey, { userName: opts.userName || "User" });
    } catch {}
  }

  const fullPrompt = buildPrompt(prompt, { ...opts, historyBlock });
  const errors = [];

  const finish = async (reply) => {
    // simpan giliran ini ke sesi biar obrolan lanjutan nyambung
    if (opts.sessionKey) {
      try {
        const { appendTurn } = await import("./nova-ai-session.js");
        appendTurn(opts.sessionKey, prompt, reply);
      } catch {}
    }
    return reply;
  };

  // 0. Gemini native — key Google AI Studio valid = prioritas utama (provider resmi)
  try { return finish(await viaGeminiNative(fullPrompt)); }
  catch (e) { errors.push(`gemini-native: ${e.message}`); }

  // 1. Mercury (Inception Labs) — dLLM difusi super cepat (key owner)
  try { return finish(await viaMercury(fullPrompt)); }
  catch (e) { errors.push(`mercury: ${e.message}`); }

  // 1.5 SenseNova (SenseTime) — multimodal vision + chat, 256K ctx (key owner)
  try {
    const { sensenovaChat } = await import("../scraper/sensenova.js");
    return finish(await sensenovaChat(fullPrompt));
  } catch (e) { errors.push(`sensenova: ${e.message}`); }

  // 2. Haidar — brand pilihan, gagal → gemini
  try { return finish(await viaHaidar(fullPrompt, model)); }
  catch (e) { errors.push(`haidar/${model}: ${e.message}`); }
  if (model !== "gemini") {
    try { return finish(await viaHaidar(fullPrompt, "gemini")); }
    catch (e) { errors.push(`haidar/gemini: ${e.message}`); }
  }

  // 3. Ikyy (callIkyy bawa persona/systemPrompt sendiri)
  try { return finish(await viaIkyy(prompt, { ...opts, historyBlock })); }
  catch (e) { errors.push(`ikyy: ${e.message}`); }

  // 4. Xemoz deepseek
  try { return finish(await viaXemoz(fullPrompt)); }
  catch (e) { errors.push(`xemoz: ${e.message}`); }

  // 5. KuroNeko (sylvatica.my.id) — flagship AI KuroNeko (key owner)
  try {
    const { kuronekoChat } = await import("../scraper/kuroneko.js");
    return finish(await kuronekoChat(fullPrompt));
  } catch (e) { errors.push(`kuroneko: ${e.message}`); }

  throw new Error(`Semua fallback AI gagal (${errors.join(" | ")})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// aiFallbackChat — STRICT SATU RUTE (request owner 11 Sep 2026: AI satuan
// jangan ada fallback — .deepseek tetep jalur deepseek, gak ada fallback
// meskipun key belum diset atau provider down → THROW).
// Rute ditentukan:
//   • opts.route "mercury"   → viaMercury (key inception; kosong → error)
//   • opts.route "sensenova" → sensenovaChat
//   • opts.route "kuroneko"  → kuronekoChat
//   • selain itu             → viaHaidar(opts.model, default "gemini") —
//                              brand endpoint masing-masing:
//                              deepseek→deepsek, gpt5→gpt55, gpt4→gpt54,
//                              gpt4o→mateai, claude→claude, googleai/gemini→gemini
// Persona/systemPrompt/sesi obrolan/quoted tetap kepake seperti biasa.
// ─────────────────────────────────────────────────────────────────────────────
export async function aiFallbackChat(prompt, opts = {}) {
  const route = String(opts.route || "").toLowerCase();
  const model = opts.model || "gemini";

  // ── SESSION: muat riwayat obrolan user ini (nova-ai-session.js) ──
  let historyBlock = "";
  if (opts.sessionKey) {
    try {
      const { foldHistory } = await import("./nova-ai-session.js");
      historyBlock = foldHistory(opts.sessionKey, { userName: opts.userName || "User" });
    } catch {}
  }

  const fullPrompt = buildPrompt(prompt, { ...opts, historyBlock });
  const label = route || `haidar/${model}`;

  let reply = "";
  try {
    if (route === "mercury") {
      reply = await viaMercury(fullPrompt);
    } else if (route === "sensenova") {
      const { sensenovaChat } = await import("../scraper/sensenova.js");
      reply = await sensenovaChat(fullPrompt);
    } else if (route === "kuroneko") {
      const { kuronekoChat } = await import("../scraper/kuroneko.js");
      reply = await kuronekoChat(fullPrompt);
    } else {
      reply = await viaHaidar(fullPrompt, model);
    }
  } catch (e) {
    throw new Error(`Jalur ${label} gagal: ${e.message} — tanpa fallback (mode satuan strict)`);
  }
  if (!cleanText(reply)) {
    throw new Error(`Jalur ${label} balas kosong — tanpa fallback (mode satuan strict)`);
  }

  // simpan giliran ini ke sesi biar obrolan lanjutan nyambung
  if (opts.sessionKey) {
    try {
      const { appendTurn } = await import("./nova-ai-session.js");
      appendTurn(opts.sessionKey, prompt, reply);
    } catch {}
  }
  return reply;
}
