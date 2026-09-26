// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .urlcode — encode/decode URL (port altftool.com/tools/all/url-encoder-decoder)
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "urlcode", alias: ["urlcode", "urlencode", "urldecode"], category: "tools",
  description: "Encode/decode karakter khusus di URL", usage: ".urlcode <enc/dec> <teks>",
  example: ".urlcode enc halo dunia", isOwner: false, isPremium: false,
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
      return m.reply(novaGuideV2("urlcode", {
        kaomoji: "(◍•ᴗ•◍)",
        sapaan: "link atau teks mau di-encode/di-decode? gih~",
        cara: "ketik enc (teks→aman URL) atau dec (URL→teks biasa) lalu isinya",
        contoh: `${prefix}urlcode enc halo dunia? 1=2 · ${prefix}urlcode dec halo%20dunia`,
        note: "spasi dan simbol khusus diubah ke %XX biar aman dipakai di URL",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "urlcode");
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = encodeURIComponent(text);
    } else if (action === "dec" || action === "decode") {
      try {
        result = decodeURIComponent(text);
      } catch (e) {
        await m.react("❌");
        return m.reply(novaSalahV2("urlcode", {
          kaomoji: "(・_・;)",
          pesan: "stringnya gak bisa didecode — ada pola % yang gak valid",
          contoh: `${prefix}urlcode dec halo%20dunia`,
        }), "urlcode");
      }
    } else {
      await m.react("❌");
      return m.reply(novaSalahV2("urlcode", {
        kaomoji: "(・_・;)",
        pesan: "pilih enc atau dec ya",
        contoh: `${prefix}urlcode enc halo dunia`,
      }), "urlcode");
    }
    await m.react("🐣");
    await m.reply(claraWrap("URL Encode/Decode", [`Hasil (${action === "enc" || action === "encode" ? "encode" : "decode"}):`,
      "",
      "```" + (result.length > 800 ? result.substring(0, 800) + "…" : result) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("URL Encode/Decode", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
