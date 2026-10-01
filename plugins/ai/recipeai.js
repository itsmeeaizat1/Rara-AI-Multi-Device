// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// AI Recipe — AI generates recipes based on available ingredients

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "recipeai",
  alias: ["recipeai", "airesep", "resepai", "masakai"],
  category: "ai",
  description: "AI kasih resep masakan dari bahan yang kamu punya",
  usage: ".recipeai <bahan yang ada>",
  example: ".recipeai telur, bawang, nasi",
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
      return m.reply(raraWrap("recipeai", `Kasih tau bahan yang kamu punya!\n\nContoh: ${m.prefix}recipeai telur, bawang, nasi\n${m.prefix}recipeai ayam, kecap, bawang putih`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Saya punya bahan berikut: ${text}. Tolong buatkan resep masakan yang bisa dibuat dari bahan tersebut (atau bahan tambahan yang mudah didapat). Format jawaban WAJIB:

NAMA: [nama masakan]
WAKTU: [estimasi waktu masak]
BAHAN:
- [bahan1]
- [bahan2]
LANGKAH:
1. [langkah pertama]
2. [langkah kedua]
3. [dst]
TIPS: [tips tambahan]

Gunakan bahasa Indonesia. Resep harus praktis dan bisa dibuat di rumah.`;

    const result = await UnlimitedAI(prompt, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("recipeai", "AI-nya lagi di dapur yang lain 😅", "error"));
    }

    // Format the response
    const lines = result.answer.trim().split("\n");
    let formatted = "";
    let inSection = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("NAMA:")) {
        formatted += `🍳 *${t.replace("NAMA:", "").trim()}*

`;
      } else if (t.startsWith("WAKTU:")) {
        formatted += `⏰ ${t.replace("WAKTU:", "").trim()}

`;
      } else if (t.startsWith("BAHAN:")) {
        inSection = "bahan";
        formatted += `📋 *bahan:*\n`;
      } else if (t.startsWith("LANGKAH:")) {
        inSection = "langkah";
        formatted += `📝 *cara memasak:*\n`;
      } else if (t.startsWith("TIPS:")) {
        inSection = "";
        formatted += `💡 *tips:* ${t.replace("TIPS:", "").trim()}\n`;
      } else if (t.match(/^\d+\./) || t.startsWith("-")) {
        formatted += `${t}\n`;
      } else {
        formatted += `${t}\n`;
      }
    }

    if (!formatted) {
      formatted = `${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = "";
    msg += `🥘 Bahan: *${text}*\n`;
    msg += `
`;
    msg += formatted;
        return m.reply(msg);
  } catch (err) {
    console.error("recipeai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("recipeai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
