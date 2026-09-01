// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bomb.js — Game jinakkan bom (potong kabel yang benar)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

class BombGame {
  constructor() {
    this.colors = ["🔴 Merah", "🔵 Biru", "🟡 Kuning", "🟢 Hijau", "⚪ Putih"];
    this.bombKabel = "";
    this.cutCards = [];
    this.state = "playing";
    this.totalSafeNeeded = 4;
  }
  start() {
    this.bombKabel = this.colors[Math.floor(Math.random() * this.colors.length)];
    return this.colors;
  }
  cut(choice) {
    const chosenColor = this.colors[choice - 1];
    if (this.cutCards.includes(chosenColor)) throw new Error("Kabel ini sudah dipotong sebelumnya!");
    if (chosenColor === this.bombKabel) {
      this.state = "exploded";
      return { success: false, color: chosenColor };
    }
    this.cutCards.push(chosenColor);
    if (this.cutCards.length === this.totalSafeNeeded) this.state = "defused";
    return { success: true, color: chosenColor };
  }
}

const pluginConfig = {
  name: "bomb",
  alias: ["bomb", "jinakkan"],
  category: "game",
  description: "Game jinakkan bom — potong kabel yang benar!",
  usage: ".bomb start | .bomb potong <nomor>",
  example: ".bomb start\n.bomb potong 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 2, isEnabled: true,
};

const games = new Map();

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    if (!action || action === "start") {
      if (games.has(from)) {
        return m.reply(claraWrap("bomb", `Bomb masih aktif! Gunakan .bomb potong <nomor>`, "guide"));
      }
      const game = new BombGame();
      const colors = game.start();
      games.set(from, game);
      await m.react("🕒");
      let msg = `╭─「 *BOMB GAME* 」\n`;
      msg += `│ 🧨 Bom telah dipasang!\n`;
      msg += `│ Potong 4 kabel yang aman!\n`;
      msg += `│\n`;
      colors.forEach((c, i) => { msg += `│ ${i + 1}. ${c}\n`; });
      msg += `│\n`;
      msg += `│ Cara main: .bomb potong <nomor>\n`;
      msg += `╰──────────`;
      await m.reply(msg);
      await m.react("🐣");
      return;
    }

    if (action === "potong" || action === "cut") {
      const game = games.get(from);
      if (!game) return m.reply(claraWrap("bomb", "Belum ada bom aktif! Ketik .bomb start", "guide"));
      const choice = parseInt(args[1]);
      if (isNaN(choice) || choice < 1 || choice > 5) return m.reply(claraWrap("bomb", "Pilih nomor 1-5!", "guide"));

      await m.react("🕒");
      const result = game.cut(choice);
      if (!result.success) {
        games.delete(from);
        await m.react("💥");
        let msg = `╭─「 *BOMB EXPLODED* 」\n`;
        msg += `│ 💥 BOOM!\n`;
        msg += `│ Kamu memotong kabel ${result.color}\n`;
        msg += `│ Itu kabel bom! Kamu kalah!\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }
      if (game.state === "defused") {
        games.delete(from);
        await m.react("🐣");
        let msg = `╭─「 *BOMB DIFFUSED* 」\n`;
        msg += `│ ✅ Berhasil jinakkan bom!\n`;
        msg += `│ Kabel aman: ${game.cutCards.join(", ")}\n`;
        msg += `│ 🎉 Selamat! Kamu menang!\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }
      let msg = `╭─「 *BOMB SAFE* 」\n`;
      msg += `│ ✅ Kabel ${result.color} aman!\n`;
      msg += `│ Sudah dipotong: ${game.cutCards.length}/${game.totalSafeNeeded}\n`;
      msg += `│ Sisa kabel:\n`;
      game.colors.forEach((c, i) => {
        if (!game.cutCards.includes(c)) msg += `│   ${i + 1}. ${c}\n`;
      });
      msg += `╰──────────`;
      await m.reply(msg);
      await m.react("🐣");
    }
  } catch (err) {
    console.error("bomb error:", err);
    await m.react("❌");
    return m.reply(claraWrap("bomb", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
