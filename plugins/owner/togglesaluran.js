import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import {
  NOTIFY_EVENTS,
  getAllNotifyStatus,
  setNotifyEnabled,
} from "../../src/lib/nova-saluran-broadcast.js";
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "togglesaluran",
  alias: ["togglasaluran", "salurantoggle", "notifsaluran", "togglenotif"],
  category: "owner",
  description: "Toggle on/off notifikasi saluran per event",
  usage: ".togglesaluran (lihat status) / .togglesaluran <event> (toggle) / .togglesaluran all on/off",
  example: ".togglesaluran\n.togglesaluran sewaRegister\n.togglesaluran all off",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = args[0]?.toLowerCase();

  // No args - show all toggle statuses
  if (!subCmd || subCmd === "status" || subCmd === "cek") {
    const statuses = getAllNotifyStatus();
    let onCount = 0;
    let offCount = 0;

    let text =
      claraWrap("Toggle Saluran", [`  ┊  ➶ Saluran: *${botConfig.saluran?.name || "-"}*`,
        `  ┊  ➶ Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`].join("\n")) +
      "\nSTATUS TOGGLE:\n\n";

    for (const [key, info] of Object.entries(statuses)) {
      const status = info.enabled ? "ON" : "OFF";
      const emoji = info.enabled ? "🟢" : "🔴";
      text += `${emoji} *${info.label}*\n`;
      text += `Status: *${status}* | Toggle: \`${prefix}togglesaluran ${key}\`\n\n`;
      if (info.enabled) onCount++;
      else offCount++;
    }

    text +=
      separator("━", 22) +
      "\n" +
      tipText(`ON: ${onCount} | OFF: ${offCount}`) + "\n" +
      tipText(`Toggle semua: \`${prefix}togglesaluran all on/off\``);

    return sendReplyWithNav(sock, m, text, "togglesaluran");
  }

  // Toggle all
  if (subCmd === "all") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Toggle Saluran", [`Gunakan: \`${prefix}togglesaluran all on\` atau \`${prefix}togglesaluran all off\``].join("\n")),
        "togglesaluran"
      );
    }

    const enabled = action === "on";
    let count = 0;
    for (const key of Object.keys(NOTIFY_EVENTS)) {
      setNotifyEnabled(key, enabled);
      count++;
    }

    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Toggle Saluran", "🔔") + "\n\n" +
      claraWrap("SEMUA EVENT", [
        `  ┊  ➶ Status: *${enabled ? "ALL ON" : "ALL OFF"}*`,
        `  ┊  ➶ Total: *${count} event*`,
      ]) + "\n\n" +
      tipText(`Cek status: \`${prefix}togglesaluran\``),
      "togglesaluran"
    );
  }

  // Toggle specific event
  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus();
    const current = statuses[subCmd].enabled;
    const newVal = !current;

    setNotifyEnabled(subCmd, newVal);

    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Toggle Saluran", "🔔") + "\n\n" +
      claraWrap("TOGGLE BERHASIL", [
        `  ┊  ➶ Event: *${NOTIFY_EVENTS[subCmd]}*`,
        `  ┊  ➶ Status: *${newVal ? "ON" : "OFF"}*`,
      ]) + "\n\n" +
      tipText(`${newVal ? "Notifikasi akan dikirim ke saluran" : "Notifikasi dimatikan"}`) + "\n" +
      tipText(`Cek semua: \`${prefix}togglesaluran\``),
      "togglesaluran"
    );
  }

  // Unknown event
  let availableList = "";
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
    availableList += `\`${key}\` — ${label}\n`;
  }

  return sendReplyWithNav(
    sock,
    m,
    claraWrap("Toggle Saluran", [`Event: *${subCmd}*`,
      `Tidak ada dalam daftar toggle`].join("\n")) + "\nEVENT TERSEDIA:\n\n" +
    availableList +
    "\n" + tipText(`Contoh: \`${prefix}togglesaluran sewaRegister\``),
    "togglesaluran"
  );
}

export { pluginConfig as config, handler };
