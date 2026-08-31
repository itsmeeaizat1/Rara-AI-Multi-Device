// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
//
// ============================================================
//  LICENSE: Custom Proprietary License
//  Copyright (c) 2024-2026 Aizat (github.com/itsmeeaizat)
//  All Rights Reserved. Made in Indonesia.
//
//  Dilarang: menjual, menyewakan, menghapus watermark,
//  mengklaim sebagai karya sendiri, atau mendistribusikan
//  ulang tanpa izin tertulis dari pembuat.
//  Lihat file LICENSE untuk ketentuan lengkap.
// ============================================================
//
import path from "path";
import fs from "fs";
import config from "./config.js";
import { startConnection } from "./src/connection.js";
import {
  messageHandler,
  groupHandler,
  messageUpdateHandler,
  groupSettingsHandler,
  handleAntiRemoveFromUpsert,
} from "./src/handler.js";
import { loadPlugins, pluginStore } from "./src/lib/nova-plugins.js";
import { initDatabase, getDatabase } from "./src/lib/nova-database.js";
import {
  initScheduler,
  loadScheduledMessages,
  startGroupScheduleChecker,
  startSewaChecker,
} from "./src/lib/nova-scheduler.js";
import { handleAntiTagSW } from "./src/lib/nova-group-protection.js";
// import { initSholatScheduler } from "./src/lib/nova-sholat-scheduler.js";  // moved to dynamic import below
// import { initNotifScheduler } from "./src/lib/nova-notif-scheduler.js";  // moved to dynamic import below
// import { initWeatherScheduler } from "./src/lib/nova-weather-scheduler.js";  // moved to dynamic import below
// import { initLokerScheduler } from "./src/lib/nova-loker-scheduler.js";  // moved to dynamic import below
// import { initAutoJpmScheduler } from "./src/lib/nova-auto-jpm.js";  // moved to dynamic import below
import { startMemoryMonitor } from "./src/lib/nova-memory-monitor.js";
import { startTempCleaner } from "./src/lib/nova-temp-cleaner.js";
import { init as initCacheCleaner } from "./src/lib/nova-cache-cleaner.js";
import { startDailyPruner } from "./src/lib/nova-data-pruner.js";
import { preloadAssets } from "./src/lib/nova-asset-manager.js";
import {
  logger,
  c,
  playBootSequence,
  spinText,
  logConnection,
  logErrorBox,
  divider,
} from "./src/lib/nova-logger.js";

await import("./src/lib/nova-agent.js")
  .then((m) => m.initializeAgent())
  .catch(() => { });

// === DEAD MAN'S SWITCH ===
const _p = path.join(process.cwd(), "src", "lib", "auth", "auth.js");
if (!fs.existsSync(_p)) {
  console.error("\n[FATAL] File sistem kritis tidak ditemukan. Bot tidak dapat dijalankan.\n");
  process.exit(1);
}
// === END DEAD MAN'S SWITCH ===

const LOG_NOISE = new Set([
  "Closing",
  "prekey",
  "_chains",
  "registrationId",
  "chainKey",
  "ephemeralKeyPair",
  "rootKey",
  "indexInfo",
  "pendingPreKey",
  "currentRatchet",
  "baseKey",
  "privKey",
]);
const _log = console.log;
console.log = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  for (const noise of LOG_NOISE) {
    if (first.includes(noise)) return;
  }
  _log.apply(console, args);
};

const startTime = Date.now();

let pluginWatcher = null;
const reloadDebounce = new Map();
const fileStatCache = new Map();

