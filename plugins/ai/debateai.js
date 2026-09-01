// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Debate — Two AI characters debate a topic

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "debateai",
  alias: ["debateai", "aidebate", "debat"],
  category: "ai",
  description: "Dua karakter AI berdebat tentang topik yang kamu pilih",
  usage: ".debateai <topik>",
  example: ".debateai nasi goreng vs mie goreng",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const DEBATERS = [
  { char: "jokowi-ai", name: "Pak Jokowi", emoji: "👴" },
  { char: "prabowo-ai", name: "Pak Prabowo", emoji: "🪖" },
];

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("debateai", `Topik apa yang mau diperdebatkan?\n\nContoh: ${m.prefix}debateai nasi goreng vs mie goreng`, "guide"));
    }

    await m.react("🕒");

    // Pro side (Jokowi)
    const proPrompt = `Kamu akan berdebat tentang topik: "${text}". Kamu MENDUKUNG/menyetujui topik tersebut. Buat argumen pendukung yang kuat dalam 3-4 kalimat. Gunakan gaya bicara yang khas: sederhana, bijak, pakai analogi sehari-hari, kadang bahasa Jawa halus seperti "Nggih", "Monggo". Langsung tulis argumen tanpa pembuka.`;
    
    // Con side (Prabowo)
    const conPrompt = `Kamu akan berdebat tentang topik: "${text}". Kamu MENENTANG/menolak topik tersebut. Buat argumen penentang yang kuat dalam 3-4 kalimat. Gunakan gaya bicara yang tegas, patriotik, penuh semangat, pakai kata "Saudara-saudara!" dan "Kita harus berdaulat!". Langsung tulis argumen tanpa pembuka.`;

    const [proResult, conResult] = await Promise.all([
      UnlimitedAI(proPrompt, "jokowi-ai"),
      UnlimitedAI(conPrompt, "prabowo-ai"),
    ]);

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴅᴇʙᴀᴛ ᴀɪ ✦ 」\n`;
    msg += `│ 📌 Topik: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${DEBATERS[0].emoji} *${DEBATERS[0].name} (PRO):*\n`;
    msg += `│ ${proResult.answer?.trim() || "Gagal merespon"}\n`;
    msg += `│\n`;
    msg += `│ ${DEBATERS[1].emoji} *${DEBATERS[1].name} (KONTRA):*\n`;
    msg += `│ ${conResult.answer?.trim() || "Gagal merespon"}\n`;
    msg += `│\n`;
    msg += `│ 💡 Siapa yang menurutmu menang? 😄\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("debateai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("debateai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
