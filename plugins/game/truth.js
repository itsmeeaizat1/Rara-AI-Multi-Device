// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Truth or Dare — Truth command

import fs from "fs";
import { raraBox, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRandomTruth() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../src/data/truth.json"), "utf8")
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch {
    return null;
  }
}

export const config = {
  name: "truth",
  alias: ["truth"],
  category: "game",
  description: "Truth or Dare — pertanyaan jujur",
  usage: ".truth",
  example: ".truth",
  isOwner: false,
  isPremium: true,
  isRegister: true,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const truth = getRandomTruth();
    if (!truth) {
      await m.reply(raraGameBox({ title: "truth", icon: "🎤", flavor: "🫠 *KOSONG!*", body: "Truth-nya lagi kosong nih, coba lagi yuk!" }));
      return;
    }

    const text = raraBox("Truth", [
      truth,
      "",
      "💡 Jawab jujur ya!",
      "📌 Ketik .dare buat ganti tantangan",
    ]);

    await m.reply(text);
    await m.react("🎭");
  } catch (e) {
    console.error("[truth] Error:", e.message);
    try {
      await m.reply(raraGameBox({ title: "truth", icon: "🎤", flavor: "😵 *ERROR!*", body: "Yah ada error nih, coba lagi bentar ya!" }));
    } catch {}
  }
}
