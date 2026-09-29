// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-review",
  alias: ["ai-review"],
  category: "ai",
  description: "Review code dengan AI",
  usage: ".ai-review <code> | reply code",
  example: ".ai-review function add(a,b){return a+b}",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  let aiStatus = null;
  try {
    const raw = m.text?.trim() || "";
    const code = m.quoted?.text ? m.quoted.text : raw.replace(/^\.ai-review\s+/i, "").trim();

    if (!code) {
      const out =
        novaCaption({
  emoji: "🤖",
  name: "ai-review",
  description: "Review code dengan AI",
  usage: `${prefix}ai-review <code> | reply code`,
  example: `${prefix}ai-review function add(a,b){return a+b}`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(out);
      return { handled: true };
    }

    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → hasil edit-in-place
    aiStatus = await startAiStatus(sock, m);
    const prompt = `Review code berikut dalam bahasa Indonesia:\n- Sebutkan potensi bug\n- Berikan sphinx perbaikan\n- Berikan versi yang lebih bersih jika bisa\n\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``;
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [{ role: "user", content: prompt }],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const out =
      claraWrap("AI Review", [`Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-review <code> untuk review lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIReview", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI Review gagal — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-review"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
