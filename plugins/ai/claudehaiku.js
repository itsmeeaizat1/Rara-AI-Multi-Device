// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";

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
    return m.reply(raraGuideV2("claudehaiku", {
 kaomoji: "(⌒‿⌒)",
 sapaan: "tanya apa aja ke Claude Haiku — cepat, ringan, cocok buat tanyaan harian! (ᵔ◡ᵔ)",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}claudehaiku Jelaskan teori relativitas`,
      note: "respons cepat tapi tetap cerdas",
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await ClaudeHaiku(text);

    if (!result.status) {
      return m.reply(raraWrap("Claude Haiku Gagal", `${result.error || "Gagal dapet respons nih"}`));
    }
    const reply = `${result.answer}`;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(raraWrap("claudehaiku", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
