// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .htmlpong — game Pong HTML self-contained (kategori HTML, port altftool "Paddle Ball Arcade")
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "htmlpong", alias: ["pongnya"], category: "html",
  description: "Game Pong HTML — main langsung di browser HP",
  usage: ".htmlpong", example: ".htmlpong",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../../src/htmlgames/pong.html");

async function handler(m, { sock, config }) {
  try {
    await m.react("🕒");
    const html = fs.readFileSync(file);
    await sock.sendMessage(m.chat, {
      document: html,
      mimetype: "text/html",
      fileName: "rara-pong.html",
      caption: raraWrap("HTML Game — Pong", [
        "🏓 GAME PONG SIAP MAIN",
        "",
        "1. Buka lampiran rara-pong.html",
        "2. Pilih buka di browser (Chrome/Safari)",
        "3. Main! Geser jari untuk gerakkan paddle",
        "",
        "Lawan AI sampai 7 poin · jalan offline tanpa internet",
      ].join("\n")),
    }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("HTML Game — Pong", ["ERROR: gagal menyiapkan game — " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
