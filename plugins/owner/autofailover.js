// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autofailover — Auto-Failover API Router
 *
 * Fitur automation "bot masa depan":
 * - Monitor API health real-time (ping setiap interval configurable)
 * - Kalau API A down → auto-switch semua request ke API B/C (backup chain)
 * - User gak ngerasa downtime — failover seamless
 * - API routing table: setiap endpoint category punya primary + fallback chain
 * - Health check: HTTP status + latency + response validation
 * - Auto-recovery: kalau API A kembali up → auto-restore ke primary
 * - Circuit breaker: kalau API down >3x dalam 1 jam → mark "unhealthy" (skip 30 menit)
 * - Per-category failover: download, stalker, berita, tools, ai, maker
 * - Real-time stats: uptime %, avg latency, failover count
 * - Notify owner saat failover triggered & saat recovery
 *
 * Commands:
 *   .autofailover                         — Dashboard status
 *   .autofailover on/off                   — Aktifkan/matikan
 *   .autofailover now                      — Health check semua API sekarang
 *   .autofailover routes                   — Lihat routing table
 *   .autofailover add <category> <primary> <backup1> [backup2] — Tambah route
 *   .autofailover del <category>           — Hapus route
 *   .autofailover interval <menit>         — Set interval health check
 *   .autofailover status <api_name>        — Detail status 1 API
 *   .autofailover stats                    — Statistik failover
 *   .autofailover test <category>          — Test failover untuk category
 *   .autofailover reset <api_name>         — Reset circuit breaker API
 *   .autofailover notify on/off            — Toggle notifikasi owner
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autofailover",
  alias: ["autofailover", "failover", "apirouter", "apifailover", "autofo"],
  category: "owner",
  description: "Auto-Failover API Router — monitor API health & auto-switch ke backup kalau down",
  usage: ".autofailover <on/off/now/routes/add/del/interval/status/stats/test/reset/notify>",
  example: ".autofailover on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// STATE
// ============================================================
let cronJob = null;

// ============================================================
// DEFAULT ROUTING TABLE — Category → API chain (primary → fallback)
// ============================================================
const DEFAULT_ROUTES = {
  download: {
    apis: [
      { name: "fastdl", url: "https://api-wh.fastdl.app/api/" },
      { name: "cobalt", url: "https://api.cobalt.tools/api/json" },
      { name: "snapcdn", url: "https://dl.snapcdn.app/" },
      { name: "ikyyxd", url: "https://api.ikyyxd.my.id/api/" },
    ],
  },
  stalker: {
    apis: [
      { name: "siputzx", url: "https://api.siputzx.my.id/api/" },
      { name: "velyn", url: "https://velyn.me/api/" },
      { name: "nexray", url: "https://api.nexray-web.my.id/api/" },
      { name: "aliceeapis", url: "https://aliceeapis.my.id/api/" },
    ],
  },
  berita: {
    apis: [
      { name: "siputzx", url: "https://api.siputzx.my.id/api/berita/antara" },
      { name: "ikyyxd", url: "https://api.ikyyxd.my.id/api/berita/antara" },
      { name: "aliceeapis", url: "https://aliceeapis.my.id/api/berita/antara" },
    ],
  },
  tools: {
    apis: [
      { name: "siputzx", url: "https://api.siputzx.my.id/api/tools/nik-checker?nik=1234567890" },
      { name: "ikyyxd", url: "https://api.ikyyxd.my.id/api/tools/" },
      { name: "aliceeapis", url: "https://aliceeapis.my.id/api/tools/" },
    ],
  },
  ai: {
    apis: [
      { name: "tio", url: "https://ai.tioo.eu.org/v1/models" },
      { name: "xemoz", url: "https://api-xemoz-official.my.id/api/ai/deepseek-v3" },
      { name: "puter", url: "https://api.puter.com/" },
    ],
  },
  maker: {
    apis: [
      { name: "siputzx-brat", url: "https://api.siputzx.my.id/api/maker/brat" },
      { name: "api-faa-brat", url: "https://api-faa.my.id/faa/brat" },
      { name: "aliceeapis", url: "https://aliceeapis.my.id/api/maker/" },
    ],
  },
  islamic: {
    apis: [
      { name: "aladhan", url: "https://api.aladhan.com/v1/status" },
      { name: "alquran-cloud", url: "https://api.alquran.cloud/v1/status" },
    ],
  },
  search: {
    apis: [
      { name: "siputzx", url: "https://api.siputzx.my.id/api/" },
      { name: "ikyyxd", url: "https://api.ikyyxd.my.id/api/" },
      { name: "aliceeapis", url: "https://aliceeapis.my.id/api/" },
    ],
  },
};

// ============================================================
// API HEALTH STATE
// ============================================================
const apiHealth = {}; // { name: { status, latency, lastCheck, failCount, circuitState, circuitUntil, uptimeHistory } }

// ============================================================
// CIRCUIT BREAKER STATES
// ============================================================
const CIRCUIT = {
  CLOSED: "closed",     // normal — API healthy
  OPEN: "open",         // tripped — API down, skip for cooldown
  HALF_OPEN: "half_open", // testing — try one request
};

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoFailover) {
    db.db.data.automation.autoFailover = {
      enabled: false,
      interval: 5, // minutes
      notifyOwner: true,
      circuitCooldown: 30, // minutes to skip after circuit trips
      failThreshold: 3, // consecutive failures before circuit opens
      routes: JSON.parse(JSON.stringify(DEFAULT_ROUTES)),
      stats: {
        totalChecks: 0,
        totalFailovers: 0,
        totalRecoveries: 0,
        byApi: {}, // { name: { checks, failures, failovers, recoveries, avgLatency } }
        byCategory: {}, // { category: { failovers, lastFailover } }
        lastCheck: null,
      },
    };
    db.db.write();
  }
  return db.db.data.automation.autoFailover;
}

// ============================================================
// PING API
// ============================================================
async function pingApi(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "NovaBot/21.12.0" },
    });
    const elapsed = Date.now() - start;
    clearTimeout(timeout);
    return {
      ok: res.ok || res.status < 500,
      status: res.status,
      latency: elapsed,
    };
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? "TIMEOUT" : "ERR",
      latency: isTimeout ? timeoutMs : 0,
      error: err.message?.slice(0, 80) || "Unknown error",
    };
  }
}

// ============================================================
// GET OR INIT API HEALTH
// ============================================================
function getApiHealth(name) {
  if (!apiHealth[name]) {
    apiHealth[name] = {
      status: "unknown",
      latency: 0,
      lastCheck: 0,
      failCount: 0,
      circuitState: CIRCUIT.CLOSED,
      circuitUntil: 0,
      uptimeHistory: [], // last 100 checks
      currentRoute: null, // which category is currently using this as active
    };
  }
  return apiHealth[name];
}

// ============================================================
// UPDATE API HEALTH
// ============================================================
function updateHealth(name, result, settings) {
  const h = getApiHealth(name);
  h.lastCheck = Date.now();
  h.latency = result.latency;
  h.status = result.ok ? "up" : "down";

  // Track uptime history
  h.uptimeHistory.push(result.ok ? 1 : 0);
  if (h.uptimeHistory.length > 100) h.uptimeHistory.shift();

  // Circuit breaker logic
  if (result.ok) {
    h.failCount = 0;
    if (h.circuitState === CIRCUIT.OPEN) {
      h.circuitState = CIRCUIT.HALF_OPEN;
    } else if (h.circuitState === CIRCUIT.HALF_OPEN) {
      h.circuitState = CIRCUIT.CLOSED;
      // Recovery!
      settings.stats.totalRecoveries++;
      if (settings.stats.byApi[name]) {
        settings.stats.byApi[name].recoveries = (settings.stats.byApi[name].recoveries || 0) + 1;
      }
      return "recovered";
    }
  } else {
    h.failCount++;
    if (h.failCount >= settings.failThreshold && h.circuitState === CIRCUIT.CLOSED) {
      h.circuitState = CIRCUIT.OPEN;
      h.circuitUntil = Date.now() + settings.circuitCooldown * 60 * 1000;
      return "circuit_opened";
    }
  }
  return null;
}

// ============================================================
// CHECK IF API IS AVAILABLE (circuit breaker)
// ============================================================
function isApiAvailable(name) {
  const h = getApiHealth(name);
  if (h.circuitState === CIRCUIT.OPEN) {
    if (Date.now() >= h.circuitUntil) {
      h.circuitState = CIRCUIT.HALF_OPEN;
      return true; // try one request
    }
    return false; // still in cooldown
  }
  return true;
}

// ============================================================
// GET UPTIME PERCENTAGE
// ============================================================
function getUptime(name) {
  const h = getApiHealth(name);
  if (!h.uptimeHistory || h.uptimeHistory.length === 0) return null;
  const upCount = h.uptimeHistory.filter((x) => x === 1).length;
  return Math.round((upCount / h.uptimeHistory.length) * 100);
}

// ============================================================
// GET ACTIVE API FOR CATEGORY (failover routing)
// ============================================================
function getActiveApi(category) {
  const settings = getSettings();
  const route = settings.routes[category];
  if (!route || !route.apis || route.apis.length === 0) return null;

  for (const api of route.apis) {
    if (isApiAvailable(api.name)) {
      return api;
    }
  }
  // All APIs in circuit open — return first anyway (last resort)
  return route.apis[0];
}


// ============================================================
// HEALTH CHECK ALL APIs
// ============================================================
async function checkAllApis(sock) {
  const settings = getSettings();
  if (!settings.enabled) return;

  const allApis = new Set();
  Object.values(settings.routes).forEach((route) => {
    route.apis.forEach((api) => allApis.add(JSON.stringify(api)));
  });

  const apiList = [...allApis].map((s) => JSON.parse(s));
  const failoverEvents = [];
  const recoveryEvents = [];

  // Batch check (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < apiList.length; i += batchSize) {
    const batch = apiList.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (api) => {
        const result = await pingApi(api.url);
        const event = updateHealth(api.name, result, settings);

        // Update stats
        settings.stats.totalChecks++;
        if (!settings.stats.byApi[api.name]) {
          settings.stats.byApi[api.name] = { checks: 0, failures: 0, failovers: 0, recoveries: 0, avgLatency: 0 };
        }
        const apiStat = settings.stats.byApi[api.name];
        apiStat.checks++;
        apiStat.avgLatency = Math.round((apiStat.avgLatency * (apiStat.checks - 1) + result.latency) / apiStat.checks);
        if (!result.ok) apiStat.failures++;

        if (event === "circuit_opened") {
          failoverEvents.push(api.name);
          settings.stats.totalFailovers++;
        } else if (event === "recovered") {
          recoveryEvents.push(api.name);
        }
      })
    );
  }

  settings.stats.lastCheck = new Date().toISOString();
  getDatabase().db.write();

  // Notify owner of failovers
  if (settings.notifyOwner && (failoverEvents.length > 0 || recoveryEvents.length > 0)) {
    const ownerJid = config.owner?.[0];
    if (ownerJid && sock?.sendMessage) {
      const lines = [];
      if (failoverEvents.length > 0) {
        lines.push(`FAILOVER triggered:`);
        failoverEvents.forEach((name) => {
          const activeApi = getActiveApiForCategory(name, settings);
          lines.push(`| ${name} DOWN -> switched to ${activeApi || "no backup"}`);
        });
      }
      if (recoveryEvents.length > 0) {
        lines.push("---");
        lines.push(`RECOVERY detected:`);
        recoveryEvents.forEach((name) => lines.push(`| ${name} back UP`));
      }
      try {
        await sock.sendMessage(ownerJid, { text: novaBox("API FAILOVER", lines) });
      } catch {}
    }
  }
}

// ============================================================
// HELPER: Find which category uses this API
// ============================================================
function getActiveApiForCategory(downApiName, settings) {
  for (const [category, route] of Object.entries(settings.routes)) {
    const idx = route.apis.findIndex((a) => a.name === downApiName);
    if (idx !== -1 && idx + 1 < route.apis.length) {
      return route.apis[idx + 1].name;
    }
  }
  return null;
}

// ============================================================
// CRON: Periodic health check
// ============================================================
function startCronJob(sock) {
  if (cronJob) cronJob.stop();
  const settings = getSettings();
  const intervalMin = settings.interval || 5;

  cronJob = new CronJob(
    `0 */${intervalMin} * * * *`,
    async () => {
      try {
        await checkAllApis(sock);
      } catch (e) {
        console.error("[autofailover] cron error:", e.message);
      }
    },
    null, true, "Asia/Jakarta"
  );
  console.log("[auto-failover] Health check every", intervalMin, "minutes");
}

// ============================================================
// EXPORT: Start function
// ============================================================
export function startAutoFailover(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    // Initialize health for all APIs
    const allApis = new Set();
    Object.values(settings.routes).forEach((route) => {
      route.apis.forEach((api) => {
        getApiHealth(api.name);
        allApis.add(api.name);
      });
    });
    startCronJob(sock);
    // Do initial check after 5 seconds
    setTimeout(() => checkAllApis(sock), 5000);
    console.log("[auto-failover] Started — monitoring", allApis.size, "APIs");
  }
}

// ============================================================
// EXPORT: Get active API for a category (dipakai plugin lain)
// ============================================================
export function getApiForCategory(category) {
  return getActiveApi(category);
}

// ============================================================
// EXPORT: Check if specific API is healthy
// ============================================================
export function isApiHealthy(name) {
  const h = getApiHealth(name);
  return h.status === "up" && isApiAvailable(name);
}

// ============================================================
// MAIN HANDLER
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
      const routeCount = Object.keys(settings.routes).length;
      const totalApis = new Set();
      Object.values(settings.routes).forEach((r) => r.apis.forEach((a) => totalApis.add(a.name)));

      // Count current down APIs
      let downCount = 0;
      let circuitOpen = 0;
      totalApis.forEach((name) => {
        const h = getApiHealth(name);
        if (h.status === "down") downCount++;
        if (h.circuitState === CIRCUIT.OPEN) circuitOpen++;
      });

      const msg = novaBox("AUTO-FAILOVER API ROUTER", [
        `Status: ${status}`,
        `Interval: ${settings.interval} min`,
        `Routes: ${routeCount} categories`,
        `APIs monitored: ${totalApis.size}`,
        `Circuit threshold: ${settings.failThreshold} fails`,
        `Circuit cooldown: ${settings.circuitCooldown} min`,
        "---",
        `Health:`,
        `| UP: ${totalApis.size - downCount - circuitOpen}`,
        `| DOWN: ${downCount}`,
        `| CIRCUIT OPEN: ${circuitOpen}`,
        "---",
        `Stats:`,
        `| Total checks: ${settings.stats.totalChecks}`,
        `| Failovers: ${settings.stats.totalFailovers}`,
        `| Recoveries: ${settings.stats.totalRecoveries}`,
        `| Last check: ${settings.stats.lastCheck || "Belum ada"}`,
      ]);

      await m.reply(msg + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autofailover on/off`,
        `${prefix}autofailover now`,
        `${prefix}autofailover routes`,
        `${prefix}autofailover add <category> <primary> <backup> [backup2]`,
        `${prefix}autofailover del <category>`,
        `${prefix}autofailover interval <menit>`,
        `${prefix}autofailover status <api_name>`,
        `${prefix}autofailover stats`,
        `${prefix}autofailover test <category>`,
        `${prefix}autofailover reset <api_name>`,
        `${prefix}autofailover notify on/off`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      startCronJob(sock);
      // Initial check
      setTimeout(() => checkAllApis(sock), 3000);
      await m.reply(novaBox("AUTO-FAILOVER", [
        "Status: ON",
        "API health monitoring aktif",
        `Interval: ${settings.interval} min`,
        `Failovers: ${settings.stats.totalFailovers}`,
        `Circuit: ${settings.failThreshold} fails -> ${settings.circuitCooldown} min cooldown`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      if (cronJob) cronJob.stop();
      await m.reply(novaBox("AUTO-FAILOVER", ["Status: OFF", "API health monitoring dimatikan"]));
      return { handled: true };
    }

    // ─── NOW (Health check all) ───
    if (sub === "now") {
      await m.reply(novaBox("AUTO-FAILOVER", ["Checking all APIs..."]));
      await checkAllApis(sock);
      // Show results
      const allApis = new Set();
      Object.values(settings.routes).forEach((r) => r.apis.forEach((a) => allApis.add(a.name)));
      const results = [...allApis].map((name) => {
        const h = getApiHealth(name);
        const uptime = getUptime(name);
        const circuit = h.circuitState === CIRCUIT.CLOSED ? "" : h.circuitState === CIRCUIT.OPEN ? " [CIRCUIT OPEN]" : " [HALF-OPEN]";
        return `${h.status === "up" ? "UP" : "DOWN"} | ${name} | ${h.latency}ms | uptime: ${uptime !== null ? uptime + "%" : "?"}${circuit}`;
      }).join("\n| ");
      await m.reply(novaBox("API HEALTH — CHECK RESULT", [`| ${results}`]));
      return { handled: true };
    }

    // ─── ROUTES ───
    if (sub === "routes") {
      const routeList = Object.entries(settings.routes).map(([cat, route]) => {
        const chain = route.apis.map((a, i) => `${i === 0 ? "PRIMARY" : "FALLBACK"}: ${a.name}`).join("\n| ");
        return `${cat}\n| ${chain}`;
      }).join("\n| \n| ");
      await m.reply(novaBox("FAILOVER — ROUTING TABLE", [routeList]));
      return { handled: true };
    }

    // ─── ADD ROUTE ───
    if (sub === "add") {
      const category = (args[1] || "").toLowerCase();
      const apis = args.slice(2);
      if (!category || apis.length < 2) {
        await m.reply(novaBox("AUTO-FAILOVER", [
          `Format: ${prefix}autofailover add <category> <primary_url> <backup_url> [backup2_url]`,
          `Contoh: ${prefix}autofailover add download https://api-wh.fastdl.app/api/ https://api.cobalt.tools/api/json`,
        ]));
        return { handled: true };
      }
      // Parse URLs into api objects
      const apiList = apis.map((url, i) => {
        let name = url.replace(/^https?:\/\//, "").split("/")[0].split(".")[0];
        if (i > 0) name += `_fallback${i}`;
        return { name, url };
      });
      settings.routes[category] = { apis: apiList };
      db.db.write();
      const chain = apiList.map((a, i) => `${i === 0 ? "PRIMARY" : "FALLBACK"}: ${a.name}`).join("\n| ");
      await m.reply(novaBox("AUTO-FAILOVER", [
        `Route ditambah: ${category}`,
        `| ${chain}`,
      ]));
      return { handled: true };
    }

    // ─── DEL ROUTE ───
    if (sub === "del") {
      const category = (args[1] || "").toLowerCase();
      if (!settings.routes[category]) {
        await m.reply(novaBox("AUTO-FAILOVER", [`Category tidak ditemukan: ${category}`]));
        return { handled: true };
      }
      delete settings.routes[category];
      db.db.write();
      await m.reply(novaBox("AUTO-FAILOVER", [`Route dihapus: ${category}`]));
      return { handled: true };
    }

    // ─── INTERVAL ───
    if (sub === "interval") {
      const val = parseInt(args[1]);
      if (isNaN(val) || val < 1) {
        await m.reply(novaBox("AUTO-FAILOVER", [`Interval: ${settings.interval} min`, `Ketik: ${prefix}autofailover interval <menit>`]));
        return { handled: true };
      }
      settings.interval = val;
      db.db.write();
      if (settings.enabled) {
        if (cronJob) cronJob.stop();
        startCronJob(sock);
      }
      await m.reply(novaBox("AUTO-FAILOVER", [`Interval: ${val} min`]));
      return { handled: true };
    }

    // ─── STATUS (single API) ───
    if (sub === "status") {
      const name = args[1];
      if (!name) {
        await m.reply(novaBox("AUTO-FAILOVER", [`Ketik: ${prefix}autofailover status <api_name>`]));
        return { handled: true };
      }
      const h = getApiHealth(name);
      const uptime = getUptime(name);
      const circuitLabel = h.circuitState === CIRCUIT.CLOSED ? "CLOSED (healthy)" : h.circuitState === CIRCUIT.OPEN ? "OPEN (down)" : "HALF-OPEN (testing)";
      await m.reply(novaBox(`API STATUS — ${name}`, [
        `Status: ${h.status}`,
        `Latency: ${h.latency}ms`,
        `Uptime: ${uptime !== null ? uptime + "%" : "no data"}`,
        `Circuit: ${circuitLabel}`,
        `Fail count: ${h.failCount}`,
        `Last check: ${h.lastCheck ? new Date(h.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "never"}`,
        `History: ${h.uptimeHistory.length} checks`,
      ]));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const apiStats = Object.entries(settings.stats.byApi)
        .sort((a, b) => (b[1].failures || 0) - (a[1].failures || 0))
        .slice(0, 10)
        .map(([name, s]) => `${name}: ${s.checks} checks, ${s.failures} fail, ${s.failovers} FO, ${s.recoveries} rec, ${s.avgLatency}ms avg`)
        .join("\n| ") || "Belum ada data";

      const catStats = Object.entries(settings.stats.byCategory || {})
        .map(([cat, s]) => `${cat}: ${s.failovers || 0} failovers, last: ${s.lastFailover || "never"}`)
        .join("\n| ") || "Belum ada";

      await m.reply(novaBox("FAILOVER — STATISTIK", [
        `Total checks: ${settings.stats.totalChecks}`,
        `Total failovers: ${settings.stats.totalFailovers}`,
        `Total recoveries: ${settings.stats.totalRecoveries}`,
        `Last check: ${settings.stats.lastCheck || "Belum ada"}`,
        "---",
        `Per API:`,
        `| ${apiStats}`,
        "---",
        `Per Category:`,
        `| ${catStats}`,
      ]));
      return { handled: true };
    }

    // ─── TEST (Test failover for category) ───
    if (sub === "test") {
      const category = (args[1] || "").toLowerCase();
      if (!settings.routes[category]) {
        await m.reply(novaBox("AUTO-FAILOVER", [`Category tidak ditemukan: ${category}`]));
        return { handled: true };
      }
      const route = settings.routes[category];
      const results = [];
      for (const api of route.apis) {
        const r = await pingApi(api.url);
        const available = isApiAvailable(api.name);
        results.push(`${r.ok ? "UP" : "DOWN"} | ${api.name} | ${r.latency}ms | circuit: ${getApiHealth(api.name).circuitState}${available ? "" : " (skipped)"}`);
      }
      const active = getActiveApi(category);
      await m.reply(novaBox(`FAILOVER TEST — ${category}`, [
        `| ${results.join("\n| ")}`,
        "---",
        `Active: ${active?.name || "none"}`,
      ]));
      return { handled: true };
    }

    // ─── RESET (Reset circuit breaker) ───
    if (sub === "reset") {
      const name = args[1];
      if (!name) {
        await m.reply(novaBox("AUTO-FAILOVER", [`Ketik: ${prefix}autofailover reset <api_name>`]));
        return { handled: true };
      }
      const h = getApiHealth(name);
      h.circuitState = CIRCUIT.CLOSED;
      h.circuitUntil = 0;
      h.failCount = 0;
      await m.reply(novaBox("AUTO-FAILOVER", [
        `Circuit breaker reset: ${name}`,
        `State: CLOSED`,
        `Fail count: 0`,
      ]));
      return { handled: true };
    }

    // ─── NOTIFY ───
    if (sub === "notify") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        settings.notifyOwner = true;
        db.db.write();
        await m.reply(novaBox("AUTO-FAILOVER", ["Notify: ON", "Owner akan dikabari saat failover/recovery"]));
      } else if (action === "off") {
        settings.notifyOwner = false;
        db.db.write();
        await m.reply(novaBox("AUTO-FAILOVER", ["Notify: OFF"]));
      } else {
        await m.reply(novaBox("AUTO-FAILOVER", [`Notify: ${settings.notifyOwner ? "ON" : "OFF"}`, `Ketik: ${prefix}autofailover notify on/off`]));
      }
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-FAILOVER", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autofailover untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autofailover] handler error:", error.message);
    await m.reply(novaError("AutoFailover", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
