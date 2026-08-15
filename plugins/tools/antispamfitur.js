import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "antispamfitur",
  alias: ["aspcmd", "antispamcmd", "aspfitur"],
  category: "tools",
  description: "Anti-spam khusus command fitur (bukan menu) - toggle & config",
  usage: ".antispamfitur <command>",
  example: ".antispamfitur dm on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function defaultSettings() {
  return {
    group: {
      menu: { enabled: false, limit: 3, windowMs: 30000, cooldownMs: 60000 },
      fitur: { enabled: false, limit: 5, windowMs: 30000, cooldownMs: 60000 },
    },
    dm: {
      menu: { enabled: true, limit: 1, windowMs: 20000, cooldownMs: 20000 },
      fitur: { enabled: false, limit: 5, windowMs: 30000, cooldownMs: 60000 },
    },
  };
}

function loadSettings(db) {
  const raw = db.setting("antispamMenuV2") || defaultSettings();
  if (raw.group && raw.dm && raw.group.fitur && raw.dm.fitur) return raw;
  // Migrate
  const s = defaultSettings();
  if (raw.group && raw.dm) {
    if (raw.group.menu) s.group.menu = { ...s.group.menu, ...raw.group.menu };
    if (raw.group.fitur) s.group.fitur = { ...s.group.fitur, ...raw.group.fitur };
    if (raw.dm.menu) s.dm.menu = { ...s.dm.menu, ...raw.dm.menu };
    if (raw.dm.fitur) s.dm.fitur = { ...s.dm.fitur, ...raw.dm.fitur };
  } else if (raw.enabled !== undefined) {
    s.group.menu.enabled = raw.enabled;
    s.group.menu.limit = raw.limit || 3;
    s.group.menu.windowMs = raw.windowMs || 30000;
    s.group.menu.cooldownMs = raw.cooldownMs || 60000;
  }
  db.setting("antispamMenuV2", s);
  return s;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const settings = loadSettings(db);

  const args = m.text?.trim().split(/\s+/) || [];
  const action = (args[0] || "").toLowerCase();

  // === HELP ===
  if (!action || action === "help" || action === "bantuan") {
    return sendReplyWithNav(sock, m, claraWrap("Anti-Spam Fitur", [
      "Anti-spam khusus command fitur (.sticker, .play, dll)",
      "Menu commands (.menu/.allmenu) gak kena, diatur via .antispammenuv2",
      "",
      "Perintah:",
      ".antispamfitur status - Lihat semua setting",
      ".antispamfitur dm on/off - DM fitur toggle",
      ".antispamfitur gc on/off - Grup fitur toggle",
      ".antispamfitur dm limit <n> - DM max panggilan (default 5)",
      ".antispamfitur dm window <s> - DM window detik (default 30)",
      ".antispamfitur dm cooldown <s> - DM cooldown detik (default 60)",
      ".antispamfitur gc limit <n> - Grup max panggilan (default 5)",
      ".antispamfitur gc window <s> - Grup window detik (default 30)",
      ".antispamfitur gc cooldown <s> - Grup cooldown detik (default 60)",
      "",
      "DM fitur: default OFF",
      "Grup fitur: default OFF",
      "Owner bypass, command exempt: .antispammenuv2, .owner, .sewa",
    ]), { commandName: "antispamfitur" });
  }

  // === STATUS ===
  if (action === "status" || action === "info") {
    const f = settings.group.fitur;
    const d = settings.dm.fitur;
    return m.reply(claraWrap("Anti-Spam Fitur Status", [
      "*Grup*",
      `  Status: ${f.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${f.limit}x per ${f.windowMs / 1000}s`,
      `  Cooldown: ${f.cooldownMs / 1000}s`,
      "",
      "*DM*",
      `  Status: ${d.enabled ? "AKTIF" : "MATI"}`,
      `  Limit: ${d.limit}x per ${d.windowMs / 1000}s`,
      `  Cooldown: ${d.cooldownMs / 1000}s`,
    ]));
  }

  // === Scope commands: dm / gc ===
  if (action === "dm" || action === "gc" || action === "grup" || action === "group") {
    const isGrup = action === "gc" || action === "grup" || action === "group";
    const scopeKey = isGrup ? "group" : "dm";
    const scopeLabel = isGrup ? "Grup" : "DM";
    const target = settings[scopeKey].fitur;

    const subCmd = (args[1] || "").toLowerCase();
    const subVal = args[2];

    if (subCmd === "on") {
      target.enabled = true;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Fitur", `${scopeLabel} fitur diaktifkan!`, "success"));
    }

    if (subCmd === "off") {
      target.enabled = false;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Fitur", `${scopeLabel} fitur dimatikan!`, "info"));
    }

    if (subCmd === "limit") {
      const val = parseInt(subVal);
      if (!val || val < 1 || val > 50) {
        return m.reply(claraWrap("Anti-Spam Fitur", `Limit 1-50!\nContoh: .antispamfitur ${action} limit 10`, "error"));
      }
      target.limit = val;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Fitur", `${scopeLabel} limit: ${val}x`, "success"));
    }

    if (subCmd === "window") {
      const val = parseInt(subVal);
      if (!val || val < 5 || val > 600) {
        return m.reply(claraWrap("Anti-Spam Fitur", `Window 5-600 detik!\nContoh: .antispamfitur ${action} window 60`, "error"));
      }
      target.windowMs = val * 1000;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Fitur", `${scopeLabel} window: ${val}s`, "success"));
    }

    if (subCmd === "cooldown") {
      const val = parseInt(subVal);
      if (!val || val < 5 || val > 600) {
        return m.reply(claraWrap("Anti-Spam Fitur", `Cooldown 5-600 detik!\nContoh: .antispamfitur ${action} cooldown 120`, "error"));
      }
      target.cooldownMs = val * 1000;
      db.setting("antispamMenuV2", settings);
      return m.reply(claraWrap("Anti-Spam Fitur", `${scopeLabel} cooldown: ${val}s`, "success"));
    }

    return m.reply(claraWrap("Anti-Spam Fitur", `Sub-perintah tidak dikenal.\nKetik .antispamfitur help`, "warn"));
  }

  // === Legacy on/off (maps to DM) ===
  if (action === "on") {
    settings.dm.fitur.enabled = true;
    db.setting("antispamMenuV2", settings);
    return m.reply(claraWrap("Anti-Spam Fitur", "DM fitur diaktifkan! (untuk grup: .antispamfitur gc on)", "success"));
  }

  if (action === "off") {
    settings.dm.fitur.enabled = false;
    db.setting("antispamMenuV2", settings);
    return m.reply(claraWrap("Anti-Spam Fitur", "DM fitur dimatikan! (untuk grup: .antispamfitur gc off)", "info"));
  }

  return m.reply(claraWrap("Anti-Spam Fitur", `Perintah tidak dikenal: ${action}\nKetik .antispamfitur help`, "warn"));
}

export { pluginConfig as config, handler };
