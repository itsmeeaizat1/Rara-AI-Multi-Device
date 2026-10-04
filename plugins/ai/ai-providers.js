// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ai-providers.js — Individual AI command per provider
// .openai .gemini .claude .groq .grok .xai .qwen .cohere .perplexity .fireworks
// .ai21 .reka .cerebras .huggingface .voyage .cloudflare .stability .jina
// .mistral .together .github + IkyyXD & Tio providers
import { callAI, callImageGen, getAllProviders, resolveApiKeyForProvider } from "../../src/lib/rara-ai-service.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { toMessages as sessionToMessages, appendTurn as sessionAppend } from "../../src/lib/rara-ai-session.js";

// brand fallback per provider (API key kosong / provider mati → rantai multi-API)
const FALLBACK_MODEL = {
  openai: "gpt5", gemini: "gemini", anthropic: "claude", groq: "gpt4",
  xai: "gemini", deepseek: "deepseek", meta: "gemini", qwen: "gemini",
  kimi: "gemini", zhipu: "gemini", openrouter: "gpt5", mistral: "gemini",
  together: "gpt5", github: "gpt5", huggingface: "gemini", cohere: "gemini",
  perplexity: "gemini", fireworks: "gpt4", cerebras: "gpt4", voyage: "gemini",
  cloudflare: "gemini", jina: "gemini", stability: "gemini", ai21: "gemini",
  reka: "gemini", codestral: "gemini", kimicode: "gemini",
};
import { raraBox, raraWrap, raraAiUsage, raraGuide } from "../../src/lib/rara-menu-style.js";

// Command → providerKey mapping
const PROVIDER_COMMANDS = {
  // Global providers (butuh API key)
  openai: "openai",
  gpt: "openai",
  gemini: "gemini",
  google: "gemini",
  claude: "anthropic",
  anthropic: "anthropic",
  groq: "groq",
  grok: "xai",
  xai: "xai",
  deepseek: "deepseek",
  ds: "deepseek",
  zhipu: "zhipu",
  glm: "zhipu",
  kimi: "kimi",
  moonshot: "kimi",
  meta: "meta",
  muse: "meta",
  llama: "meta",
  openrouter: "openrouter",
  or: "openrouter",
  codestral: "codestral",
  kimicode: "kimicode",
  qwen: "qwen",
  cohere: "cohere",
  perplexity: "perplexity",
  fireworks: "fireworks",
  ai21: "ai21",
  reka: "reka",
  cerebras: "cerebras",
  huggingface: "huggingface",
  hf: "huggingface",
  voyage: "voyage",
  cloudflare: "cloudflare",
  stability: "stability",
  jina: "jina",
  mistral: "mistral",
  together: "together",
  // Free / no-key providers
  github: "github",
  // IkyyXD providers (gratis via IkyyXD API)
  ikyygemini: "ikyy_gemini",
  ikyygpt5: "ikyy_gpt5",
  ikyygemma: "ikyy_gemma",
  ikyyuni: "ikyy_unliai",
  ikyypub: "ikyy_publicai",
  ikyyperplex: "ikyy_perplexity",
  // Tio providers (gratis via Tio API)
  tioai: "tio_openai",
  tiogemini: "tio_gemini",
  tioclaude: "tio_anthropic",
};

const allCommands = Object.keys(PROVIDER_COMMANDS);

// Provider yang gratis (tidak butuh API key)
const FREE_PROVIDERS = new Set([
  "blackbox", "github",
  "tio_openai", "tio_gemini", "tio_anthropic",
  "ikyy_gemini", "ikyy_cici", "ikyy_gpt5", "ikyy_gemma",
  "ikyy_unliai", "ikyy_publicai", "ikyy_perplexity", "ikyy_zai", "ikyy_zerogpt",
]);

// Smallcaps helper
const SC_MAP = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
const toSC = (s) => String(s || "").replace(/[a-z]/g, c => SC_MAP[c] || c);

