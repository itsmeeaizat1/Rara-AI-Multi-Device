// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraHeader, separator, tipText, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { loadAlarms, saveAlarms } from "../../src/lib/rara-alarm.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: "alarm", alias: ["alarm"], category: "utility",
  alias: ["alarm"],
  description: "Alarm pengingat pribadi", usage: ".alarm <HH:MM> <pesan>",
  example: ".alarm 07:30 bangun sekolah", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    global.alarms = loadAlarms(); // store persist db — alarm gak ilang pas restart
    const input = (m.text || "").trim();
    if (!input) {
      await m.reply(raraCaption({
  emoji: "🔧",
  name: "alarm",
  description: "Alarm pengingat pribadi",
  usage: `${prefix}alarm <HH:MM> <pesan>`,
  example: `${prefix}alarm 07:30 bangun sekolah`,
}));
      return { handled: true };
    }
    const args = input.split(/\s+/);
    if (args[0] === "list") {
      const myAlarms = global.alarms[m.sender] || [];
      if (!myAlarms.length) {
        await m.reply(raraError("Alarm", ["Tidak ada alarm aktif"].join("\n")));
        return { handled: true };
      }
      let text = raraHeader("Alarm Aktif", "⏰") + "\n\n";
      myAlarms.forEach((a, i) => { text += `${i+1}. *${a.time}* - ${a.message}\n`; });
      text += "\n" + tipText("Alarm bunyi tiap hari di jam WIB — tersimpan walau bot restart");
      await m.reply(text);
      return { handled: true };
    }
    if (args[0] === "del") {
      const idx = parseInt(args[1]) - 1;
      if (!global.alarms[m.sender]) global.alarms[m.sender] = [];
      global.alarms[m.sender].splice(idx, 1);
      saveAlarms();
      await m.reply(raraError("Alarm", [`Alarm #${idx+1} dihapus`].join("\n")));
      return { handled: true };
    }
    const time = args[0];
    const message = args.slice(1).join(" ") || "Alarm!";
    if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error("Format waktu: HH:MM");
    const [h, min] = time.split(":").map(Number);
    if (!global.alarms[m.sender]) global.alarms[m.sender] = [];
    global.alarms[m.sender].push({ time, message, active: true, chat: m.chat, lastFiredYmd: null });
    saveAlarms();
    // 🔹 LIVE COUNTDOWN (13 Sep): hitung countdown ke bunyi BERIKUTNYA (HH:MM
    // WIB) — kalau udah lewat jamnya hari ini, target besok. Sisa ≤ 30 dtk
    // tick tiap detik; sisanya adaptif (biar gak junk ribuan edit).
    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    const secNow = nowWib.getUTCHours() * 3600 + nowWib.getUTCMinutes() * 60 + nowWib.getUTCSeconds();
    const secTarget = h * 3600 + min * 60;
    let diffSec = secTarget - secNow;
    if (diffSec <= 59) diffSec += 86400; // udah lewat / mepet banget → besok
    const targetTs = Date.now() + diffSec * 1000;
    const total = global.alarms[m.sender].length;
    const card = (remainingMs, live = true) => raraWrap("Alarm Disetel", [
      `⏰ Waktu : *${time}* WIB`,
      `📝 Pesan : ${message}`,
      live
        ? `🕒 Bunyi dalam : *${formatRemaining(remainingMs)}* 🕒`
        : `🕒 Bunyi pukul : *${time}* WIB`,
      `📌 Total alarm kamu: ${total}`,
    ].join("\n"), "success");
    await runLiveTicker({
      sock, chat: m.chat, m,
      mode: "down", targetTs, maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 16,
      initialCard: card(targetTs - Date.now()),
      tickCard: (st) => card(st.remainingMs, st.remainingMs > 0),
      finalCard: (st) => card(st.remainingMs, false),
    });
    return { handled: true };
  } catch (e) {
    await m.reply(raraWrap("Gagal nih", [`${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };