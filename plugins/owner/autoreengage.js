// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC, bracketBox, tipText } from "../../src/lib/rara-menu-style.js";
import {
  enableReengage,
  disableReengage,
  getReengageStatus,
  triggerManualReengage,
  resetContacted,
  findInactiveUsers,
} from "../../src/lib/rara-auto-reengage.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import * as timeHelper from "../../src/lib/rara-time.js";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";

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
        return m.reply(raraWrap("autoreengage", toSC("Format jam tidak valid! Gunakan HH:MM")));
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(raraWrap("autoreengage", toSC("Jam tidak valid!")));
      }

      if (thresholdDays < 1) {
        return m.reply(raraWrap("autoreengage", toSC("Threshold minimal 1 hari!")));
      }

      const result = enableReengage(hour, minute, thresholdDays, sock);

      if (!result.success) {
        return m.reply(raraWrap("autoreengage", `❌ ${toSC(result.error)}`));
      }
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
      return m.reply(raraWrap("autoreengage", toSC("Re-engagement dinonaktifkan")));
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
      try {
        await triggerManualReengage(sock);
        return m.reply(raraWrap("autoreengage", toSC("Re-engagement dijalankan! Cek DM untuk laporan.")));
      } catch (error) {
        return m.reply(raraWrap("autoreengage", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    case "reset": {
      resetContacted();
      return m.reply(raraWrap("autoreengage", toSC("List contacted di-reset. User bisa dikirimi pesan re-engage lagi.")));
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
