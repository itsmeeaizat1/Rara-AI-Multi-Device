// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/nova-countdown.js";

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
      await m.reply(novaError("Countdown", [`Target: *${target.toLocaleDateString("id-ID")}*`,
        "Tanggal sudah lewat!"].join("\n")));
      return { handled: true };
    }
    // 🔹 LIVE COUNTDOWN (13 Sep, request owner "fitur polos di-variasi biar
    // menarik"): ironis kalau fitur bernama countdown gak nge-tick — kartu
    // sekarang hidup pakai nova-countdown, settle statis saat kuota edit abis.
    const cdCard = (remainingMs, live = true) => {
      const days = Math.floor(Math.max(0, remainingMs) / 86400000);
      const hms = formatRemaining(Math.max(0, remainingMs) % 86400000);
      return claraWrap("Countdown", [
        `Target: *${target.toLocaleDateString("id-ID")}*`,
        live
          ? `🕒 *${days} hari ${hms}* lagi 🕒`
          : `Sisa: *${days} hari, ${formatRemaining(Math.max(0, remainingMs))}*`,
      ].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);
    };
    await runLiveTicker({
      sock, chat: m.chat, m,
      mode: "down", targetTs: target.getTime(), maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 16,
      initialCard: cdCard(diff),
      tickCard: (st) => cdCard(st.remainingMs, st.remainingMs > 0),
      finalCard: (st) => cdCard(st.remainingMs, false),
    });
  } catch (e) {
    await m.reply(claraWrap("Gagal nih", [`${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };