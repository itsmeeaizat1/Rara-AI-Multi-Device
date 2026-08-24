// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "unreg",
  alias: ["unregister", "hapusdaftar"],
  category: "user",
  description: "Hapus data pendaftaran kamu dari bot",
  usage: ".unreg",
  example: ".unreg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user?.isRegistered) {
    return m.reply(claraWrap("unreg", `❌ Kamu belum terdaftar!\n\n` + `Daftar dengan \`${m.prefix}daftar\``));
  }

  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";
  const unregisteredAt = new Date().toISOString();

  db.setUser(m.sender, {
    isRegistered: false,
    regName: null,
    regEmail: null,
    regAge: null,
    regGender: null,
    regSerial: null,
    unregisteredAt,
  });

  await db.save();

  await sock.sendMessage(
    m.chat,
    {
      text:
        `✅ *Unregister Berhasil!*\n\n` +
        `Data pendaftaran kamu sudah dihapus.\n\n` +
        `Untuk daftar ulang: \`${m.prefix}daftar\``,
      contextInfo: {
        forwardingScore: 0,
        isForwarded: false,
      },
    },
    { quoted: m },
  );

  m.react("🐣");
}

export { pluginConfig as config, handler };
