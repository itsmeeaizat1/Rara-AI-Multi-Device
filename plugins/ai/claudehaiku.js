// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "claudehaiku",
  alias: ["claudehaiku"],
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
    return m.reply(claraWrap("claudehaiku", [
      "Tanya apa aja ke AI Claude Haiku — cepat dan ringan, cocok buat pertanyaan sehari-hari.",
      "",
      "📌 Format:",
      `${m.prefix}claudehaiku <pertanyaan>`,
      "",
      "💡 Contoh:",
      `${m.prefix}claudehaiku Jelaskan teori relativitas`,
      "",
      `${m.prefix}claudehaiku Tips biar produktif`,
      "",
      "Respons cepat, tapi tetap cerdas",
    ]));
  }
  try {
  await m.react("🕒");
    const result = await ClaudeHaiku(text);

    if (!result.status) {
      return m.reply(claraWrap("Claude Haiku Gagal", `${result.error || "Gagal dapet respons nih"}`));
    }
    const reply = `${result.answer}`;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("claudehaiku", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
