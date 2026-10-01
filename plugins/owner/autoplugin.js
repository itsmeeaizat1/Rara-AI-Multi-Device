// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autoplugin — Auto Plugin Health Monitor
 *
 * Fitur automation "bot masa depan":
 * - Track error/crash rate tiap plugin secara real-time
 * - Auto-disable plugin yang crash rate > threshold
 * - Notifikasi owner saat plugin auto-disabled
 * - Health report per plugin & per kategori
 * - Whitelist plugin critical (tidak bisa di-disable)
 * - Auto-re-enable plugin setelah cooldown period
 *
 * Commands:
 *   .autoplugin                  — Dashboard status monitor
 *   .autoplugin on/off            — Aktifkan/matikan auto-monitoring
 *   .autoplugin status            — Lihat status + stats per plugin
 *   .autoplugin report            — Full report: top errors, crash rate, health
 *   .autoplugin threshold <persen> — Set crash rate threshold (default: 50%)
 *   .autoplugin window <jumlah>   — Set window sample size (default: 20 eksekusi)
 *   .autoplugin cooldown <menit>  — Set cooldown auto-re-enable (default: 30 menit)
 *   .autoplugin whitelist add/del <plugin> — Plugin critical (tidak auto-disable)
 *   .autoplugin whitelist          — Lihat whitelist
 *   .autoplugin enable <plugin>   — Enable manual plugin yang di-disable
 *   .autoplugin disable <plugin>   — Disable manual plugin
 *   .autoplugin reset <plugin>     — Reset error counter plugin
 *   .autoplugin reset all          — Reset semua counter
 *   .autoplugin notify on/off      — Toggle notifikasi owner
 */

import { raraError, raraEmpty, raraGuide, raraNoInput, toSC, raraBox } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { pluginStore, disablePlugin, enablePlugin, isPluginEnabled, getAllPlugins, getPluginCount } from "../../src/lib/rara-plugins.js";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "autoplugin",
  alias: ["autoplugin", "pluginhealth", "pluginmonitor", "plugincheck"],
  category: "owner",
  description: "Auto Plugin Health Monitor — track crash rate, auto-disable plugin error",
  usage: ".autoplugin <on/off/status/report/threshold/whitelist/enable/disable/reset>",
  example: ".autoplugin report",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// STATE
// ============================================================
const pluginStats = new Map(); // name -> { executions, errors, lastError, lastErrorTime, disabledAt, autoDisabled }
let monitorActive = false;
let cooldownInterval = null;

// Plugin critical yang tidak boleh di-auto-disable
const DEFAULT_WHITELIST = [
  "menu", "allmenu", "help", "ping", "owner", "self", "public",
  "autoplugin", "autoapicheck", "autohealth", "automod",
  "botmode", "crashguard", "servermonitor",
];

// ============================================================
// HELPERS
// ============================================================

function getSettings() {
  const db = getDatabase();
  return {
    enabled: db.setting("autoplugin_enabled") || false,
    threshold: db.setting("autoplugin_threshold") || 50, // 50% crash rate
    windowSize: db.setting("autoplugin_window") || 20,  // last 20 executions
    cooldownMin: db.setting("autoplugin_cooldown") || 30, // 30 min auto-re-enable
    notifyOwner: db.setting("autoplugin_notify") !== false,
  };
}

function getWhitelist() {
  const db = getDatabase();
  return db.setting("autoplugin_whitelist") || [...DEFAULT_WHITELIST];
}

function getStats(name) {
  if (!pluginStats.has(name)) {
    pluginStats.set(name, {
      executions: 0,
      errors: 0,
      lastError: null,
      lastErrorTime: null,
      disabledAt: null,
      autoDisabled: false,
      recentResults: [], // sliding window: true=ok, false=error
    });
  }
  return pluginStats.get(name);
}

function recordExecution(name, success, errorMsg) {
  const stats = getStats(name);
  stats.executions++;

  if (!success) {
    stats.errors++;
    stats.lastError = errorMsg;
    stats.lastErrorTime = Date.now();
  }

  // Sliding window
  stats.recentResults.push(success);
  if (stats.recentResults.length > 50) {
    stats.recentResults = stats.recentResults.slice(-50);
  }
}

