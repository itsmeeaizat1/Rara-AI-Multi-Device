// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "calculator",
  alias: ["calculator", "calc"],
  category: "tools",
  description: "Kalkulator matematika",
  usage: ".calc <ekspresi>",
  example: ".calc 5 + 3 * 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// (16 Sep 2026, upgrade owner: mathjs) — dulu pakai new Function() = eval
// kode gak aman + cuma bisa +-*/%. Sekarang: parser mathjs yang aman (gak
// bisa ngeakses scope/global) + fungsi lengkap (sqrt, sin, cos, pi, ^, dll).
import { evaluate, format } from "mathjs";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const expr = m.text?.trim();

    if (!expr) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "calculator",
  description: "Kalkulator matematika",
  usage: `${prefix}calc <ekspresi>`,
  example: `${prefix}calc 5 + 3 * 2`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "calculator");
      return { handled: true };
    }

    if (expr.length > 300) {
      await m.reply(novaError("Calculator", "Ekspresi kepanjangan — maksimal 300 karakter"), "calculator");
      return { handled: true };
    }

    let result;
    try {
      // parser mathjs: sandboxed — gak bisa ngeakses scope/global Node
      const val = evaluate(expr);
      result = typeof val === "number" || typeof val === "string" ? String(val) : format(val, { precision: 10 });
    } catch {
      const text =
        novaWrap("Calculator", [`Ekspresi: *${expr}*`,
          "Status: *ekspresi tidak valid*"].join("\n")) +
        "\n" +
        tipText(`Contoh valid: sqrt(16), 5^2 + sin(pi/2), 2 * (3 + 4)`);
      await m.reply(text, "calculator");
      await m.react("❌");
      return { handled: true };
    }

    const text =
      novaWrap("Calculator", [`Ekspresi: *${expr}*`,
        `Hasil: *${result}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}calc <ekspresi> untuk menghitung lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(text, "calculator");
  } catch (error) {
    await m.react("❌");
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "calculator");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
