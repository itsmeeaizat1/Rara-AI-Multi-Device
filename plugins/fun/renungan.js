// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Random renungan images

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let fetchBuffer;
try {
  fetchBuffer = (await import("../../src/lib/nova-utils.js")).fetchBuffer;
} catch {}

function getRandomRenungan() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../src/data/renungan.json"), "utf8")
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch {
    return null;
  }
}

export const config = {
  name: "renungan",
  alias: ["renungan", "quotesrenungan"],
  category: "fun",
  description: "Random gambar renungan",
  usage: ".renungan",
  example: ".renungan",
  isOwner: false,
  isPremium: false,
  isRegister: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const imgUrl = getRandomRenungan();
    if (!imgUrl) {
      await m.reply("❌ *Data renungan tidak tersedia!*");
      return;
    }

    if (!fetchBuffer) {
      await m.reply(`╭──「 *RENUNGAN*\n\n${imgUrl}\n\n╰──────────❀`);
      return;
    }

    let buffer;
    try {
      buffer = await fetchBuffer(imgUrl);
    } catch {
      await m.reply(`╭──「 *RENUNGAN*\n\n${imgUrl}\n\n╰──────────❀`);
      return;
    }

    let caption = `╭──「 *RENUNGAN*\n\n」`;
    caption += `_Semoga renungan hari ini bermanfaat_\n\n`;
    caption += `╰──────────❀`;

    await sock.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
    await m.react("🤲");
  } catch (e) {
    console.error("[renungan] Error:", e.message);
    try {
      await m.react("❌");
      await m.reply("❌ *Terjadi error!*");
    } catch {}
  }
}
