// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC, bracketBox, tipText } from "../../src/lib/rara-menu-style.js";
import {
  enableAutoReport,
  disableAutoReport,
  getReportStatus,
  triggerManualReport,
} from "../../src/lib/rara-auto-report.js";
import * as timeHelper from "../../src/lib/rara-time.js";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "autoreport",
  alias: ["autoreport", "ar", "laporan"],
  category: "owner",
  description: "Kelola auto report harian ke owner",
  usage: ".autoreport <on/off/status/now> [HH:MM]",
  example: ".autoreport on 23:00",
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
    const status = getReportStatus();
    const ownerNum = config.owner?.number?.[0] || "Tidak diset";

    const helpText = bracketBox("📊", toSC("Auto Report Harian"), [
      `${toSC("Laporan otomatis tiap hari ke owner")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
      `${toSC("Last Report")}: ${status.lastReport ? timeHelper.fromTimestamp(status.lastReport, "DD MMM YYYY HH:mm") : "-"}`,
      `${toSC("Total Report")}: ${status.reportCount || 0}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autoreport on 23:00`,
      `${m.prefix}autoreport on 08:00`,
      `${m.prefix}autoreport off`,
      `${m.prefix}autoreport status`,
      `${m.prefix}autoreport now`,
    ]);

    return m.reply(helpText + "\n\n" + usageText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const timeArg = args[1];

      if (!timeArg || !timeArg.match(/^\d{1,2}:\d{2}$/)) {
        return m.reply(
          bracketBox("❗", toSC("Format Jam Dibutuhkan"), [
            `${toSC("Gunakan format HH:MM")}`,
            "",
            `${toSC("Contoh")}:`,
            `${m.prefix}autoreport on 23:00`,
            `${m.prefix}autoreport on 08:30`,
          ])
        );
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(raraWrap("autoreport", toSC("Jam tidak valid! Gunakan format 24 jam (00:00 - 23:59)")));
      }

      const result = enableAutoReport(hour, minute, sock);

      if (!result.success) {
        return m.reply(raraWrap("autoreport", `❌ ${toSC(result.error || "Gagal mengaktifkan")}`));
      }
      return m.reply(
        bracketBox("✅", toSC("Auto Report Diaktifkan"), [
          `${toSC("Jadwal")}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`,
          `${toSC("Dikirim ke")}: ${config.owner?.number?.[0] || "Owner"}`,
          `${toSC("Isi")}: ${toSC("User baru, command terpopuler, error, uptime, memory")}`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableAutoReport();
      return m.reply(raraWrap("autoreport", toSC("Auto Report dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getReportStatus();

      return m.reply(
        bracketBox("📊", toSC("Status Auto Report"), [
          `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
          `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
          `${toSC("Running")}: ${status.isRunning ? "✅" : "❌"}`,
          `${toSC("Last Report")}: ${status.lastReport ? timeHelper.fromTimestamp(status.lastReport, "DD MMM YYYY HH:mm") : "-"}`,
          `${toSC("Total")}: ${status.reportCount || 0} ${toSC("report")}`,
        ])
      );
    }

    case "now":
    case "manual":
    case "trigger": {
      try {
        await triggerManualReport(sock);
        return m.reply(raraWrap("autoreport", toSC("Report harian dikirim ke owner!")));
      } catch (error) {
        return m.reply(raraWrap("autoreport", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now`,
          `${toSC("Contoh")}: ${m.prefix}autoreport on 23:00`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
