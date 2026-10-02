// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftoolslugify — teks jadi URL slug (port altftool.com/tools/all/slug-generator)
import { raraGuide, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolslugify", alias: ["slugify", "slug", "slugteks"], category: "tools",
  description: "Ubah teks jadi slug URL yang rapi", usage: ".ftoolslugify <teks>",
  example: ".ftoolslugify Halo Dunia Baru 2026", isOwner: false, isPremium: false,
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
      return m.reply(raraGuide("ftoolslugify", {
        kaomoji: "(◕‿◕)",
        sapaan: "teks mau dijadiin slug URL? ketik aja teksnya~",
        cara: "ketik teks apa pun, nanti otomatis jadi slug kecil terpisah tanda minus",
        contoh: `${prefix}ftoolslugify Halo Dunia Baru 2026 → halo-dunia-baru-2026`,
        note: "huruf besar jadi kecil, spasi dan simbol jadi -, cocok buat URL dan nama file",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolslugify");
    }
    const slug = slugify(text);
    if (!slug) {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolslugify", {
        kaomoji: "(・_・;)",
        pesan: "teksnya gak ada huruf/angka yang bisa dipakai buat slug",
        contoh: `${prefix}ftoolslugify Halo Dunia`,
      }), "ftoolslugify");
    }
    await m.react("🐣");
    await m.reply(raraWrap("Slugify", ["SLUGIFY BERHASIL",
      "",
      `Input: ${text.substring(0, 120)}`,
      "Slug: ```" + slug + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Slugify", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
