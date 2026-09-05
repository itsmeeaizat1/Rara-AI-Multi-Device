// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// scanvirus.js — Toggle auto-scan virus file di grup via VirusTotal
// Saat ON: setiap file (document) dari member di-scan otomatis ke VirusTotal
// (60+ engine) — ada notif "sedang di-scan" + hasil verdict lengkap.
// Owner & admin grup di-exempt. Default OFF saat pairing (aturan owner).
import { claraWrap, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: 'scanvirus',
  alias: ["scanvirus"],
  category: 'group',
  description: 'Toggle auto-scan virus file via VirusTotal di grup',
  usage: '.scanvirus on/off',
  example: '.scanvirus on',
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
  isAdmin: true,
  isBotAdmin: false
};

async function handler(m, { sock }) {
  try {
    if (!m.isAdmin && !m.isOwner) {
      await m.react("🚫");
      await m.reply(claraWrap("scanvirus", `Hanya admin grup yang bisa menggunakan fitur ini`, "error"));
      return { handled: true };
    }

    const args = m.args[0]?.toLowerCase();
    const db = getDatabase();
    const group = db.getGroup(m.chat) || {};

    if (!['on', 'off'].includes(args)) {
      const status = group.scanVirus === true ? '✅ Aktif' : '❌ Nonaktif';
      await m.reply(claraWrap("scanvirus", [
        `Fitur : Auto-scan virus file`,
        `Status : ${status}`,
        "",
        `📌 Saat aktif, semua file yang dikirim member di grup otomatis di-scan lewat VirusTotal.`,
        `💡 Contoh : ${m.prefix}scanvirus on`,
      ].join("\n")));
      return { handled: true };
    }

    group.scanVirus = args === 'on';
    db.setGroup(m.chat, group);

    if (args === 'on') {
      await m.reply(claraWrap("scanvirus", [
        `Auto-scan virus diaktifkan`,
        "",
        `Setiap file dari member bakal di-scan otomatis ke VirusTotal.`,
        `Owner & admin grup dikecualikan.`,
      ].join("\n"), "success"));
    } else {
      await m.reply(claraWrap("scanvirus", `Auto-scan virus dinonaktifkan`, "error"));
    }
    return { handled: true };
  } catch (error) {
    await m.reply(novaError("Scanvirus", `Gagal: ${error.message}`));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
