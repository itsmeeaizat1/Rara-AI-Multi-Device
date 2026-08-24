// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jokowi-ai",
  alias: ["jokowiai", "jokowi", "pakjokowi"],
  category: "ai",
  description: "Chat dengan Pak Jokowi — Pria Solo",
  usage: ".jokowi-ai <pertanyaan>",
  example: ".jokowi-ai Pak, gimana kabar?",
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
    return m.reply( `🏛️ *Pak Jokowi*\n\n` +
        `Pria Solo — Mantan Presiden RI\n> Sederhana, bijak, dan suka blusukan\n\n` +
        `*PENGGUNAAN:*\n` +
        `*${m.prefix}jokowi-ai <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `*${m.prefix}jokowi-ai Pak, gimana kabar?*`, "jokowi-ai");
  }

  await m.react("🕒");

  try {
    const result = await UnlimitedAI(text, "jokowi-ai");

    if (!result.status) {
      { const __navText = `❌ *Jokowi AI Error*\n\n> ${result.error || "Gagal mendapatkan respons"}`; return await m.reply(__navText); };
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("jokowi-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
