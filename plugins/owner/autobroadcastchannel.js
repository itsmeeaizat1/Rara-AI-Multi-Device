// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import {
  NOTIFY_EVENTS,
  getAllNotifyStatus,
  setNotifyEnabled,
} from "../../src/lib/nova-saluran-broadcast.js";
import { claraHeader,

    separator,
  tipText } from "../../src/lib/nova-menu-style.js";

function claraWrap(title, text) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  const body = Array.isArray(text) ? text.join("\n") : text;
  // Convert body to small caps tapi skip baris command (.xxx) dan preserve *bold*
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `❀°˖ ${toSC(title)} ˖°❀\n\n${scBody}`;
}
async function formatAndReply( text, cmdName) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  // Convert all text to small caps, skip command lines
  text = text.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:") || line.includes("❀°˖") || line.includes("❀⋆｡˚")) return line;
    return toSC(line);
  }).join("\n");
  if (!text.includes("╰──────────❀")) {
    text = text + "\n\n╰──────────❀";
  }
  return await m.reply(text);
}


const pluginConfig = {
  name: "autobroadcastchannel",
  alias: ["autobroadcastchannel"],
  alias: ["autobcsaluran", "autobc", "autobroadcast", "autosaluran", "autobcchannel"],
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

    let text =
      claraWrap("AutoBroadcastChannel", [`Saluran: *${botConfig.saluran?.name || "-"}*`,
        `Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`].join("\n")) +
      "\nSTATUS TOGGLE:\n\n";

    for (const [key, info] of Object.entries(statuses)) {
      const status = info.enabled ? "ON" : "OFF";
      text += `${info.enabled ? "ON" : "OFF"} *${info.label}*\n`;
      text += `Toggle: ${prefix}autobroadcastchannel ${key} on/off\n\n`;
      if (info.enabled) onCount++;
      else offCount++;
    }

    text +=
      separator("-", 22) +
      "\n" +
      `ON: ${onCount} | OFF: ${offCount}` + "\n" +
      `All toggle: ${prefix}autobroadcastchannel all on/off`;

    return formatAndReply( text, "autobroadcastchannel");
  }

  // Toggle all
  if (subCmd === "all") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return await m.reply(claraWrap("AutoBroadcastChannel", `Gunakan: ${prefix}autobroadcastchannel all on atau ${prefix}autobroadcastchannel all off`));
    }

    const enabled = action === "on";
    let count = 0;
    for (const key of Object.keys(NOTIFY_EVENTS)) {
      setNotifyEnabled(key, enabled);
      count++;
    }

    return await m.reply(claraWrap("AutoBroadcastChannel", [`Status: *${enabled ? "ALL ON" : "ALL OFF"}*`, `Total: *${count} event*`].join("\n")) + "\n\n" + `Cek status: ${prefix}autobroadcastchannel`);
  }

  // Toggle specific event — support explicit on/off ATAU flip
  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus();
    const current = statuses[subCmd].enabled;

    // Cek apakah ada argumen on/off eksplisit
    const explicitArg = args[1]?.toLowerCase();
    let newVal;
    if (explicitArg === "on") {
      newVal = true;
    } else if (explicitArg === "off") {
      newVal = false;
    } else {
      // Tanpa on/off → flip state
      newVal = !current;
    }

    setNotifyEnabled(subCmd, newVal);
    return await m.reply(claraWrap("AutoBroadcastChannel", [`Event: *${NOTIFY_EVENTS[subCmd]}*`, `Status: *${newVal ? "ON" : "OFF"}*`].join("\n")) + "\n\n" + (newVal ? "Notifikasi akan dikirim ke saluran" : "Notifikasi dimatikan") + "\n" + `Cek semua: ${prefix}autobroadcastchannel`);
  }

  // Unknown event
  let availableList = "";
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
    availableList += `${key} - ${label}\n`;
  }

  return await m.reply(claraWrap("AutoBroadcastChannel", [`Event: *${subCmd}*`, `Tidak ada dalam daftar`].join("\n")) + "\nEVENT TERSEDIA:\n\n" + availableList + "\nContoh: " + prefix + "autobroadcastchannel userBanned on");
}

export { pluginConfig as config, handler };
