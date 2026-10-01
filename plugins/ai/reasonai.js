// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// alasanai — AI generator alasan (excuse generator)
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "alasanai",
  alias: ["alasanai", "aialasan", "excuseai"],
  category: "ai",
  description: "AI bikin alasan kreatif buat apapun situasi",
  usage: ".alasanai <situasi yang butuh alasan>",
  example: ".alasanai telat masuk kerja\n.alasanai gak bales chat pacar\n.alasanai batal kumpul teman",
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
      return m.reply(raraWrap("alasanai", `Mau alasan untuk apa?\n\nContoh: ${m.prefix}alasanai telat masuk kerja\n${m.prefix}alasanai gak bales chat pacar\n${m.prefix}alasanai batal kumpul teman`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan 5 alasan kreatif untuk: "${text}"

Kategori:
1. Alasan formal (profesional, untuk atasan/bos)
2. Alasan santai (untuk teman)
3. Alasan dramatis (lebay tapi meyakinkan)
4. Alasan teknis (HP/error/internet)
5. Alasan jujur tapi halus

Tiap alasan 1-2 kalimat. Bahasa Indonesia. Buat yang masuk akal dan tidak terlalu absurd. Nomori 1-5.`;

    const result = await UnlimitedAI(prompt, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("alasanai", "AI-nya juga bingung cari alasan 😅", "error"));
    }

    await m.react("🐣");
    let msg = `Situasi: *${text}*\n\n${result.answer.trim()}\n\nPilih yang paling meyakinkan!`;
    return m.reply(msg);
  } catch (err) {
    console.error("alasanai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("alasanai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
