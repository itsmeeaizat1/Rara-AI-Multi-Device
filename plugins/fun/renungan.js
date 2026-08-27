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
      await m.reply("╭──「 🤲 Renungan 」\n├── ❌ Data tidak tersedia\n├── Coba lagi nanti ya\n╰──────────❀");
      return;
    }

    const caption = [
      "╭──「 🤲 *Renungan Harian* 」",
      "│",
      "├── 💡 Semoga renungan hari ini bermanfaat",
      "├── 🤲 Semoga kita selalu dalam lindungan-Nya",
      "╰──────────❀",
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
      await m.react("❌");
      await m.reply("╭──「 🤲 Renungan 」\n├── ❌ Terjadi error\n├── Coba lagi nanti ya\n╰──────────❀");
    } catch {}
  }
}
