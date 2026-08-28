// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import {
  enableReengage,
  disableReengage,
  getReengageStatus,
  triggerManualReengage,
  resetContacted,
  findInactiveUsers,
} from "../../src/lib/nova-auto-reengage.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "autoreengage",
  alias: ["autoreengage", "reengage", "followup"],
  category: "owner",
  description: "Kelola auto re-engagement — kirim pesan ke user yang lama tidak aktif",
  usage: ".autoreengage <on/off/status/now/reset> [HH:MM] [threshold_hari]",
  example: ".autoreengage on 10:00 7",
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
    const status = getReengageStatus();

    const helpText = bracketBox("👋", toSC("Auto Re-engagement"), [
      `${toSC("Kirim pesan ke user yang lama tidak aktif")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
      `${toSC("Threshold")}: ${status.inactiveThresholdDays} ${toSC("hari")}`,
      `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
      `${toSC("Total terkirim")}: ${status.totalSent}`,
      `${toSC("User dikontak")}: ${status.contactedCount}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autoreengage on 10:00 7`,
      `${m.prefix}autoreengage off`,
      `${m.prefix}autoreengage status`,
      `${m.prefix}autoreengage now`,
      `${m.prefix}autoreengage reset`,
    ]);

    return m.reply(helpText + "\n\n" + usageText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const timeArg = args[1] || "10:00";
      const thresholdDays = parseInt(args[2]) || 7;

      if (!timeArg.match(/^\d{1,2}:\d{2}$/)) {
        return m.reply(claraWrap("autoreengage", toSC("Format jam tidak valid! Gunakan HH:MM")));
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(claraWrap("autoreengage", toSC("Jam tidak valid!")));
      }

      if (thresholdDays < 1) {
        return m.reply(claraWrap("autoreengage", toSC("Threshold minimal 1 hari!")));
      }

      const result = enableReengage(hour, minute, thresholdDays, sock);

      if (!result.success) {
        return m.reply(claraWrap("autoreengage", `❌ ${toSC(result.error)}`));
      }

      await m.react("🐣");
      return m.reply(
        bracketBox("✅", toSC("Re-engagement Diaktifkan"), [
          `${toSC("Jadwal")}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`,
          `${toSC("Threshold")}: ${thresholdDays} ${toSC("hari")}`,
          `${toSC("Bot akan kirim pesan ke user yang inactive")} ${thresholdDays}+ ${toSC("hari")}`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableReengage();
      await m.react("🐣");
      return m.reply(claraWrap("autoreengage", toSC("Re-engagement dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getReengageStatus();

      // Cek juga berapa user yang inactive sekarang
      const db = getDatabase();
      const inactive = findInactiveUsers(db, status.inactiveThresholdDays);

      const lines = [
        `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
        `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
        `${toSC("Threshold")}: ${status.inactiveThresholdDays} ${toSC("hari")}`,
        `${toSC("Running")}: ${status.isRunning ? "✅" : "❌"}`,
        `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
        `${toSC("Total terkirim")}: ${status.totalSent}`,
        `${toSC("User dikontak")}: ${status.contactedCount}`,
        "",
        `${toSC("User inactive sekarang")}: ${inactive.length}`,
      ];

      if (inactive.length > 0 && inactive.length <= 5) {
        inactive.forEach((u, i) => {
          lines.push(`${i + 1}. ${u.name} (${u.daysInactive} ${toSC("hari")})`);
        });
      } else if (inactive.length > 5) {
        inactive.slice(0, 5).forEach((u, i) => {
          lines.push(`${i + 1}. ${u.name} (${u.daysInactive} ${toSC("hari")})`);
        });
        lines.push(`... ${toSC("dan")} ${inactive.length - 5} ${toSC("lainnya")}`);
      }

      return m.reply(bracketBox("👋", toSC("Re-engagement Status"), lines));
    }

    case "now":
    case "manual":
    case "trigger": {
      await m.react("🕒");
      try {
        await triggerManualReengage(sock);
        await m.react("🐣");
        return m.reply(claraWrap("autoreengage", toSC("Re-engagement dijalankan! Cek DM untuk laporan.")));
      } catch (error) {
        await m.react("❌");
        return m.reply(claraWrap("autoreengage", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    case "reset": {
      resetContacted();
      await m.react("🐣");
      return m.reply(claraWrap("autoreengage", toSC("List contacted di-reset. User bisa dikirimi pesan re-engage lagi.")));
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now, reset`,
          `${m.prefix}autoreengage on 10:00 7`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
