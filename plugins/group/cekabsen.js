// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import moment from "moment-timezone";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "cekabsen",
  alias: ["cekabsen"],
  category: "group",
  description: "Lihat daftar peserta yang sudah absen",
  usage: ".cekabsen",
  example: ".cekabsen",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
if (!global.absensi) global.absensi = {};
async function handler(m, { sock }) {
  const chatId = m.chat;
  if (!global.absensi[chatId]) {
    return m.reply(claraWrap("Tidak Ada Absen", ["Belum ada sesi absen di grup ini!",
        "",
        "Admin dapat memulai dengan",
        "*.mulaiabsen [keterangan]*",].join("\n")));
  }
  const absen = global.absensi[chatId];
  const now = moment().tz("Asia/Jakarta");
  const dateStr = now.format("D MMMM YYYY");
  const createdDate = moment(absen.createdAt).tz("Asia/Jakarta");
  const timeStr = createdDate.format("HH:mm");
  let list = "┃ _Belum ada yang absen_";
  if (absen.peserta.length > 0) {
    list = absen.peserta
      .map((jid, i) => `│ ${i + 1}. @${jid.split("@")[0]}`)
      .join("\n");
  }
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";
  await m.reply(claraWrap("DAFTAR YANG UDAH ABSEN", `📋 *ᴅᴀꜰᴛᴀʀ ʏᴀɴɢ ᴜᴅᴀʜ ᴀʙꜱᴇɴ*\n\n` +
      `╭──「 *ɪɴꜰᴏ* 」\n` +
      `│ 📝 ${absen.keterangan}\n` +
      `│ 📅 ${dateStr}\n` +
      `│ ⏰ Dimulai: ${timeStr}\n` +
      `│ 👑 Dibuat: @${absen.createdBy.split("@")[0]}\n` +
      `├┈┈「 👥 *PESERTA (${absen.peserta.length})* 」\n` +
      `${list}\n` +
      `╰┈┈┈┈┈┈┈┈\n\n` +
      `Ketik *${m.prefix}absen* untuk hadir`));
}
export { pluginConfig as config, handler };
