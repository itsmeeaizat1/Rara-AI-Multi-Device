// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .htmldino — game Dino Run HTML self-contained (kategori HTML, port altftool "Dino Run Game")
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "htmldino", alias: ["dinonya"], category: "html",
  description: "Game Dino Run HTML — main langsung di browser HP",
  usage: ".htmldino", example: ".htmldino",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../../src/htmlgames/dino.html");

async function handler(m, { sock, config }) {
  try {
    await m.react("🕒");
    const html = fs.readFileSync(file);
    await sock.sendMessage(m.chat, {
      document: html,
      mimetype: "text/html",
      fileName: "nova-dino.html",
      caption: claraWrap("HTML Game — Dino Run", [
        "🦖 GAME DINO RUN SIAP MAIN",
        "",
        "1. Buka lampiran nova-dino.html",
        "2. Pilih buka di browser (Chrome/Safari)",
        "3. Main! Ketuk layar untuk lompat",
        "",
        "Makin lama makin cepat · rekor tersimpan di browser · jalan offline",
      ].join("\n")),
    }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("HTML Game — Dino Run", ["ERROR: gagal menyiapkan game — " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
