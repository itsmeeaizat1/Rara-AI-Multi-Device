// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftoolreplace — ganti potongan teks massal (port altftool.com/tools/all/find-and-replace)
import { raraGuide, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolreplace", alias: ["replace", "gantiteks", "findreplace"], category: "tools",
  description: "Cari dan ganti semua kemunculan teks", usage: ".ftoolreplace <dari>|<ke>|<teks>",
  example: ".ftoolreplace kucing|anjing|kucing hitam dan kucing putih", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    const parts = raw.split("|");
    if (parts.length < 3 || !parts[0].trim()) {
      return m.reply(raraGuide("ftoolreplace", {
        kaomoji: "(¬‿¬)",
        sapaan: "teks mau diganti massal? pisahin pakai tanda |",
        cara: "ketik teks yang dicari, tanda |, penggantinya, tanda |, lalu teks aslinya",
        contoh: `${prefix}ftoolreplace kucing|anjing|kucing hitam dan kucing putih`,
        note: "kosongin bagian tengah untuk hapus: ${prefix}ftoolreplace halo||halo dunia → dunia".replace("${prefix}", prefix),
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolreplace");
    }
    const [dari, ke, ...rest] = parts;
    const teks = rest.join("|");
    const from = dari.trim(), to = ke;
    if (!teks.trim()) {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolreplace", {
        kaomoji: "(・_・;)",
        pesan: "teks aslinya kosong",
        contoh: `${prefix}ftoolreplace kucing|anjing|kucing hitam`,
      }), "ftoolreplace");
    }
    const count = teks.split(from).length - 1;
    const out = count ? teks.split(from).join(to) : teks;
    await m.react("🐣");
    await m.reply(raraWrap("Find & Replace", [`"${from}" → "${to}" (${count}x diganti)`,
      "",
      "```" + (out.length > 800 ? out.substring(0, 800) + "…" : out) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Find & Replace", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
