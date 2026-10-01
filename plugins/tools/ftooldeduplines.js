// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftooldeduplines — hapus baris duplikat (port altftool.com/tools/all/duplicate-line-remover)
import { novaGuideV2, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftooldeduplines", alias: ["deduplines", "hapusduplikat", "uniquelines"], category: "tools",
  description: "Hapus baris yang duplikat dari teks", usage: ".ftooldeduplines <teks>",
  example: ".ftooldeduplines list-mu di sini", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("ftooldeduplines", {
        kaomoji: "(◕‿◕)",
        sapaan: "daftar banyak baris duplikat? bersihin sekejap~",
        cara: "tempel teksnya, baris yang dobel dihapus dan urutan pertama tetap dipertahankan",
        contoh: `${prefix}ftooldeduplines nasi\\ngoreng\\nnasi\\nbakso`,
        note: "baris dibaca per baris (enter), baris kosong diabaikan",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooldeduplines");
    }
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const seen = new Set();
    const out = [];
    for (const l of lines) {
      if (!l) continue;
      if (seen.has(l)) continue;
      seen.add(l);
      out.push(l);
    }
    const removed = lines.filter((l) => l.trim()).length - out.length;
    if (!out.length) {
      await m.react("❌");
      return m.reply(novaWrap("Dedup Lines", ["ERROR: gak ada baris yang bisa diproses"].join("\n")));
    }
    const lines2 = ["HASIL DEDUP",
      "",
      `Baris awal: ${lines.filter((l) => l.trim()).length} · Unik: ${out.length} · Dihapus: ${removed}`,
      "",
      "```" + (out.join("\n").length > 800 ? out.join("\n").substring(0, 800) + "…" : out.join("\n")) + "```"];
    await m.react("🐣");
    await m.reply(novaWrap("Dedup Lines", lines2.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(novaWrap("Dedup Lines", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
