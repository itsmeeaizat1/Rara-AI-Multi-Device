// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Truth or Dare — Truth command

import fs from "fs";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
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
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const truth = getRandomTruth();
    if (!truth) {
      await m.reply("╭─「 ✦ Truth ✦ 」\n│ ❌ Hmm, truth-nya lagi kosong nih 🫠\n│ Coba lagi yuk!\n╰────  •  ────");
      return;
    }

    const text = [
      "╭─「 ✦ Truth or Dare ✦ 」",
      "│",
      `│ *Mode:* TRUTH 🎭`,
      "│ ",
      "│ ```" + truth + "```",
      "│ ",
      "│ 💡 Jawab jujur ya!",
      "│ Atau ketik .dare buat ganti tantangan",
      "╰────  •  ────",
    ].join("\n");

    await m.reply(text);
    await m.react("🎭");
  } catch (e) {
    console.error("[truth] Error:", e.message);
    try {
      await m.reply("╭─「 ✦ Truth ✦ 」\n│ ❌ Yah, ada error nih 😵\n│ Coba lagi bentar ya\n╰────  •  ────");
    } catch {}
  }
}
