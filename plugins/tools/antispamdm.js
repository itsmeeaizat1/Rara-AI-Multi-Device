// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "antispamdm",
  alias: ["antispampc", "antispampriv", "antispambot"],
  category: "tools",
  description: "Anti-spam untuk DM/Pribadi - cegah user nyepam command di private chat",
  usage: ".antispamdm <command>",
  example: ".antispamdm on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.text?.trim().split(/\s+/) || [];
  const action = (args[0] || "").toLowerCase();

  // === HELP ===
  if (!action || action === "help" || action === "bantuan") {
    return sendReplyWithNav(sock, m, claraWrap("Anti-Spam DM", [
      "Sistem perlindungan bot dari spam di private chat",
      "",
      "Perintah tersedia:",
      "",
      ".antispamdm on",
      "Aktifkan anti-spam DM",
      "",
      ".antispamdm off",
      "Matikan anti-spam DM",
      "",
      ".antispamdm status",
      "Lihat pengaturan saat ini",
      "",
      ".antispamdm limit <jumlah>",
      "Max pesan per window (default 10)",
      "",
      ".antispamdm window <detik>",
      "Window waktu tracking (default 10s)",
      "",
      ".antispamdm warn <jumlah>",
      "Max peringatan sebelum mute (default 3)",
      "",
      ".antispamdm mute <menit>",
      "Durasi mute (default 5 menit)",
      "",
      "Cara kerja:",
      "User kirim > limit pesan dalam window waktu",
      "-> Warn 1, 2, 3... -> Mute X menit",
      "Owner selalu bypass",
    ]), { commandName: "antispamdm" });
  }

  // Get current settings
  const settings = db.setting("antispamDM") || {
    enabled: false,
    limit: 10,
    windowMs: 10000,
    maxWarn: 3,
    muteMin: 5,
  };

  // === ON ===
  if (action === "on") {
    settings.enabled = true;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", [
      "Anti-spam DM diaktifkan!",
      "",
      `Limit: ${settings.limit} pesan per ${settings.windowMs / 1000}s`,
      `Max warning: ${settings.maxWarn}x`,
      `Mute: ${settings.muteMin} menit`,
    ], "success"));
  }

  // === OFF ===
  if (action === "off") {
    settings.enabled = false;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", "Anti-spam DM dimatikan!", "info"));
  }

  // === STATUS ===
  if (action === "status" || action === "info") {
    return m.reply(claraWrap("Anti-Spam DM Status", [
      `Status: ${settings.enabled ? "AKTIF" : "MATI"}`,
      `Limit: ${settings.limit} pesan`,
      `Window: ${settings.windowMs / 1000} detik`,
      `Max warning: ${settings.maxWarn}x`,
      `Mute duration: ${settings.muteMin} menit`,
    ]));
  }

  // === LIMIT ===
  if (action === "limit") {
    const val = parseInt(args[1]);
    if (!val || val < 3 || val > 50) {
      return m.reply(claraWrap("Anti-Spam DM", "Nilai limit harus 3-50!\n\nContoh: .antispamdm limit 15", "error"));
    }
    settings.limit = val;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", `Limit diatur ke ${val} pesan per window`, "success"));
  }

  // === WINDOW ===
  if (action === "window") {
    const val = parseInt(args[1]);
    if (!val || val < 3 || val > 120) {
      return m.reply(claraWrap("Anti-Spam DM", "Window harus 3-120 detik!\n\nContoh: .antispamdm window 15", "error"));
    }
    settings.windowMs = val * 1000;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", `Window diatur ke ${val} detik`, "success"));
  }

  // === WARN ===
  if (action === "warn") {
    const val = parseInt(args[1]);
    if (!val || val < 1 || val > 10) {
      return m.reply(claraWrap("Anti-Spam DM", "Max warning harus 1-10!\n\nContoh: .antispamdm warn 5", "error"));
    }
    settings.maxWarn = val;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", `Max warning diatur ke ${val}x`, "success"));
  }

  // === MUTE ===
  if (action === "mute") {
    const val = parseInt(args[1]);
    if (!val || val < 1 || val > 1440) {
      return m.reply(claraWrap("Anti-Spam DM", "Mute duration 1-1440 menit!\n\nContoh: .antispamdm mute 10", "error"));
    }
    settings.muteMin = val;
    db.setting("antispamDM", settings);
    return m.reply(claraWrap("Anti-Spam DM", `Mute duration diatur ke ${val} menit`, "success"));
  }

  return m.reply(claraWrap("Anti-Spam DM", [
    `Perintah tidak dikenal: ${action}`,
    "Ketik .antispamdm help untuk panduan",
  ], "warn"));
}

export { pluginConfig as config, handler };
