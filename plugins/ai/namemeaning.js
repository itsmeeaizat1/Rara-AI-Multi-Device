// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// artinama — AI arti nama dengan analisis kepribadian
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "artinama",
  alias: ["artinama", "aiartinama", "namaai"],
  category: "ai",
  description: "AI menebak arti nama dan kepribadian dari nama",
  usage: ".artinama <nama>",
  example: ".artinama Aizat\n.artinama Putri Maharani",
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
      return m.reply(claraWrap("artinama", `Mau cari tahu arti nama siapa?\n\nContoh: ${m.prefix}artinama Aizat\n${m.prefix}artinama Putri Maharani`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Analisis nama "${text}" dengan format:

ARTI NAMA: [arti dari nama, asal bahasa jika diketahui]
KARAKTER: [3 sifat positif yang melekat pada nama ini]
KEPRIBADIAN: [deskripsi kepribadian orang dengan nama ini]
KEBERUNTUNGAN: [aspek keberuntungan dari nama]
KESAN: [kesan pertama orang melihat nama ini]

Gunakan bahasa Indonesia. Jika nama tidak dikenal, buat analisis berdasarkan bunyi dan struktur nama.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("artinama", "AI-nya bingung sama nama itu 😅", "error"));
    }

    await m.react("🐣");
    let msg = `Nama: *${text}*\n\n${result.answer.trim()}\n\n⚠️ Hanya untuk hiburan, bukan ramalan pasti`;
    return m.reply(msg);
  } catch (err) {
    console.error("artinama error:", err);
    await m.react("❌");
    return m.reply(claraWrap("artinama", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