function startDevWatcher(pluginsPath) {
  if (pluginWatcher) pluginWatcher.close();

  logger.system("dev", "Hot-Reload watcher active for plugins");

  pluginWatcher = fs.watch(
    pluginsPath,
    { recursive: true },
    (eventType, filename) => {
      if (!filename || !filename.endsWith(".js")) return;

      const existingTimeout = reloadDebounce.get(filename);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(async () => {
        reloadDebounce.delete(filename);
        const fullPath = path.join(pluginsPath, filename);

        if (!fs.existsSync(fullPath)) {
          fileStatCache.delete(fullPath);
          const pluginName = path.basename(filename, ".js");
          const { unloadPlugin } = await import("./src/lib/nova-plugins.js");
          const result = unloadPlugin(pluginName);
          if (result.success) logger.warn("plugin", `removed ${filename}`);
          return;
        }

        try {
          const stats = fs.statSync(fullPath);
          const cached = fileStatCache.get(fullPath);
          const changed =
            !cached ||
            cached.mtimeMs !== stats.mtimeMs ||
            cached.size !== stats.size;
          if (!changed) return;

          fileStatCache.set(fullPath, {
            mtimeMs: stats.mtimeMs,
            size: stats.size,
          });

          const { hotReloadPlugin } =
            await import("./src/lib/nova-plugins.js");
          const result = await hotReloadPlugin(fullPath);
          if (!result.success) {
            logger.error(
              "plugin",
              `reload failed: ${filename}: ${result.error}`,
            );
          }
        } catch (error) {
          logger.error(
            "plugin",
            `reload failed: ${filename}: ${error.message}`,
          );
        }
      }, 500);

      reloadDebounce.set(filename, timeout);
    },
  );

  logger.debug("dev", `Monitoring directory: ${pluginsPath}`);
}

let srcWatcher = null;

function startSrcWatcher(srcPath) {
  if (srcWatcher) srcWatcher.close();

  logger.system("dev", "Hot-Reload watcher active for src");

  srcWatcher = fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) return;

    const existingTimeout = reloadDebounce.get("src_" + filename);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      reloadDebounce.delete("src_" + filename);
      const fullPath = path.join(srcPath, filename);
      if (!fs.existsSync(fullPath)) {
        logger.warn("dev", `src file removed: ${filename}`);
        return;
      }
      logger.success("dev", `src changed: ${filename}`);
    }, 500);

    reloadDebounce.set("src_" + filename, timeout);
  });

  logger.debug("dev", `Monitoring directory: ${srcPath}`);
}

function setupAntiCrash() {
  process.on("uncaughtException", (error, origin) => {
    const ignoredErrors = [
      "write EOF",
      "ECONNRESET",
      "EPIPE",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
      "read ECONNRESET",
    ];
    const isIgnored = ignoredErrors.some(
      (msg) => error.message?.includes(msg) || error.code === msg,
    );
    if (isIgnored) return;

    logErrorBox("uncaught exception", error.message);
    console.error(c.gray(error.stack));
    logger.system("system", "Engine is still running");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logErrorBox("unhandled rejection", String(reason));
    console.error(c.gray("Promise:"), promise);
    logger.system("system", "Engine is still running");
  });

  process.on("warning", (warning) => {
    logger.warn("system", `${warning.name}: ${warning.message}`);
  });

  process.on("SIGINT", async () => {
    console.log("");
    logger.system("system", "Received STOP signal (SIGINT)");
    logger.info("database", "Saving data to local storage...");
    try {
      const db = getDatabase();
      db.save();
      logger.success("database", "All data successfully saved");
    } catch (error) {
      logger.warn("database", `save failed: ${error.message}`);
    }
    logger.info("system", "Engine stopped safely");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("");
    logger.system("system", "Received TERMINATE signal (SIGTERM)");
    process.exit(0);
  });

  logger.success("system", "Anti-Crash Protection is Active");
}

