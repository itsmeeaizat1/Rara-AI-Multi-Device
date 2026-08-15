// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import {
  getSettings,
  updateSettings,
  runCleanup,
  startCleaner,
  stopCleaner,
  parseInterval,
  init,
} from "../../src/lib/nova-cache-cleaner.js";

const pluginConfig = {
  name: "autocleancache",
  alias: ["cleancache", "cacheauto", "autoclean", "bersihcache"],
  category: "owner",
  description: "Auto bersihkan cache & file temp yang gak kepakai",
  usage: ".autocleancache [on/off/status/now/1 hour/30 minutes]",
  example: ".autocleancache on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Initialize on load
init();

function formatSize(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
}

function formatLastClean(iso) {
  if (!iso) return "Belum pernah";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Baru saja";
  if (diff < 3600000) return Math.floor(diff / 60000) + " menit lalu";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " jam lalu";
  return Math.floor(diff / 86400000) + " hari lalu";
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const action = args[0] || "";
    const settings = getSettings();

    // Default: toggle on/off
    if (!action) {
      if (settings.enabled) {
        stopCleaner();
        updateSettings({ enabled: false });
        return m.reply(
          "Auto Clean Cache: *OFF*\n\n" +
          "Cache tidak akan dibersihkan otomatis.\n" +
          "Ketik `.autocleancache on` untuk menyalakan kembali."
        );
      } else {
        const newSettings = updateSettings({ enabled: true });
        startCleaner(newSettings);
        return m.reply(
          "Auto Clean Cache: *ON*\n\n" +
          "Interval: " + (newSettings.intervalStr || "1 hour") + "\n" +
          "Target: tmp/ logs/ downloads/ .cache/\n\n" +
          "File yang belum diakses >1 jam akan dihapus.\n" +
          "Atur interval: `.autocleancache 30 minutes`"
        );
      }
    }

    // Turn on
    if (action === "on") {
      let intervalStr = "";
      if (args.length >= 2) {
        const parsed = parseInterval(args.slice(1).join(" "));
        if (parsed) {
          intervalStr = parsed.str;
          updateSettings({ intervalMs: parsed.ms, intervalStr: parsed.str });
        }
      }
      const newSettings = updateSettings({ enabled: true });
      startCleaner(newSettings);
      return m.reply(
        "Auto Clean Cache: *ON*\n\n" +
        "Interval: " + (newSettings.intervalStr || "1 hour") + "\n" +
        "Target: tmp/ logs/ downloads/ .cache/\n\n" +
        "File yang belum diakses >interval akan dihapus otomatis."
      );
    }

    // Turn off
    if (action === "off") {
      stopCleaner();
      updateSettings({ enabled: false });
      return m.reply(claraWrap("Autocleancache", "Auto Clean Cache: *OFF*\n\nCache tidak akan dibersihkan otomatis."));
    }

    // Status
    if (action === "status") {
      return m.reply(
        "Auto Clean Cache - Status\n\n" +
        "Status: " + (settings.enabled ? "*ON*" : "*OFF*") + "\n" +
        "Interval: " + (settings.intervalStr || "1 hour") + "\n" +
        "Terakhir dibersihkan: " + formatLastClean(settings.lastClean) + "\n" +
        "Total file dibersihkan: " + (settings.totalCleaned || 0) + "\n" +
        "Total space dibebaskan: " + formatSize((settings.totalFreedKB || 0) * 1024) + "\n\n" +
        "Ketik `.autocleancache now` untuk bersihkan sekarang"
      );
    }

    // Clean now (manual one-time)
    if (action === "now") {
      await m.react("🕐");
      const result = runCleanup();
      if (result.totalCleaned > 0) {
        let txt = "Cache dibersihkan!\n\n";
        for (const d of result.details) txt += d + "\n";
        txt += "\nTotal: " + result.totalCleaned + " file | " + formatSize(result.totalFreed) + " dibebaskan";
        await m.react("✅");
        return m.reply(claraWrap("autocleancache", txt));
      } else {
        await m.react("✅");
        return m.reply(claraWrap("Autocleancache", "Cache sudah bersih, tidak ada file yang perlu dihapus."));
      }
    }

    // Set interval (e.g., ".autocleancache 1 hour", ".autocleancache 30 minutes")
    const parsed = parseInterval(args.join(" "));
    if (parsed) {
      const wasEnabled = settings.enabled;
      const newSettings = updateSettings({ intervalMs: parsed.ms, intervalStr: parsed.str });
      if (wasEnabled) {
        stopCleaner();
        startCleaner(newSettings);
      }
      return m.reply(
        "Auto Clean Cache - Interval diatur\n\n" +
        "Interval baru: " + parsed.str + "\n" +
        "Status: " + (newSettings.enabled ? "*ON*" : "*OFF*") + "\n\n" +
        (newSettings.enabled ? "Perubahan langsung aktif." : "Ketik `.autocleancache on` untuk menyalakan.")
      );
    }

    // Unknown command
    return m.reply(
      "Auto Clean Cache\n\n" +
      "Perintah tersedia:\n" +
      ".autocleancache - Toggle on/off\n" +
      ".autocleancache on - Nyalakan (default 1 hour)\n" +
      ".autocleancache off - Matikan\n" +
      ".autocleancache status - Lihat status\n" +
      ".autocleancache now - Bersihkan sekarang\n" +
      ".autocleancache 2 hours - Set interval custom\n" +
      ".autocleancache 30 minutes - Set interval custom\n\n" +
      "Min 1 minute, Max 24 hours"
    );
  } catch (e) {
    console.error("[autocleancache] Error:", e.message);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig, handler };
