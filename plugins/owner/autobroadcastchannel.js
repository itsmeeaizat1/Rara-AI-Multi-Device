// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaBox } from "../../src/lib/nova-menu-style.js";
import {
  NOTIFY_EVENTS,
  getAllNotifyStatus,
  setNotifyEnabled,
} from "../../src/lib/nova-saluran-broadcast.js";

const pluginConfig = {
  name: "autobroadcastchannel",
  alias: ["autobroadcastchannel", "autobcsaluran", "autobc", "autobroadcast", "autosaluran", "autobcchannel"],
  category: "owner",
  description: "Auto broadcast saluran — toggle on/off semua event notifikasi saluran",
  usage: ".autobroadcastchannel (lihat status)\n.autobroadcastchannel all on/off\n.autobroadcastchannel <event> on/off",
  example: ".autobroadcastchannel all on\n.autobroadcastchannel userBanned on",
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

    let text = "Saluran: " + (botConfig.saluran?.name || "-") + "\n";
    text += "Total Event: " + Object.keys(NOTIFY_EVENTS).length + "\n\n";
    text += "Status Toggle:\n";

    for (const [key, info] of Object.entries(statuses)) {
      const icon = info.enabled ? "✅" : "❌";
      text += icon + " " + info.label + "\n";
      text += "↳ `" + prefix + "autobroadcastchannel " + key + " on/off`\n";
      if (info.enabled) onCount++;
      else offCount++;
    }

    text += "\nON: " + onCount + " | OFF: " + offCount + "\n";
    text += "All toggle: `" + prefix + "autobroadcastchannel all on/off`";

    return m.reply(text);
  }

  // Toggle all
  if (subCmd === "all") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return m.reply(novaBox("Auto Broadcast Channel", ["❌ Gunakan: " + prefix + "autobroadcastchannel all on/off"]));
    }

    const enabled = action === "on";
    let count = 0;
    for (const key of Object.keys(NOTIFY_EVENTS)) {
      setNotifyEnabled(key, enabled);
      count++;
    }

    return m.reply(novaBox("Auto Broadcast Channel", ["✅ Status: " + (enabled ? "ALL ON" : "ALL OFF"), "Total: " + count + " event", "---", "Cek status: " + prefix + "autobroadcastchannel"]));
  }

  // Toggle specific event
  // FIX FINALISASI 25 Sep (ketangkep e2e 1f): subCmd di-lowercase dari chat,
  // tapi key event camelCase (premiumAdd, userBanned, dst) — lookup lama
  // `NOTIFY_EVENTS[subCmd]` GAK PERNAH cocok → toggle per-event gak pernah jalan
  // sama sekali. Resolve case-insensitive ke key ASLI sebelum dipakai.
  const evKey = Object.keys(NOTIFY_EVENTS).find((k) => k.toLowerCase() === subCmd);
  if (evKey) {
    const statuses = getAllNotifyStatus();
    const current = statuses[evKey].enabled;

    const explicitArg = args[1]?.toLowerCase();
    let newVal;
    if (explicitArg === "on") newVal = true;
    else if (explicitArg === "off") newVal = false;
    else newVal = !current;

    setNotifyEnabled(evKey, newVal);

    return m.reply(novaBox("Auto Broadcast Channel", ["Event: " + NOTIFY_EVENTS[evKey], "Status: " + (newVal ? "✅ ON" : "❌ OFF"), "---", newVal ? "Notifikasi akan dikirim ke saluran" : "Notifikasi dimatikan", "Cek semua: " + prefix + "autobroadcastchannel"]));
  }

  // Unknown event
  let availableList = "";
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
    availableList += key + " — " + label + "\n";
  }

  return m.reply(novaBox("Auto Broadcast Channel", ["❌ Event: " + subCmd + " tidak ada", "---", "Event tersedia:", availableList.trim(), "---", "Contoh: " + prefix + "autobroadcastchannel userBanned on"]));
}

export { pluginConfig as config, handler };
