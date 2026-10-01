// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolemojiremove — buang emoji dari teks (port altftool.com/tools/all/emoji-remover)
import { raraGuideV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolemojiremove", alias: ["emojiremove", "hapusemoji", "stripemoji"], category: "tools",
  description: "Buang emoji dari teks, sisa teks bersih", usage: ".ftoolemojiremove <teks>",
  example: ".ftoolemojiremove halo dunia 😄🎉", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(raraGuideV2("ftoolemojiremove", {
        kaomoji: "(˶ᵔ ᵕ ᵔ˶)",
        sapaan: "teks penuh emoji mau dibersihin? tempel aja~",
        cara: "tempel teksnya, semua emoji dibuang dan spasi berlebih dirapikan",
        contoh: `${prefix}ftoolemojiremove halo 🎉 dunia 😄 → halo dunia`,
        note: "emoji dan pengubah warna kulit dihapus, teks dan angka tetap utuh",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolemojiremove");
    }
    const out = text
      .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu, "")
      .replace(/ {2,}/g, " ")
      .trim();
    if (!out) {
      await m.react("❌");
      return m.reply(raraWrap("Emoji Remove", ["ERROR: hasilnya kosong — isinya emoji semua?"].join("\n")));
    }
    await m.react("🐣");
    await m.reply(raraWrap("Emoji Remove", ["EMOJI DIBUANG",
      "",
      "```" + (out.length > 800 ? out.substring(0, 800) + "…" : out) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Emoji Remove", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
