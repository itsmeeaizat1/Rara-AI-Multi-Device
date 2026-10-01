// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolbase32 — teks ↔ Base32 RFC 4648 (port altftool.com/tools/all/base32)
import { novaGuideV2, novaSalahV2, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftoolbase32", alias: ["base32"], category: "tools",
  description: "Encode/decode Base32 (RFC 4648)", usage: ".ftoolbase32 <enc/dec> <teks>",
  example: ".ftoolbase32 enc halo dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const A32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32enc = (text) => {
  const bytes = Buffer.from(text, "utf-8");
  let out = "", bits = 0, val = 0;
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += A32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += A32[(val << (5 - bits)) & 31];
  while (out.length % 8) out += "=";
  return out;
};
const b32dec = (text) => {
  const clean = text.replace(/=+$/, "").toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z2-7]*$/.test(clean) || clean.length % 8 === 1) return null;
  let bits = 0, val = 0; const bytes = [];
  for (const ch of clean) {
    val = (val << 5) | A32.indexOf(ch); bits += 5;
    if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes).toString("utf-8");
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ");
    if (!action || !text) {
      return m.reply(novaGuideV2("ftoolbase32", {
        kaomoji: "(๑•̀ㅂ•́)و",
        sapaan: "teks mau diubah ke Base32? atau sebaliknya?",
        cara: "ketik enc (teks→base32) atau dec (base32→teks) lalu isinya",
        contoh: `${prefix}ftoolbase32 enc halo · ${prefix}ftoolbase32 dec MZXW6YTB`,
        note: "base32 dipakai TOTP/link berbasis teks, 32 huruf aman dibaca manusia",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolbase32");
    }
    let result;
    if (action === "enc" || action === "encode") result = b32enc(text);
    else if (action === "dec" || action === "decode") {
      result = b32dec(text);
      if (result === null) {
        await m.react("❌");
        return m.reply(novaSalahV2("ftoolbase32", {
          kaomoji: "(・_・;)",
          pesan: "string base32nya gak valid — cuma huruf A-Z dan angka 2-7",
          contoh: `${prefix}ftoolbase32 dec MZXW6YTB`,
        }), "ftoolbase32");
      }
    } else {
      await m.react("❌");
      return m.reply(novaSalahV2("ftoolbase32", {
        kaomoji: "(・_・;)",
        pesan: "pilih enc atau dec ya",
        contoh: `${prefix}ftoolbase32 enc halo`,
      }), "ftoolbase32");
    }
    await m.react("🐣");
    await m.reply(novaWrap("Base32", [`Hasil (${action.startsWith("e") ? "encode" : "decode"}):`,
      "",
      "```" + (result.length > 800 ? result.substring(0, 800) + "…" : result) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(novaWrap("Base32", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
