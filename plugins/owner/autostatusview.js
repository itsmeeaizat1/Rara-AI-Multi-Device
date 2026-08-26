// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autostatusview",
  alias: ["autostatusview"],
  category: "owner",
  description: "Auto view (read) & react status/story WA - gabungan autoreadsw + autoreactsw",
  usage: ".autostatusview <command>",
  example: ".autostatusview on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function defaultSettings() {
  return {
    read: { enabled: false },
    react: { enabled: false, emoji: "🔥" },
  };
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.text?.trim().split(/\s+/) || [];
  const action = (args[0] || "").toLowerCase();

  // Load settings
  const raw = db.setting("autoStatusView") || defaultSettings();
  let settings;
  if (raw.read && raw.react) {
    settings = raw;
  } else {
    settings = defaultSettings();
    // Migrate from old autoReadSW/autoReactSW
    const oldRead = db.setting("autoReadSW");
    const oldReact = db.setting("autoReactSW");
    if (oldRead?.enabled) settings.read.enabled = true;
    if (oldReact?.enabled) {
      settings.react.enabled = true;
      settings.react.emoji = oldReact.emoji || "🔥";
    }
  }

  // === HELP ===
  if (!action || action === "help" || action === "bantuan") {
    return m.reply( claraWrap("Auto Status View", [
      "Auto view (read) & react status/story WA",
      "",
      "Perintah:",
      ".autostatusview status - Lihat setting",
      ".autostatusview read on/off - Toggle auto read",
      ".autostatusview react on/off [emoji] - Toggle auto react",
      ".autostatusview emoji <emoji> - Ubah emoji react",
      ".autostatusview all on/off - Toggle read + react sekaligus",
      "",
      "Default: OFF semua",
      "Owner only",
    ]), { commandName: "autostatusview" });
  }

  // === STATUS ===
  if (action === "status" || action === "info") {
    return m.reply(claraWrap("Auto Status View", [
      `Read: ${settings.read.enabled ? "AKTIF" : "MATI"}`,
      `React: ${settings.react.enabled ? "AKTIF" : "MATI"}`,
      `Emoji: ${settings.react.emoji}`,
    ]));
  }

  // === READ ON/OFF ===
  if (action === "read") {
    const sub = (args[1] || "").toLowerCase();
    if (sub === "on") {
      settings.read.enabled = true;
      db.setting("autoStatusView", settings);
      db.save();
      // Also update old key for backward compat with connection.js
      db.setting("autoReadSW", { enabled: true });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", "Auto read story diaktifkan!", "success"));
    }
    if (sub === "off") {
      settings.read.enabled = false;
      db.setting("autoStatusView", settings);
      db.save();
      db.setting("autoReadSW", { enabled: false });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", "Auto read story dimatikan!", "info"));
    }
    return m.reply(claraWrap("Auto Status View", "Gunakan: .autostatusview read on/off", "warn"));
  }

  // === REACT ON/OFF [emoji] ===
  if (action === "react") {
    const sub = (args[1] || "").toLowerCase();
    if (sub === "on") {
      const emoji = args[2] || settings.react.emoji || "🔥";
      settings.react.enabled = true;
      settings.react.emoji = emoji;
      db.setting("autoStatusView", settings);
      db.save();
      db.setting("autoReactSW", { enabled: true, emoji });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", [
        "Auto react story diaktifkan!",
        `Emoji: ${emoji}`,
      ], "success"));
    }
    if (sub === "off") {
      settings.react.enabled = false;
      db.setting("autoStatusView", settings);
      db.save();
      db.setting("autoReactSW", { enabled: false, emoji: settings.react.emoji });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", "Auto react story dimatikan!", "info"));
    }
    return m.reply(claraWrap("Auto Status View", "Gunakan: .autostatusview react on/off [emoji]", "warn"));
  }

  // === EMOJI ===
  if (action === "emoji") {
    const emoji = args[1];
    if (!emoji) {
      return m.reply(claraWrap("Auto Status View", `Emoji saat ini: ${settings.react.emoji}\nUbah: .autostatusview emoji 😍`, "warn"));
    }
    settings.react.emoji = emoji;
    db.setting("autoStatusView", settings);
    db.save();
    db.setting("autoReactSW", { enabled: settings.react.enabled, emoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto Status View", `Emoji react diatur ke ${emoji}`, "success"));
  }

  // === ALL ON/OFF ===
  if (action === "all") {
    const sub = (args[1] || "").toLowerCase();
    if (sub === "on") {
      settings.read.enabled = true;
      settings.react.enabled = true;
      db.setting("autoStatusView", settings);
      db.save();
      db.setting("autoReadSW", { enabled: true });
      db.setting("autoReactSW", { enabled: true, emoji: settings.react.emoji });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", [
        "Auto read + react diaktifkan!",
        `Emoji: ${settings.react.emoji}`,
      ], "success"));
    }
    if (sub === "off") {
      settings.read.enabled = false;
      settings.react.enabled = false;
      db.setting("autoStatusView", settings);
      db.save();
      db.setting("autoReadSW", { enabled: false });
      db.setting("autoReactSW", { enabled: false, emoji: settings.react.emoji });
      db.save();
      await m.react("🐣");
      return m.reply(claraWrap("Auto Status View", "Auto read + react dimatikan!", "info"));
    }
    return m.reply(claraWrap("Auto Status View", "Gunakan: .autostatusview all on/off", "warn"));
  }

  // === Legacy on/off ===
  if (action === "on") {
    settings.read.enabled = true;
    settings.react.enabled = true;
    db.setting("autoStatusView", settings);
    db.save();
    db.setting("autoReadSW", { enabled: true });
    db.setting("autoReactSW", { enabled: true, emoji: settings.react.emoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto Status View", [
      "Auto read + react diaktifkan!",
      `Emoji: ${settings.react.emoji}`,
      "Untuk kontrol individual: .autostatusview help",
    ], "success"));
  }

  if (action === "off") {
    settings.read.enabled = false;
    settings.react.enabled = false;
    db.setting("autoStatusView", settings);
    db.save();
    db.setting("autoReadSW", { enabled: false });
    db.setting("autoReactSW", { enabled: false, emoji: settings.react.emoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto Status View", "Auto read + react dimatikan!", "info"));
  }

  return m.reply(claraWrap("Auto Status View", `Perintah tidak dikenal: ${action}\nKetik .autostatusview help`, "warn"));
}

export { pluginConfig as config, handler };
