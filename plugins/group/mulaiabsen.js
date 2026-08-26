// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "mulaiabsen",
  alias: ["mulaiabsen", "startabsen", "bukaabsen", "openabsen"],
  category: "group",
  description: "Mulai sesi absen di grup (admin only)",
  usage: ".mulaiabsen [keterangan]",
  example: ".mulaiabsen Rapat Mingguan",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
  isAdmin: true,
};

if (!global.absensi) global.absensi = {};

async function handler(m, { sock }) {
  const chatId = m.chat;

  if (global.absensi[chatId]) {
    return m.reply(claraWrap("Masih Ada Absen", `❌ *ᴍᴀꜱɪʜ ᴀᴅᴀ ᴀʙꜱᴇɴ*\n\n` +
        `Masih ada sesi absen di grup ini!\n\n` +
        `Ketik *.hapusabsen* untuk menghapus\n` +
        `atau *.cekabsen* untuk melihat daftar`));
  }

  const keterangan = m.text?.trim() || "Absen Harian";

  global.absensi[chatId] = {
    keterangan: keterangan,
    createdBy: m.sender,
    createdAt: new Date().toISOString(),
    peserta: [],
  };

  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

  await m.reply(claraWrap("ABSEN UDAH JALAN NIHH", `📋 *ᴀʙꜱᴇɴ ᴜᴅᴀʜ ᴊᴀʟᴀɴ ɴɪʜʜ*\n\n` +
      `「 📋 *InғO* 」\n` +
      `📝 ${keterangan}\n` +
      `👑 Dibuat oleh: @${m.sender.split("@")[0]}\n` +
      `👥 Peserta: 0\n\n` +
      `Untuk kamu yang mau ikutan absen, silahkan ketik *${m.prefix}absen*` +
      `Untuk admin yang mau cek absen, silahkan ketik *${m.prefix}cekabsen*` +
      `Untuk admin yang mau hapus absen, silahkan ketik *${m.prefix}hapusabsen*`));
}

export { pluginConfig as config, handler };
