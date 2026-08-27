// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Truth or Dare — Dare command

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRandomDare() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../src/data/dare.json"), "utf8")
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch {
    return null;
  }
}

export const config = {
  name: "dare",
  alias: ["dare"],
  category: "game",
  description: "Truth or Dare — tantangan berani",
  usage: ".dare",
  example: ".dare",
  isOwner: false,
  isPremium: true,
  isRegister: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const dare = getRandomDare();
    if (!dare) {
      await m.reply("❌ *Data dare tidak tersedia!*");
      return;
    }

    let text = `╭──「 *TRUTH OR DARE* 」\n\n」`;
    text += `│ 🔥 Mode: *DARE*\n\n`;
    text += `\`\`\`${dare}\`\`\`\n\n`;
    text += `_Berani lakuin? Atau ketik .truth buat ganti ke pertanyaan_\n`;
    text += `╰──────────❀`;

    await m.reply(text);
    await m.react("🔥");
  } catch (e) {
    console.error("[dare] Error:", e.message);
    try {
      await m.react("❌");
      await m.reply("❌ *Terjadi error saat mengambil tantangan dare!*");
    } catch {}
  }
}
