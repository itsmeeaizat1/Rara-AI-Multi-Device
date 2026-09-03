// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

function getRegistrationContextInfo() {
  const saluranId = config.saluran?.id || "@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

  return {
    forwardingScore: 0,
    isForwarded: false,
  };
}

function toDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRegistrationStats(db) {
  const users = Object.values(db.getAllUsers() || {});
  const todayKey = toDateKey(new Date());

  return {
    totalRegistered: users.filter((user) => user?.isRegistered).length,
    registeredToday: users.filter(
      (user) =>
        toDateKey(user?.lastRegisteredAt || user?.registeredAt) === todayKey,
    ).length,
    unregisteredToday: users.filter(
      (user) => toDateKey(user?.unregisteredAt) === todayKey,
    ).length,
    activeSessions: Object.keys(global.registrationSessions || {}).length,
  };
}

const pluginConfig = {
  name: "sistemdaftar",
  alias: ["sistemdaftar"],
  category: "owner",
  description: "Kelola sistem wajib daftar dan statistik pendaftaran",
  usage: ".sistemdaftar <on/off/stats>",
  example: ".sistemdaftar stats",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,

  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.text?.trim() || "";
  const normalizedArgs = args.toLowerCase();

  const currentStatus =
    db.setting("registrationRequired") ?? config.registration?.enabled ?? false;
  const stats = getRegistrationStats(db);

  if (!normalizedArgs) {
    return m.reply( claraWrap("sIstem Daftar", `⚙️ *sIstem Daftar*\n\n` +
        `Status: ${currentStatus ? "✅ ON (Wajib Daftar)" : "❌ OFF"}\n\n` +
        `*Statistik:*\n` +
        `Total registered: *${stats.totalRegistered}*\n` +
        `Register hari ini: *${stats.registeredToday}*\n` +
        `Unreg hari ini: *${stats.unregisteredToday}*\n` +
        `Sesi aktif: *${stats.activeSessions}*\n\n` +
        `*Usage:*\n` +
        `\`${m.prefix}sistemdaftar on\` - Wajibkan daftar\n` +
        `\`${m.prefix}sistemdaftar off\` - Matikan wajib daftar\n` +
        `\`${m.prefix}sistemdaftar stats\` - Lihat statistik\n\n` +
        `Jika ON, user harus \`${m.prefix}daftar\` sebelum pakai command`), "sistemdaftar");
  }

  if (normalizedArgs === "stats") {
    await sock.sendMessage(
      m.chat,
      {
        text:
          `📊 *sTatistik Daftar*\n\n` +
          `Status sistem: ${currentStatus ? "✅ ON (Wajib Daftar)" : "❌ OFF"}\n\n` +
          "" +
          `Total registered: *${stats.totalRegistered}*\n` +
          `Register hari ini: *${stats.registeredToday}*\n` +
          `Unreg hari ini: *${stats.unregisteredToday}*\n` +
          `Sesi aktif: *${stats.activeSessions}*\n` +
          `---`,
        contextInfo: getRegistrationContextInfo(),
      },
      { quoted: m },
    );
    return;
  }

  if (
    normalizedArgs === "on" ||
    normalizedArgs === "1" ||
    normalizedArgs === "true"
  ) {
    db.setting("registrationRequired", true);
    await db.save();

    await sock.sendMessage(
      m.chat,
      {
        text:
          `✅ *sIstem Daftar Diaktifkan!*\n\n` +
          `User sekarang wajib daftar sebelum menggunakan command!\n\n` +
          `Command: \`${m.prefix}daftar\``,
        contextInfo: getRegistrationContextInfo(),
      },
      { quoted: m },
    );
    return;
  }

  if (
    normalizedArgs === "off" ||
    normalizedArgs === "0" ||
    normalizedArgs === "false"
  ) {
    db.setting("registrationRequired", false);
    await db.save();

    await sock.sendMessage(
      m.chat,
      {
        text:
          `❌ *sIstem Daftar Dinonaktifkan!*\n\n` +
          `User tidak perlu daftar untuk menggunakan command.`,
        contextInfo: getRegistrationContextInfo(),
      },
      { quoted: m },
    );

    return;
  }

  return m.reply(claraWrap("sistemdaftar", `❌ Option tidak valid!\n\nGunakan: \`on\`, \`off\`, atau \`stats\``,));
}

export { pluginConfig as config, handler };
