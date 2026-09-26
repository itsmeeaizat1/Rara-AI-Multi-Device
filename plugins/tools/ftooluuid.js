// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftooluuid — generator UUID v4 (port altftool.com/tools/all/uuid-generator) pakai crypto.randomUUID().
import { randomUUID } from "node:crypto";
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftooluuid", alias: ["uuid", "uuidgen", "guid"], category: "tools",
  description: "Generate UUID v4 acak", usage: ".ftooluuid [jumlah]",
  example: ".ftooluuid 5", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const MAX = 10;

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    let n = 1;
    if (raw) {
      n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 1) {
        await m.react("❌");
        return m.reply(novaSalahV2("ftooluuid", {
          kaomoji: "(・_・;)",
          pesan: "jumlahnya harus angka lebih dari 0",
          contoh: `${prefix}ftooluuid 5`,
        }), "ftooluuid");
      }
      n = Math.min(n, MAX);
    }
    const ids = Array.from({ length: n }, () => randomUUID());
    await m.react("🐣");
    await m.reply(claraWrap("UUID Generator", [`UUID V4 ×${n} BERHASIL`,
      "",
      "```" + ids.join("\n") + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("UUID Generator", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
