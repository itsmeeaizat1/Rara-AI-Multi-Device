// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "prabowo-ai",
  alias: ["prabowoi", "prabowo", "pakprabowo"],
  category: "ai",
  description: "Chat dengan Pak Prabowo — Pria Sawit",
  usage: ".prabowo-ai <pertanyaan>",
  example: ".prabowo-ai Saudara, kita harus berdaulat!",
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
    return sendReplyWithNav(sock, m, `🇮🇩 *Pak Prabowo*\n\n` +
        `> Pria Sawit — Presiden RI\n> Tegas, patriotik, dan karismatik\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}prabowo-ai <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `> *${m.prefix}prabowo-ai Saudara, kita harus berdaulat!*`, "prabowo-ai");
  }

  await m.react("🕐");

  try {
    const result = await UnlimitedAI(text, "prabowo-ai");

    if (!result.status) {
      { const __navText = `❌ *Prabowo AI Error*\n\n> ${result.error || "Gagal mendapatkan respons"}`; return await m.reply(__navText); };
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("prabowo-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
