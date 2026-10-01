// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { persistLoad, persistSave } from "../../src/lib/rara-ram-persist.js";
import { runLiveTicker } from "../../src/lib/rara-countdown.js";
const pluginConfig = {
  name: "mulaiabsen",
  alias: ["mulaiabsen"],
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
  persistLoad("absensi"); // restore sesi absen dari db (anti hilang pas restart)
  const chatId = m.chat;

  if (global.absensi[chatId]) {
    return m.reply(raraWrap("Masih Ada Absen", 
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
  persistSave("absensi");

  const saluranId = config.saluran?.id || "@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

  // 🔹 LIVE COUNT-UP (13 Sep, pola AFK): kartu sesi nunjukin
  // 🕒 sesi berjalan yang nge-tick tiap detik ±12 dtk lalu settle —
  // biar admin langsung keliatan sesinya hidup + lama sesi berjalan.
  const startedTs = Date.now();
  const mulaiCard = (ms) => raraWrap("ABSEN UDAH JALAN NIHH",
      `「 📋 *InғO* 」\n` +
      `📝 ${keterangan}\n` +
      `👑 Dibuat oleh: @${m.sender.split("@")[0]}\n` +
      `⏰ Mulai: ${new Date(startedTs).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })} WIB\n` +
      `🕒 Sesi berjalan: ${Math.floor(ms / 1000)} detik\n` +
      `👥 Peserta: 0\n\n` +
      `Untuk kamu yang mau ikutan absen, silahkan ketik *${m.prefix}absen*\n` +
      `Untuk admin yang mau cek absen, silahkan ketik *${m.prefix}cekabsen*\n` +
      `Untuk admin yang mau hapus absen, silahkan ketik *${m.prefix}hapusabsen*`);
  return runLiveTicker({
    sock, chat: m.chat, m,
    mode: "up",
    sinceTs: startedTs,
    upRunMs: Number(process.env.NOVAABSEN_TICKER_MS) || 12000,
    initialCard: mulaiCard(0),
    tickCard: (st) => mulaiCard(st.elapsedMs),
    finalCard: (st) => mulaiCard(st.elapsedMs),
  }).then(() => { try { sock.sendMessage(m.chat, { mentions: [m.sender] }); } catch {} });
}

export { pluginConfig as config, handler };
