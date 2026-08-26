// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "antispammenuv2",
  alias: ["antispammenuv2"],
  category: "tools",
  description: "Anti-spam menu & fitur (.menu/.allmenu + command fitur) - V2 standalone",
  usage: ".antispammenuv2 <command>",
  example: ".antispammenuv2 on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// === Tracker ===
if (!global.novaMenuSpamV2) global.novaMenuSpamV2 = {};

// Menu commands yang kena limit menu
const MENU_COMMANDS = [
  "menu", "help", "bantuan", "commands", "m",
  "allmenu", "fullmenu", "am", "allcommand", "semua"
];

// Commands yang gak kena limit fitur (sistem/owner tools)
const EXEMPT_COMMANDS = [
  "antispammenuv2", "antispammenu", "aspmenu", "aspmenuv2",
  "owner", "creator", "sewa", "rental", "jadibot",
];

// Default settings
function defaultSettings() {
  return {
    // Grup settings
    group: {
      menu: { enabled: false, limit: 3, windowMs: 30000, cooldownMs: 60000 },
      fitur: { enabled: false, limit: 5, windowMs: 30000, cooldownMs: 60000 },
    },
    // DM settings
    dm: {
      menu: { enabled: true, limit: 1, windowMs: 20000, cooldownMs: 20000 },
      fitur: { enabled: false, limit: 5, windowMs: 30000, cooldownMs: 60000 },
    },
  };
}

function getScope(m, settings, type) {
  if (m.isGroup) return settings.group[type];
  return settings.dm[type];
}

