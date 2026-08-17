// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kobo-ai",
  alias: ["koboai", "kobo"],
  category: "ai",
  description: "Chat dengan Kobo Kanaeru — VTuber Hololive ID",
  usage: ".kobo-ai <pertanyaan>",
  example: ".kobo-ai Kobo lagi apa?",
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
    return sendReplyWithNav(sock, m, `🌬️ *Kobo Kanaeru*\n\n` +
        `VTuber Hololive Indonesia Gen 3\n> Wind Shaman yang cheerfull dan suka prank!\n\n` +
        `*PENGGUNAAN:*\n` +
        `*${m.prefix}kobo-ai <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `*${m.prefix}kobo-ai Kobo lagi apa?*`, "kobo-ai");
  }

  await m.react("🕐");

  try {
    const result = await UnlimitedAI(text, "kobo-ai");

    if (!result.status) {
      { const __navText = `❌ *Kobo AI Error*\n\n> ${result.error || "Gagal mendapatkan respons"}`; return await m.reply(__navText); };
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("kobo-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
