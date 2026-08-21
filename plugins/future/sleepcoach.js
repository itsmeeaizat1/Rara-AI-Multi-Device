// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sleepcoach", alias: ["sleepcoach", "sleeptips", "tidurcoach"], category: "future",
  description: "AI analisis pola tidur dari chat", usage: ".sleepcoach",
  example: ".sleepcoach", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 30, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const hour = new Date().getHours();
    let status, advice;
    if (hour >= 0 && hour < 5) { status = "🦉 Begadang"; advice = "Kamu chat di jam 00:00-05:00. Coba tidur lebih awal ya!"; }
    else if (hour >= 5 && hour < 9) { status = "🌅 Pagi"; advice = "Sudah bangun pagi, mantap! Jangan lupa sarapan."; }
    else if (hour >= 9 && hour < 17) { status = "☀️ Aktif"; advice = "Jam aktif normal. Tetap produktif!"; }
    else if (hour >= 17 && hour < 22) { status = "🌇 Sore"; advice = "Saatnya winding down. Kurangi screen time."; }
    else { status = "🌙 Malam"; advice = "Sudah jam tidur. Idealnya tidur sebelum 23:00."; }
    { const __navText = (claraWrap("Sleep Coach", [`  ┊  ➶ Jam sekarang: *${hour}:00*`, `  ┊  ➶ Status: *${status}*`,
      `  ┊  ➶ Saran: ${advice}`].join("\n"))); await m.reply(__navText); };
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };