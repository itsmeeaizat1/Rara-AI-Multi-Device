// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import {
  enableRenewalReminder,
  disableRenewalReminder,
  getRenewalStatus,
  triggerManualRenewal,
  findExpiringUsers,
} from "../../src/lib/nova-auto-renewal.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "autorenewal",
  alias: ["autorenewal", "renewal", "premiumreminder"],
  category: "owner",
  description: "Kelola auto renewal reminder — notif premium user H-3 sebelum expired",
  usage: ".autorenewal <on/off/status/now/list> [HH:MM] [reminder_days]",
  example: ".autorenewal on 09:00 3",
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
    const status = getRenewalStatus();

    const helpText = bracketBox("💎", toSC("Auto Renewal Reminder"), [
      `${toSC("Notif premium user H-")}${status.reminderDays} ${toSC("sebelum expired")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
      `${toSC("Reminder")}: H-${status.reminderDays}`,
      `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
      `${toSC("Total terkirim")}: ${status.totalSent}`,
      `${toSC("Akan expired")}: ${status.expiringCount} ${toSC("user")}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autorenewal on 09:00 3`,
      `${m.prefix}autorenewal off`,
      `${m.prefix}autorenewal status`,
      `${m.prefix}autorenewal now`,
      `${m.prefix}autorenewal list`,
    ]);

    return m.reply(helpText + "\n\n" + usageText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const timeArg = args[1] || "09:00";
      const reminderDays = parseInt(args[2]) || 3;

      if (!timeArg.match(/^\d{1,2}:\d{2}$/)) {
        return m.reply(claraWrap("autorenewal", toSC("Format jam tidak valid! Gunakan HH:MM")));
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(claraWrap("autorenewal", toSC("Jam tidak valid!")));
      }

      if (reminderDays < 1 || reminderDays > 30) {
        return m.reply(claraWrap("autorenewal", toSC("Reminder days harus 1-30!")));
      }

      const result = enableRenewalReminder(hour, minute, reminderDays, sock);

      if (!result.success) {
        return m.reply(claraWrap("autorenewal", `❌ ${toSC(result.error)}`));
      }

      await m.react("🐣");
      return m.reply(
        bracketBox("✅", toSC("Renewal Reminder Diaktifkan"), [
          `${toSC("Jadwal")}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`,
          `${toSC("Reminder")}: H-${reminderDays} ${toSC("sebelum expired")}`,
          `${toSC("Bot kirim notif ke premium user yang akan expired")}`,
          `${toSC("Anti-spam: 1x per user per hari")}`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableRenewalReminder();
      await m.react("🐣");
      return m.reply(claraWrap("autorenewal", toSC("Renewal Reminder dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getRenewalStatus();

      const lines = [
        `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
        `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
        `${toSC("Reminder")}: H-${status.reminderDays}`,
        `${toSC("Running")}: ${status.isRunning ? "✅" : "❌"}`,
        `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
        `${toSC("Total terkirim")}: ${status.totalSent}`,
        `${toSC("Akan expired")}: ${status.expiringCount} ${toSC("user")}`,
      ];

      if (status.expiring.length > 0) {
        lines.push("");
        lines.push(`${toSC("List akan expired")}:`);
        status.expiring.forEach((u, i) => {
          lines.push(`${i + 1}. ${u.name} — H-${u.daysLeft} (${u.expiryDate})`);
        });
      }

      return m.reply(bracketBox("💎", toSC("Status Renewal Reminder"), lines));
    }

    case "now":
    case "manual":
    case "trigger":
    case "check": {
      await m.react("🕒");
      try {
        await triggerManualRenewal(sock);
        await m.react("🐣");
        return m.reply(claraWrap("autorenewal", toSC("Renewal check dijalankan! Cek DM untuk laporan.")));
      } catch (error) {
        await m.react("❌");
        return m.reply(claraWrap("autorenewal", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    case "list": {
      const status = getRenewalStatus();
      const expiring = status.expiring;

      if (expiring.length === 0) {
        return m.reply(claraWrap("autorenewal", toSC("Tidak ada premium user yang akan expired dalam H-") + status.reminderDays));
      }

      const lines = expiring.map((u, i) => `${i + 1}. ${u.name} — H-${u.daysLeft} (${u.expiryDate})`);

      return m.reply(bracketBox("💎", toSC("Premium Expiring List"), lines));
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now, list`,
          `${m.prefix}autorenewal on 09:00 3`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
