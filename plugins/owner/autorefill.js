// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import {
  enableRefill,
  disableRefill,
  getRefillStatus,
  triggerManualRefill,
} from "../../src/lib/nova-auto-refill.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "autorefill",
  alias: ["autorefill", "refill", "restock"],
  category: "owner",
  description: "Kelola auto refill notif — kirim pesan ke user saat energi di-refill",
  usage: ".autorefill <on/off/status/now> [HH:MM]",
  example: ".autorefill on 00:00",
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
    const status = getRefillStatus();

    const helpText = bracketBox("🔋", toSC("Auto Refill Notification"), [
      `${toSC("Notif user saat energi harian di-refill")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
      `${toSC("Last refill")}: ${status.lastRefill ? timeHelper.fromTimestamp(status.lastRefill, "DD MMM HH:mm") : "-"}`,
      `${toSC("Total terkirim")}: ${status.totalSent}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autorefill on 00:00`,
      `${m.prefix}autorefill off`,
      `${m.prefix}autorefill status`,
      `${m.prefix}autorefill now`,
    ]);

    const infoText = tipText(
      toSC("Bot reset energi semua user + kirim notif otomatis") + "\n" +
      toSC("Default jam 00:00 (tengah malam)")
    );

    return m.reply(helpText + "\n\n" + usageText + "\n\n" + infoText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const timeArg = args[1] || "00:00";

      if (!timeArg.match(/^\d{1,2}:\d{2}$/)) {
        return m.reply(claraWrap("autorefill", toSC("Format jam tidak valid! Gunakan HH:MM")));
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(claraWrap("autorefill", toSC("Jam tidak valid!")));
      }

      const result = enableRefill(hour, minute, sock);

      if (!result.success) {
        return m.reply(claraWrap("autorefill", `❌ ${toSC(result.error)}`));
      }

      await m.react("🐣");
      return m.reply(
        bracketBox("✅", toSC("Auto Refill Diaktifkan"), [
          `${toSC("Jadwal")}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`,
          `${toSC("Bot akan reset energi + kirim notif ke semua user")}`,
          `${toSC("Owner juga dapat laporan ringkasan")}`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableRefill();
      await m.react("🐣");
      return m.reply(claraWrap("autorefill", toSC("Auto Refill dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getRefillStatus();

      return m.reply(
        bracketBox("🔋", toSC("Status Auto Refill"), [
          `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
          `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
          `${toSC("Running")}: ${status.isRunning ? "✅" : "❌"}`,
          `${toSC("Last refill")}: ${status.lastRefill ? timeHelper.fromTimestamp(status.lastRefill, "DD MMM HH:mm") : "-"}`,
          `${toSC("Total terkirim")}: ${status.totalSent}`,
        ])
      );
    }

    case "now":
    case "manual":
    case "trigger": {
      await m.react("🕒");
      try {
        await triggerManualRefill(sock);
        await m.react("🐣");
        return m.reply(claraWrap("autorefill", toSC("Refill dijalankan! Energi semua user sudah di-reset + notif dikirim.")));
      } catch (error) {
        await m.react("❌");
        return m.reply(claraWrap("autorefill", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now`,
          `${m.prefix}autorefill on 00:00`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
