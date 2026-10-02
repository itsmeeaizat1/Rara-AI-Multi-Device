// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftoolasciitext — teks ↔ kode ASCII/Unicode (port altftool.com/tools/all/text-ascii)
import { raraGuide, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolasciitext", alias: ["asciitext", "kodeascii", "textascii"], category: "tools",
  description: "Ubah teks ke kode ASCII/Unicode dan sebaliknya", usage: ".ftoolasciitext <enc/dec> <teks>",
  example: ".ftoolasciitext enc abc", isOwner: false, isPremium: false,
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
      return m.reply(raraGuide("ftoolasciitext", {
        kaomoji: "(◕ᴗ◕)",
        sapaan: "teks mau diubah ke kode angka? atau kode ke teks?",
        cara: "ketik enc (teks→kode) atau dec (kode→teks) lalu isinya",
        contoh: `${prefix}ftoolasciitext enc halo · ${prefix}ftoolasciitext dec 104 97 108 111`,
        note: "kode dipisah spasi, unicode di luar ASCII tetep kebaca (emoji = angka gede)",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolasciitext");
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = [...text].map((c) => c.codePointAt(0)).join(" ");
    } else if (action === "dec" || action === "decode") {
      const nums = text.split(/[\s,]+/).filter(Boolean);
      if (!nums.every((n) => /^\d+$/.test(n) && Number(n) <= 0x10ffff)) {
        await m.react("❌");
        return m.reply(raraSalahV2("ftoolasciitext", {
          kaomoji: "(・_・;)",
          pesan: "kodenya harus angka dipisah spasi atau koma",
          contoh: `${prefix}ftoolasciitext dec 104 97 108 111`,
        }), "ftoolasciitext");
      }
      result = nums.map((n) => String.fromCodePoint(Number(n))).join("");
    } else {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolasciitext", {
        kaomoji: "(・_・;)",
        pesan: "pilih enc atau dec ya",
        contoh: `${prefix}ftoolasciitext enc abc`,
      }), "ftoolasciitext");
    }
    await m.react("🐣");
    await m.reply(raraWrap("ASCII Text", [`Hasil (${action.startsWith("e") ? "encode" : "decode"}):`,
      "",
      "```" + (result.length > 800 ? result.substring(0, 800) + "…" : result) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("ASCII Text", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
