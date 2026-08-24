// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nova-ai",
  alias: ["novaai", "nova", "tanyaai", "tanya"],
  category: "ai",
  description: "Chat dengan Nova AI — Asisten bot cerdas",
  usage: ".nova-ai <pertanyaan>",
  example: ".nova-ai Apa itu Node.js?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply( `🤖 *Nova AI*\n\n` +
        `Asisten cerdas siap membantu\n\n` +
        `*PENGGUNAAN:*\n` +
        `*${m.prefix}nova-ai <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `*${m.prefix}nova-ai Apa itu Node.js?*`, "nova-ai");
  }

  await m.react("🐣");

  try {
    const result = await UnlimitedAI(text, "nova-ai");

    if (!result.status) {
      return m.reply(claraWrap("Nova AI Error", `❌ *Nova AI Error*\n\n> ${result.error || "Gagal mendapatkan respons"}`));
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("nova-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
