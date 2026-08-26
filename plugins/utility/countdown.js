// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "countdown", alias: ["hitungmundur", "mundur"], category: "utility",
  description: "Hitung mundur ke tanggal tertentu", usage: ".countdown <DD-MM-YYYY>",
  example: ".countdown 25-12-2026", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input) {
      await m.reply( claraWrap("Countdown", [`│ ❏ Penggunaan: *${prefix}countdown <DD-MM-YYYY>*`,
        `│ ❏ Contoh: *${prefix}countdown 25-12-2026*`].join("\n")), "countdown");
      return { handled: true };
    }
    const parts = input.split(/[-/]/).map(Number);
    const target = new Date(parts[2], parts[1]-1, parts[0]);
    if (isNaN(target)) throw new Error("Format tanggal salah");
    const now = new Date();
    const diff = target - now;
    if (diff < 0) {
      await m.reply(claraWrap("Countdown", [`│ ❏ Target: *${target.toLocaleDateString("id-ID")}*`,
        "│ ❏ Tanggal sudah lewat!"].join("\n")));
      return { handled: true };
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    await m.reply(claraWrap("Countdown", [`│ ❏ Target: *${target.toLocaleDateString("id-ID")}*`,
      `│ ❏ Sisa: *${days} hari, ${hours} jam, ${mins} menit, ${secs} detik*`].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`│ ❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };