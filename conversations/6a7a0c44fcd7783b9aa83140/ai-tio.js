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
  description: "Tanya AI menggunakan Tio AI (AIO) - multi model dalam satu API",
  usage: ".ai-tio <pertanyaan>",
  example: ".ai-tio jelaskan tentang black hole",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TIO_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Paling pintar" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Cepat & hemat" },
  { id: "gpt-4o", label: "GPT-4o", desc: "OpenAI flagship" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Cepat & murah" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Google" },
  { id: "deepseek-chat", label: "DeepSeek Chat", desc: "Reasoning" },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const prompt = raw.replace(/^\.ai-tio\s+/i, "").replace(/^\.tio\s+/i, "").replace(/^\.aio\s+/i, "").trim();

    if (!prompt) {
      const aiHelp = botConfig.aiHelp || {};
      const currentModel = aiHelp.model || "claude-sonnet-4-20250514";
      const hasKey = !!(aiHelp.apiKey || process.env.OPENAI_API_KEY);

      const modelLines = TIO_MODELS.map((mdl, i) =>
        `  ${i + 1}. *${mdl.label}* (${mdl.id})\n     ${mdl.desc}${mdl.id === currentModel ? " ✅ aktif" : ""}`
      ).join("\n");

      const text =
        alyaHeader("Tio AI (AIO)", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ Multi-model AI dalam satu API`,
          `◦ Endpoint: *ai.tioo.eu.org*`,
          `◦ API Key: *${hasKey ? "Terpasang ✅" : "Belum diisi ❌"}*`,
          `◦ Model aktif: *${currentModel}*`,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴍᴏᴅᴇʟ ᴛᴇʀꜱᴇᴅɪᴀ", [
          modelLines,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ", [
          `◦ *${prefix}ai-tio <pertanyaan>* — tanya AI`,
          `◦ *${prefix}ai-tio model <nama>* — ganti model`,
          `◦ *${prefix}ai-tio list* — lihat model tersedia`,
          `◦ *${prefix}ai-set apiKey <key>* — set API key`,
          `◦ *${prefix}ai-set endpoint <url>* — set endpoint`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Contoh: ${prefix}ai-tio jelaskan tentang AI`);

      await m.reply(text);
      return { handled: true };
    }

    // Handle "model" subcommand
    if (prompt.toLowerCase().startsWith("model ")) {
      const modelArg = prompt.slice(6).trim();

      if (modelArg.toLowerCase() === "list") {
        const modelLines = TIO_MODELS.map((mdl, i) =>
          `  ${i + 1}. *${mdl.label}* (${mdl.id}) — ${mdl.desc}`
        ).join("\n");
        const text =
          alyaHeader("Tio AI Models", "🤖") +
          "\n\n" +
          bracketBox("📋", "ᴍᴏᴅᴇʟ", [modelLines]) +
          "\n\n" +
          separator("━", 22) +
          "\n" +
          tipText(`Ganti: ${prefix}ai-tio model <nama-model>`);
        await m.reply(text);
        return { handled: true };
      }

      const found = TIO_MODELS.find(
        (mdl) => mdl.id === modelArg || mdl.label.toLowerCase() === modelArg.toLowerCase()
      );

      if (!found) {
        const text =
          alyaHeader("Model Tidak Ditemukan", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Model *${modelArg}* tidak ditemukan`,
            `◦ Ketik *${prefix}ai-tio model list* untuk lihat semua model`,
          ]) +
          "\n\n" +
          separator("━", 22) +
          "\n" +
          tipText(`Ketik ${prefix}ai-tio model list`);
        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.model = found.id;

      const text =
        alyaHeader("Model Diganti", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴘᴇʀᴜʙᴀʜᴀɴ", [
          `◦ Model: *${found.label}*`,
          `◦ ID: *${found.id}*`,
          `◦ Deskripsi: *${found.desc}*`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Seketik ${prefix}ai-tio <pertanyaan> untuk tes`);
      await m.reply(text);
      return { handled: true };
    }

    // Handle "list" subcommand
    if (prompt.toLowerCase() === "list") {
      const modelLines = TIO_MODELS.map((mdl, i) =>
        `  ${i + 1}. *${mdl.label}* (${mdl.id}) — ${mdl.desc}`
      ).join("\n");
      const text =
        alyaHeader("Tio AI Models", "🤖") +
        "\n\n" +
        bracketBox("📋", "ᴍᴏᴅᴇʟ", [modelLines]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ganti: ${prefix}ai-tio model <nama-model>`);
      await m.reply(text);
      return { handled: true };
    }

    // Call Tio AI
    const aiHelp = botConfig.aiHelp || {};
    const apiKey = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    const apiEndpoint = aiHelp.apiEndpoint || "https://ai.tioo.eu.org/v1/messages";
    const model = aiHelp.model || "claude-sonnet-4-20250514";
    const systemPrompt = aiHelp.systemPrompt || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    if (!apiKey) {
      const text =
        alyaHeader("API Key Belum Diisi", "⚠️") +
        "\n\n" +
        bracketBox("⚠️", "ᴇʀʀᴏʀ", [
          `◦ API Key Tio AI belum di-set`,
          `◦ Set di config.js bagian aiHelp.apiKey`,
          `◦ Atau ketik *${prefix}ai-set apiKey <key>*`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Set API key dulu sebelum menggunakan`);
      await m.reply(text);
      return { handled: true };
    }

    // Build conversation context from quoted message if available
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    const reply = await callAI({
      providerKey: "tio",
      model: model,
      messages: messages,
      systemPrompt: systemPrompt,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Format response
    const modelLabel = TIO_MODELS.find((mdl) => mdl.id === model)?.label || model;
    const replyText = reply.length > 3800 ? reply.slice(0, 3800) + "\n\n_... respon dipotong_" : reply;

    const text =
      alyaHeader("Tio AI", "🤖") +
      "\n\n" +
      bracketBox("🤖", "ʀᴇꜱᴘᴏɴ", [
        `◦ Model: *${modelLabel}*`,
        `◦ Pertanyaan: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "",
        replyText,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}ai-tio <pertanyaan> untuk tanya lagi`) +
      "\n" +
      tipText(`Ganti model: ${prefix}ai-tio model <nama>`);

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
