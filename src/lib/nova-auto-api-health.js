// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-api-health.js — Auto API Health Check
// Cek API eksternal tiap interval, kirim notif ke owner kalau ada yang down
import { CronJob } from "cron";
import path from "path";
import fs from "fs";
import { getDatabase } from "./nova-database.js";
import config from "../../config.js";
import { logger } from "./nova-logger.js";
import { toSC, bracketBox } from "./nova-menu-style.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "autoapihealth.json");
const TZ = "Asia/Jakarta";

let sockInstance = null;
let activeCronJob = null;

// === Daftar API endpoints untuk dicek ===
// Tiap entry: { name, url, method, expectedStatus, timeoutMs }
function getApiEndpoints() {
  const endpoints = [
    { name: "9Router v2 (Tio)", url: "https://9router.cloudku.us.kg/v1/models", method: "GET", expectedStatus: [200, 401], timeoutMs: 8000 },
    { name: "Open-Meteo", url: "https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.6&current=temperature_2m", method: "GET", expectedStatus: [200], timeoutMs: 8000 },
    { name: "SaveNow", url: "https://p.savenow.to", method: "GET", expectedStatus: [200, 301, 302, 403], timeoutMs: 8000 },
  ];

  // Tambah endpoint dari config kalau ada
  const tioKey = config.ai?.apiKey;
  if (tioKey) {
    endpoints[0].headers = { "Authorization": `Bearer ${tioKey}` };
  }

  return endpoints;
}

// === State Management ===
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: false,
    intervalMinutes: 30,
    lastCheck: null,
    totalChecks: 0,
    totalDown: 0,
    apiStatus: {}, // { "Tio AI": { status: "up", lastOk: "...", lastFail: "...", failCount: 0 } }
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("ApiHealth", `Save state failed: ${e.message}`);
  }
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

// === Check single API ===
async function checkApi(endpoint) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs || 8000);

    const res = await fetch(endpoint.url, {
      method: endpoint.method || "GET",
      headers: endpoint.headers || {},
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeout);

    const expected = endpoint.expectedStatus || [200];
    const isOk = expected.includes(res.status) || (res.status >= 200 && res.status < 400);

    return {
      status: isOk ? "up" : "warning",
      httpStatus: res.status,
      responseTime: 0, // Tidak akurat tanpa performance API, skip
    };
  } catch (e) {
    return {
      status: "down",
      error: e.name === "AbortError" ? "Timeout" : e.message,
    };
  }
}

// === Main check loop ===
async function doHealthCheck() {
  try {
    const db = getDatabase();
    const state = loadState();
    const endpoints = getApiEndpoints();

    const downApis = [];
    const recoveredApis = [];

    for (const ep of endpoints) {
      const result = await checkApi(ep);
      const prevStatus = state.apiStatus[ep.name] || { status: "unknown" };

      if (result.status === "down" || result.status === "warning") {
        // API down/warning
        if (prevStatus.status !== "down" && prevStatus.status !== "warning") {
          // Baru saja down — notif owner
          downApis.push({
            name: ep.name,
            status: result.status,
            error: result.error || `HTTP ${result.httpStatus}`,
          });
        }

        state.apiStatus[ep.name] = {
          status: result.status,
          lastFail: new Date().toISOString(),
          failCount: (prevStatus.failCount || 0) + 1,
          error: result.error || `HTTP ${result.httpStatus}`,
        };
      } else {
        // API up
        if (prevStatus.status === "down" || prevStatus.status === "warning") {
          // Recovered — notif owner
          recoveredApis.push({
            name: ep.name,
            downtime: prevStatus.lastFail,
          });
        }

        state.apiStatus[ep.name] = {
          status: "up",
          lastOk: new Date().toISOString(),
          failCount: 0,
        };
      }
    }

    state.lastCheck = new Date().toISOString();
    state.totalChecks++;
    if (downApis.length > 0) state.totalDown++;
    saveState(state);

    // Kirim notif ke owner kalau ada down atau recovered
    const ownerJid = getOwnerJid();
    if (ownerJid && sockInstance && (downApis.length > 0 || recoveredApis.length > 0)) {
      let lines = [];

      if (downApis.length > 0) {
        lines.push(toSC("API DOWN!"));
        downApis.forEach((a) => {
          lines.push(`❌ ${a.name}: ${a.error}`);
        });
      }

      if (recoveredApis.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(toSC("API Recovered"));
        recoveredApis.forEach((a) => {
          lines.push(`✅ ${a.name}`);
        });
      }

      const notif = bracketBox("🩺", toSC("API Health Alert"), lines);
      try {
        await sockInstance.sendMessage(ownerJid, { text: notif });
      } catch {}
    }

    logger.info("ApiHealth", `Check done: ${downApis.length} down, ${recoveredApis.length} recovered`);
  } catch (error) {
    logger.error("ApiHealth", `Check failed: ${error.message}`);
  }
}

// === Cron management ===
function startHealthCheck(sock) {
  sockInstance = sock;
  const state = loadState();
  if (!state.enabled) {
    logger.info("ApiHealth", "API health check is disabled");
    return;
  }

  stopHealthCheck();

  const interval = Math.max(5, state.intervalMinutes);
  const cronExp = `*/${interval} * * * *`;
  activeCronJob = new CronJob(cronExp, doHealthCheck, null, true, TZ);
  logger.info("ApiHealth", `Started (every ${interval} min, cron: ${cronExp})`);
}

function stopHealthCheck() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("ApiHealth", "Stopped");
  }
}

function enableHealthCheck(intervalMinutes, sock) {
  if (intervalMinutes < 5) {
    return { success: false, error: "Minimal 5 menit" };
  }

  sockInstance = sock;
  const state = loadState();
  state.enabled = true;
  state.intervalMinutes = intervalMinutes;
  saveState(state);

  stopHealthCheck();
  startHealthCheck(sock);

  return { success: true, intervalMinutes };
}

function disableHealthCheck() {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  stopHealthCheck();
  return { success: true };
}

function getHealthStatus() {
  const state = loadState();
  return {
    enabled: state.enabled,
    intervalMinutes: state.intervalMinutes,
    lastCheck: state.lastCheck,
    totalChecks: state.totalChecks || 0,
    totalDown: state.totalDown || 0,
    apiStatus: state.apiStatus || {},
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualCheck(sock) {
  sockInstance = sock;
  await doHealthCheck();
}

function initHealthCheck(sock) {
  sockInstance = sock;
  startHealthCheck(sock);
}

export {
  initHealthCheck,
  startHealthCheck,
  stopHealthCheck,
  enableHealthCheck,
  disableHealthCheck,
  getHealthStatus,
  triggerManualCheck,
  getApiEndpoints,
};
