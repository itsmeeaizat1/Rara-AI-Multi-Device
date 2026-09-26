// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .htmlsnake — game Snake HTML self-contained (kategori HTML, port altftool "Snake Game")
// Chat WA gak bisa render HTML → dikirim sebagai DOKUMEN .html, user tap → main di browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "htmlsnake", alias: ["snakenya"], category: "html",
  description: "Game Snake HTML — main langsung di browser HP",
  usage: ".htmlsnake", example: ".htmlsnake",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../../src/htmlgames/snake.html");

async function handler(m, { sock, config }) {
  try {
    await m.react("🕒");
    const html = fs.readFileSync(file);
    await sock.sendMessage(m.chat, {
      document: html,
      mimetype: "text/html",
      fileName: "nova-snake.html",
      caption: claraWrap("HTML Game — Snake", [
        "🐍 GAME SNAKE SIAP MAIN",
        "",
        "1. Buka lampiran nova-snake.html",
        "2. Pilih buka di browser (Chrome/Safari)",
        "3. Main! Geser layar atau tombol panah",
        "",
        "Rekor tersimpan di browser · file ini aman, jalan offline tanpa internet",
      ].join("\n")),
    }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("HTML Game — Snake", ["ERROR: gagal menyiapkan game — " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