export function checkMenuSpamV2(m) {
  const db = getDatabase();
  const raw = db.setting("antispamMenuV2") || defaultSettings();

  // Normalize old format -> migrate
  let settings;
  if (raw.group && raw.dm && raw.group.menu && raw.group.fitur) {
    settings = raw;
  } else if (raw.group && raw.dm) {
    // Mid format (group/dm flat without menu/fitur split)
    settings = defaultSettings();
    settings.group.menu.enabled = raw.group.enabled;
    settings.group.menu.limit = raw.group.limit || 3;
    settings.group.menu.windowMs = raw.group.windowMs || 30000;
    settings.group.menu.cooldownMs = raw.group.cooldownMs || 60000;
    settings.dm.menu.enabled = raw.dm.enabled;
    settings.dm.menu.limit = raw.dm.limit || 1;
    settings.dm.menu.windowMs = raw.dm.windowMs || 20000;
    settings.dm.menu.cooldownMs = raw.dm.cooldownMs || 20000;
    db.setting("antispamMenuV2", settings);
  } else {
    settings = defaultSettings();
    if (raw.enabled !== undefined) {
      settings.group.menu.enabled = raw.enabled;
      settings.group.menu.limit = raw.limit || 3;
      settings.group.menu.windowMs = raw.windowMs || 30000;
      settings.group.menu.cooldownMs = raw.cooldownMs || 60000;
    }
    db.setting("antispamMenuV2", settings);
  }

  // Owner bypass
  if (m.isOwner || m.fromMe) return { blocked: false };

  // No command? Skip
  if (!m.command) return { blocked: false };

  const cmd = m.command.toLowerCase();
  const isMenu = MENU_COMMANDS.includes(cmd);
  const isExempt = EXEMPT_COMMANDS.includes(cmd);

  // Determine which scope to check
  let scope;
  let scopeType;

  if (isMenu) {
    scope = getScope(m, settings, "menu");
    scopeType = "menu";
  } else if (!isExempt) {
    // Feature command
    scope = getScope(m, settings, "fitur");
    scopeType = "fitur";
  } else {
    return { blocked: false };
  }

  if (!scope.enabled) return { blocked: false };

  const now = Date.now();
  const sender = m.sender;
  const trackerKey = `${m.isGroup ? "gc" : "dm"}_${scopeType}_${sender}`;

  if (!global.novaMenuSpamV2[trackerKey]) {
    global.novaMenuSpamV2[trackerKey] = { calls: [], cooldownUntil: 0 };
  }
  const tracker = global.novaMenuSpamV2[trackerKey];

  // Check cooldown
  if (now < tracker.cooldownUntil) {
    const remainSec = Math.ceil((tracker.cooldownUntil - now) / 1000);
    return { blocked: true, remainSec, reason: "cooldown", scopeType };
  }

  // Clean old entries
  tracker.calls = tracker.calls.filter(ts => now - ts < scope.windowMs);

  if (tracker.calls.length >= scope.limit) {
    tracker.cooldownUntil = now + scope.cooldownMs;
    tracker.calls = [];
    return { blocked: true, remainSec: Math.ceil(scope.cooldownMs / 1000), reason: "limit", scopeType };
  }

  tracker.calls.push(now);
  return { blocked: false };
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const raw = db.setting("antispamMenuV2") || defaultSettings();

  // Normalize
  let settings;
  if (raw.group && raw.dm && raw.group.menu && raw.group.fitur) {
    settings = raw;
  } else if (raw.group && raw.dm) {
    settings = defaultSettings();
    settings.group.menu.enabled = raw.group.enabled;
    settings.group.menu.limit = raw.group.limit || 3;
    settings.group.menu.windowMs = raw.group.windowMs || 30000;
    settings.group.menu.cooldownMs = raw.group.cooldownMs || 60000;
    settings.dm.menu.enabled = raw.dm.enabled;
    settings.dm.menu.limit = raw.dm.limit || 1;
    settings.dm.menu.windowMs = raw.dm.windowMs || 20000;
    settings.dm.menu.cooldownMs = raw.dm.cooldownMs || 20000;
  } else {
    settings = defaultSettings();
    if (raw.enabled !== undefined) {
      settings.group.menu.enabled = raw.enabled;
      settings.group.menu.limit = raw.limit || 3;
      settings.group.menu.windowMs = raw.windowMs || 30000;
      settings.group.menu.cooldownMs = raw.cooldownMs || 60000;
    }
  }

  const args = m.text?.trim().split(/\s+/) || [];
  const action = (args[0] || "").toLowerCase();

  // === HELP ===
  if (!action || action === "help" || action === "bantuan") {
    return m.reply( claraWrap("Anti-Spam Menu V2", [
      "Anti-spam menu (.menu/.allmenu) & fitur (command lain)",
      "",
      "Perintah:",
      ".antispammenuv2 status - Lihat semua setting",
      ".antispammenuv2 gc menu on/off - Grup menu toggle",
      ".antispammenuv2 gc fitur on/off - Grup fitur toggle",
      ".antispammenuv2 dm menu on/off - DM menu toggle",
      ".antispammenuv2 dm fitur on/off - DM fitur toggle",
      "",
      "Setting per scope:",
      ".antispammenuv2 <gc/dm> <menu/fitur> limit <n>",
      ".antispammenuv2 <gc/dm> <menu/fitur> window <s>",
      ".antispammenuv2 <gc/dm> <menu/fitur> cooldown <s>",
      "",
      "DM menu: default ON, 1x/20s",
      "DM fitur: default OFF",
      "Grup menu: default OFF, 3x/30s",
      "Grup fitur: default OFF, 5x/30s",
      "Owner bypass semua",
    ]), { commandName: "antispammenuv2" });
  }

  // === STATUS ===
  if (action === "status" || action === "info") {
    const s = settings;
    return m.reply(claraWrap("Anti-Spam Menu V2 Status", [
      "*ɢʀᴜᴘ - ᴍᴇɴᴜ*",
      `  Status: ${s.group.menu.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${s.group.menu.limit}x per ${s.group.menu.windowMs / 1000}s`,
      `  Cooldown: ${s.group.menu.cooldownMs / 1000}s`,
      "",
      "*ɢʀᴜᴘ - ꜰɪᴛᴜʀ*",
      `  Status: ${s.group.fitur.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${s.group.fitur.limit}x per ${s.group.fitur.windowMs / 1000}s`,
      `  Cooldown: ${s.group.fitur.cooldownMs / 1000}s`,
      "",
      "*ᴅᴍ - ᴍᴇɴᴜ*",
      `  Status: ${s.dm.menu.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${s.dm.menu.limit}x per ${s.dm.menu.windowMs / 1000}s`,
      `  Cooldown: ${s.dm.menu.cooldownMs / 1000}s`,
      "",
      "*ᴅᴍ - ꜰɪᴛᴜʀ*",
      `  Status: ${s.dm.fitur.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${s.dm.fitur.limit}x per ${s.dm.fitur.windowMs / 1000}s`,
      `  Cooldown: ${s.dm.fitur.cooldownMs / 1000}s`,
    ]));
  }

  // === Scope-based commands: gc/dm menu/fitur <sub> <val> ===
  const scopeMatch = action === "gc" || action === "dm" || action === "grup" || action === "group";
  if (scopeMatch) {
    const isGrup = action === "gc" || action === "grup" || action === "group";
    const scopeKey = isGrup ? "group" : "dm";
    const scopeLabel = isGrup ? "Grup" : "DM";

    const typeArg = (args[1] || "").toLowerCase();
    const subCmd = (args[2] || "").toLowerCase();
    const subVal = args[3];

    // Validate type
    if (typeArg !== "menu" && typeArg !== "fitur") {
      return m.reply(claraWrap("Anti-Spam Menu V2", `Tipe harus "menu" atau "fitur"\nContoh: .antispammenuv2 ${action} menu on`, "error"));
    }

    const typeKey = typeArg;
    const typeLabel = typeArg === "menu" ? "Menu" : "Fitur";
    const target = settings[scopeKey][typeKey];

    if (subCmd === "on") {
      target.enabled = true;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Menu V2", `${scopeLabel} ${typeLabel} diaktifkan!`, "success"));
    }

    if (subCmd === "off") {
      target.enabled = false;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Menu V2", `${scopeLabel} ${typeLabel} dimatikan!`, "info"));
    }

    if (subCmd === "limit") {
      const val = parseInt(subVal);
      if (!val || val < 1 || val > 20) {
        return m.reply(claraWrap("Anti-Spam Menu V2", `Nilai limit 1-20!\nContoh: .antispammenuv2 ${action} ${typeArg} limit 5`, "error"));
      }
      target.limit = val;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Menu V2", `${scopeLabel} ${typeLabel} limit: ${val}x`, "success"));
    }

    if (subCmd === "window") {
      const val = parseInt(subVal);
      if (!val || val < 5 || val > 600) {
        return m.reply(claraWrap("Anti-Spam Menu V2", `Window 5-600 detik!\nContoh: .antispammenuv2 ${action} ${typeArg} window 60`, "error"));
      }
      target.windowMs = val * 1000;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Menu V2", `${scopeLabel} ${typeLabel} window: ${val}s`, "success"));
    }

    if (subCmd === "cooldown") {
      const val = parseInt(subVal);
      if (!val || val < 5 || val > 600) {
        return m.reply(claraWrap("Anti-Spam Menu V2", `Cooldown 5-600 detik!\nContoh: .antispammenuv2 ${action} ${typeArg} cooldown 120`, "error"));
      }
      target.cooldownMs = val * 1000;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Menu V2", `${scopeLabel} ${typeLabel} cooldown: ${val}s`, "success"));
    }

    return m.reply(claraWrap("Anti-Spam Menu V2", `Sub-perintah tidak dikenal.\nKetik .antispammenuv2 help`, "warn"));
  }

  // === Legacy on/off (maps to group menu) ===
  if (action === "on") {
    settings.group.menu.enabled = true;
    db.setting("antispamMenuV2", settings);
    return m.reply(claraWrap("Anti-Spam Menu V2", "Grup menu diaktifkan! (untuk DM/fitur lihat .antispammenuv2 help)", "success"));
  }

  if (action === "off") {
    settings.group.menu.enabled = false;
    db.setting("antispamMenuV2", settings);
    return m.reply(claraWrap("Anti-Spam Menu V2", "Grup menu dimatikan! (untuk DM/fitur lihat .antispammenuv2 help)", "info"));
  }

  return m.reply(claraWrap("Anti-Spam Menu V2", `Perintah tidak dikenal: ${action}\nKetik .antispammenuv2 help`, "warn"));
}

export { pluginConfig as config, handler };
