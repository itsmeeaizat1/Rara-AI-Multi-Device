// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai-providers.js — Individual AI command per provider
// .openai .gemini .claude .groq .grok .xai .qwen .cohere .perplexity .fireworks
// .ai21 .reka .cerebras .huggingface .voyage .cloudflare .stability .jina
// .mistral .together .github + IkyyXD & Tio providers
import { callAI, callImageGen, getAllProviders, resolveApiKeyForProvider } from "../../src/lib/nova-ai-service.js";
import { novaBox, claraWrap } from "../../src/lib/nova-menu-style.js";

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
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
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
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config, db, args, text }) {
  try {
    const prefix = config.command?.prefix || ".";
    const cmdUsed = (m.command || "").toLowerCase();
    const providerKey = PROVIDER_COMMANDS[cmdUsed] || cmdUsed;

    const providers = getAllProviders();
    const provider = providers[providerKey];
    if (!provider) {
      await m.reply(claraWrap(cmdUsed, `Provider tidak ditemukan. Cek daftar provider: ${prefix}multi-ai list`, "error"));
      return { handled: true };
    }

    const fullText = (text || "").trim();

    // 🔹 VISION: upload gambar + caption .<provider> <tanya> ATAU reply gambar.
    // Provider support vision (gemini/openai/claude/groq/grok/mistral) → gambar
    // ikut dikirim ke API. Provider teks doang → bot jelasin sendiri gak support.
    const directImage = m.isImage ? m : null;
    const quotedImage = m.quoted?.isImage ? m.quoted : null;
    const imageSource = directImage || quotedImage;

    // No text → show info (kecuali ada gambar — langsung scan)
    if (!fullText && !imageSource) {
      const models = (provider.models || []).join(", ");
      const keyStatus = FREE_PROVIDERS.has(providerKey) ? "Gratis" : (resolveApiKeyForProvider(providerKey, {}) ? "Terisi" : "Belum diisi");
      const lines = [
        "Provider  : " + provider.name,
        "Default   : " + provider.defaultModel,
      ];
      if (models) lines.push("Models    : " + models);
      lines.push("Key       : " + keyStatus);
      lines.push("---");
      lines.push("Cara pakai: " + prefix + cmdUsed + " [model] <pesan>");
      lines.push("Contoh    : " + prefix + cmdUsed + " apa itu AI");
      const box = novaBox ? novaBox("Info Provider", lines) : lines.join("\n");
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
      await m.reply(claraWrap(cmdUsed, `Tulis pesan kamu setelah command.\n\n💡 Contoh: ${prefix}${cmdUsed} halo`));
      return { handled: true };
    }

    // Resolve API key
    const aiConfig = config.aiHelp || {};
    const apiKey = resolveApiKeyForProvider(providerKey, aiConfig);

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
        const lines = [
          "Provider : " + provider.name,
          "Status   : API key belum diisi",
          "---",
          "Isi di src/lib/apikey/apikeys.json",
          "Atau ketik " + prefix + "ai-set apiKey " + providerKey + " <key>",
        ];
        const box = novaBox ? novaBox("API Key Diperlukan", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
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
        const box = novaBox ? novaBox("Tidak Support Gambar", lines) : lines.join("\n");
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
        const box = novaBox ? novaBox("Gagal Analisis Gambar", lines) : lines.join("\n");
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
        const box = novaBox ? novaBox("Tidak Support Generate Gambar", lines) : lines.join("\n");
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
        await sock.sendMessage(m.chat, {
          image: Buffer.from(img.base64, "base64"),
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
        const box = novaBox ? novaBox("Gagal Generate Gambar", lines) : lines.join("\n");
        await m.reply(box);
        return { handled: true };
      }
    }

    // Loading react
    try { await m.react("🕒"); } catch {}

    // Call AI
    const reply = await callAI({
      providerKey,
      model,
      messages: [{ role: "user", content: userMessage }],
      systemPrompt: String(aiConfig.systemPrompt || "Kamu adalah asisten AI yang membantu."),
      apiKey,
      apiEndpoint: "",
    });

    if (!reply || reply.trim() === "") {
      try { await m.react("❌"); } catch {}
      const lines = [
        "Provider : " + provider.name,
        "Model    : " + model,
        "Status   : Tidak ada respons",
        "---",
        "Cek API key atau coba model lain",
      ];
      const box = novaBox ? novaBox("AI Error", lines) : lines.join("\n");
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
    await m.reply(claraWrap(cmdUsed, error.message || "Gagal proses, coba lagi ya", "error"));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
