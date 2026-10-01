// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import moment from "moment-timezone";
import config from "../../config.js";
import {
  searchKota,
  getTodaySchedule,
  extractPrayerTimes,
  computeNextPrayer,
  buildSholatCountdownCard,
} from "../../src/lib/nova-sholat-api.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "jadwalsholat2",
  alias: ["jadwalsholat", "jadwalsolat", "solat", "prayerschedule"],
  category: "islami",
  description: "Menampilkan jadwal sholat real-time dari myquran.com",
  usage: ".jadwalsholat <kota>",
  example: ".jadwalsholat Jakarta",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
async function handler(m, { sock }) {
  const city = m.args.join(" ").trim() || "Jakarta";
  try {
    const kota = await searchKota(city);
    if (!kota) {
      return m.reply(novaError("Religi", `❌ *gagal*\n\nKota "${city}" tidak ditemukan\nCoba nama kabupaten/kota lain`));
    }
    const jadwalData = await getTodaySchedule(kota.id);
    const times = extractPrayerTimes(jadwalData);
    const lokasi = jadwalData.lokasi || kota.lokasi;
    const daerah = jadwalData.daerah || "";
    const today = moment.tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    // 🕒 PENGHITUNG (13 Sep 2026): sholat berikutnya ditandai 🔜 + ticker live
    const next = computeNextPrayer(times);
    const mark = (k) => (next && next.key === k ? "🔜 " : "");
    const berikutnya = next
      ? `\n🕒 *Berikutnya: ${next.name} pukul ${next.timeStr}${next.isTomorrow ? " (besok)" : ""}* — countdown jalan di bawah!\n`
      : "";
    const caption = `🕌 *jadwal sholat*
📍 Lokasi: ${lokasi}
📅 ${today}
🗺️ ${daerah}
${berikutnya}
Waktu Sholat:
🌙 Imsak: \`${times.imsak}\`
${mark("subuh")}🌅 Subuh: \`${times.subuh}\`
☀️ Terbit: \`${times.terbit}\`
🌤️ Dhuha: \`${times.dhuha}\`
${mark("dzuhur")}🌞 Dzuhur: \`${times.dzuhur}\`
${mark("ashar")}🌇 Ashar: \`${times.ashar}\`
${mark("maghrib")}🌆 Maghrib: \`${times.maghrib}\`
${mark("isya")}🌃 Isya: \`${times.isya}\`

_Sumber: myquran.com | Jangan lupa sholat ya! 🤲_`;
    const adzanUrl = "https://media.vocaroo.com/mp3/1ofLT2YUJAjQ";
    let adzanBuffer;
    try {
      const res = await axios.get(adzanUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      adzanBuffer = Buffer.from(res.data);
    } catch {
      adzanBuffer = null;
    }
    const contextInfo = saluranCtx();
    if (adzanBuffer) {
      await sock.sendMessage(
        m.chat,
        {
          audio: adzanBuffer,
          mimetype: "audio/mpeg",
          ptt: false,
          contextInfo,
        },
        { quoted: m },
      );
      await sock.sendMessage(m.chat, { text: caption }, { quoted: m });
    } else {
      await sock.sendMessage(
        m.chat,
        { text: caption, contextInfo },
        { quoted: m },
      );
    }
    // 🕒 LIVE COUNTDOWN ke sholat berikutnya — kartu sendiri, edit-in-place
    // tiap menit (makin dekat makin cepet), sampai waktunya → kartu
    // "SUDAH WAKTU". Fire-and-forget: gak nahan command.
    if (next) {
      try {
        const lokasiLine = daerah ? `${lokasi} — ${daerah}` : lokasi;
        runLiveTicker({
          sock,
          chat: m.chat,
          m,
          initialCard: buildSholatCountdownCard(next, next.targetTs - Date.now(), lokasiLine),
          tickCard: (st) => buildSholatCountdownCard(next, st.remainingMs, lokasiLine),
          mode: "down",
          targetTs: next.targetTs,
        }).catch(() => {});
      } catch {}
    }
  } catch (error) {
    m.reply(claraWrap("jadwalsholat2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
