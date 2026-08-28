// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import {
  enableAutoBirthday,
  disableAutoBirthday,
  getBirthdayStatus,
  setBirthday,
  getBirthday,
  checkTodayBirthdays,
  triggerManualBirthday,
} from "../../src/lib/nova-auto-birthday.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "autoulah",
  alias: ["autoulah", "autobday", "autobirthday"],
  category: "owner",
  description: "Kelola auto birthday reminder",
  usage: ".autoulah <on/off/status/now> [HH:MM]",
  example: ".autoulah on 08:00",
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
    const status = getBirthdayStatus();

    const helpText = bracketBox("🎂", toSC("Auto Birthday Reminder"), [
      `${toSC("Bot otomatis kirim ucapan ulang tahun ke user")}`,
      "",
      `${toSC("Status")}: ${status.enabled ? "✅ ON" : "❌ OFF"}`,
      `${toSC("Jadwal cek")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
      `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM YYYY HH:mm") : "-"}`,
      `${toSC("Total dikirim")}: ${status.birthdaysSent || 0}`,
    ]);

    const usageText = bracketBox("💡", toSC("Cara Pakai"), [
      `${m.prefix}autoulah on 08:00`,
      `${m.prefix}autoulah off`,
      `${m.prefix}autoulah status`,
      `${m.prefix}autoulah now`,
    ]);

    const infoText = tipText(
      toSC("User set tanggal lahir dengan .setultah DD-MM") + "\n" +
      toSC("Bot cek tiap hari, kirim ucapan ke yang ultah")
    );

    return m.reply(helpText + "\n\n" + usageText + "\n\n" + infoText);
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const timeArg = args[1] || "08:00";

      if (!timeArg.match(/^\d{1,2}:\d{2}$/)) {
        return m.reply(
          bracketBox("❗", toSC("Format Jam Dibutuhkan"), [
            `${toSC("Gunakan format HH:MM")}`,
            `${m.prefix}autoulah on 08:00`,
          ])
        );
      }

      const [hour, minute] = timeArg.split(":").map(Number);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return m.reply(claraWrap("autoulah", toSC("Jam tidak valid!")));
      }

      const result = enableAutoBirthday(hour, minute, sock);

      if (!result.success) {
        return m.reply(claraWrap("autoulah", `❌ ${toSC(result.error || "Gagal")}`));
      }

      await m.react("🐣");
      return m.reply(
        bracketBox("✅", toSC("Auto Birthday Diaktifkan"), [
          `${toSC("Jadwal cek")}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`,
          `${toSC("Bot akan cek user yang ultah tiap hari")}`,
          `${toSC("Pastikan user sudah set tanggal lahir")}: .setultah DD-MM`,
        ])
      );
    }

    case "off":
    case "disable":
    case "stop": {
      disableAutoBirthday();
      await m.react("🐣");
      return m.reply(claraWrap("autoulah", toSC("Auto Birthday dinonaktifkan")));
    }

    case "status":
    case "info": {
      const status = getBirthdayStatus();

      // Cek juga siapa yang ultah hari ini
      const db = getDatabase();
      const todayBdays = checkTodayBirthdays(db);

      const lines = [
        `${toSC("Enabled")}: ${status.enabled ? "✅" : "❌"}`,
        `${toSC("Jadwal")}: ${String(status.hour).padStart(2, "0")}:${String(status.minute).padStart(2, "0")} WIB`,
        `${toSC("Last check")}: ${status.lastCheck ? timeHelper.fromTimestamp(status.lastCheck, "DD MMM YYYY HH:mm") : "-"}`,
        `${toSC("Total dikirim")}: ${status.birthdaysSent || 0}`,
        "",
        `${toSC("Ultah hari ini")}: ${todayBdays.length} ${toSC("user")}`,
      ];

      if (todayBdays.length > 0) {
        todayBdays.slice(0, 5).forEach((u, i) => {
          lines.push(`${i + 1}. ${u.name || u.jid} — ${u.birthday}`);
        });
        if (todayBdays.length > 5) {
          lines.push(`... ${toSC("dan")} ${todayBdays.length - 5} ${toSC("lainnya")}`);
        }
      }

      return m.reply(bracketBox("🎂", toSC("Status Auto Birthday"), lines));
    }

    case "now":
    case "manual":
    case "trigger": {
      await m.react("🕒");
      try {
        await triggerManualBirthday(sock);
        await m.react("🐣");
        return m.reply(claraWrap("autoulah", toSC("Cek birthday dijalankan! User yang ultah hari ini sudah dikirim ucapan.")));
      } catch (error) {
        await m.react("❌");
        return m.reply(claraWrap("autoulah", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    default:
      return m.reply(
        bracketBox("❗", toSC("Action Tidak Valid"), [
          `${toSC("Pilih")}: on, off, status, now`,
          `${m.prefix}autoulah on 08:00`,
        ])
      );
  }
}

export { pluginConfig as config, handler };
