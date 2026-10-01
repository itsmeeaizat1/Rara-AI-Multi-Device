// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftooltextcount — statistik teks (port altftool.com/tools/all/word-character-counter)
import { novaGuideV2, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftooltextcount", alias: ["textcount", "counttext", "hitungteks"], category: "tools",
  description: "Hitung kata, karakter, kalimat, paragraf + waktu baca", usage: ".ftooltextcount <teks>",
  example: ".ftooltextcount teks apa pun di sini", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("ftooltextcount", {
        kaomoji: "(◍•ᴗ•◍)",
        sapaan: "teks mau dihitung statistiknya? tempel aja di sini~",
        cara: "ketik teks apa pun setelah command, nanti dihitung otomatis",
        contoh: `${prefix}ftooltextcount sekali membaca itu jauh lebih baik daripada sepuluh kali meniru`,
        note: "hasil: jumlah kata, karakter, kalimat, paragraf, plus estimasi waktu baca",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooltextcount");
    }
    const chars = [...text].length;
    const noSpace = text.replace(/\s+/g, "").length;
    const words = (text.match(/\S+/g) || []).length;
    const sentences = (text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)).length;
    const paragraphs = (text.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean)).length;
    const readSec = Math.round((words / 200) * 60);
    const readTxt = readSec < 60 ? readSec + " detik" : (Math.round(readSec / 60) + " menit");
    await m.react("🐣");
    await m.reply(novaWrap("Text Count", ["STATISTIK TEKS",
      "",
      `Kata: ${words}`,
      `Karakter: ${chars} (tanpa spasi: ${noSpace})`,
      `Kalimat: ${sentences} · Paragraf: ${paragraphs}`,
      `Estimasi baca: ±${readTxt}`].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(novaWrap("Text Count", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
