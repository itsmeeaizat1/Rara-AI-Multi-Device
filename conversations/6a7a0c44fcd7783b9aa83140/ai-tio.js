import {
  alyaHeader,
  bracketBox,
  separator,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-tio",
  alias: ["tio", "aio", "tioai", "asktio"],
  category: "ai",
  description: "Tanya AI via Tio AIO - 3 format: .tio openai/gemini/anthropic <pesan>",
  usage: ".tio <format> <pertanyaan>",
  example: ".tio openai halo\n.tio gemini hai\n.tio anthropic hai",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// Tio AI - 34 models, semua support 3 format API
// Format = cara manggil API, bukan jenis model
// ═══════════════════════════════════════════════

const TIO_FORMATS = {
  openai: {
    label: "OpenAI",
    emoji: "🟢",
    providerKey: "tio_openai",
    endpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    defaultModel: "deepseek-v4-flash:free",
  },
  gemini: {
    label: "Gemini",
    emoji: "🔵",
    providerKey: "tio_gemini",
    endpoint: null, // dynamic per model
    defaultModel: "deepseek-v4-flash:free",
  },
  anthropic: {
    label: "Anthropic",
    emoji: "🟣",
    providerKey: "tio_anthropic",
    endpoint: "https://ai.tioo.eu.org/v1/messages",
    defaultModel: "deepseek-v4-flash:free",
  },
};

// Daftar model tersedia di Tio AI
const TIO_MODELS = [
  // Free models
  { id: "deepseek-v4-flash:free", label: "DeepSeek V4 Flash (Free)", desc: "Cepat & gratis", free: true },
  { id: "kimi-k3:free", label: "Kimi K3 (Free)", desc: "Moonshot AI", free: true },
  { id: "mimo-v2.5:free", label: "Mimo V2.5 (Free)", desc: "Xiaomi", free: true },
  { id: "tencent/hy3:free", label: "Tencent HY3 (Free)", desc: "Tencent", free: true },
  { id: "openrouter/free", label: "OpenRouter (Free)", desc: "Auto-route", free: true },
  { id: "stepfun/step-3.7-flash:free", label: "Step 3.7 Flash (Free)", desc: "StepFun", free: true },
  { id: "cohere/north-mini-code:free", label: "Cohere North (Free)", desc: "Coding", free: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron Ultra (Free)", desc: "550B params", free: true },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super (Free)", desc: "120B params", free: true },
  { id: "moonshotai/kimi-k3-free", label: "Kimi K3 Alt (Free)", desc: "Moonshot", free: true },
  { id: "inclusionai/ling-3.0-flash:free", label: "Ling 3.0 Flash (Free)", desc: "InclusionAI", free: true },
  { id: "poolside/laguna-s-2.1:free", label: "Laguna S (Free)", desc: "Poolside", free: true },
  { id: "poolside/laguna-xs-2.1:free", label: "Laguna XS (Free)", desc: "Poolside", free: true },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron Nano (Free)", desc: "Reasoning", free: true },
  { id: "nvidia/nemotron-3.5-content-safety:free", label: "Nemotron Safety (Free)", desc: "Content safety", free: true },
  { id: "kilo-auto/free", label: "Kilo Auto (Free)", desc: "Auto + image", free: true },
  // Premium models
  { id: "auto", label: "Auto", desc: "Auto-route terbaik", free: false },
  { id: "DeepSeek-V4-Pro", label: "DeepSeek V4 Pro", desc: "Versi pro", free: false },
  { id: "DeepSeek-V4-Flash", label: "DeepSeek V4 Flash", desc: "Versi flash", free: false },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", desc: "Versi flash", free: false },
  { id: "moonshotai/Kimi-K2.6", label: "Kimi K2.6", desc: "Moonshot flagship", free: false },
  { id: "MiniMaxAI/MiniMax-M2.7", label: "MiniMax M2.7", desc: "MiniMax", free: false },
  { id: "Qwen3.5-397B-A17B", label: "Qwen 3.5 397B", desc: "Alibaba besar", free: false },
  { id: "Qwen3.6-35B-A3B", label: "Qwen 3.6 35B", desc: "Alibaba efisien", free: false },
  { id: "glm-5.2", label: "GLM 5.2", desc: "Zhipu AI", free: false },
  { id: "glm-5.1", label: "GLM 5.1", desc: "Zhipu AI", free: false },
  { id: "step-3.7-flash", label: "Step 3.7 Flash", desc: "StepFun", free: false },
  { id: "step-3.5-flash", label: "Step 3.5 Flash", desc: "StepFun", free: false },
  { id: "step-router-v1", label: "Step Router V1", desc: "Router", free: false },
  { id: "kat-coder-pro-v2.5", label: "Kat Coder Pro", desc: "Coding pro", free: false },
  { id: "sensenova-6.7-flash-lite", label: "SenseNova 6.7", desc: "SenseTime", free: false },
];

// Short alias map for formats
const FORMAT_ALIASES = {
  o: "openai", open: "openai", oai: "openai", gpt: "openai",
  g: "gemini", gem: "gemini", google: "gemini",
  a: "anthropic", ant: "anthropic", claude: "anthropic", antro: "anthropic",
};

function resolveFormat(arg) {
  const lower = String(arg || "").toLowerCase().trim();
  if (TIO_FORMATS[lower]) return lower;
  if (FORMAT_ALIASES[lower]) return FORMAT_ALIASES[lower];
  return null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const body = raw.replace(/^\.ai-tio\s+/i, "").replace(/^\.tio\s+/i, "").replace(/^\.aio\s+/i, "").replace(/^\.asktio\s+/i, "").trim();

    const aiHelp = botConfig.aiHelp || {};
    const apiKey = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    const hasKey = !!apiKey;

    // ═══ No args → show menu ═══
    if (!body) {
      const text =
        alyaHeader("Tio AI (AIO)", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ 34 model AI via *ai.tioo.eu.org*`,
          `◦ 3 Format: OpenAI / Gemini / Anthropic`,
          `◦ API Key: *${hasKey ? "Terpasang ✅" : "Belum diisi ❌"}*`,
        ]) +
        "\n\n" +
        bracketBox("🟢", "ᴏᴘᴇɴᴀɪ ꜰᴏʀᴍᴀᴛ", [
          `  *${prefix}tio openai <pesan>*`,
          `  Endpoint: /v1/chat/completions`,
        ]) +
        "\n\n" +
        bracketBox("🔵", "ɢᴇᴍɪɴɪ ꜰᴏʀᴍᴀᴛ", [
          `  *${prefix}tio gemini <pesan>*`,
          `  Endpoint: /v1beta/models/{model}:generateContent`,
        ]) +
        "\n\n" +
        bracketBox("🟣", "ᴀɴᴛʜʀᴏᴘɪᴄ ꜰᴏʀᴍᴀᴛ", [
          `  *${prefix}tio anthropic <pesan>*`,
          `  Endpoint: /v1/messages`,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ ʟᴀɪɴ", [
          `◦ *${prefix}tio model <format> <nama>* — ganti model`,
          `◦ *${prefix}tio list* — lihat semua model`,
          `◦ *${prefix}tio list free* — lihat model gratis`,
          `◦ *${prefix}ai-set apiKey <key>* — set API key`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Contoh: ${prefix}tio openai jelaskan tentang AI`);

      await m.reply(text);
      return { handled: true };
    }

    const parts = body.split(/[ \t]+/).filter(Boolean);
    const firstWord = (parts[0] || "").toLowerCase();

    // ═══ "list" subcommand ═══
    if (firstWord === "list") {
      const filterFree = (parts[1] || "").toLowerCase() === "free";
      const models = filterFree ? TIO_MODELS.filter((m) => m.free) : TIO_MODELS;

      const freeModels = models.filter((m) => m.free);
      const premiumModels = models.filter((m) => !m.free);

      const fmtLines = (list) => list.map((mdl) =>
        `  *${mdl.label}* (${mdl.id})\n    ${mdl.desc}`
      ).join("\n");

      let text = alyaHeader("Tio AI Models" + (filterFree ? " (Free)" : ""), "🤖") + "\n\n";
      if (freeModels.length) {
        text += bracketBox("🆓", "ꜰʀᴇᴇ ᴍᴏᴅᴇʟꜱ", [fmtLines(freeModels)]) + "\n\n";
      }
      if (!filterFree && premiumModels.length) {
        text += bracketBox("💎", "ᴘʀᴇᴍɪᴜᴍ ᴍᴏᴅᴇʟꜱ", [fmtLines(premiumModels)]) + "\n\n";
      }
      text += separator("━", 22) +
        "\n" + tipText(`Ganti: ${prefix}tio model <format> <nama-model>`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ "model" subcommand ═══
    if (firstWord === "model") {
      const fmtArg = (parts[1] || "").toLowerCase();
      const modelArg = parts.slice(2).join(" ").trim();

      if (!fmtArg || !modelArg) {
        const text =
          alyaHeader("Ganti Model", "⚙️") +
          "\n\n" +
          bracketBox("📋", "ᴄᴀʀᴀ", [
            `◦ *${prefix}tio model openai deepseek-v4-flash:free*`,
            `◦ *${prefix}tio model gemini kimi-k3:free*`,
            `◦ *${prefix}tio model anthropic auto*`,
            `◦ *${prefix}tio list* — lihat semua model`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      const fmtKey = resolveFormat(fmtArg);
      if (!fmtKey) {
        const text =
          alyaHeader("Format Tidak Valid", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Format *${fmtArg}* tidak dikenal`,
            `◦ Pilih: openai / gemini / anthropic`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      const fmt = TIO_FORMATS[fmtKey];
      const found = TIO_MODELS.find(
        (mdl) => mdl.id === modelArg || mdl.label.toLowerCase() === modelArg.toLowerCase()
      );

      if (!found) {
        const text =
          alyaHeader("Model Tidak Ditemukan", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Model *${modelArg}* tidak ada`,
            `◦ Ketik *${prefix}tio list* untuk lihat semua model`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp[fmtKey + "Model"] = found.id;

      const text =
        alyaHeader("Model Diganti", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴘᴇʀᴜʙᴀʜᴀɴ", [
          `◦ Format: *${fmt.label}*`,
          `◦ Model: *${found.label}*`,
          `◦ ID: *${found.id}*`,
          `◦ ${found.desc}`,
          `◦ Gratis: *${found.free ? "Ya ✅" : "Tidak 💎"}*`,
        ]) +
        "\n\n" + separator("━", 22) +
        "\n" + tipText(`Tes: ${prefix}tio ${fmtKey} halo`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ Main: .tio <format> <pesan> ═══
    const fmtKey = resolveFormat(firstWord);

    if (!fmtKey) {
      const text =
        alyaHeader("Format Tidak Dikenal", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ Format *${parts[0]}* tidak dikenal`,
          `◦ Pilih: *openai* / *gemini* / *anthropic*`,
          `◦ Contoh: *${prefix}tio openai halo*`,
        ]) +
        "\n\n" + separator("━", 22) +
        "\n" + tipText(`Ketik ${prefix}tio untuk lihat panduan`);
      await m.reply(text);
      return { handled: true };
    }

    const fmt = TIO_FORMATS[fmtKey];
    const prompt = parts.slice(1).join(" ").trim();

    if (!prompt) {
      const text =
        alyaHeader(fmt.label + " - Kosong", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ Pesan tidak boleh kosong`,
          `◦ Contoh: *${prefix}tio ${fmtKey} halo*`,
        ]) +
        "\n\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Check API key
    if (!apiKey) {
      const text =
        alyaHeader("API Key Belum Diisi", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ API Key Tio AI belum di-set`,
          `◦ Set di config.js: aiHelp.apiKey`,
          `◦ Atau ketik *${prefix}ai-set apiKey <key>*`,
        ]) +
        "\n\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Get model for this format
    const model = aiHelp[fmtKey + "Model"] || fmt.defaultModel;
    const systemPrompt = aiHelp.systemPrompt || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    // Build messages
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    // Set endpoint (Gemini is dynamic per model)
    const apiEndpoint = fmtKey === "gemini"
      ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
      : fmt.endpoint;

    // Call AI
    const reply = await callAI({
      providerKey: fmt.providerKey,
      model: model,
      messages: messages,
      systemPrompt: systemPrompt,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Find model label
    const modelInfo = TIO_MODELS.find((mdl) => mdl.id === model);
    const modelLabel = modelInfo?.label || model;
    const replyText = reply.length > 3800 ? reply.slice(0, 3800) + "\n\n_... respon dipotong_" : reply;

    const text =
      alyaHeader("Tio AI", fmt.emoji) +
      "\n\n" +
      bracketBox(fmt.emoji, "ʀᴇꜱᴘᴏɴ", [
        `◦ Format: *${fmt.label}*`,
        `◦ Model: *${modelLabel}*`,
        `◦ Pertanyaan: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "",
        replyText,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}tio ${fmtKey} <pesan> untuk tanya lagi`) +
      "\n" +
      tipText(`Ganti model: ${prefix}tio model ${fmtKey} <nama>`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      alyaHeader("Tio AI Error", "❌") +
      "\n\n" +
      bracketBox("❌", "ᴇʀʀᴏʀ", [
        `◦ Status: *Gagal*`,
        `◦ Error: *${error.message || "Unknown error"}*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Coba lagi atau cek API key dengan ${prefix}ai-set list`);
    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
