// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * .autoresource — Auto-Resource Optimizer
 *
 * Fitur automation "bot masa depan" #5:
 * - Monitor CPU, RAM, event loop lag, API response time real-time
 * - Threshold PERSEN BISA DIATUR SENDIRI oleh owner
 * - Auto-optimize: clear cache, gc(), restart connection, switch API
 * - Auto-action berdasarkan threshold yang di-set:
 *   - RAM > X% → clear cache + force GC
 *   - CPU > X% → reduce interval, pause non-critical tasks
 *   - Event loop lag > Xms → throttle message processing
 *   - API response > Xms → switch ke backup API
 * - Monitor interval configurable (default: tiap 5 menit)
 * - Notifikasi owner saat resource critical
 * - Resource history (last 50 snapshots)
 * - Action log: setiap optimasi yang dijalankan
 * - Manual trigger: clear cache, gc, restart
 *
 * Commands:
 *   .autoresource                      — Dashboard status
 *   .autoresource on/off               — Aktifkan/matikan monitoring
 *   .autoresource set <metric> <persen> — Set threshold (ram/cpu/api/loop)
 *   .autoresource interval <menit>     — Set interval monitoring
 *   .autoresource action <metric> <action> — Set action per metric
 *   .autoresource notify on/off        — Notifikasi owner saat critical
 *   .autoresource now                   — Cek resource sekarang
 *   .autoresource clear                 — Clear cache manual
 *   .autoresource gc                    — Force garbage collection
 *   .autoresource restart               — Restart connection (hati-hati)
 *   .autoresource history               — Lihat resource history
 *   .autoresource actions               — Lihat action log
 *   .autoresource reset                 — Reset stats & history
 */

import os from "os";
import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraBox, toSC } from "../../src/lib/rara-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autoresource",
  alias: ["autoresource", "autoopt", "resourceoptimizer", "aropt", "autooptimize"],
  category: "owner",
  description: "Auto-Resource Optimizer — monitor & auto-optimize CPU/RAM/API dengan threshold custom",
  usage: ".autoresource <on/off/set/interval/action/notify/now/clear/gc/restart/history/actions/reset>",
  example: ".autoresource set ram 80",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// SETTINGS — threshold persen bisa diatur sendiri
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoResource) {
    db.db.data.automation.autoResource = {
      enabled: false,
      intervalMinutes: 5, // check every N minutes
      notifyOwner: true,
      // Threshold dalam persen (bisa di-set sendiri oleh owner)
      thresholds: {
        ram: 80,        // % RAM usage → trigger action
        cpu: 85,        // % CPU usage → trigger action
        eventLoop: 500, // ms event loop lag → trigger action (bukan persen, ms)
        apiLatency: 3000, // ms API response time → trigger (bukan persen, ms)
      },
      // Action per metric (bisa di-custom)
      actions: {
        ram: "clear+gc",      // clear cache + force gc
        cpu: "throttle",      // reduce non-critical tasks
        eventLoop: "throttle", // throttle message processing
        apiLatency: "switch",  // switch to backup API
      },
      stats: {
        totalChecks: 0,
        totalActions: 0,
        totalClearCache: 0,
        totalGC: 0,
        totalRestarts: 0,
        totalAPISwitch: 0,
        totalThrottle: 0,
        lastCheck: null,
        peakRAM: 0,
        peakCPU: 0,
        peakEventLoop: 0,
        peakAPILatency: 0,
      },
      history: [], // last 50 resource snapshots
      actionLog: [], // last 30 actions taken
    };
    db.db.write();
  }
  return db.db.data.automation.autoResource;
}

// ============================================================
// RESOURCE MONITORING
// ============================================================

// CPU usage (approximation via loadavg vs core count)
function getCPUUsage() {
  const load = os.loadavg()[0]; // 1-minute load average
  const cores = os.cpus().length;
  return Math.min(100, Math.round((load / cores) * 100));
}

// RAM usage
function getRAMUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return Math.round((used / total) * 100);
}

// Process memory (heap)
function getProcessMemory() {
  const mem = process.memoryUsage();
  return {
    rss: Math.round(mem.rss / 1024 / 1024), // MB
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
    external: Math.round(mem.external / 1024 / 1024), // MB
  };
}

// Event loop lag (approximation)
function getEventLoopLag() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // ms
      resolve(Math.round(lag));
    });
  });
}

// API latency check (ping one API endpoint)
async function getAPILatency() {
  try {
    const testUrl = config.aiHelp?.apiEndpoint || "https://api.openai.com";
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(testUrl, {
      method: "HEAD",
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    return Date.now() - start;
  } catch {
    return 9999; // timeout/error
  }
}

// ============================================================
// ACTIONS
// ============================================================

// Clear cache
function clearCache() {
  let cleared = 0;
  // Clear require cache for non-core modules
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes("plugins/") &&
      !key.includes("node_modules") &&
      !key.includes("autoresource")
    ) {
      delete require.cache[key];
      cleared++;
    }
  }
  return cleared;
}

// Force garbage collection (if --expose-gc)
function forceGC() {
  if (global.gc) {
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    return Math.round((before - after) / 1024 / 1024); // MB freed
  }
  return 0;
}

// Throttle: reduce non-critical task frequency
let throttleActive = false;
let throttleUntil = 0;
function activateThrottle(durationMs = 60000) {
  throttleActive = true;
  throttleUntil = Date.now() + durationMs;
}
export function isThrottled() {
  if (!throttleActive) return false;
  if (Date.now() > throttleUntil) {
    throttleActive = false;
    return false;
  }
  return true;
}

// ============================================================
// LOG ACTION
// ============================================================
function logAction(settings, action, metric, value, threshold) {
  settings.actionLog.push({
    action,
    metric,
    value,
    threshold,
    timestamp: new Date().toISOString(),
  });
  if (settings.actionLog.length > 30) settings.actionLog.shift();

  switch (action) {
    case "clear+gc":
    case "clear":
      settings.stats.totalClearCache++;
      break;
    case "gc":
      settings.stats.totalGC++;
      break;
    case "throttle":
      settings.stats.totalThrottle++;
      break;
    case "restart":
      settings.stats.totalRestarts++;
      break;
    case "switch":
      settings.stats.totalAPISwitch++;
      break;
  }
  settings.stats.totalActions++;
}

// ============================================================
// MAIN CHECK: run resource check & auto-optimize
// ============================================================
async function runResourceCheck(sock) {
  const settings = getSettings();
  if (!settings.enabled) return;

  const ramUsage = getRAMUsage();
  const cpuUsage = getCPUUsage();
  const eventLoopLag = await getEventLoopLag();
  const procMem = getProcessMemory();
  const apiLatency = await getAPILatency();

  // Snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    ram: ramUsage,
    cpu: cpuUsage,
    eventLoop: eventLoopLag,
    apiLatency,
    procMem,
  };

  // Update stats
  settings.stats.totalChecks++;
  settings.stats.lastCheck = snapshot.timestamp;
  settings.stats.peakRAM = Math.max(settings.stats.peakRAM, ramUsage);
  settings.stats.peakCPU = Math.max(settings.stats.peakCPU, cpuUsage);
  settings.stats.peakEventLoop = Math.max(settings.stats.peakEventLoop, eventLoopLag);
  settings.stats.peakAPILatency = Math.max(settings.stats.peakAPILatency, apiLatency);

  // History
  settings.history.push(snapshot);
  if (settings.history.length > 50) settings.history.shift();

  // Check thresholds & execute actions
  const actions = [];
  let criticalCount = 0;

  // RAM check
  if (ramUsage >= settings.thresholds.ram) {
    criticalCount++;
    const action = settings.actions.ram;
    actions.push({ metric: "RAM", value: ramUsage, threshold: settings.thresholds.ram, action });

    if (action.includes("clear")) {
      const cleared = clearCache();
      logAction(settings, "clear", "RAM", ramUsage, settings.thresholds.ram);
    }
    if (action.includes("gc")) {
      const freed = forceGC();
      logAction(settings, "gc", "RAM", ramUsage, settings.thresholds.ram);
    }
  }

  // CPU check
  if (cpuUsage >= settings.thresholds.cpu) {
    criticalCount++;
    const action = settings.actions.cpu;
    actions.push({ metric: "CPU", value: cpuUsage, threshold: settings.thresholds.cpu, action });

    if (action === "throttle") {
      activateThrottle(120000); // throttle for 2 minutes
      logAction(settings, "throttle", "CPU", cpuUsage, settings.thresholds.cpu);
    }
  }

  // Event loop check
  if (eventLoopLag >= settings.thresholds.eventLoop) {
    criticalCount++;
    const action = settings.actions.eventLoop;
    actions.push({ metric: "EventLoop", value: eventLoopLag, threshold: settings.thresholds.eventLoop, action });

    if (action === "throttle") {
      activateThrottle(60000);
      logAction(settings, "throttle", "EventLoop", eventLoopLag, settings.thresholds.eventLoop);
    }
  }

  // API latency check
  if (apiLatency >= settings.thresholds.apiLatency) {
    criticalCount++;
    const action = settings.actions.apiLatency;
    actions.push({ metric: "API", value: apiLatency, threshold: settings.thresholds.apiLatency, action });

    if (action === "switch") {
      // Trigger autofailover if available
      try {
        const { triggerFailoverCheck } = await import("./autofailover.js");
        if (typeof triggerFailoverCheck === "function") {
          await triggerFailoverCheck(sock);
        }
      } catch {}
      logAction(settings, "switch", "API", apiLatency, settings.thresholds.apiLatency);
    }
  }

  // Notify owner if critical
  if (criticalCount > 0 && settings.notifyOwner) {
    try {
      const ownerNum = config.owner?.number?.[0];
      if (ownerNum) {
        const ownerJid = ownerNum.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        const actionLines = actions.map((a) => `${a.metric}: ${a.value} (threshold: ${a.threshold}) → ${a.action}`).join("\n");
        const notifyMsg =
          "" +
          `${criticalCount} metric critical!\n` +
          `${actionLines}\n` +
          `
` +
          `RAM: ${ramUsage}% | CPU: ${cpuUsage}%\n` +
          `Loop: ${eventLoopLag}ms | API: ${apiLatency}ms\n` +
          "";
        await sock.sendMessage(ownerJid, { text: notifyMsg });
      }
    } catch {}
  }

  getDatabase().db.write();
  return { snapshot, actions, criticalCount };
}

