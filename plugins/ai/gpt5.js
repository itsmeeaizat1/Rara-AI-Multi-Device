// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { GPT5 } from "../../src/scraper/gpt5.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gpt5",
  alias: ["gpt5nano", "gpt41"],
  category: "ai",
  description: "Chat dengan GPT-4.1 Nano via OverChat",
  usage: ".gpt5 <pertanyaan>",
  example: ".gpt5 Apa itu quantum computing?",
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
    return m.reply( `🤖 *GPT-4.1 Nano*\n\n` +
        `Tanya apa aja ke AI, nanti dijawab pakai model GPT-4.1 Nano.\n\n` +
        `*PENGGUNAAN:*\n` +
        `*${m.prefix}gpt5 <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `*${m.prefix}gpt5 Apa itu quantum computing?*\n` +
        `*${m.prefix}gpt5 Buat puisi tentang Indonesia*\n\n` +
        `_Jawaban bisa agak lama, sabar ya_`, "gpt5");
  }

  await m.react("🕒");

  try {
    const result = await GPT5(text);

    if (!result.status) {
      return m.reply(claraWrap("GPT-5 Gagal", `❌ *GPT-5 Gagal*\n\n> ${result.error || "Gagal mendapatkan respons"}`));
    }

    await m.react("🐣");

    const reply = `${result.answer}`;

    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("gpt5", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
