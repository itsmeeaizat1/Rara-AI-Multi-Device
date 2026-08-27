// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Random bucin quotes

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRandomBucin() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../src/data/bucin.json"), "utf8")
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch {
    return null;
  }
}

export const config = {
  name: "bucin",
  alias: ["bucin"],
  category: "fun",
  description: "Random quotes bucin",
  usage: ".bucin",
  example: ".bucin",
  isOwner: false,
  isPremium: false,
  isRegister: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

export async function handler(m, { sock }) {
  try {
    const quote = getRandomBucin();
    if (!quote) {
      await m.reply("╭──「 💕 Bucin 」\n├── ❌ Data tidak tersedia\n├── Coba lagi nanti ya\n╰──────────❀");
      return;
    }

    const text = [
      "╭──「 💕 *Quotes Bucin* 」",
      "│",
      "│ ```" + quote + "```",
      "│",
      "├── 💕 Semoga harimu makin manis",
      "╰──────────❀",
    ].join("\n");

    await m.reply(text);
    await m.react("💕");
  } catch (e) {
    console.error("[bucin] Error:", e.message);
    try {
      await m.react("❌");
      await m.reply("╭──「 💕 Bucin 」\n├── ❌ Terjadi error\n├── Coba lagi nanti ya\n╰──────────❀");
    } catch {}
  }
}
