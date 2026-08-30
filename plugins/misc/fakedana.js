// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fakedana.js — Fake DANA transfer receipt
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fakedana",
  alias: ["fakedana", "danafake"],
  category: "misc",
  description: "Buat struk transfer DANA palsu (untuk prank)",
  usage: ".fakedana <nominal>",
  example: ".fakedana 50000",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const amount = parseInt(m.args?.[0]) || Math.floor(Math.random() * 1000000) + 10000;
    const ref = Math.random().toString(36).substring(2, 15).toUpperCase();
    const date = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const name = m.pushName || "User";

    let msg = `╭──「 *DANA TRANSFER* 」\n`;
    msg += `│\n`;
    msg += `│  💰 Transfer Berhasil\n`;
    msg += `│  ─────────────────\n`;
    msg += `│  Tujuan: ${name}\n`;
    msg += `│  Jumlah: Rp ${amount.toLocaleString("id-ID")}\n`;
    msg += `│  Berita: Transfer\n`;
    msg += `│  Ref: ${ref}\n`;
    msg += `│  Waktu: ${date}\n`;
    msg += `│  ─────────────────\n`;
    msg += `│  Saldo: Rp ${(Math.floor(Math.random() * 9000000) + 1000000).toLocaleString("id-ID")}\n`;
    msg += `│\n`;
    msg += `│  ⚠️ INI HANYA PRANK\n`;
    msg += `│  Bukan struk asli dari DANA\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("fakedana error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fakedana", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
