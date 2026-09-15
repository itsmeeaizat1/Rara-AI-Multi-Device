// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .figlet — ASCII art banner via package figlet (16 Sep 2026, request owner:
// figlet ternyata sudah terpasang sejak lama tapi BELUM PERNAH dipakai —
// fitur gratis tanpa dep baru). Font kurasi + list font.

import figlet from "figlet";
import { novaError, novaCaption, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "figlet",
  alias: ["figlet", "ascii", "asciiart"],
  category: "fun",
  description: "Ubah teks jadi ASCII art banner",
  usage: ".figlet <teks> [font]",
  example: ".figlet NOVA",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

let _figlet = figlet;
export function _setFigletForTest(impl) { _figlet = impl; }

const FONTS = [
  "Standard", "Big", "Slant", "3-D", "Doom", "Ghost", "ANSI Shadow",
  "Bloody", "Banner3-D", "Colossal", "Delta Corps Priest 1", "Electronic",
];
const DEFAULT_FONT = "Standard";

function buatArt(teks, font) {
  return new Promise((ok, err) => {
    _figlet.text(
      teks,
      { font, width: 200, whitespaceBreak: true },
      (e, result) => (e || !result ? err(e || new Error("font gagal")) : ok(result)),
    );
  });
}

async function handler(m, { config: botConfig, prefix: cmdPrefix }) {
  const prefix = cmdPrefix || botConfig?.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").trim();

    if (!raw || raw.toLowerCase() === "list") {
      const text =
        novaCaption({
          emoji: "🔠",
          name: "figlet",
          description: "Ubah teks jadi ASCII art banner keren — pilih fontnya juga",
          usage: `${prefix}figlet <teks> [font] — atau ${prefix}figlet list`,
          example: `${prefix}figlet NOVA\n${prefix}figlet NOVA Doom\n\nFont pilihan: ${FONTS.join(", ")}`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.reply(text, "figlet");
      return { handled: true };
    }

    if (raw.length > 20) {
      await m.reply(novaError("Figlet", "Teks kepanjangan — maksimal 20 karakter biar art-nya gak berantakan"), "figlet");
      await m.react("❌");
      return { handled: true };
    }

    const parts = raw.split(/\s+/);
    let teks = raw;
    let font = DEFAULT_FONT;
    const lastWord = parts[parts.length - 1] || "";
    if (parts.length > 1 && FONTS.includes(lastWord)) {
      teks = parts.slice(0, -1).join(" ");
      font = lastWord;
    }

    const art = await buatArt(teks, font);
    await m.react("🐣");
    await m.reply(
      `「 ${font} 」\n\`\`\`\n${art}\n\`\`\`\n` +
        tipText(`Ketik ${prefix}figlet list untuk lihat semua font`),
      "figlet",
    );
  } catch (error) {
    await m.react("❌");
    await m.reply(novaError("Figlet", `Gagal bikin ASCII art — font mungkin tidak ada: ${String(error?.message || error).slice(0, 100)}`), "figlet");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