const pluginConfig = {
  name: "openai",
  alias: allCommands,
  category: "ai",
  description: "Chat langsung dengan AI provider pilihanmu (35+ provider) — provider vision support gambar (upload/reply)",
  usage: ".<provider> [model] <pesan>\n.<provider vision> <tanya> (kirim/reply gambar) — scan gambar, bantu tugas, dll",
  example: ".openai apa itu AI\n.gemini gemini-2.0-flash jelaskan kuantum\n.gemini (reply gambar) selesaikan soal ini\n.claude (kirim gambar + caption) jelaskan\n.groq hai\n.grok buat puisi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config, db, args, text }) {
  const cmdUsed = (m.command || "").toLowerCase(); // di luar try: dipakai juga di catch
  try {
    const prefix = config.command?.prefix || ".";
    const providerKey = PROVIDER_COMMANDS[cmdUsed] || cmdUsed;

    const providers = getAllProviders();
    const provider = providers[providerKey];
    if (!provider) {
      await m.reply(raraWrap(cmdUsed, `Provider tidak ditemukan. Cek daftar provider: ${prefix}multi-ai list`, "error"));
      return { handled: true };
    }

    const fullText = (text || "").trim();

    // 🔹 VISION: upload gambar + caption .<provider> <tanya> ATAU reply gambar.
    // Provider support vision (gemini/openai/claude/groq/grok/mistral) → gambar
    // ikut dikirim ke API. Provider teks doang → bot jelasin sendiri gak support.
    const directImage = m.isImage ? m : null;
    const quotedImage = m.quoted?.isImage ? m.quoted : null;
    const imageSource = directImage || quotedImage;

    // No text → USAGE DESAIN V2 ala owner (25 Sep 2026): kaomoji + sapaan +
    // 📍 cara/contoh/note + TAMBAHAN KHUSUS AI (request owner 25 Sep): ✨ model
    // aktif + 📋 model tersedia + baris spec. Model & command VERBATIM.
    if (!fullText && !imageSource) {
      const box = raraGuide(cmdUsed, {
 kaomoji: "(◍•ᴗ•◍)",
 sapaan: "ada yang mau ditanyain? tanya aja langsung! (≧ω≦)",
        cara: "ketik pertanyaannya sesudah command, reply atau kirim gambar juga bisa",
        contoh: `${prefix}${cmdUsed} apa itu AI?`,
        note: "jawaban otomatis dari model yang aktif, ganti modelnya lewat contoh di atas atau perintah setmodel",
        modelAktif: provider.defaultModel || provider.model || null,
        models: Array.isArray(provider.models) ? provider.models : [],
        spec: ["💸 gratis"],
      });
      await m.reply(box);
      return { handled: true };
    }

    // Parse model dari kata pertama jika cocok
    const parts = fullText.split(/\s+/);
    let model = provider.defaultModel;
    let userMessage = fullText;

    if (provider.models && parts.length > 1) {
      const possibleModel = parts[0];
      if (provider.models.includes(possibleModel)) {
        model = possibleModel;
        userMessage = parts.slice(1).join(" ");
      }
    }

    if (!userMessage) {
      await m.reply(raraWrap(cmdUsed, `Tulis pesan kamu setelah command.\n\n💡 Contoh: ${prefix}${cmdUsed} halo`));
      return { handled: true };
    }

    // Resolve API key
    const aiConfig = config.aiHelp || {};
    let apiKey = resolveApiKeyForProvider(providerKey, aiConfig);

    if (!apiKey && !FREE_PROVIDERS.has(providerKey)) {
      const globalMap = {
        openai: "openaiApiKey", gemini: "geminiApiKey", anthropic: "anthropicApiKey",
        groq: "groqkey", deepseek: "deepseekkey", xai: "xaikey", qwen: "qwenkey",
        cohere: "coherekey", perplexity: "perplexitykey", fireworks: "fireworkskey",
        ai21: "ai21key", reka: "rekakey", cerebras: "cerebraskey", openrouter: "openrouterkey",
        huggingface: "huggingfacekey", voyage: "voyagekey", cloudflare: "cloudflarekey",
        stability: "stabilitykey", jina: "jinakey", mistral: "mistralkey", together: "togetherkey",
      };
      const gKey = globalMap[providerKey] ? (global[globalMap[providerKey]] || "") : "";
      if (!gKey) {
        // 🔹 key kosong → TETAP dilayani lewat rantai fallback multi-API
        // (rara-ai-fallback.js) — sesi obrolan tetep kepake biar nyambung.
        apiKey = "";
      } else {
        apiKey = gKey;
      }
    }

    // 🔹 JALUR VISION — ada gambar: cek dulu provider-nya sanggup apa gak
    if (imageSource) {
      if (!provider.supportsVision) {
        try { await m.react("❗"); } catch {}
        const lines = [
          "Provider  : " + provider.name,
          "Status   : AI ini tidak support gambar (teks saja)",
          "---",
          "Kirim pertanyaan teks aja, atau scan gambarnya pakai AI vision:",
          prefix + "gemini <tanya>  (reply/kirim gambar)",
          prefix + "openai <tanya>",
          prefix + "claude <tanya>",
          prefix + "groq <tanya>",
          prefix + "grok <tanya>",
          prefix + "kimi <tanya>",
        ];
        const box = raraBox ? raraBox("Tidak Support Gambar", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
      }
      try { await m.react("🕒"); } catch {}
      try {
        const buffer = await (directImage ? m.download() : m.quoted.download());
        const mime = imageSource.mimetype || imageSource.mtype || "image/jpeg";
        const prompt = userMessage || "Jelaskan apa yang ada di gambar ini secara lengkap dan berguna.";
        // kalau user gak pilih model eksplisit → pakai model vision provider
        const visionModel = (model && provider.models?.includes(model) && userMessage !== fullText)
          ? model
          : (provider.visionModel || model);
        const reply = await callAI({
          providerKey,
          model: visionModel,
          messages: [{ role: "user", content: prompt, image: { mimeType: mime, data: buffer.toString("base64") } }],
          systemPrompt: String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu. Analisis gambar dengan detail dan berguna."),
          apiKey,
          apiEndpoint: "",
        });
        try { await m.react("🐣"); } catch {}
        await m.reply(String(reply || "").slice(0, 4096) || "Tidak ada jawaban.");
        return { handled: true };
      } catch (e) {
        try { await m.react("❌"); } catch {}
        const lines = [
          "Provider : " + provider.name,
          "Error    : " + String(e.message || e).slice(0, 200),
          "---",
          "Coba lagi, atau pakai " + prefix + "gemini buat scan gambar.",
        ];
        const box = raraBox ? raraBox("Gagal Analisis Gambar", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
      }
    }

    // 🔹 JALUR IMAGE GEN — user minta bikin gambar (tanpa gambar dilampirkan):
    // provider support generate (gemini/openai/grok) → bikin gambar;
    // provider gak support → bot jelasin sendiri.
    const askGen =
      /\b(buat|buatkan|bikin|bikinkan|generate|generasi)\b/i.test(userMessage) &&
      /\b(gambar|image|logo|ilustrasi|art|meme)\b/i.test(userMessage);
    if (askGen) {
      if (!provider.imageGen) {
        try { await m.react("❗"); } catch {}
        const lines = [
          "Provider  : " + provider.name,
          "Status   : AI ini tidak bisa generate gambar (teks saja)",
          "---",
          "Coba AI yang bisa bikin gambar:",
          prefix + "gemini buat gambar <apa yang mau dibikin>",
          prefix + "openai buat gambar <apa yang mau dibikin>",
          prefix + "grok buat gambar <apa yang mau dibikin>",
          prefix + "zhipu buat gambar <apa yang mau dibikin>",
        ];
        const box = raraBox ? raraBox("Tidak Support Generate Gambar", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
      }
      try { await m.react("🕒"); } catch {}
      try {
        const cleanPrompt = userMessage
          .replace(/^(tolong|coba|please)\s+/i, "")
          .replace(/^\s*(buatkan|buat|bikinkan|bikin|generate|generasi)\s+/i, "")
          .replace(/^\s*(sebuah|satu)\s+/i, "")
          .replace(/^\s*(gambar|image|ilustrasi|logo|art|meme)\s*(dari|tentang|buat|dengan|of)?\s*/i, "")
          .trim() || userMessage;
        const img = await callImageGen(providerKey, cleanPrompt, { apiKey });
        try { await m.react("🐣"); } catch {}
        const provBuf = Buffer.from(img.base64, "base64");
        let provCap = "🎨 " + cleanPrompt.slice(0, 150) + (img.via && img.via !== providerKey ? "\n_(engine fallback: " + img.via + ")_" : "");
        try {
          const info = await probeBuffer(provBuf);
          const card = mediaResultCard({
            header: "aiproviders",
            request: [["Model", img.via || providerKey], ["Prompt", String(cleanPrompt).slice(0, 80)]],
            size: info.size, mime: info.mime, width: info.width, height: info.height,
          });
          if (card) provCap = card;
        } catch {}
        await sock.sendMessage(m.chat, {
          image: provBuf,
          caption: provCap,
          caption: "🎨 " + cleanPrompt.slice(0, 150) + (img.via && img.via !== providerKey ? "\n_(engine: " + img.via + ")_" : ""),
        }, { quoted: m });
        return { handled: true };
      } catch (e) {
        try { await m.react("❌"); } catch {}
        const lines = [
          "Provider : " + provider.name,
          "Error    : " + String(e.message || e).slice(0, 200),
          "---",
          "Coba lagi beberapa saat, atau pakai " + prefix + "gemini.",
        ];
        const box = raraBox ? raraBox("Gagal Generate Gambar", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
      }
    }

    // Loading react
    try { await m.react("🕒"); } catch {}

    // 🔹 SESSION: riwayat obrolan user ini (persist rara-ai-session.js)
    // → AI inget obrolan sebelumnya, lanjut ngobrol nyambung
    // 🔹 QUOTED: pesan yang di-reply user ikut jadi konteks
    const sessionKey = `provider:${m.sender}`;
    const quotedText = m.quoted?.text?.trim() || "";
    const messageWithContext = quotedText
      ? `${userMessage}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
      : userMessage;
    const historyMsgs = sessionToMessages(sessionKey).slice(-20);

    // Call AI (dengan histori sesi)
    let reply = "";
    try {
      reply = await callAI({
        providerKey,
        model,
        messages: [...historyMsgs, { role: "user", content: messageWithContext }],
        systemPrompt: String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu."),
        apiKey,
        apiEndpoint: "",
      });
    } catch (e) {
      reply = "";
    }

    // STRICT (owner 11 Sep: satuan gak ada fallback) — provider mati / key
    // kosong / balas kosong → LANGSUNG error, GAK jatuh ke brand lain.

    // simpan giliran ke sesi (biar obrolan berikutnya inget)
    if (reply && reply.trim()) {
      sessionAppend(sessionKey, userMessage, reply.trim().slice(0, 800));
    }

    if (!reply || reply.trim() === "") {
      try { await m.react("❌"); } catch {}
      const lines = [
        "Provider : " + provider.name,
        "Model    : " + model,
        "Status   : Tidak ada respons",
        "---",
        "Cek API key atau coba model lain",
      ];
      const box = raraBox ? raraBox("AI Error", lines) : lines.join("\n");
      await m.reply(box);
      return { handled: true };
    }

    // Trim + send
    const trimmedReply = reply.length > 3000 ? reply.slice(0, 3000) + "..." : reply;
    try { await m.react("🐣"); } catch {}
    await m.reply(trimmedReply);
    return { handled: true };
  } catch (error) {
    console.error("[ai-providers.js]:", error.message);
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap(cmdUsed, error.message || "Gagal proses, coba lagi ya", "error"));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
