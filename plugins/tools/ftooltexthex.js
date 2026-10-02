// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftooltexthex — teks ↔ heksadesimal (port altftool.com/tools/all/text-to-hex)
import { raraGuide, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftooltexthex", alias: ["texthex", "hex", "texttohex"], category: "tools",
  description: "Ubah teks ke heksadesimal dan sebaliknya", usage: ".ftooltexthex <enc/dec> <teks>",
  example: ".ftooltexthex enc halo", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ");
    if (!action || !text) {
      return m.reply(raraGuide("ftooltexthex", {
        kaomoji: "(◕ᴗ◕)",
        sapaan: "teks mau diubah ke heksadesimal? atau heksa ke teks?",
        cara: "ketik enc (teks→hex) atau dec (hex→teks) lalu isinya",
        contoh: `${prefix}ftooltexthex enc halo · ${prefix}ftooltexthex dec 68616c6f`,
        note: "hex = kode byte per karakter, 2 digit tiap huruf",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooltexthex");
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = Buffer.from(text, "utf-8").toString("hex");
    } else if (action === "dec" || action === "decode") {
      const hex = text.replace(/\s+/g, "");
      if (!/^([0-9a-fA-F]{2})+$/.test(hex)) {
        await m.react("❌");
        return m.reply(raraSalahV2("ftooltexthex", {
          kaomoji: "(・_・;)",
          pesan: "string heksadesimalnya gak valid — harus pasangan digit 0-9 a-f dan genap jumlahnya",
          contoh: `${prefix}ftooltexthex dec 68616c6f`,
        }), "ftooltexthex");
      }
      result = Buffer.from(hex, "hex").toString("utf-8");
    } else {
      await m.react("❌");
      return m.reply(raraSalahV2("ftooltexthex", {
        kaomoji: "(・_・;)",
        pesan: "pilih enc atau dec ya",
        contoh: `${prefix}ftooltexthex enc halo`,
      }), "ftooltexthex");
    }
    await m.react("🐣");
    await m.reply(raraWrap("Text Hex", [`Hasil (${action === "enc" || action === "encode" ? "teks→hex" : "hex→teks"}):`,
      "",
      "```" + (result.length > 800 ? result.substring(0, 800) + "…" : result) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Text Hex", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
