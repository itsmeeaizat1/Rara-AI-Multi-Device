// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

import { enableAutoBackup, disableAutoBackup, getBackupStatus, triggerManualBackup, formatInterval } from '../../src/lib/nova-auto-backup.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
  name: "autobackup",
  alias: ["autobackup"],
  category: "owner",
  description: "Kelola sistem auto backup",
  usage: ".autobackup <on/off/status/now> [interval]",
  example: ".autobackup on 5h",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.text?.trim().split(/\s+/) || [];
  const action = args[0]?.toLowerCase();

  if (!action) {
    const status = getBackupStatus();
    const ownerNum = config.owner?.number?.[0] || "Tidak diset";

    let txt = `🗂️ *Auto Backup sYstem*\n\n`;
    txt += `╭─「 ✦ sTatus ✦ 」\n`;
    txt += `│ 🔘 Status: ${status.enabled ? "✅ *ON*" : "❌ *OFF*"}\n`;
    txt += `│ ⏱️ Interval: ${status.interval}\n`;
    txt += `│ 📅 Last Backup: ${status.lastBackup ? timeHelper.fromTimestamp(status.lastBackup, "DD MMMM YYYY HH:mm:ss") : "-"}\n`;
    txt += `│ #️⃣ Total: ${status.backupCount} backup\n`;
    txt += `│ 📤 Dikirim ke: ${ownerNum}\n`;
    txt += `╰┈┈┈┈┈┈┈┈\n\n`;

    txt += `*Cara Pakai:*\n`;
    txt += `\`${m.prefix}autobackup on <interval>\`\n`;
    txt += `\`${m.prefix}autobackup off\`\n`;
    txt += `\`${m.prefix}autobackup status\`\n`;
    txt += `\`${m.prefix}autobackup now\`\n\n`;

    txt += `*Format Interval:*\n`;
    txt += `\`5m\` = 5 menit\n`;
    txt += `\`1h\` = 1 jam\n`;
    txt += `\`6h\` = 6 jam\n`;
    txt += `\`1d\` = 1 hari\n\n`;

    txt += `*Contoh:*\n`;
    txt += `\`${m.prefix}autobackup on 6h\` - backup setiap 6 jam`;

    return await m.reply( txt, "autobackup");
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const interval = args[1];

      if (!interval) {
        return m.reply(
          `⚠️ *Interval Dibutuhkan*\n\n` +
            `\`${m.prefix}autobackup on <interval>\`\n\n` +
            `*Contoh:*\n` +
            `\`${m.prefix}autobackup on 30m\` - tiap 30 menit\n` +
            `\`${m.prefix}autobackup on 6h\` - tiap 6 jam\n` +
            `\`${m.prefix}autobackup on 1d\` - tiap 1 hari`,
        );
      }

      const result = enableAutoBackup(interval, sock);

      if (!result.success) {
        return m.reply(claraWrap("autobackup", `❌ *Gagal*\n\n${result.error}`));
      }

      const ownerNum = config.owner?.number?.[0] || "Owner #1";
      return m.reply(
        `✅ *Auto Backup Diaktifkan*\n\n` +
          `╭─「 ✦ sEttings ✦ 」\n` +
          `│ ⏱️ Interval: ${result.interval}\n` +
          `│ 📤 Dikirim ke: ${ownerNum}\n` +
          `│ 📦 Exclude: node_modules, .git, storages, dll\n` +
          `╰┈┈┈┈┈┈┈┈\n\n` +
          `Backup pertama akan dikirim dalam ${result.interval}`,
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableAutoBackup();
      return m.reply(
        `❌ *Auto Backup Dinonaktifkan*\n\n` +
          `Backup otomatis sudah dihentikan.\n` +
          `Gunakan \`${m.prefix}autobackup on <interval>\` untuk mengaktifkan kembali.`,
      );
    }

    case "status":
    case "info": {
      const status = getBackupStatus();
      const ownerNum = config.owner?.number?.[0] || "Tidak diset";

      let txt = `🗂️ *sTatus Auto Backup*\n\n`;
      txt += `╭─「 ✦ Info ✦ 」\n`;
      txt += `│ 🔘 Enabled: ${status.enabled ? "✅ Ya" : "❌ Tidak"}\n`;
      txt += `│ ⏱️ Interval: ${status.interval}\n`;
      txt += `│ 🔄 Running: ${status.isRunning ? "✅ Ya" : "❌ Tidak"}\n`;
      txt += `│ 📅 Last: ${status.lastBackup ? timeHelper.fromTimestamp(status.lastBackup, "DD MMMM YYYY HH:mm:ss") : "-"}\n`;
      txt += `│ #️⃣ Total: ${status.backupCount} backup\n`;
      txt += `│ 📤 Target: ${ownerNum}\n`;
      txt += `╰┈┈┈┈┈┈┈┈`;

      return await m.reply(claraWrap("autobackup", txt));
    }

    case "now":
    case "manual":
    case "trigger": {
      try {
        await triggerManualBackup(sock);
        return m.reply(
          `✅ *Backup sElesai*\n\nBackup telah dikirim ke owner!`,
        );
      } catch (error) {
        await m.reply(claraWrap("autobackup", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    default:
      return m.reply(
        `⚠️ *Action Tidak Valid*\n\n` +
          `Pilih: \`on\`, \`off\`, \`status\`, atau \`now\`\n` +
          `Contoh: \`${m.prefix}autobackup on 6h\``,
      );
  }
}

export { pluginConfig as config, handler }