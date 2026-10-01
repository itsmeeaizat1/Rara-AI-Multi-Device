// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Truth or Dare — Dare command

import fs from "fs";
import {raraBox, raraEmpty, raraError, raraGuide, raraNoInput} from "../../src/lib/rara-menu-style.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
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
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const dare = getRandomDare();
    if (!dare) {
      await m.reply(raraGameBox({ title: "dare", icon: "🎯", flavor: "🫠 *KOSONG!*", body: "Dare-nya lagi kosong nih, coba lagi yuk!" }));
      return;
    }

    const text = raraBox("Dare", [
      dare,
      "",
      "💡 Berani lakuin?",
      "📌 Ketik .truth buat ganti ke pertanyaan",
    ]);

    await m.reply(text);
    await m.react("🔥");
  } catch (e) {
    console.error("[dare] Error:", e.message);
    try {
      await m.reply(raraGameBox({ title: "dare", icon: "🎯", flavor: "😵 *ERROR!*", body: "Yah ada error nih, coba lagi bentar ya!" }));
    } catch {}
  }
}
