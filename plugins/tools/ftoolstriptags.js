// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolstriptags — buang tag HTML dari teks (port altftool.com/tools/all/html-tag-stripper)
import { novaGuideV2, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftoolstriptags", alias: ["striptags", "htmlstrip", "htmlketeks"], category: "tools",
  description: "Buang tag HTML dari teks, sisa teks bersih", usage: ".ftoolstriptags <teks html>",
  example: ".ftoolstriptags <b>halo</b> dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("ftoolstriptags", {
        kaomoji: "(•̀ᴗ•́)و",
        sapaan: "teks HTML berantakan mau dibersihin? tempel aja~",
        cara: "tempel teks html apa pun, semua tag dihapus dan simbol khusus diterjemahin",
        contoh: `${prefix}ftoolstriptags <p>halo <b>dunia</b></p> → halo dunia`,
        note: "entity seperti &amp; diterjemahin ke simbol aslinya, spasi berlebih dirapikan",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolstriptags");
    }
    let out = text.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "");
    for (const [ent, ch] of Object.entries(ENTITIES)) out = out.split(ent).join(ch);
    out = out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!out) {
      await m.react("❌");
      return m.reply(novaWrap("Strip HTML", ["ERROR: hasilnya kosong — isinya tag semua?"].join("\n")));
    }
    await m.react("🐣");
    await m.reply(novaWrap("Strip HTML", ["HTML BERSIH",
      "",
      "```" + (out.length > 800 ? out.substring(0, 800) + "…" : out) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(novaWrap("Strip HTML", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
