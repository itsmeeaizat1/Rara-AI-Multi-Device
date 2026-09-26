// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .slugify — teks jadi URL slug (port altftool.com/tools/all/slug-generator)
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "slugify", alias: ["slugify", "slug", "slugteks"], category: "tools",
  description: "Ubah teks jadi slug URL yang rapi", usage: ".slugify <teks>",
  example: ".slugify Halo Dunia Baru 2026", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const slugify = (text) => String(text)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-+|-+$/g, "");

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("slugify", {
        kaomoji: "(◕‿◕)",
        sapaan: "teks mau dijadiin slug URL? ketik aja teksnya~",
        cara: "ketik teks apa pun, nanti otomatis jadi slug kecil terpisah tanda minus",
        contoh: `${prefix}slugify Halo Dunia Baru 2026 → halo-dunia-baru-2026`,
        note: "huruf besar jadi kecil, spasi dan simbol jadi -, cocok buat URL dan nama file",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "slugify");
    }
    const slug = slugify(text);
    if (!slug) {
      await m.react("❌");
      return m.reply(novaSalahV2("slugify", {
        kaomoji: "(・_・;)",
        pesan: "teksnya gak ada huruf/angka yang bisa dipakai buat slug",
        contoh: `${prefix}slugify Halo Dunia`,
      }), "slugify");
    }
    await m.react("🐣");
    await m.reply(claraWrap("Slugify", ["SLUGIFY BERHASIL",
      "",
      `Input: ${text.substring(0, 120)}`,
      "Slug: ```" + slug + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("Slugify", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
