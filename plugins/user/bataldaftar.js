// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { clearRegistrationSession } from "./daftar.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bataldaftar",
  alias: ["bataldaftar"],
  category: "user",
  description: "Batalkan sesi pendaftaran yang sedang aktif",
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
  const canceled = clearRegistrationSession(m.sender);

  if (!canceled) {
    { const __navText = claraWrap("bataldaftar", `❌ Kamu tidak punya sesi pendaftaran aktif.`); return await m.reply(__navText); };
  }

  return m.reply(
    `✅ Sesi pendaftaran berhasil dibatalkan.\n\n` +
      `Mulai lagi dengan: \`${m.prefix}daftar\``,
  );
}

export { pluginConfig as config, handler };
