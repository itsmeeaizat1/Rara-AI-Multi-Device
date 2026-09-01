// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "countdown", alias: ["countdown"], category: "utility",
  alias: ["countdown"],
  description: "Hitung mundur ke tanggal tertentu", usage: ".countdown <DD-MM-YYYY>",
  example: ".countdown 25-12-2026", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const input = m.text?.trim();
    if (!input) {
      await m.reply( novaCaption({
  emoji: "🔧",
  name: "countdown",
  description: "Hitung mundur ke tanggal tertentu",
  usage: `${prefix}countdown <DD-MM-YYYY>`,
  example: `${prefix}countdown 25-12-2026`,
}), "countdown");
      return { handled: true };
    }
    const parts = input.split(/[-/]/).map(Number);
    const target = new Date(parts[2], parts[1]-1, parts[0]);
    if (isNaN(target)) throw new Error("Format tanggal salah");
    const now = new Date();
    const diff = target - now;
    if (diff < 0) {
      await m.reply(novaError("Countdown", [`│ Target: *${target.toLocaleDateString("id-ID")}*`,
        "│ Tanggal sudah lewat!"].join("\n")));
      return { handled: true };
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    await m.reply(novaError("Countdown", [`│ Target: *${target.toLocaleDateString("id-ID")}*`,
      `│ Sisa: *${days} hari, ${hours} jam, ${mins} menit, ${secs} detik*`].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
  } catch (e) {
    await m.reply(claraWrap("Gagal nih", [`│ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };