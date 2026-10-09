// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
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
// 🔹 SECURITY: log sanitizer — sensor apikey/token/authorization di SEMUA
// console.log/error/warn sebelum modul lain di-import (biar semua log,
// termasuk yg jalan saat startup, ikut ke-sensor). Penting kalau panel
// hosting disewakan — penyewa lain gak boleh liat API key lewat console.
import { installLogSanitizer } from "./src/lib/rara-log-sanitizer.js";
installLogSanitizer();
// 🔹 AI AGENT: load all AI provider keys
import {
  getDeepSeekKey, getGroqKey,
  getXaiKey, getQwenKey, getCohereKey, getPerplexityKey,
  getFireworksKey, getAi21Key, getRekaKey, getCerebrasKey,
  getOpenRouterKey, getHuggingFaceKey, getVoyageKey,
  getCloudflareKey, getStabilityKey, getJinaKey
} from "./src/lib/config/env-loader.js";
// 🔹 Set global keys — dipakai oleh aiagent.js & rara-ai-service.js
global.deepseekkey = getDeepSeekKey();
global.groqkey = getGroqKey();
global.xaikey = getXaiKey();
global.qwenkey = getQwenKey();
global.coherekey = getCohereKey();
global.perplexitykey = getPerplexityKey();
global.fireworkskey = getFireworksKey();
global.ai21key = getAi21Key();
global.rekakey = getRekaKey();
global.cerebraskey = getCerebrasKey();
global.openrouterkey = getOpenRouterKey();
global.huggingfacekey = getHuggingFaceKey();
global.voyagekey = getVoyageKey();
global.cloudflarekey = getCloudflareKey();
global.stabilitykey = getStabilityKey();
global.jinakey = getJinaKey();
import { startConnection } from "./src/connection.js";
import {
  messageHandler,
  groupHandler,
  messageUpdateHandler,
  groupSettingsHandler,
  handleAntiRemoveFromUpsert,
} from "./src/handler.js";
import { loadPlugins, pluginStore } from "./src/lib/rara-plugins.js";
import { initDatabase, getDatabase } from "./src/lib/rara-database.js";
import { drainSendQueue, getQueueDepth } from "./src/lib/rara-send-queue.js";
import { syncSewaOverrides } from "./src/lib/sewa/sewa.js";
import {
  initScheduler,
  loadScheduledMessages,
  startGroupScheduleChecker,
  startSewaChecker,
} from "./src/lib/rara-scheduler.js";
import { handleAntiTagSW } from "./src/lib/rara-group-protection.js";
// import { initSholatScheduler } from "./src/lib/rara-sholat-scheduler.js";  // moved to dynamic import below
// import { initNotifScheduler } from "./src/lib/rara-notif-scheduler.js";  // moved to dynamic import below
// import { initWeatherScheduler } from "./src/lib/rara-weather-scheduler.js";  // moved to dynamic import below
// import { initLokerScheduler } from "./src/lib/rara-loker-scheduler.js";  // moved to dynamic import below
// import { initAutoJpmScheduler } from "./src/lib/rara-auto-jpm.js";  // moved to dynamic import below
import { startMemoryMonitor, registerHdBusyCheck } from "./src/lib/rara-memory-monitor.js";
import { startTempCleaner } from "./src/lib/rara-temp-cleaner.js";
import { init as initCacheCleaner } from "./src/lib/rara-cache-cleaner.js";
import { startDailyPruner } from "./src/lib/rara-data-pruner.js";
import { preloadAssets } from "./src/lib/rara-asset-manager.js";
import {
  logger,
  c,
  playBootSequence,
  spinText,
  logConnection,
  logErrorBox,
  divider,
} from "./src/lib/rara-logger.js";

await import("./src/lib/rara-agent.js")
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
          const { unloadPlugin } = await import("./src/lib/rara-plugins.js");
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
            await import("./src/lib/rara-plugins.js");
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
    // 🔹 DOCTOR: error kecatat ke ring buffer (self-healing, default off)
    import("./src/lib/rara-doctor.js").then((md) => md.recordDoctorErrorAuto("uncaughtException", error)).catch(() => {});
  });

  process.on("unhandledRejection", (reason, promise) => {
    logErrorBox("unhandled rejection", String(reason));
    console.error(c.gray("Promise:"), promise);
    logger.system("system", "Engine is still running");
    // 🔹 DOCTOR: rejection juga kecatat (self-healing, default off)
    const __docReason = reason instanceof Error ? reason : new Error(String(reason));
    import("./src/lib/rara-doctor.js").then((md) => md.recordDoctorErrorAuto("unhandledRejection", __docReason)).catch(() => {});
  });

  process.on("warning", (warning) => {
    logger.warn("system", `${warning.name}: ${warning.message}`);
  });

  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
  });

  logger.success("system", "Anti-Crash Protection is Active");
}

// QA Gate 5: graceful shutdown — selesaikan reply yang nanggung di antrean
// kirim dulu (drain), simpan DB, baru mati. Dipanggil SIGINT & SIGTERM.
async function gracefulShutdown(signal) {
  const guarded = gracefulShutdown.__ran;
  if (guarded) return; // signal dobel (egg kirim SIGTERM+SIGINT) = jalan sekali
  gracefulShutdown.__ran = true;
  console.log("");
  logger.system("system", `Received ${signal} signal`);

  // 1) drain antrean kirim — reply nanggung harus sampai sebelum koneksi mati
  try {
    const depth = getQueueDepth();
    if (depth > 0) {
      logger.info("system", `Menyelesaikan ${depth} pesan yang masih di antrean...`);
      const ok = await drainSendQueue(8000);
      if (!ok) logger.warn("system", "Antrean belum kosong setelah 8 detik — lanjut shutdown");
    }
  } catch (error) {
    logger.warn("system", `drain antrean gagal: ${error.message}`);
  }

  // 2) simpan database
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
}

async function main() {
  await playBootSequence({
    name: config.bot?.name || "Rara-AI",
    version: config.bot?.version || "1.0.0",
    developer: config.bot?.developer || "Developer",
    mode: config.mode || "public",
  });
  setupAntiCrash();

  const dbPath = path.join(
    process.cwd(),
    config.database?.path || "./src/database",
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
  // Harga sewa & premium live (override .setsewa) — apply setelah DB ready
  try { syncSewaOverrides(); } catch (e) { console.error("[startup] syncSewaOverrides gagal:", e.message); }

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

  // 🔹 AI CALL AUTO-RUN (18 Sep 2026, request owner: "aicall lngsung ke run
  // saat bot dirun") — service Go aicall/ai-call dinyalain otomatis kalau
  // mati: pm2 restart/start rara-aicall (fallback spawn langsung), lalu
  // tunggu /health OK. Fire-and-forget — gak nunda WhatsApp connect, dan
  // semua gagal-senyap-proof (bot tetap boot normal).
  import("./src/lib/rara-aicall-autostart.js")
    .then((m) => m.ensureAicallRunning())
    .catch((e) => console.error("[aicall-autostart] gagal:", e?.message || e));

  // 🔹 RARA BRIDGE MULTI-PLATFORM (29 Sep 2026) — gateway Telegram & Discord
  // nyalain otomatis kalau .bridge on sebelumnya. Fire-and-forget — bot WA tetap boot.
  import("./src/lib/rarabridge/manager.js")
    .then((m) => m.initBridgeFromBoot())
    .catch((e) => console.error("[rarabridge] gagal init:", e?.message || e));

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
          { name: "PingLog", fn: () => import("./src/lib/rara-pinglog.js").then(m => m.startPingLog?.(sock)) },
          { name: "Optimizer", fn: () => import("./src/lib/rara-optimizer.js").then(m => m.initOptimizerMonitor?.(sock)) },
          { name: "AutoJoin", fn: () => import("./src/lib/rara-autojoin.js").then(m => m.initAutoJoinScheduler?.(sock)) },
          { name: "AnonChat", fn: () => import("./src/lib/rara-anonchat.js").then(m => m.initAnonChatSweeper?.(sock)) },
          { name: "AnonimChat", fn: () => import("./src/lib/rara-anonim-engine.js").then(m => m.initAnonimSweeper?.(sock)) },
          { name: "ChatibLobby", fn: () => import("./src/lib/rara-chatib-lobby.js").then(m => m.initChatibLobbySweeper?.(sock)) },
          { name: "AutoJPM", fn: () => import("./src/lib/rara-auto-jpm.js").then(m => m.initAutoJpmScheduler?.(sock)) },
          { name: "Sholat", fn: () => import("./src/lib/rara-sholat-scheduler.js").then(m => m.initSholatScheduler?.(sock)) },
          { name: "Notif", fn: () => import("./src/lib/rara-notif-scheduler.js").then(m => m.initNotifScheduler?.(sock)) },
          { name: "Weather", fn: () => import("./src/lib/rara-weather-scheduler.js").then(m => m.initWeatherScheduler?.(sock)) },
          { name: "Loker", fn: () => import("./src/lib/rara-loker-scheduler.js").then(m => m.initLokerScheduler?.(sock)) },
          { name: "BMKG", fn: () => import("./src/lib/rara-bmkg-scheduler.js").then(m => m.initBmkgScheduler?.(sock)) },
          { name: "BMKG-Cuaca", fn: () => import("./src/lib/rara-bmkg-cuaca-scheduler.js").then(m => m.initCuacaScheduler?.(sock)) },
          { name: "Bencana", fn: () => import("./src/lib/rara-bencana.js").then(m => m.initBencanaMonitor?.(sock)) },
          { name: "WxAlert", fn: () => import("./plugins/bencana/wxalert.js").then(m => m.initWxAlertMonitor?.(sock)) },
          { name: "Briefing", fn: () => import("./src/lib/rara-briefing.js").then(m => m.initBriefingScheduler?.(sock)) },
          { name: "BotDoctor", fn: () => import("./src/lib/rara-botdoctor.js").then(m => m.initBotDoctorScheduler?.(sock)) },
          { name: "RentAuto", fn: () => import("./src/lib/rara-rent-auto.js").then(m => m.initRentAutoScheduler?.(sock)) },
          { name: "KeyPatrol", fn: () => import("./src/lib/rara-key-patrol.js").then(m => m.initKeyPatrolScheduler?.(sock)) },
          { name: "WorldEvent", fn: () => import("./src/lib/rara-world-event.js").then(m => m.initWorldEventScheduler?.(sock)) },
          { name: "AnimeNotifier", fn: () => import("./src/lib/rara-auto-anime-notifier.js").then(m => m.initAnimeNotifier?.(sock)) },
          { name: "AutoAnimeWinbu", fn: () => import("./src/lib/rara-auto-anime.js").then(m => m.initAutoStart?.(sock)) },
          { name: "MovieNotifier", fn: () => import("./src/lib/rara-movie-notifier.js").then(m => m.initMovieNotifier?.(sock)) },
          { name: "BolaNotifier", fn: () => import("./src/lib/rara-auto-bola-notifier.js").then(m => m.initBolaNotifier?.(sock)) },
          { name: "RainNotifier", fn: () => import("./src/lib/rara-rain-notify.js").then(m => m.initRainNotifier?.(sock)) },
          { name: "LinkedInNotifier", fn: () => import("./src/lib/rara-linkedin-notify.js").then(m => m.initLinkedInNotifier?.(sock)) },
          { name: "RaraWeb", fn: () => import("./src/lib/rara-web-server.js").then(m => m.initNovaWebServer?.(sock)) },
          { name: "Dashboard", fn: () => import("./src/lib/rara-dashboard.js").then(m => m.initDashboardServer?.(sock)) },
          { name: "Store", fn: () => import("./src/lib/rara-store.js").then(m => m.setSock?.(sock)) },
          { name: "Family100Harvest", fn: () => import("./src/lib/rara-family100-harvest.js").then(m => m.initAutoRefresh?.(sock)) },
          { name: "WebWatch", fn: () => import("./src/lib/rara-webwatch.js").then(m => m.initWebWatch?.(sock)) },
          { name: "BeritaNotifier", fn: () => import("./src/lib/rara-berita-notifier.js").then(m => m.initBeritaNotifier?.(sock)) },
          { name: "CryptoAlert", fn: () => import("./src/lib/rara-cryptoalert.js").then(m => m.initCryptoAlert?.(sock)) },
          { name: "APICheck", fn: () => import("./plugins/owner/autoapicheck.js").then(m => m.startMonitor?.(sock)) },
          { name: "PluginHealth", fn: () => import("./plugins/owner/autoplugin.js").then(m => m.startPluginMonitor?.(sock)) },
          { name: "WeeklyReport", fn: () => import("./plugins/owner/autoweeklyreport.js").then(m => m.startWeeklyReport?.(sock)) },
          { name: "ChurnMonitor", fn: () => import("./plugins/owner/autochurn.js").then(m => m.startChurnMonitor?.(sock)) },
          { name: "AutoLang", fn: () => import("./plugins/owner/autolang.js").then(m => m.startAutoLang?.(sock)) },
          { name: "SmartMod", fn: () => import("./plugins/owner/autosmartmod.js").then(m => m.startSmartMod?.(sock)) },
          { name: "AutoContent", fn: () => import("./plugins/owner/autocontent.js").then(m => m.startAutoContent?.(sock)) },
          { name: "AutoPredict", fn: () => import("./plugins/owner/autopredict.js").then(m => m.startAutoPredict?.(sock)) },
          { name: "AutoFailover", fn: () => import("./plugins/owner/autofailover.js").then(m => m.startAutoFailover?.(sock)) },
          { name: "AutoConflict", fn: () => import("./plugins/owner/autoconflict.js").then(m => m.processConflictMessage?.(null, sock)) },
          { name: "AutoSummary", fn: () => import("./plugins/owner/autosummary.js").then(m => m.startAutoSummary?.(sock)) },
          { name: "AutoTask", fn: () => import("./plugins/ai-agent/autotask.js").then(m => m.resumeAutoTasks?.(sock)) },
          { name: "AgentLoop", fn: () => import("./plugins/ai-agent/agentloop.js").then(m => m.resumeAgentLoops?.(sock)) },
          { name: "HotReload", fn: () => import("./src/lib/rara-hotreload.js").then(m => m.resumeHotreload?.(sock)) },
          { name: "9Router", fn: () => import("./src/lib/rara-9router-local.js").then(m => m.initRouter9Boot?.()) },
          { name: "AutoSwgc", fn: () => import("./plugins/owner/autoswgc.js").then(m => m.startAutoSwgc?.(sock)) },
          { name: "AutoResource", fn: () => import("./plugins/owner/autoresource.js").then(m => m.startAutoResource?.(sock)) },
          { name: "ChannelHub", fn: () => import("./src/lib/rara-saluran-hub.js").then(m => m.initSaluranHubScheduler?.(sock)) },
          { name: "Doctor", fn: () => import("./src/lib/rara-doctor.js").then(m => m.initDoctorMonitor?.(sock)) },
          { name: "ChatRevive", fn: () => import("./src/lib/rara-chat-revive.js").then(m => m.initChatReviveScheduler?.(sock)) },
        ];
        for (const { name, fn } of schedulerInits) {
          try {
            await fn();
            logger.success("scheduler", `${name} scheduler started`);
          } catch (e) {
            logger.warn("scheduler", `${name} scheduler skipped: ${e.message}`);
          }
        }
        // Speedtest otomatis PERTAMA KALI pairing/konek (request owner 11 Sep):
        // hasil tes disimpan sbg tanda kecepatan server → tampil di Info Server
        // allmenu. Fire-and-forget biar gak nungguin boot.
        try {
          const { initServerSpeedtest } = await import("./src/lib/rara-speedtest.js");
          initServerSpeedtest(sock).catch(() => {});
        } catch { }
        // ── FIX v24.1.0 — HAPUS IMPORT HANTU (audit import path) ──
        // Tiga modul di bawah ini direferensikan tapi FILE-nya tidak pernah
        // ada di repo: ./plugins/religi/autosahur.js,
        // ./src/lib/rara-order-poller.js, ./src/lib/rara-otp-poller.js.
        // Karena dibungkus try/catch, kegagalannya SENYAP (fitur dikira jalan
        // padahal selalu di-skip). Order polling sudah ditangani inline oleh
        // plugins/panel/orderpanel.js (poll sampai lunas/kedaluwarsa), dan OTP
        // dipanggil on-demand via src/lib/rara-otp-service.js. Referensi mati
        // dihapus supaya tidak menyesatkan. Kalau nanti mau fitur ini sbg
        // background cron, implementasinya dibuat sebagai modul baru + didaftarkan
        // di scheduler resmi (src/lib/rara-scheduler.js), bukan import hantu.

        try {
          const { getAllJadibotSessions, restartJadibotSession } =
            await import("./src/lib/rara-jadibot-manager.js");
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
        // hubungin watchdog memory ke status antrian .remini — restart
        // ditunda selama ada render HD aktif (job gak boleh ilang di tengah)
        import("./src/lib/rara-hd-pool.js")
          .then(({ hdQueueInfo }) => registerHdBusyCheck(() => hdQueueInfo().busy))
          .catch(() => {});
        startTempCleaner();
        startDailyPruner();
        initCacheCleaner();
        console.log("");
        console.log("╭─「 ✦ RARA AI ✦ 」");
        console.log("│");
        console.log("│ ✅ All subsystems fully operational" + (config.dev?.enabled ? " • dev" : ""));
        console.log("│");
        console.log("╰────  •  ────");
        console.log("");
      }
    },
  });
}

main().catch((error) => {
  logErrorBox("Fatal Error", error.message);
  console.error(c.gray(error.stack));
  process.exit(1);
});
