// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import moment from "moment-timezone";
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { persistLoad, persistSave } from "../../src/lib/rara-ram-persist.js";
import { buildAbsenMeter, countGroupMembers } from "../../src/lib/rara-absen-meter.js";
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
  persistLoad("absensi"); // restore sesi absen dari db (anti hilang pas restart)
  const chatId = m.chat;
  if (!global.absensi[chatId]) {
    return m.reply(raraWrap("Tidak Ada Absen", ["Belum ada sesi absen di grup ini!",
        "",
        "Admin dapat memulai dengan",
        "*.mulaiabsen [keterangan]*",].join("\n")));
  }
  const absen = global.absensi[chatId];
  const now = moment().tz("Asia/Jakarta");
  const dateStr = now.format("D MMMM YYYY");
  const createdDate = moment(absen.createdAt).tz("Asia/Jakarta");
  const timeStr = createdDate.format("HH:mm");
  let list = "_Belum ada yang absen_";
  if (absen.peserta.length > 0) {
    list = absen.peserta
      .map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`)
      .join("\n");
  }
  // 📊 METER KEHADIRAN (13 Sep 2026): progress bar peserta/anggota grup
  const totalMembers = await countGroupMembers(sock, chatId);
  const meter = totalMembers ? buildAbsenMeter(absen.peserta.length, totalMembers) : null;
  await m.reply(raraWrap("DAFTAR YANG UDAH ABSEN", `` +
      "" +
      `📝 ${absen.keterangan}\n` +
      `📅 ${dateStr}\n` +
      `⏰ Dimulai: ${timeStr}\n` +
      `👑 Dibuat: @${absen.createdBy.split("@")[0]}\n` +
      `👥 *Peserta (${absen.peserta.length})*\n` +
      (meter ? meter.lines.join("\n") + "\n" : "") +
      `${list}\n` +
      `---\n\n` +
      `Ketik *${m.prefix}absen* untuk hadir`));
}
export { pluginConfig as config, handler };
