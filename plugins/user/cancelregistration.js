// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { clearRegistrationSession } from "./register.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bataldaftar",
  alias: ["bataldaftar"],
  category: "user",
  description: "Batalkan sesi pendaftaran atau hapus data registrasi",
  usage: ".bataldaftar",
  example: ".bataldaftar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();

  // Cek apakah ada sesi pendaftaran aktif
  const canceled = clearRegistrationSession(m.sender);

  if (canceled) {
    return m.reply(
      claraWrap("bataldaftar",
        `✅ Sesi pendaftaran berhasil dibatalkan.\n\nMulai lagi dengan: \`${m.prefix}daftar\``
      )
    );
  }

  // Tidak ada sesi aktif — cek apakah user sudah terdaftar
  const user = db.getUser(m.sender);
  if (user?.isRegistered) {
    return m.reply(
      claraWrap("bataldaftar",
        `ℹ️ Kamu sudah terdaftar!\n\n` +
        `Untuk menghapus data pendaftaran:\n` +
        `\`${m.prefix}unreg\` atau \`${m.prefix}bataldaftar\`\n\n` +
        `⚠️ Data yang dihapus tidak bisa dikembalikan.`
      )
    );
  }

  return m.reply(
    claraWrap("bataldaftar",
      `❌ Kamu tidak punya sesi pendaftaran aktif dan belum terdaftar.\n\nDaftar dengan: \`${m.prefix}daftar\``
    )
  );
}

export { pluginConfig as config, handler };
