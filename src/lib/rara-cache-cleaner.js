// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { logger } from "./rara-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "autocleancache.json");

// Directories to clean (relative to project root)
const CLEAN_DIRS = [
  { dir: "tmp", maxAge: 3600000, label: "Temp files" },
  { dir: "logs", maxAge: 86400000, label: "Log files" },
  { dir: "downloads", maxAge: 3600000, label: "Downloads" },
  { dir: ".cache", maxAge: 3600000, label: "Cache" },
];

// File extensions safe to delete
const SAFE_EXT = [
  ".webp", ".png", ".jpg", ".jpeg", ".mp4", ".mp3",
  ".wav", ".ogg", ".gif", ".tmp", ".pdf", ".zip",
  ".tar", ".gz", ".webm", ".mov", ".txt",
];

let cleanTimer = null;
let currentSettings = null;

function loadSettings() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) {
    logger.error("cache-cleaner", `Failed to load settings: ${e.message}`);
  }
  return {
    enabled: false,
    intervalMs: 3600000,
    intervalStr: "1 hour",
    lastClean: null,
    totalCleaned: 0,
    totalFreedKB: 0,
  };
}

function saveSettings(settings) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(settings, null, 2));
    currentSettings = settings;
  } catch (e) {
    logger.error("cache-cleaner", `Failed to save settings: ${e.message}`);
  }
}

function getSettings() {
  if (!currentSettings) currentSettings = loadSettings();
  return currentSettings;
}

function updateSettings(updater) {
  const cur = getSettings();
  const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
  saveSettings(next);
  return next;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
}

function isSafeToDelete(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return true;
  return SAFE_EXT.includes(ext);
}

function cleanDirectory(dirPath, maxAgeMs) {
  let cleaned = 0;
  let freedBytes = 0;
  const now = Date.now();

  if (!fs.existsSync(dirPath)) return { cleaned, freedBytes };

  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const sub = cleanDirectory(fullPath, maxAgeMs);
          cleaned += sub.cleaned;
          freedBytes += sub.freedBytes;
          try {
            if (fs.readdirSync(fullPath).length === 0) {
              fs.rmdirSync(fullPath);
              cleaned++;
            }
          } catch {}
          continue;
        }
        const fileAge = now - stat.mtimeMs;
        if (fileAge < maxAgeMs) continue;
        if (!isSafeToDelete(fullPath)) continue;
        const fileSize = stat.size;
        fs.unlinkSync(fullPath);
        cleaned++;
        freedBytes += fileSize;
      } catch { continue; }
    }
  } catch (e) {
    logger.error("cache-cleaner", `Failed to clean ${dirPath}: ${e.message}`);
  }
  return { cleaned, freedBytes };
}

function runCleanup() {
  const settings = getSettings();
  let totalCleaned = 0;
  let totalFreed = 0;
  const details = [];

  for (const cfg of CLEAN_DIRS) {
    const dirPath = path.join(process.cwd(), cfg.dir);
    const maxAge = settings.maxAgeMs || cfg.maxAge;
    const result = cleanDirectory(dirPath, maxAge);
    if (result.cleaned > 0) {
      totalCleaned += result.cleaned;
      totalFreed += result.freedBytes;
      details.push(`${cfg.dir}: ${result.cleaned} file (${formatSize(result.freedBytes)})`);
    }
  }

  const updated = updateSettings((cur) => ({
    ...cur,
    lastClean: new Date().toISOString(),
    totalCleaned: (cur.totalCleaned || 0) + totalCleaned,
    totalFreedKB: (cur.totalFreedKB || 0) + Math.round(totalFreed / 1024),
  }));

  if (totalCleaned > 0) {
    logger.success("cache-cleaner", `Cleaned ${totalCleaned} files, freed ${formatSize(totalFreed)} | Total: ${updated.totalCleaned} files`);
  } else {
    logger.info("cache-cleaner", "No stale files to clean");
  }
  return { totalCleaned, totalFreed, details };
}

function startCleaner(settings) {
  if (cleanTimer) { clearInterval(cleanTimer); cleanTimer = null; }
  if (!settings.enabled) return;
  const interval = settings.intervalMs || 3600000;
  cleanTimer = setInterval(() => {
    try { runCleanup(); } catch (e) { logger.error("cache-cleaner", `Cleanup error: ${e.message}`); }
  }, interval);
  if (cleanTimer.unref) cleanTimer.unref();
  logger.success("cache-cleaner", `Auto-clean started | Interval: ${settings.intervalStr || "1 hour"}`);
}

function stopCleaner() {
  if (cleanTimer) { clearInterval(cleanTimer); cleanTimer = null; logger.info("cache-cleaner", "Auto-clean stopped"); }
}

function parseInterval(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)\s*(s|sec|second|m|min|minute|h|hour|hr)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms;
  if (unit.startsWith("s")) ms = num * 1000;
  else if (unit.startsWith("m")) ms = num * 60000;
  else if (unit.startsWith("h")) ms = num * 3600000;
  else return null;
  if (ms < 60000) return null;
  if (ms > 86400000) return null;
  const label = unit.startsWith("h") ? "hour" : unit.startsWith("m") ? "minute" : "second";
  return { ms, str: `${num} ${label}${num > 1 ? "s" : ""}` };
}

function getStatus() { return getSettings(); }

function init() {
  const settings = getSettings();
  if (settings.enabled) startCleaner(settings);
  return settings;
}

export { getSettings, updateSettings, runCleanup, startCleaner, stopCleaner, parseInterval, getStatus, init };