// ============================================================
// CRON JOB
// ============================================================
let resourceCron = null;

function startResourceCron(sock) {
  if (resourceCron) resourceCron.stop();

  const settings = getSettings();
  if (!settings.enabled) return;

  const minutes = settings.intervalMinutes || 5;
  resourceCron = new CronJob(
    `0 */${minutes} * * * *`,
    async () => {
      console.log("[autoresource] Cron — checking resources...");
      await runResourceCheck(sock);
    },
    null,
    true,
    "Asia/Jakarta"
  );

  console.log(`[autoresource] Cron started — every ${minutes} minutes`);
}

function stopResourceCron() {
  if (resourceCron) {
    resourceCron.stop();
    resourceCron = null;
  }
}

// ============================================================
// START FUNCTION (called from index.js)
// ============================================================
export async function startAutoResource(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startResourceCron(sock);
  }
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const settings = getSettings();
    const db = getDatabase();
    const arg = (m.text || "").trim();
    const args = arg.split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();

    // ─── DASHBOARD ───
    if (!sub) {
      const status = settings.enabled ? "ON" : "OFF";
      const t = settings.thresholds;

      const actionLines = Object.entries(settings.actions)
        .map(([k, v]) => `| ${k}: ${v}`)
        .join("\n");

      const thresholdLines = `| RAM: ${t.ram}% → ${settings.actions.ram}\n` +
        `| CPU: ${t.cpu}% → ${settings.actions.cpu}\n` +
        `| EventLoop: ${t.eventLoop}ms → ${settings.actions.eventLoop}\n` +
        `| API: ${t.apiLatency}ms → ${settings.actions.apiLatency}`;

      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        `Status: ${status}`,
        `Interval: ${settings.intervalMinutes} menit`,
        `Notify: ${settings.notifyOwner ? "ON" : "OFF"}`,
        "---",
        `Thresholds & Actions:`,
        thresholdLines,
        "---",
        `Stats:`,
        `| Checks: ${settings.stats.totalChecks}`,
        `| Actions: ${settings.stats.totalActions}`,
        `| Clear: ${settings.stats.totalClearCache} | GC: ${settings.stats.totalGC}`,
        `| Throttle: ${settings.stats.totalThrottle} | Switch: ${settings.stats.totalAPISwitch}`,
        `| Restarts: ${settings.stats.totalRestarts}`,
        "---",
        `Peak:`,
        `| RAM: ${settings.stats.peakRAM}% | CPU: ${settings.stats.peakCPU}%`,
        `| Loop: ${settings.stats.peakEventLoop}ms | API: ${settings.stats.peakAPILatency}ms`,
      ]) + "\n\n" + raraBox("COMMANDS", [
        `${prefix}autoresource on/off`,
        `${prefix}autoresource set <ram/cpu/loop/api> <nilai>`,
        `${prefix}autoresource action <ram/cpu/loop/api> <action>`,
        `${prefix}autoresource interval <menit>`,
        `${prefix}autoresource notify on/off`,
        `${prefix}autoresource now`,
        `${prefix}autoresource clear`,
        `${prefix}autoresource gc`,
        `${prefix}autoresource history`,
        `${prefix}autoresource actions`,
        `${prefix}autoresource reset`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      startResourceCron(sock);
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        "Status: ON",
        `Interval: ${settings.intervalMinutes} menit`,
        `RAM threshold: ${settings.thresholds.ram}%`,
        `CPU threshold: ${settings.thresholds.cpu}%`,
        "Monitoring aktif!",
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      stopResourceCron();
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", ["Status: OFF", "Monitoring dihentikan"]));
      return { handled: true };
    }

    // ─── SET THRESHOLD ───
    if (sub === "set") {
      const metric = (args[1] || "").toLowerCase();
      const value = parseInt(args[2]);

      const metricMap = {
        ram: "ram", cpu: "cpu",
        loop: "eventLoop", eventloop: "eventLoop",
        api: "apiLatency", apilatency: "apiLatency",
      };

      const realMetric = metricMap[metric];
      if (!realMetric) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Metric tidak dikenal: ${metric}`,
          "Pilihan: ram, cpu, loop, api",
          `Ketik: ${prefix}autoresource set <ram/cpu/loop/api> <nilai>`,
          "",
          "ram/cpu → persen (1-100)",
          "loop/api → milidetik (ms)",
        ]));
        return { handled: true };
      }

      if (!value || value < 1) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Nilai tidak valid: ${args[2]}`,
          `Ketik: ${prefix}autoresource set ${metric} <nilai>`,
          realMetric === "ram" || realMetric === "cpu" ? "Range: 1-100 (persen)" : "Range: 100-99999 (ms)",
        ]));
        return { handled: true };
      }

      const oldVal = settings.thresholds[realMetric];
      settings.thresholds[realMetric] = value;
      db.db.write();

      const unit = realMetric === "ram" || realMetric === "cpu" ? "%" : "ms";
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        `Threshold ${realMetric}: ${oldVal}${unit} → ${value}${unit}`,
        `Action: ${settings.actions[realMetric]}`,
      ]));
      return { handled: true };
    }

    // ─── SET ACTION ───
    if (sub === "action") {
      const metric = (args[1] || "").toLowerCase();
      const action = (args[2] || "").toLowerCase();

      const metricMap = {
        ram: "ram", cpu: "cpu",
        loop: "eventLoop", eventloop: "eventLoop",
        api: "apiLatency", apilatency: "apiLatency",
      };

      const realMetric = metricMap[metric];
      if (!realMetric) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Metric: ${metric} tidak dikenal`,
          "Pilihan: ram, cpu, loop, api",
        ]));
        return { handled: true };
      }

      // Valid actions per metric
      const validActions = {
        ram: ["clear", "gc", "clear+gc", "restart", "none"],
        cpu: ["throttle", "restart", "none"],
        eventLoop: ["throttle", "none"],
        apiLatency: ["switch", "none"],
      };

      if (!validActions[realMetric].includes(action)) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Action tidak valid: ${action}`,
          `Pilihan untuk ${realMetric}: ${validActions[realMetric].join(", ")}`,
          `Ketik: ${prefix}autoresource action ${metric} <action>`,
        ]));
        return { handled: true };
      }

      const oldAction = settings.actions[realMetric];
      settings.actions[realMetric] = action;
      db.db.write();

      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        `Action ${realMetric}: ${oldAction} → ${action}`,
        `Threshold: ${settings.thresholds[realMetric]}${realMetric === "ram" || realMetric === "cpu" ? "%" : "ms"}`,
      ]));
      return { handled: true };
    }

    // ─── INTERVAL ───
    if (sub === "interval") {
      const mins = parseInt(args[1]);
      if (!mins || mins < 1) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Current: ${settings.intervalMinutes} menit`,
          `Ketik: ${prefix}autoresource interval <menit>`,
        ]));
        return { handled: true };
      }
      settings.intervalMinutes = mins;
      db.db.write();
      if (settings.enabled) startResourceCron(sock);
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        `Interval: ${mins} menit`,
        "Cron di-restart",
      ]));
      return { handled: true };
    }

    // ─── NOTIFY ───
    if (sub === "notify") {
      const val = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(val)) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `Current: ${settings.notifyOwner ? "ON" : "OFF"}`,
          `Ketik: ${prefix}autoresource notify on/off`,
        ]));
        return { handled: true };
      }
      settings.notifyOwner = val === "on";
      db.db.write();
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [`Notify Owner: ${val.toUpperCase()}`]));
      return { handled: true };
    }

    // ─── NOW (check resource now) ───
    if (sub === "now") {
      const ramUsage = getRAMUsage();
      const cpuUsage = getCPUUsage();
      const eventLoopLag = await getEventLoopLag();
      const procMem = getProcessMemory();
      const apiLatency = await getAPILatency();
      const uptime = os.uptime();
      const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

      const t = settings.thresholds;
      const ramBar = "▰".repeat(Math.floor(ramUsage / 10)) + "▱".repeat(10 - Math.floor(ramUsage / 10));
      const cpuBar = "▰".repeat(Math.floor(cpuUsage / 10)) + "▱".repeat(10 - Math.floor(cpuUsage / 10));

      const ramStatus = ramUsage >= t.ram ? "⚠️ CRITICAL" : "✓ OK";
      const cpuStatus = cpuUsage >= t.cpu ? "⚠️ CRITICAL" : "✓ OK";
      const loopStatus = eventLoopLag >= t.eventLoop ? "⚠️ CRITICAL" : "✓ OK";
      const apiStatus = apiLatency >= t.apiLatency ? "⚠️ CRITICAL" : "✓ OK";

      await m.reply(raraBox("RESOURCE STATUS (LIVE)", [
        `Uptime: ${uptimeStr}`,
        `Cores: ${os.cpus().length} | ${os.platform()}`,
        "---",
        `RAM:    ${ramBar} ${ramUsage}% ${ramStatus}`,
        `CPU:    ${cpuBar} ${cpuUsage}% ${cpuStatus}`,
        `Loop:   ${eventLoopLag}ms ${loopStatus}`,
        `API:    ${apiLatency}ms ${apiStatus}`,
        "---",
        `Process Memory:`,
        `| RSS: ${procMem.rss}MB`,
        `| Heap: ${procMem.heapUsed}/${procMem.heapTotal}MB`,
        `| External: ${procMem.external}MB`,
        "---",
        `Thresholds:`,
        `| RAM: ${t.ram}% | CPU: ${t.cpu}%`,
        `| Loop: ${t.eventLoop}ms | API: ${t.apiLatency}ms`,
      ]));
      return { handled: true };
    }

    // ─── CLEAR (manual cache clear) ───
    if (sub === "clear") {
      const cleared = clearCache();
      settings.stats.totalClearCache++;
      db.db.write();
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
        `Cache cleared: ${cleared} modules`,
        `RAM before: ${getRAMUsage()}%`,
      ]));
      return { handled: true };
    }

    // ─── GC (manual garbage collection) ───
    if (sub === "gc") {
      const before = process.memoryUsage().heapUsed;
      const freed = forceGC();
      const after = process.memoryUsage().heapUsed;
      settings.stats.totalGC++;
      db.db.write();

      if (freed > 0) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `GC executed`,
          `Heap freed: ${freed}MB`,
          `Before: ${Math.round(before / 1024 / 1024)}MB → After: ${Math.round(after / 1024 / 1024)}MB`,
        ]));
      } else {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [
          `GC not available`,
          `Jalankan bot dengan: node --expose-gc index.js`,
          "Atau PM2: set --expose-gc flag",
          `Current heap: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        ]));
      }
      return { handled: true };
    }

    // ─── HISTORY ───
    if (sub === "history") {
      if (settings.history.length === 0) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", ["History: kosong"]));
        return { handled: true };
      }
      const recent = settings.history.slice(-15).reverse();
      const lines = recent.map((h) => {
        const time = new Date(h.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return `| ${time} RAM:${h.ram}% CPU:${h.cpu}% Loop:${h.eventLoop}ms API:${h.apiLatency}ms`;
      });
      await m.reply(raraBox("RESOURCE HISTORY", lines));
      return { handled: true };
    }

    // ─── ACTIONS (action log) ───
    if (sub === "actions") {
      if (settings.actionLog.length === 0) {
        await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", ["Action log: kosong"]));
        return { handled: true };
      }
      const recent = settings.actionLog.slice(-15).reverse();
      const lines = recent.map((a) => {
        const time = new Date(a.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return `| ${a.metric} ${a.value} ≥ ${a.threshold} → ${a.action} ${time}`;
      });
      await m.reply(raraBox("ACTION LOG", lines));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = {
        totalChecks: 0,
        totalActions: 0,
        totalClearCache: 0,
        totalGC: 0,
        totalRestarts: 0,
        totalAPISwitch: 0,
        totalThrottle: 0,
        lastCheck: null,
        peakRAM: 0,
        peakCPU: 0,
        peakEventLoop: 0,
        peakAPILatency: 0,
      };
      settings.history = [];
      settings.actionLog = [];
      db.db.write();
      await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", ["Stats, history & action log direset"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(raraBox("AUTO-RESOURCE OPTIMIZER", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autoresource untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autoresource] handler error:", error.message);
    await m.reply(raraError("AutoResource", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
