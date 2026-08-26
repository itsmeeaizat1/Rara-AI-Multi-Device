// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// togglesaluran.js — Toggle on/off notifikasi saluran per event
// Command: .switch saluran (status) / .switch saluran <event> / .switch saluran all on/off

import {
  NOTIFY_EVENTS,
  getAllNotifyStatus,
  setNotifyEnabled,
} from "../../src/lib/nova-saluran-broadcast.js";
import { claraWrap, tipText, separator } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "switch",
  alias: ["switch", "togglesaluran", "togglasaluran", "salurantoggle", "notifsaluran", "togglenotif", "saluran"],
  category: "owner",
  description: "Switch on/off fitur (saluran, broadcast, dll)",
  usage: ".switch saluran (lihat status) / .switch saluran <event> (toggle) / .switch saluran all on/off",
  example: ".switch saluran\n.switch saluran sewaRegister\n.switch saluran all on\n.switch saluran all off",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.args || [];
    const subCmd = args[0]?.toLowerCase();

    // No args - show usage
    if (!subCmd) {
      return await m.reply(claraWrap("Switch", "⚙️") + "\n\n" + claraWrap("Cara Pakai", [
        `│ ❏ \`${prefix}switch saluran\` — Lihat status saluran`,
        `│ ❏ \`${prefix}switch saluran <event>\` — Toggle event`,
        `│ ❏ \`${prefix}switch saluran all on\` — Aktifkan semua`,
        `│ ❏ \`${prefix}switch saluran all off\` — Matikan semua`,
      ]) + "\n\n" + tipText(`Contoh: \`${prefix}switch saluran all on\``));
    }

    // If first arg is "saluran", shift to get the actual subcommand
    let eventCmd = subCmd;
    if (subCmd === "saluran") {
      eventCmd = args[1]?.toLowerCase();
    }

    // No event - show all toggle statuses
    if (!eventCmd || eventCmd === "status" || eventCmd === "cek") {
      const statuses = getAllNotifyStatus();
      let onCount = 0;
      let offCount = 0;

      let text =
        claraWrap("Switch Saluran", [`│ ❏ Saluran: *${botConfig.saluran?.name || "Belum diset"}*`, `│ ❏ Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`].join("\n")) +
        "\nSTATUS TOGGLE:\n\n";

      for (const [key, info] of Object.entries(statuses)) {
        const status = info.enabled ? "ON" : "OFF";
        const emoji = info.enabled ? "🟢" : "🔴";
        text += `${emoji} *${info.label}*\n`;
        text += `Status: *${status}* | Toggle: \`${prefix}switch saluran ${key}\`\n\n`;
        if (info.enabled) onCount++;
        else offCount++;
      }

      text +=
        separator("━", 22) +
        "\n" +
        tipText(`ON: ${onCount} | OFF: ${offCount}`) + "\n" +
        tipText(`Toggle semua: \`${prefix}switch saluran all on/off\``);

      return m.reply(text);
    }

    // Toggle all
    if (eventCmd === "all") {
      const action = (subCmd === "saluran" ? args[2] : args[1])?.toLowerCase();
      if (action !== "on" && action !== "off") {
        return await m.reply(claraWrap("Switch Saluran", `Gunakan: \`${prefix}switch saluran all on\` atau \`${prefix}switch saluran all off\``));
      }

      const enabled = action === "on";
      let count = 0;
      for (const key of Object.keys(NOTIFY_EVENTS)) {
        setNotifyEnabled(key, enabled);
        count++;
      }

      await m.reply(claraWrap("Switch Saluran", "🔔") + "\n\n" + claraWrap("SEMUA EVENT", [`│ ❏ Status: *${enabled ? "ALL ON" : "ALL OFF"}*`, `│ ❏ Total: *${count} event*`]) + "\n\n" + tipText(`Cek status: \`${prefix}switch saluran\``));
    }

    // Toggle specific event
    if (NOTIFY_EVENTS[eventCmd]) {
      const statuses = getAllNotifyStatus();
      const current = statuses[eventCmd].enabled;
      const newVal = !current;

      setNotifyEnabled(eventCmd, newVal);

      await m.reply(claraWrap("Switch Saluran", "🔔") + "\n\n" + claraWrap("TOGGLE BERHASIL", [`│ ❏ Event: *${NOTIFY_EVENTS[eventCmd]}*`, `│ ❏ Status: *${newVal ? "ON" : "OFF"}*`]) + "\n\n" + tipText(`${newVal ? "Notifikasi akan dikirim ke saluran" : "Notifikasi dimatikan"}`) + "\n" + tipText(`Cek semua: \`${prefix}switch saluran\``));
    }

    // Unknown event
    let availableList = "";
    for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
      availableList += `\`${key}\` — ${label}\n`;
    }

    return await m.reply(claraWrap("Switch Saluran", [`Event: *${eventCmd}*`, `Tidak ada dalam daftar toggle`].join("\n")) + "\nEVENT TERSEDIA:\n\n" + availableList + "\n" + tipText(`Contoh: \`${prefix}switch saluran sewaRegister\``));
  } catch (e) {
    return m.reply(`Error: ${e.message || e}`);
  }
}

export { pluginConfig as config, handler };
