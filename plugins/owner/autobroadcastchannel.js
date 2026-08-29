// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import {
  NOTIFY_EVENTS,
  getAllNotifyStatus,
  setNotifyEnabled,
} from "../../src/lib/nova-saluran-broadcast.js";

function modBox(title, lines) {
  const body = Array.isArray(lines) ? lines.join("\n") : lines;
  return "╭──「 " + title + " 」\n│\n" + body.split("\n").map(l => "" + l).join("\n") + "\n╰──────────";
}

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

    let text = "╭──「 AutoBroadcastChannel 」\n";
    text += "│\n";
    text += "│ 📺 Saluran: *" + (botConfig.saluran?.name || "-") + "*\n";
    text += "│ 📋 Total Event: *" + Object.keys(NOTIFY_EVENTS).length + "*\n";
    text += "│\n";
    text += "├──「 *Status Toggle* 」\n";

    for (const [key, info] of Object.entries(statuses)) {
      const icon = info.enabled ? "✅" : "❌";
      text += "" + icon + " *" + info.label + "*\n";
      text += "│ ↳ `" + prefix + "autobroadcastchannel " + key + " on/off`\n";
      if (info.enabled) onCount++;
      else offCount++;
    }

    text += "│\n";
    text += "│ 📊 ON: " + onCount + " | OFF: " + offCount + "\n";
    text += "│ 🔧 All toggle: `" + prefix + "autobroadcastchannel all on/off`\n";
    text += "╰──────────";

    return m.reply(text);
  }

  // Toggle all
  if (subCmd === "all") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return m.reply(modBox("📡 AutoBroadcastChannel", [
        "❌ Gunakan: `" + prefix + "autobroadcastchannel all on`",
        "   atau: `" + prefix + "autobroadcastchannel all off`",
      ]));
    }

    const enabled = action === "on";
    let count = 0;
    for (const key of Object.keys(NOTIFY_EVENTS)) {
      setNotifyEnabled(key, enabled);
      count++;
    }

    return m.reply(
      "╭──「 AutoBroadcastChannel 」\n" +
      "│\n" +
      "│ ✅ Status: *" + (enabled ? "ALL ON" : "ALL OFF") + "*\n" +
      "│ 📊 Total: *" + count + " event*\n" +
      "│\n" +
      "│ 💡 Cek status: `" + prefix + "autobroadcastchannel`\n" +
      "╰──────────"
    );
  }

  // Toggle specific event
  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus();
    const current = statuses[subCmd].enabled;

    const explicitArg = args[1]?.toLowerCase();
    let newVal;
    if (explicitArg === "on") newVal = true;
    else if (explicitArg === "off") newVal = false;
    else newVal = !current;

    setNotifyEnabled(subCmd, newVal);

    return m.reply(
      "╭──「 AutoBroadcastChannel 」\n" +
      "│\n" +
      "│ 📌 Event: *" + NOTIFY_EVENTS[subCmd] + "*\n" +
      "" + (newVal ? "✅ ON" : "❌ OFF") + "\n" +
      "│\n" +
      "" + (newVal ? "📢 Notifikasi akan dikirim ke saluran" : "🔕 Notifikasi dimatikan") + "\n" +
      "│ 💡 Cek semua: `" + prefix + "autobroadcastchannel`\n" +
      "╰──────────"
    );
  }

  // Unknown event
  let availableList = "";
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
    availableList += "" + key + " — " + label + "\n";
  }

  return m.reply(
    "╭──「 AutoBroadcastChannel 」\n" +
    "│\n" +
    "│ ❌ Event: *" + subCmd + "* tidak ada dalam daftar\n" +
    "│\n" +
    "├──「 *Event Tersedia* 」\n" +
    availableList +
    "│\n" +
    "│ 💡 *Contoh:* `" + prefix + "autobroadcastchannel userBanned on`\n" +
    "╰──────────"
  );
}

export { pluginConfig as config, handler };
