// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// write2.js — Nulis v2 (nexray maker API, tulis tangan)
import axios from "axios";
import { nexrayNulis } from "../../src/scraper/nexray-maker.js";
import { claraWrap, novaBerhasil } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nulis2",
  alias: ["nulis2", "nulisv2", "tulis2"],
  category: "maker",
  description: "Generate gambar tulisan tangan v2 (nexray maker)",
  usage: ".nulis2 <teks>",
  example: ".nulis2 Halo dunia, aku sedang belajar",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("nulis2", `Mau nulis apa?\n\n💡 Contoh: ${m.prefix}nulis2 Halo dunia`, "guide"));
    }
    if (text.length > 300) {
      return m.reply(claraWrap("nulis2", "Teks terlalu panjang! Maksimal 300 karakter.", "error"));
    }

    await m.react("🕒");
    const result = await nexrayNulis(text);

    if (!result.status || !result.buffer) {
      await m.react("❌");
      return m.reply(claraWrap("nulis2", "Gagal generate tulisan. Coba lagi.", "error"));
    }

    await m.react("🐣");
    const caption = novaBerhasil() + `\nTeks: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`;
    return await sock.sendMessage(m.chat, { image: result.buffer, caption });
  } catch (err) {
    console.error("nulis2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("nulis2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
