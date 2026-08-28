// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import {
  enableHealthCheck,
  disableHealthCheck,
  getHealthStatus,
  triggerManualCheck,
  getApiEndpoints,
} from "../../src/lib/nova-auto-api-health.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "autohealth",
  alias: ["autohealth", "apicheck", "aphealth"],
  category: "owner",
  description: "Kelola auto API health check — notif owner kalau API down",
  usage: ".autohealth <on/off/status/now/list> [interval_menit]",
  example: ".autohealth on 30",
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
    const status = getHealthStatus();

    const helpText = bracketBox("🩺", toSC("Auto API Health Check"), [
      `${toSC("Cek API eksternal otomatis")}`,
      `${toSC("Notif owner kalau ada API yang down")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Interval")}: ${status.intervalMinutes} ${toSC("menit")}`,
      `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
      `${toSC("Total check")}: ${status.totalChecks}`,
      `${toSC("Total down")}: ${status.totalDown}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autohealth on 30`,
      `${m.prefix}autohealth off`,
      `${m.prefix}autohealth status`,
      `${m.prefix}autohealth now`,
      `${m.prefix}autohealth list`,
    ]);

    return m.reply(helpText + "\n\n" + usageText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const interval = parseInt(args[1]) || 30;

      if (interval < 5) {
        return m.reply(claraWrap("autohealth", toSC("Interval minimal 5 menit!")));
      }

      const result = enableHealthCheck(interval, sock);

      if (!result.success) {
        return m.reply(claraWrap("autohealth", `❌ ${toSC(result.error)}`));
      }

      await m.react("🐣");
      return m.reply(
        bracketBox("✅", toSC("API Health Check Diaktifkan"), [
          `${toSC("Interval")}: ${interval} ${toSC("menit")}`,
          `${toSC("Bot akan cek API tiap")} ${interval} ${toSC("menit")}`,
          `${toSC("Notif dikirim kalau ada API down/recovered")}`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableHealthCheck();
      await m.react("🐣");
      return m.reply(claraWrap("autohealth", toSC("API Health Check dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getHealthStatus();
      const endpoints = getApiEndpoints();

      const lines = [
        `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
        `${toSC("Interval")}: ${status.intervalMinutes} ${toSC("menit")}`,
        `${toSC("Running")}: ${status.isRunning ? "✅" : "❌"}`,
        `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM HH:mm") : "-"}`,
        `${toSC("Total checks")}: ${status.totalChecks}`,
        `${toSC("Total down")}: ${status.totalDown}`,
        "",
        `${toSC("API Status")}:`,
      ];

      for (const ep of endpoints) {
        const apiStatus = status.apiStatus[ep.name] || { status: "unknown" };
        const icon = apiStatus.status === "up" ? "✅" : apiStatus.status === "down" ? "❌" : apiStatus.status === "warning" ? "⚠️" : "❓";
        lines.push(`${icon} ${ep.name}: ${apiStatus.status || "unknown"}`);
      }

      return m.reply(bracketBox("🩺", toSC("API Health Status"), lines));
    }

    case "now":
    case "manual":
    case "check":
    case "trigger": {
      await m.react("🕒");
      try {
        await triggerManualCheck(sock);
        await m.react("🐣");
        return m.reply(claraWrap("autohealth", toSC("Health check selesai! Lihat notif di DM owner.")));
      } catch (error) {
        await m.react("❌");
        return m.reply(claraWrap("autohealth", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    case "list": {
      const endpoints = getApiEndpoints();
      const lines = endpoints.map((ep, i) => `${i + 1}. ${ep.name} — ${ep.url}`);

      return m.reply(bracketBox("🩺", toSC("API Endpoints"), lines));
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now, list`,
          `${m.prefix}autohealth on 30`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