async function main() {
  await playBootSequence({
    name: config.bot?.name || "Nova-AI",
    version: config.bot?.version || "1.0.0",
    developer: config.bot?.developer || "Developer",
    mode: config.mode || "public",
  });
  setupAntiCrash();

  const dbPath = path.join(
    process.cwd(),
    config.database?.path || "./database/main",
  );
  await initDatabase(dbPath);
  const db = getDatabase();

  await spinText("system", "Starting local asset cache server...", { tone: "accent" });
  await preloadAssets(config.assets);

  const savedMode = db.setting("botMode");
  if (savedMode && (savedMode === "self" || savedMode === "public"))
    config.mode = savedMode;
  const savedPremium = db.setting("premiumUsers");
  if (Array.isArray(savedPremium)) config.premiumUsers = savedPremium;
  const savedBanned = db.setting("bannedUsers");
  if (Array.isArray(savedBanned)) config.bannedUsers = savedBanned;

  const pCount = Array.isArray(savedPremium) ? savedPremium.length : 0;
  const bCount = Array.isArray(savedBanned) ? savedBanned.length : 0;
  logger.success(
    "database",
    `Database initialized | Mode: ${config.mode} | Premium: ${pCount} | Banned: ${bCount}`,
  );

  const pluginsPath = path.join(process.cwd(), "plugins");
  const pluginCount = await loadPlugins(pluginsPath);
  logger.success("plugin", `${pluginCount} modules loaded successfully`);

  if (config.dev?.enabled && config.dev?.watchPlugins)
    startDevWatcher(pluginsPath);
  if (config.dev?.enabled && config.dev?.watchSrc) {
    const srcPath = path.join(process.cwd(), "src");
    startSrcWatcher(srcPath);
  }

  initScheduler(config);

  const bootTime = Date.now() - startTime;
  logger.success("boot", `System initialized in ${bootTime}ms`);
  divider();
  await spinText("network", "Opening WhatsApp connection tunnel...", {
    duration: 900,
    tone: "accent",
  });
  logConnection("connecting", "Establishing session and handshake protocol");
  console.log("");

  await startConnection({
    onRawMessage: async (msg, sock) => {
      try {
        const db = getDatabase();
        await handleAntiTagSW(msg, sock, db);
      } catch (error) { }
    },

    onMessage: async (msg, sock) => {
      try {
        const handlerPromise = messageHandler(msg, sock);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Handler timeout")), 60000),
        );
        await Promise.race([handlerPromise, timeoutPromise]);
      } catch (error) {
        if (error.message !== "Handler timeout") {
          logger.error("HANDLER", error.message);
          if (config.dev?.debugLog) console.error(c.gray(error.stack));
        }
      }
    },

    onGroupUpdate: async (update, sock) => {
      try {
        await groupHandler(update, sock);
      } catch (error) {
        logger.error("GROUP", error.message);
      }
    },

    onMessageUpdate: async (updates, sock) => {
      try {
        await messageUpdateHandler(updates, sock);
      } catch (error) {
        logger.error("MSG", error.message);
      }
    },

    onGroupSettingsUpdate: async (update, sock) => {
      try {
        await groupSettingsHandler(update, sock);
      } catch (error) {
        logger.error("GROUP", error.message);
      }
    },

    onStubMessage: async (msg, sock) => {
      try {
        const db = getDatabase();
        await handleAntiRemoveFromUpsert(msg, sock, db);
      } catch (error) {
        logger.error("ANTIDELETE", error.message);
      }
    },

    onConnectionUpdate: async (update, sock) => {
      if (update.connection === "open") {
        logConnection("connected", sock.user?.name || "Bot");
        loadScheduledMessages(sock);
        startGroupScheduleChecker(sock);
        startSewaChecker(sock);
        initScheduler(config, sock);
        // Dynamic imports for schedulers (graceful if 'cron' package is missing)
        const schedulerInits = [
          { name: "AutoJPM", fn: () => import("./src/lib/nova-auto-jpm.js").then(m => m.initAutoJpmScheduler?.(sock)) },
          { name: "Sholat", fn: () => import("./src/lib/nova-sholat-scheduler.js").then(m => m.initSholatScheduler?.(sock)) },
          { name: "Notif", fn: () => import("./src/lib/nova-notif-scheduler.js").then(m => m.initNotifScheduler?.(sock)) },
          { name: "Weather", fn: () => import("./src/lib/nova-weather-scheduler.js").then(m => m.initWeatherScheduler?.(sock)) },
          { name: "Loker", fn: () => import("./src/lib/nova-loker-scheduler.js").then(m => m.initLokerScheduler?.(sock)) },
          { name: "BMKG", fn: () => import("./src/lib/nova-bmkg-scheduler.js").then(m => m.initBmkgScheduler?.(sock)) },
          { name: "BMKG-Cuaca", fn: () => import("./src/lib/nova-bmkg-cuaca-scheduler.js").then(m => m.initCuacaScheduler?.(sock)) },
          { name: "Store", fn: () => import("./src/lib/nova-store.js").then(m => m.setSock?.(sock)) },
          { name: "APICheck", fn: () => import("./plugins/owner/autoapicheck.js").then(m => m.startMonitor?.(sock)) },
          { name: "PluginHealth", fn: () => import("./plugins/owner/autoplugin.js").then(m => m.startPluginMonitor?.(sock)) },
          { name: "WeeklyReport", fn: () => import("./plugins/owner/autoweeklyreport.js").then(m => m.startWeeklyReport?.(sock)) },
          { name: "ChurnMonitor", fn: () => import("./plugins/owner/autochurn.js").then(m => m.startChurnMonitor?.(sock)) },
          { name: "AutoLang", fn: () => import("./plugins/owner/autolang.js").then(m => m.startAutoLang?.(sock)) },
          { name: "SmartMod", fn: () => import("./plugins/owner/autosmartmod.js").then(m => m.startSmartMod?.(sock)) },
          { name: "AutoContent", fn: () => import("./plugins/owner/autocontent.js").then(m => m.startAutoContent?.(sock)) },
          { name: "AutoPredict", fn: () => import("./plugins/owner/autopredict.js").then(m => m.startAutoPredict?.(sock)) },
          { name: "AutoFailover", fn: () => import("./plugins/owner/autofailover.js").then(m => m.startAutoFailover?.(sock)) },
          { name: "AutoSmartWelcome", fn: () => import("./plugins/owner/autosmartwelcome.js").then(m => m.startAutoSmartWelcome?.(sock)) },
        ];
        for (const { name, fn } of schedulerInits) {
          try {
            await fn();
            logger.success("scheduler", `${name} scheduler started`);
          } catch (e) {
            logger.warn("scheduler", `${name} scheduler skipped: ${e.message}`);
          }
        }
        try {
          const { initSahurCron } =
            await import("./plugins/religi/autosahur.js");
          initSahurCron(sock);
        } catch { }
        try {
          const { startOrderPoller } = await import("./src/lib/nova-order-poller.js");
          if (typeof startOrderPoller === "function") {
            try {
              startOrderPoller(sock);
            } catch (e) {
              logger.warn("ORDER", `startOrderPoller failed during start: ${e.message}`);
            }
          } else {
            logger.warn("ORDER", "startOrderPoller not exported or not a function");
          }
        } catch (e) {
          logger.warn("ORDER", `startOrderPoller unavailable: ${e.message}`);
        }
        try {
          const { startOtpPoller: _startOtp } =
            await import("./src/lib/nova-otp-poller.js");
          _startOtp(sock);
        } catch { }

        try {
          const { getAllJadibotSessions, restartJadibotSession } =
            await import("./src/lib/nova-jadibot-manager.js");
          const sessions = getAllJadibotSessions();
          if (sessions.length > 0) {
            logger.info("JADIBOT", `Restoring ${sessions.length} session(s)`);
            for (const session of sessions) {
              try {
                await restartJadibotSession(sock, session.id);
                await new Promise((r) => setTimeout(r, 3000));
              } catch (e) {
                logger.error(
                  "JADIBOT",
                  `Failed restore ${session.id}: ${e.message}`,
                );
              }
            }
          }
        } catch (e) {
          logger.error("JADIBOT", `Gagal memulihkan: ${e.message}`);
        }

        const devLabel = config.dev?.enabled ? ` ${c.yellow("• dev")}` : "";
        startMemoryMonitor();
        startTempCleaner();
        startDailyPruner();
        initCacheCleaner();
        logger.success("ready", `All subsystems are fully operational${devLabel}`);
        divider();
      }
    },
  });
}

main().catch((error) => {
  logErrorBox("Fatal Error", error.message);
  console.error(c.gray(error.stack));
  process.exit(1);
});