function getCrashRate(name) {
  const stats = getStats(name);
  const settings = getSettings();
  const windowSize = Math.min(settings.windowSize, stats.recentResults.length);
  if (windowSize === 0) return 0;

  const recent = stats.recentResults.slice(-windowSize);
  const errors = recent.filter((r) => !r).length;
  return Math.round((errors / windowSize) * 100);
}

function getHealthIcon(crashRate) {
  if (crashRate === 0) return "OK";
  if (crashRate < 25) return "OK";
  if (crashRate < 50) return "WARN";
  if (crashRate < 75) return "RISK";
  return "CRIT";
}

async function checkAndDisablePlugin(name, sock) {
  const settings = getSettings();
  const whitelist = getWhitelist();
  if (whitelist.includes(name)) return false;

  const crashRate = getCrashRate(name);
  const stats = getStats(name);

  if (stats.recentResults.length < settings.windowSize) return false;
  if (crashRate >= settings.threshold && !stats.autoDisabled) {
    disablePlugin(name);
    stats.autoDisabled = true;
    stats.disabledAt = Date.now();

    if (settings.notifyOwner) {
      await notifyOwnerPluginDisabled(name, crashRate, stats, sock);
    }
    return true;
  }
  return false;
}

async function notifyOwnerPluginDisabled(name, crashRate, stats, sock) {
  const ownerNums = (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`);
  if (ownerNums.length === 0) return;

  const msg = raraBox(toSC("Plugin Auto-Disabled"), [
    `${toSC("Plugin")}: ${name}`,
    `Crash Rate: ${crashRate}%`,
    `Errors: ${stats.errors} / ${stats.executions} ${toSC("executions")}`,
    `Last Error: ${stats.lastError?.slice(0, 100) || "unknown"}`,
    ``,
    toSC("Plugin dinonaktifkan otomatis"),
    toSC("Gunakan .autoplugin enable") + ` ${name} ${toSC("untuk re-enable")}`,
    toSC("Atau tunggu cooldown auto-re-enable"),
  ]);

  for (const num of ownerNums) {
    try {
      await sock.sendMessage(num, { text: msg });
    } catch {}
  }
}

function startCooldownChecker(sock) {
  if (cooldownInterval) clearInterval(cooldownInterval);
  if (!monitorActive) return;

  const settings = getSettings();
  cooldownInterval = setInterval(() => {
    const now = Date.now();
    const cooldownMs = settings.cooldownMin * 60 * 1000;

    for (const [name, stats] of pluginStats) {
      if (stats.autoDisabled && stats.disabledAt) {
        const elapsed = now - stats.disabledAt;
        if (elapsed >= cooldownMs) {
          // Auto-re-enable
          enablePlugin(name);
          stats.autoDisabled = false;
          stats.disabledAt = null;
          stats.recentResults = []; // reset window
          console.log(`[autoplugin] Auto-re-enabled: ${name} after ${settings.cooldownMin}min cooldown`);
        }
      }
    }
  }, 60000); // cek tiap 1 menit
}

function stopCooldownChecker() {
  if (cooldownInterval) {
    clearInterval(cooldownInterval);
    cooldownInterval = null;
  }
}

// Export untuk dipanggil dari handler.js (hook ke plugin execution)
export function recordPluginExecution(name, success, errorMsg) {
  recordExecution(name, success, errorMsg);
}

export async function postExecutionCheck(name, sock) {
  const settings = getSettings();
  if (!settings.enabled) return;
  return await checkAndDisablePlugin(name, sock);
}

export function startPluginMonitor(sock) {
  const settings = getSettings();
  if (!settings.enabled) {
    monitorActive = false;
    return;
  }
  monitorActive = true;
  startCooldownChecker(sock);
  console.log(`[autoplugin] Monitor started — threshold: ${settings.threshold}%, window: ${settings.windowSize}, cooldown: ${settings.cooldownMin}min`);
}

export function stopPluginMonitor() {
  monitorActive = false;
  stopCooldownChecker();
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = (args[0] || "").toLowerCase();
  const settings = getSettings();

  // .autoplugin (no args) — dashboard
  if (!subCmd || subCmd === "status" || subCmd === "dashboard") {
    const totalPlugins = getPluginCount();
    let activeCount = 0;
    let disabledCount = 0;
    let autoDisabledCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const [name, stats] of pluginStats) {
      const rate = getCrashRate(name);
      if (stats.autoDisabled) autoDisabledCount++;
      if (rate >= 75) criticalCount++;
      else if (rate >= 50) warningCount++;
    }

    // Cek enabled vs disabled dari pluginStore
    const allPlugins = getAllPlugins();
    for (const p of allPlugins) {
      if (p.config?.isEnabled) activeCount++;
      else disabledCount++;
    }

    const lines = [
      `Status: ${settings.enabled ? toSC("AKTIF") : toSC("MATI")}`,
      `Threshold: ${settings.threshold}%`,
      `Window: ${settings.windowSize} ${toSC("executions")}`,
      `Cooldown: ${settings.cooldownMin} ${toSC("menit")}`,
      `Notify: ${settings.notifyOwner ? "ON" : "OFF"}`,
      ``,
      `Total Plugin: ${totalPlugins}`,
      `Active: ${activeCount} | Disabled: ${disabledCount}`,
      `Auto-Disabled: ${autoDisabledCount}`,
      `Warning: ${warningCount} | Critical: ${criticalCount}`,
    ];

    if (autoDisabledCount > 0) {
      lines.push(``);
      lines.push({ sub: toSC("Auto-Disabled Plugins") });
      for (const [name, stats] of pluginStats) {
        if (stats.autoDisabled) {
          const rate = getCrashRate(name);
          const elapsed = stats.disabledAt ? Math.round((Date.now() - stats.disabledAt) / 60000) : 0;
          lines.push(`  ${name} (${rate}%) — ${elapsed}min ago`);
        }
      }
    }

    lines.push(``);
    lines.push(`${toSC("Ketik")} .autoplugin report ${toSC("untuk detail")}`);

    await m.reply(raraBox(toSC("Plugin Health Monitor"), lines));
    return;
  }

  // .autoplugin on
  if (subCmd === "on") {
    const db = getDatabase();
    db.setting("autoplugin_enabled", true);
    monitorActive = true;
    startCooldownChecker(sock);
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      toSC("Monitoring AKTIF"),
      `Threshold: ${settings.threshold}% | Window: ${settings.windowSize}`,
      `Cooldown: ${settings.cooldownMin} ${toSC("menit")}`,
      ``,
      toSC("Plugin dengan crash rate tinggi akan di-auto-disable"),
      toSC("Owner akan dinotifikasi saat itu terjadi"),
    ]));
    return;
  }

  // .autoplugin off
  if (subCmd === "off") {
    const db = getDatabase();
    db.setting("autoplugin_enabled", false);
    stopPluginMonitor();
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      toSC("Monitoring DIMATIKAN"),
      toSC("Plugin tidak akan di-auto-disable"),
    ]));
    return;
  }

  // .autoplugin report — full health report
  if (subCmd === "report") {
    await m.react("🕒");

    const allPlugins = getAllPlugins();
    const pluginData = [];

    for (const p of allPlugins) {
      const name = p.config?.name;
      if (!name) continue;
      const stats = getStats(name);
      const rate = getCrashRate(name);
      const enabled = p.config?.isEnabled !== false;
      const health = getHealthIcon(rate);

      pluginData.push({
        name,
        category: p.config?.category || "unknown",
        enabled,
        crashRate: rate,
        executions: stats.executions,
        errors: stats.errors,
        health,
        autoDisabled: stats.autoDisabled,
        lastError: stats.lastError?.slice(0, 60) || null,
      });
    }

    // Sort by crash rate descending
    pluginData.sort((a, b) => b.crashRate - a.crashRate);

    // Top 15 most problematic
    const problematic = pluginData.filter((p) => p.crashRate > 0 || p.autoDisabled).slice(0, 15);

    const lines = [
      `Total Plugin: ${pluginData.length}`,
      `Problematic: ${problematic.length}`,
      ``,
    ];

    if (problematic.length === 0) {
      lines.push(toSC("Semua plugin sehat! Tidak ada error terdeteksi"));
    } else {
      // Auto-disabled section
      const autoDisabled = problematic.filter((p) => p.autoDisabled);
      if (autoDisabled.length > 0) {
        lines.push({ sub: toSC("Auto-Disabled") });
        for (const p of autoDisabled) {
          lines.push(`  ${p.name} (${p.category}) — ${p.crashRate}%`);
          if (p.lastError) lines.push(`    Last: ${p.lastError}`);
        }
        lines.push(``);
      }

      // Warning section (crash rate > 0 but not disabled)
      const warnings = problematic.filter((p) => !p.autoDisabled);
      if (warnings.length > 0) {
        lines.push({ sub: toSC("Warning / Error Detected") });
        for (const p of warnings) {
          const status = p.enabled ? `[${p.health}]` : "[OFF]";
          lines.push(`  ${p.name} (${p.category}) — ${status} ${p.crashRate}% (${p.errors}/${p.executions})`);
          if (p.lastError && p.crashRate > 0) lines.push(`    Last: ${p.lastError}`);
        }
      }
    }

    lines.push(``);
    lines.push(`${toSC("Threshold")}: ${settings.threshold}% | ${toSC("Window")}: ${settings.windowSize}`);

    await m.react("🐣");
    await m.reply(raraBox(toSC("Plugin Health Report"), lines));
    return;
  }

  // .autoplugin threshold <persen>
  if (subCmd === "threshold") {
    const val = parseInt(args[1]);
    if (!val || val < 10 || val > 100) {
      return m.reply(raraError("autoplugin", "Threshold 10-100%", `.autoplugin threshold 50`));
    }
    const db = getDatabase();
    db.setting("autoplugin_threshold", val);
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `Threshold: ${val}%`,
      toSC("Plugin dengan crash rate di atas ini akan di-auto-disable"),
    ]));
    return;
  }

  // .autoplugin window <jumlah>
  if (subCmd === "window") {
    const val = parseInt(args[1]);
    if (!val || val < 5 || val > 100) {
      return m.reply(raraError("autoplugin", "Window 5-100 executions", `.autoplugin window 20`));
    }
    const db = getDatabase();
    db.setting("autoplugin_window", val);
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `Window: ${val} ${toSC("executions")}`,
      toSC("Crash rate dihitung dari") + ` ${val} ${toSC("eksekusi terakhir")}`,
    ]));
    return;
  }

  // .autoplugin cooldown <menit>
  if (subCmd === "cooldown") {
    const val = parseInt(args[1]);
    if (!val || val < 1 || val > 1440) {
      return m.reply(raraError("autoplugin", "Cooldown 1-1440 menit", `.autoplugin cooldown 30`));
    }
    const db = getDatabase();
    db.setting("autoplugin_cooldown", val);
    if (monitorActive) {
      stopCooldownChecker();
      startCooldownChecker(sock);
    }
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `Cooldown: ${val} ${toSC("menit")}`,
      toSC("Plugin auto-disabled akan di-re-enable setelah") + ` ${val} ${toSC("menit")}`,
    ]));
    return;
  }

  // .autoplugin whitelist [add/del] <plugin>
  if (subCmd === "whitelist") {
    const action = args[1]?.toLowerCase();
    const pluginName = args[2]?.toLowerCase();

    if (!action || action === "list" || action === "show") {
      const whitelist = getWhitelist();
      const lines = [`${toSC("Total")}: ${whitelist.length}`, ``];
      for (const name of whitelist) {
        lines.push(`  ${name}`);
      }
      lines.push(``);
      lines.push(`${toSC("Whitelist = plugin critical, tidak akan di-auto-disable")}`);
      await m.reply(raraBox(toSC("Plugin Whitelist"), lines));
      return;
    }

    if (!pluginName) {
      return m.reply(raraError("autoplugin", "Format: .autoplugin whitelist add/del <plugin>", `.autoplugin whitelist add menu`));
    }

    const db = getDatabase();
    const whitelist = getWhitelist();

    if (action === "add") {
      if (whitelist.includes(pluginName)) {
        return m.reply(raraError("autoplugin", `"${pluginName}" sudah di whitelist`, `.autoplugin whitelist`));
      }
      whitelist.push(pluginName);
      db.setting("autoplugin_whitelist", whitelist);
      await m.reply(raraBox(toSC("Plugin Whitelist"), [
        `${toSC("Ditambahkan")}: ${pluginName}`,
      ]));
      return;
    }

    if (action === "del" || action === "remove") {
      // Jangan biarkan hapus default whitelist
      if (DEFAULT_WHITELIST.includes(pluginName)) {
        return m.reply(raraError("autoplugin", `"${pluginName}" adalah default whitelist, tidak bisa dihapus`, `Hanya custom whitelist yang bisa dihapus`));
      }
      const filtered = whitelist.filter((n) => n !== pluginName);
      if (filtered.length === whitelist.length) {
        return m.reply(raraError("autoplugin", `"${pluginName}" tidak ada di whitelist`, `.autoplugin whitelist`));
      }
      db.setting("autoplugin_whitelist", filtered);
      await m.reply(raraBox(toSC("Plugin Whitelist"), [
        `${toSC("Dihapus")}: ${pluginName}`,
      ]));
      return;
    }

    return m.reply(raraError("autoplugin", "Format: .autoplugin whitelist add/del <plugin>", `.autoplugin whitelist add menu`));
  }

  // .autoplugin enable <plugin>
  if (subCmd === "enable") {
    const name = args[1]?.toLowerCase();
    if (!name) {
      return m.reply(raraError("autoplugin", "Format: .autoplugin enable <plugin>", `.autoplugin enable ytstalk`));
    }
    const result = enablePlugin(name);
    if (!result) {
      return m.reply(raraError("autoplugin", `Plugin "${name}" tidak ditemukan`, `.autoplugin report`));
    }
    // Reset auto-disabled flag
    const stats = getStats(name);
    stats.autoDisabled = false;
    stats.disabledAt = null;
    stats.recentResults = [];
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `${toSC("Plugin di-enable")}: ${name}`,
      toSC("Error counter direset"),
    ]));
    return;
  }

  // .autoplugin disable <plugin>
  if (subCmd === "disable") {
    const name = args[1]?.toLowerCase();
    if (!name) {
      return m.reply(raraError("autoplugin", "Format: .autoplugin disable <plugin>", `.autoplugin disable ytstalk`));
    }
    const result = disablePlugin(name);
    if (!result) {
      return m.reply(raraError("autoplugin", `Plugin "${name}" tidak ditemukan`, `.autoplugin report`));
    }
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `${toSC("Plugin di-disable")}: ${name}`,
    ]));
    return;
  }

  // .autoplugin reset <plugin|all>
  if (subCmd === "reset") {
    const target = args[1]?.toLowerCase();

    if (!target || target === "all") {
      pluginStats.clear();
      await m.reply(raraBox(toSC("Plugin Health Monitor"), [
        toSC("Semua error counter direset"),
      ]));
      return;
    }

    if (!pluginStats.has(target)) {
      return m.reply(raraError("autoplugin", `Plugin "${target}" belum ada data`, `.autoplugin reset all`));
    }

    const stats = getStats(target);
    stats.executions = 0;
    stats.errors = 0;
    stats.lastError = null;
    stats.lastErrorTime = null;
    stats.recentResults = [];

    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `${toSC("Counter direset")}: ${target}`,
    ]));
    return;
  }

  // .autoplugin notify on/off
  if (subCmd === "notify") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return m.reply(raraError("autoplugin", "Format: .autoplugin notify on/off", `.autoplugin notify on`));
    }
    const db = getDatabase();
    db.setting("autoplugin_notify", action === "on");
    await m.reply(raraBox(toSC("Plugin Health Monitor"), [
      `Notify Owner: ${action === "on" ? "ON" : "OFF"}`,
    ]));
    return;
  }

  // Unknown
  return m.reply(raraError("autoplugin", te(m.prefix, m.command, m.pushName), ".autoplugin report"));
}

export { pluginConfig, handler, pluginConfig as config };
