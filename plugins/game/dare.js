// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Truth or Dare — Dare command

import fs from "fs";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
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
  category: "rpg",
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
      await m.reply("╭─「 Dare 」\n│ ❌ Hmm, dare-nya lagi kosong nih 🫠\n│ Coba lagi yuk!\n╰──────────");
      return;
    }

    const text = [
      "╭─「 Truth or Dare 」",
      "│",
      "│ *Mode:* DARE 🔥",
      "│ ",
      "│ ```" + dare + "```",
      "│ ",
      "│ 💡 Berani lakuin?",
      "│ Atau ketik .truth buat ganti ke pertanyaan",
      "╰──────────",
    ].join("\n");

    await m.reply(text);
    await m.react("🔥");
  } catch (e) {
    console.error("[dare] Error:", e.message);
    try {
      await m.reply("╭─「 Dare 」\n│ ❌ Yah, ada error nih 😵\n│ Coba lagi bentar ya\n╰──────────");
    } catch {}
  }
}
