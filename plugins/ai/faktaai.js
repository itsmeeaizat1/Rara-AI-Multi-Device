// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// faktaai — AI generator fakta menarik
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "faktaai",
  alias: ["faktaai", "aifakta", "factai"],
  category: "ai",
  description: "AI kasih fakta menarik tentang topik apapun",
  usage: ".faktaai <topik>",
  example: ".faktaai luar angkasa\n.faktaai kucing\n.faktaai sejarah Indonesia",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("faktaai", `Mau tahu fakta tentang apa?\n\nContoh: ${m.prefix}faktaai luar angkasa\n${m.prefix}faktaai kucing\n${m.prefix}faktaai sejarah Indonesia`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Berikan 7 fakta menarik dan mind-blowing tentang: "${text}"

Format nomor 1-7. Tiap fakta 2-3 kalimat. Bahasa Indonesia. Pilih fakta yang kurang diketahui orang, bukan fakta pasaran. Pastikan akurat secara ilmiah/sejarah.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("faktaai", "AI-nya lagi baca buku ensiklopedia 📚", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ғᴀᴋᴛᴀ ᴍᴇɴᴀʀɪᴋ 」\n`;
    msg += `│ 📚 Topik: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("faktaai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("faktaai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
