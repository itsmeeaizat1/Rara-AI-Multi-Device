// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Random bucin quotes

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaEmpty, novaError } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";

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
  category: "couple",
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
      await m.reply(novaEmpty("Bucin", "Data quotes bucin tidak tersedia, coba lagi nanti ya"));
      return;
    }

    await m.reply(novaGameBox({
      title: "quotes bucin", icon: "💕",
      flavor: "💕 *QUOTES BUCIN BUAT KAMU!*",
      body: [
        `│ • "${quote}"`,
      ].join("\n"),
      cta: gameCTA("bucin"),
    }));
    await m.react("💕");
  } catch (e) {
    console.error("[bucin] Error:", e.message);
    try {
      await m.reply(novaError("Bucin", "Gagal mengambil quotes bucin, coba lagi nanti"));
    } catch {}
  }
}
