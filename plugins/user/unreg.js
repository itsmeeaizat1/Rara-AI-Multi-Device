// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "unreg",
  alias: ["unreg", "bataldaftar", "batalregistrasi"],
  category: "user",
  description: "Batalkan / hapus data pendaftaran kamu dari bot",
  usage: ".unreg",
  example: ".unreg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user?.isRegistered) {
    return m.reply(claraWrap("unreg",
      `❌ Kamu belum terdaftar!\n\nDaftar dengan \`${m.prefix}daftar\``
    ));
  }

  // Simpan info sebelum dihapus
  const prevName = user.regName || "Unknown";
  const prevSerial = user.regSerial || "-";
  const unregisteredAt = new Date().toISOString();

  // Hapus data registrasi
  db.setUser(m.sender, {
    isRegistered: false,
    regName: null,
    regEmail: null,
    regAge: null,
    regGender: null,
    regSerial: null,
    unregisteredAt,
    hasClaimedRegisterReward: false,
  });

  // Tidak mengambil kembali reward yang sudah diberikan (koin/exp/energi tetap)
  await db.save();

  // Reaksi loading
  await m.react("🐣");

  let txt = "╭──「 Batal Daftar 」\n";
  txt += "│\n";
  txt += "│ ✅ Data pendaftaran berhasil dihapus\n";
  txt += "│\n";
  txt += "├──「 *Data Dihapus* 」\n";
  txt += "│ 📛 Nama: " + prevName + "\n";
  txt += "│ 🔑 SN: " + prevSerial + "\n";
  txt += "│ 📅 Batal pada: " + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB\n";
  txt += "│\n";
  txt += "│ 💡 Daftar ulang kapan saja dengan `.daftar`\n";
  txt += "│ ⚠️ Reward daftar tidak bisa diklaim ulang\n";
  txt += "╰──────────";

  await sock.sendMessage(m.chat, { text: txt }, { quoted: m });
}

export { pluginConfig as config, handler };
