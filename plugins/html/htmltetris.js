// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .htmltetris — game Tetris HTML self-contained (kategori HTML, port altftool "Tetris Clone")
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "htmltetris", alias: ["tetrisnya"], category: "html",
  description: "Game Tetris HTML — main langsung di browser HP",
  usage: ".htmltetris", example: ".htmltetris",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../../src/htmlgames/tetris.html");

async function handler(m, { sock, config }) {
  try {
    await m.react("🕒");
    const html = fs.readFileSync(file);
    await sock.sendMessage(m.chat, {
      document: html,
      mimetype: "text/html",
      fileName: "rara-tetris.html",
      caption: raraWrap("HTML Game — Tetris", [
        "🧱 GAME TETRIS SIAP MAIN",
        "",
        "1. Buka lampiran rara-tetris.html",
        "2. Pilih buka di browser (Chrome/Safari)",
        "3. Main! Tombol ◀ ▶ ⟳ ⤓ di layar",
        "",
        "Bersihkan baris buat skor · rekor tersimpan di browser · jalan offline",
      ].join("\n")),
    }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("HTML Game — Tetris", ["ERROR: gagal menyiapkan game — " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
