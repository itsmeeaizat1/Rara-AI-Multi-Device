// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fakedana.js — Fake DANA transfer receipt
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

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

    let _lines = [];
      _lines.push(`💰 Transfer Berhasil`);
      _lines.push(`─────────────────`);
      _lines.push(`Tujuan: ${name}`);
      _lines.push(`Jumlah: Rp ${amount.toLocaleString("id-ID")}`);
      _lines.push(`Berita: Transfer`);
      _lines.push(`Ref: ${ref}`);
      _lines.push(`Waktu: ${date}`);
      _lines.push(`─────────────────`);
      _lines.push(`Saldo: Rp ${(Math.floor(Math.random() * 9000000) + 1000000).toLocaleString("id-ID")}`);
      _lines.push(`⚠️ INI HANYA PRANK`);
      _lines.push(`Bukan struk asli dari DANA`);
    let msg = novaBox("DANA TRANSFER", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("fakedana error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fakedana", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
