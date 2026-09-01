// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hashtagai — AI generator hashtag Instagram/TikTok
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "hashtagai",
  alias: ["hashtagai", "aihashtag", "tagai"],
  category: "ai",
  description: "AI buat hashtag viral untuk Instagram/TikTok",
  usage: ".hashtagai <topik postingan>",
  example: ".hashtagai foto pantai sunset\n.hashtagai review makanan street food",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("hashtagai", `Mau hashtag untuk postingan apa?\n\nContoh: ${m.prefix}hashtagai foto pantai sunset\n${m.prefix}hashtagai review makanan street food`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan 30 hashtag untuk postingan tentang: "${text}"

Format:
- 10 hashtag populer (jutaan post)
- 10 hashtag medium (ribu-ratus ribu post)
- 10 hashtag niche/spesifik ( targeted audience)

Pisahkan dengan koma, langsung copy-paste ready. Hashtag dalam bahasa Indonesia dan Inggris. Jangan pakai penjelasan, langsung hashtag saja.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("hashtagai", "AI-nya lagi break #️⃣", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ʜᴀsʜᴛᴀɢ ɢᴇɴᴇʀᴀᴛᴏʀ ✦ 」\n`;
    msg += `│ #️⃣ Topik: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `│\n`;
    msg += `│ 💡 Copy langsung paste ke caption\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("hashtagai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("hashtagai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
