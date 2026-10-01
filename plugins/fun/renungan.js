// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Random renungan images

import fs from "fs";
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let fetchBuffer;
try {
  fetchBuffer = (await import("../../src/lib/rara-utils.js")).fetchBuffer;
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
  alias: ["renungan"],
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
      await m.reply("❌ Data renungan lagi kosong nih, coba lagi nanti ya 🫠");
      return;
    }

    const caption = [
      "💡 Semoga renungan hari ini bermanfaat",
      "🤲 Semoga kita selalu dalam lindungan-Nya",
    ].join("\n");

    if (!fetchBuffer) {
      await sock.sendMessage(m.chat, {
        image: { url: imgUrl },
        caption,
      }, { quoted: m });
      await m.react("🤲");
      return;
    }

    let buffer;
    try {
      buffer = await fetchBuffer(imgUrl);
      await sock.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
    } catch {
      await sock.sendMessage(m.chat, {
        image: { url: imgUrl },
        caption,
      }, { quoted: m });
    }
    await m.react("🤲");
  } catch (e) {
    console.error("[renungan] Error:", e.message);
    try {
      await m.reply("❌ Yah, ada error nih 😵\nCoba lagi beberapa detik ya");
    } catch {}
  }
}
