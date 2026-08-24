// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "claudehaiku",
  alias: ["claude", "haiku", "chiku"],
  category: "ai",
  description: "Chat dengan Claude Haiku 4.5 via OverChat",
  usage: ".claudehaiku <pertanyaan>",
  example: ".claudehaiku Jelaskan teori relativitas",
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
    return m.reply( `🤍 *Claude Haiku 4.5*\n\n` +
        `Tanya apa aja ke AI Claude Haiku — cepat dan ringan, cocok buat pertanyaan sehari-hari.\n\n` +
        `*PENGGUNAAN:*\n` +
        `*${m.prefix}claudehaiku <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `*${m.prefix}claudehaiku Jelaskan teori relativitas*\n` +
        `*${m.prefix}claudehaiku Tips biar produktif*\n\n` +
        `_Respons cepat, tapi tetap cerdas_`, "claudehaiku");
  }

  await m.react("🕒");

  try {
    const result = await ClaudeHaiku(text);

    if (!result.status) {
      return m.reply(claraWrap("Claude Haiku Gagal", `❌ *Claude Haiku Gagal*\n\n> ${result.error || "Gagal mendapatkan respons"}`));
    }

    await m.react("🐣");

    const reply = `${result.answer}`;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("claudehaiku", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
