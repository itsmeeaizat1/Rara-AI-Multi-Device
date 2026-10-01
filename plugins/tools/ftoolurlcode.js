// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolurlcode — encode/decode URL (port altftool.com/tools/all/url-encoder-decoder)
import { raraGuideV2, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolurlcode", alias: ["urlcode", "urlencode", "urldecode"], category: "tools",
  description: "Encode/decode karakter khusus di URL", usage: ".ftoolurlcode <enc/dec> <teks>",
  example: ".ftoolurlcode enc halo dunia", isOwner: false, isPremium: false,
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
      return m.reply(raraGuideV2("ftoolurlcode", {
        kaomoji: "(◍•ᴗ•◍)",
        sapaan: "link atau teks mau di-encode/di-decode? gih~",
        cara: "ketik enc (teks→aman URL) atau dec (URL→teks biasa) lalu isinya",
        contoh: `${prefix}ftoolurlcode enc halo dunia? 1=2 · ${prefix}ftoolurlcode dec halo%20dunia`,
        note: "spasi dan simbol khusus diubah ke %XX biar aman dipakai di URL",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolurlcode");
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = encodeURIComponent(text);
    } else if (action === "dec" || action === "decode") {
      try {
        result = decodeURIComponent(text);
      } catch (e) {
        await m.react("❌");
        return m.reply(raraSalahV2("ftoolurlcode", {
          kaomoji: "(・_・;)",
          pesan: "stringnya gak bisa didecode — ada pola % yang gak valid",
          contoh: `${prefix}ftoolurlcode dec halo%20dunia`,
        }), "ftoolurlcode");
      }
    } else {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolurlcode", {
        kaomoji: "(・_・;)",
        pesan: "pilih enc atau dec ya",
        contoh: `${prefix}ftoolurlcode enc halo dunia`,
      }), "ftoolurlcode");
    }
    await m.react("🐣");
    await m.reply(raraWrap("URL Encode/Decode", [`Hasil (${action === "enc" || action === "encode" ? "encode" : "decode"}):`,
      "",
      "```" + (result.length > 800 ? result.substring(0, 800) + "…" : result) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("URL Encode/Decode", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
