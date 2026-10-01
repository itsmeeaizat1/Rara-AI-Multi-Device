// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// workoutai — AI rencana workout personal
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "workoutai",
  alias: ["workoutai", "aiworkout", "fitnessai", "gymai"],
  category: "ai",
  description: "AI buatin rencana workout sesuai target dan level kamu",
  usage: ".workoutai <target> <level>",
  example: ".workoutai turun berat badan pemula\n.workoutai six pack menengah\n.workoutai badan besar advance",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(raraWrap("workoutai", `Mau workout plan untuk apa?\n\nContoh: ${m.prefix}workoutai turun berat badan pemula\n${m.prefix}workoutai six pack menengah\n${m.prefix}workoutai badan besar advance`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan rencana workout untuk: "${text}"

Format:
TARGET: [goal yang dicapai]
LEVEL: [pemula/menengah/lanjutan]
DURASI: [berapa minggu program]

JADWAL MINGGUAN:
Senin: [latihan + sets x reps]
Selasa: [latihan + sets x reps]
Rabu: [rest/cardio]
Kamis: [latihan + sets x reps]
Jumat: [latihan + sets x reps]
Sabtu: [latihan + sets x reps]
Minggu: [rest/recovery]

NUTRISI: [saran makronutrien & kalori]
TIPS: [3 tips penting untuk program ini]

Gunakan bahasa Indonesia. Sesuaikan dengan level yang disebutkan. Realistis dan aman.`;

    const result = await UnlimitedAI(prompt, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("workoutai", "AI-nya lagi rest day 💪", "error"));
    }

    await m.react("🐣");
    let msg = `\n`;
    msg += `💪 Target: *${text}*\n`;
    msg += `│\n`;
    msg += `${result.answer.trim().replace(/\n/g, "\n")}\n`;
    msg += `│\n`;
    msg += `⚠️ Konsultasi dokter sebelum mulai program intensif\n`;
    msg += ``;
    return m.reply(msg);
  } catch (err) {
    console.error("workoutai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("workoutai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
