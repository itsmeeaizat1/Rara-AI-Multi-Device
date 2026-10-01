// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "ai-translate",
  alias: ["ai-translate"],
  category: "ai",
  description: "Terjemahkan teks dengan AI",
  usage: ".ai-translate <teks> | .ai-translate <bahasa> <teks>",
  example: ".ai-translate English I love programming",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  let aiStatus = null;
  try {
    const raw = m.text?.trim() || "";
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const lang = parts[0] && !parts[0].startsWith(".") ? parts[0] : "English";
    const text = parts.slice(1).join(" ") || raw.replace(/^\.ai-translate\s+/i, "").trim();

    if (!text) {
      const out =
        raraCaption({
  emoji: "🤖",
  name: "ai-translate",
  description: "Terjemahkan teks dengan AI",
  usage: `${prefix}ai-translate <teks> | .ai-translate <bahasa> <teks>`,
  example: `${prefix}ai-translate English I love programming`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(out);
      return { handled: true };
    }

    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → hasil edit-in-place
    aiStatus = await startAiStatus(sock, m);
    const prompt = `Terjemahkan teks berikut ke ${lang}. Hanya kirim hasil terjemahan tanpa penjelasan tambahan.\n\n${text.slice(0, 4000)}`;
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [{ role: "user", content: prompt }],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const out =
      raraWrap("AI Translate", [`Bahasa: *${lang}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-translate <teks> untuk terjemahkan lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AITranslate", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI Translate gagal — coba lagi ya");
    else { await m.react("❌"); await m.reply(text); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
