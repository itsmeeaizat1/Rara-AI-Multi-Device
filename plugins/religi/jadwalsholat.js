// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import moment from "moment-timezone";
import config from "../../config.js";
import {
  searchKota,
  getTodaySchedule,
  extractPrayerTimes,
} from "../../src/lib/nova-sholat-api.js";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "jadwalsholat2",
  alias: ["jadwalsholat2", "jadwalsholatv2", "jsholat"],
  category: "religi",
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
      return m.reply(claraWrap("Gagal", `❌ *ɢᴀɢᴀʟ*\n\nKota "${city}" tidak ditemukan\nCoba nama kabupaten/kota lain`));
    }
    const jadwalData = await getTodaySchedule(kota.id);
    const times = extractPrayerTimes(jadwalData);
    const lokasi = jadwalData.lokasi || kota.lokasi;
    const daerah = jadwalData.daerah || "";
    const today = moment.tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    const caption = `🕌 *ᴊᴀᴅᴡᴀʟ ꜱʜᴏʟᴀᴛ*
╭┈┈⬡「 📍 *${lokasi}* 」
┃ 📅 ${today}
┃ 🗺️ ${daerah}
╰┈┈⬡
╭┈┈⬡「 ⏰ *ᴡᴀᴋᴛᴜ ꜱʜᴏʟᴀᴛ* 」
┃ 🌙 Imsak: \`${times.imsak}\`
┃ 🌅 sUbuh: \`${times.subuh}\`
┃ ☀️ Terbit: \`${times.terbit}\`
┃ 🌤️ Dhuha: \`${times.dhuha}\`
┃ 🌞 Dzuhur: \`${times.dzuhur}\`
┃ 🌇 Ashar: \`${times.ashar}\`
┃ 🌆 Maghrib: \`${times.maghrib}\`
┃ 🌃 Isya: \`${times.isya}\`
╰┈┈⬡
  ┊  ➶ _Sumber: myquran.com | Jangan lupa sholat ya! 🤲_`;
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
    m.react("🐣");
  } catch (error) {
    m.reply(claraWrap("jadwalsholat2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
