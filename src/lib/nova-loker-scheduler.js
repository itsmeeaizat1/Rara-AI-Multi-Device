// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-loker-scheduler.js
 * Scheduler loker otomatis dan helper fetch loker.
 * Sumber: Remotive API + Arbeitnow API (gratis, tanpa API key).
 */

// sharp loaded dynamically in makeThumbnail() — not required for basic text-only loker
import { CronJob } from "cron";
import { resolveAutoTargetsOr } from "./nova-auto-target.js";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";
import config from "../../config.js";
import { getAndarazConfig } from "./config/env-loader.js";
import {
  fetchJobstreetID,
  fetchGlintsID,
  fetchKalibrrID,
  fetchIndeedID,
  fetchAllIndonesiaJobs,
} from "./nova-loker-id-sources.js";

let _sharp = null;
async function getSharp() {
  if (_sharp) return _sharp;
  try {
    _sharp = (await import("sharp")).default;
  } catch {
    logger.info("LOKER", "sharp tidak tersedia, thumbnail akan dilewati");
    _sharp = false;
  }
  return _sharp;
}

const TZ = "Asia/Jakarta";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_IMAGE_TIMEOUT_MS = 8_000;
const SENT_JOB_TTL_DAYS = 7; // ID loker yang sudah dikirim disimpan selama 7 hari

let sock = null;
// store multiple CronJob instances
let lokerJobs = [];

// cached fetch implementation (resolved on demand)
let fetchFn = null;

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────────────────────

function getLokerSettings(db) {
  const base = config.lokerScheduler || {};
  const stored = db.setting("lokerScheduler") || {};
  return {
    enabled: stored.enabled ?? base.enabled ?? false,
    timezone: stored.timezone || base.timezone || TZ,
    keywords: Array.isArray(stored.keywords) && stored.keywords.length
      ? stored.keywords
      : (Array.isArray(base.keywords) ? base.keywords : []),
    categories: Array.isArray(stored.categories) && stored.categories.length
      ? stored.categories
      : (Array.isArray(base.categories) ? base.categories : []),
    maxPerBroadcast: Number(stored.maxPerBroadcast || base.maxPerBroadcast || 5),
    schedules: Array.isArray(stored.schedules) && stored.schedules.length
      ? stored.schedules
      : (Array.isArray(base.schedules) ? base.schedules : [
          { key: "pagi", label: "Pagi", hour: 8, minute: 0 },
          { key: "siang", label: "Siang", hour: 13, minute: 0 },
          { key: "malam", label: "Malam", hour: 20, minute: 0 },
        ]),
    sources: Array.isArray(stored.sources) && stored.sources.length
      ? stored.sources
      : (Array.isArray(base.sources) ? base.sources : ["jobstreet", "glints", "kalibrr", "indeed", "remotive", "arbeitnow"]),
    targets: Array.isArray(stored.targets) ? stored.targets : [],
  };
}

function saveLokerSettings(db, settings) {
  db.setting("lokerScheduler", settings);
  return settings;
}

function updateLokerSettings(updater) {
  const db = getDatabase();
  const current = getLokerSettings(db);
  const next = updater(current);
  return saveLokerSettings(db, next);
}

function getLokerStatus() {
  const db = getDatabase();
  return getLokerSettings(db);
}

// ────────────────────────────────────────────────────────────────────────────
// CACHE SENT JOB IDs (dedup)
// ────────────────────────────────────────────────────────────────────────────

function getSentIds(db) {
  const raw = db.setting("lokerSentIds") || {};
  const now = Date.now();
  const cutoff = now - SENT_JOB_TTL_DAYS * 24 * 60 * 60 * 1000;
  // remove old entries
  const cleaned = {};
  for (const [id, ts] of Object.entries(raw)) {
    if (ts > cutoff) cleaned[id] = ts;
  }
  // persist cleaned if changed
  try {
    if (Object.keys(cleaned).length !== Object.keys(raw).length) {
      db.setting("lokerSentIds", cleaned);
    }
  } catch (err) {
    logger.warn("LOKER", `Gagal menyimpan cleaned sentIds: ${err.message}`);
  }
  return cleaned;
}

async function markSent(db, ids, options = {}) {
  // safer write: read-merge-write with retries to reduce race conditions
  const maxRetries = options.retries ?? 5;
  const retryDelay = options.retryDelayMs ?? 60; // ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const current = db.setting("lokerSentIds") || {};
      const now = Date.now();
      let changed = false;
      for (const id of ids) {
        if (!current[id]) {
          changed = true;
          current[id] = now;
        }
      }
      if (changed) db.setting("lokerSentIds", current);
      return true;
    } catch (err) {
      logger.warn("LOKER", `markSent attempt ${attempt + 1} failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, retryDelay));
    }
  }
  // last resort: try one shot with naive set
  try {
    const current = getSentIds(db);
    const now = Date.now();
    for (const id of ids) current[id] = now;
    db.setting("lokerSentIds", current);
    return true;
  } catch (err) {
    logger.error("LOKER", `markSent final write failed: ${err.message}`);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function ensureFetch() {
  if (fetchFn) return fetchFn;
  if (globalThis.fetch) {
    fetchFn = globalThis.fetch.bind(globalThis);
    return fetchFn;
  }
  try {
    const nf = await import('node-fetch');
    fetchFn = nf.default || nf;
    logger.info('LOKER', 'node-fetch di-load sebagai fallback fetchFn');
    return fetchFn;
  } catch (err) {
    logger.warn('LOKER', `node-fetch import failed: ${err.message}`);
    throw new Error('No fetch implementation available.');
  }
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const fetchImpl = await ensureFetch();
  const AbortCtr = globalThis.AbortController;
  if (AbortCtr) {
    const controller = new AbortCtr();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  // fallback race
  return await Promise.race([
    (async () => {
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.json();
    })(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
  ]);
}

async function fetchImageBuffer(url, timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS) {
  try {
    const fetchImpl = await ensureFetch();
    const AbortCtr = globalThis.AbortController;
    let controller = null;
    let timer = null;
    if (AbortCtr) {
      controller = new AbortCtr();
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }
    try {
      const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    logger.warn('LOKER', `Gagal fetch image ${url}: ${err.message}`);
    return null;
  }
}

async function makeThumbnail(buffer, maxSize = 400) {
  try {
    const sharp = await getSharp();
    if (!sharp) return null;
    const thumb = await sharp(buffer)
      .resize({ width: maxSize, height: maxSize, fit: "inside" })
      .jpeg({ quality: 60 })
      .toBuffer();
    return thumb;
  } catch (err) {
    logger.warn('LOKER', `Gagal membuat thumbnail: ${err.message}`);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ────────────────────────────────────────────────────────────────────────────

const EXPIRY_DAYS = 30; // Perkiraan loker tutup 30 hari setelah dibuka

function estimateExpiry(postedAt) {
  try {
    const d = new Date(postedAt);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + EXPIRY_DAYS);
    return d.toISOString();
  } catch {
    return "";
  }
}

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) < new Date();
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// NORMALIZE JOBS
// ────────────────────────────────────────────────────────────────────────────

function normalizeRemotive(job) {
  return {
    id: `remotive_${job.id}`,
    title: job.title || "-",
    company: job.company_name || "-",
    location: job.candidate_required_location || "Worldwide / Remote",
    type: job.job_type || "Full-time",
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 4) : [],
    url: job.url || "",
    postedAt: job.publication_date || "",
    salary: job.salary || "",
    source: "Remotive",
    // possible image fields
    image: job.company_logo || job.company_logo_url || job.company_logo_url_large || null,
  };
}

function normalizeArbeitnow(job) {
  const posted = job.created_at ? new Date(Number(job.created_at) * 1000).toISOString() : "";
  return {
    id: `arbeitnow_${job.slug || (job.company_name + '-' + job.title + '-' + job.created_at)}`,
    title: job.title || "-",
    company: job.company_name || "-",
    location: job.remote ? "Remote" : (job.location || "-"),
    type: job.remote ? "Remote" : "On-site",
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 4) : [],
    url: job.url || "",
    postedAt: posted,
    expiryDate: posted ? estimateExpiry(posted) : "",
    salary: "",
    source: "Arbeitnow",
    image: job.company_logo || job.logo || null,
  };
}

function normalizeTheMuse(job) {
  const locs = Array.isArray(job.locations) ? job.locations : [];
  const locStr = locs.length ? locs.map(l => l.name || "").filter(Boolean).join(", ") : "Remote";
  const posted = job.publication_date || "";
  return {
    id: `themuse_${job.id}`,
    title: job.name || "-",
    company: job.company?.name || "-",
    location: locStr,
    type: job.type || "Full-time",
    tags: Array.isArray(job.categories) ? job.categories.map(c => c.name).slice(0, 4) : [],
    url: job.refs?.landing_page || "",
    postedAt: posted,
    expiryDate: posted ? estimateExpiry(posted) : "",
    salary: "",
    source: "The Muse",
    image: job.company?.image?.small || job.company?.image?.thumb || null,
  };
}

function normalizeJobicy(job) {
  const posted = job.pubDate || "";
  return {
    id: `jobicy_${job.id}`,
    title: job.jobTitle || "-",
    company: job.companyName || "-",
    location: job.jobGeo || "Remote",
    type: job.jobType || "Full-time",
    tags: job.jobIndustry ? String(job.jobIndustry).split(",").map(t => t.trim()).slice(0, 4) : [],
    url: job.url || "",
    postedAt: posted,
    expiryDate: posted ? estimateExpiry(posted) : "",
    salary: "",
    source: "Jobicy",
    image: job.companyLogo || null,
  };
}

async function fetchRemotive({ keywords = [], categories = [], limit = 20 } = {}) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (keywords.length) params.set("search", keywords.join(" "));
    if (categories.length) params.set("category", categories[0]);
    const data = await fetchWithTimeout(`https://remotive.com/api/remote-jobs?${params}`);
    return (data.jobs || []).map(normalizeRemotive);
  } catch (err) {
    logger.warn("LOKER", `Remotive fetch error: ${err.message}`);
    return [];
  }
}

async function fetchArbeitnow({ keywords = [], limit = 20 } = {}) {
  try {
    const data = await fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api?page=1");
    let jobs = (data.data || []).map(normalizeArbeitnow);
    if (keywords.length) {
      const kwLower = keywords.map((k) => k.toLowerCase());
      jobs = jobs.filter((j) => {
        const text = `${j.title} ${j.company} ${j.tags.join(" ")}`.toLowerCase();
        return kwLower.some((kw) => text.includes(kw));
      });
    }
    return jobs.slice(0, limit);
  } catch (err) {
    logger.warn("LOKER", `Arbeitnow fetch error: ${err.message}`);
    return [];
  }
}

async function fetchTheMuse({ keywords = [], limit = 20 } = {}) {
  try {
    const pages = Math.min(2, Math.ceil(limit / 20));
    const allJobs = [];
    for (let page = 0; page < pages; page++) {
      const url = `https://www.themuse.com/api/public/jobs?page=${page}&limit=20`;
      const data = await fetchWithTimeout(url);
      const results = data.results || [];
      allJobs.push(...results.map(normalizeTheMuse));
      if (results.length < 20) break;
    }
    let jobs = allJobs;
    if (keywords.length) {
      const kwLower = keywords.map((k) => k.toLowerCase());
      jobs = jobs.filter((j) => {
        const text = `${j.title} ${j.company} ${j.tags.join(" ")}`.toLowerCase();
        return kwLower.some((kw) => text.includes(kw));
      });
    }
    return jobs.slice(0, limit);
  } catch (err) {
    logger.warn("LOKER", `The Muse fetch error: ${err.message}`);
    return [];
  }
}

async function fetchJobicy({ keywords = [], categories = [], limit = 20 } = {}) {
  try {
    const data = await fetchWithTimeout("https://jobicy.com/api/v2/remote-jobs");
    let jobs = (data.jobs || []).map(normalizeJobicy);
    if (keywords.length) {
      const kwLower = keywords.map((k) => k.toLowerCase());
      jobs = jobs.filter((j) => {
        const text = `${j.title} ${j.company} ${j.tags.join(" ")}`.toLowerCase();
        return kwLower.some((kw) => text.includes(kw));
      });
    }
    return jobs.slice(0, limit);
  } catch (err) {
    logger.warn("LOKER", `Jobicy fetch error: ${err.message}`);
    return [];
  }
}

async function fetchNewJobs({ sources, keywords, categories, limit, sentIds = {} } = {}) {
  const allJobs = [];
  const fetchers = [];

  // Portal Indonesia (prioritas)
  if (sources.includes("jobstreet")) fetchers.push(fetchJobstreetID({ keywords, limit: limit + 20 }));
  if (sources.includes("glints")) fetchers.push(fetchGlintsID({ keywords, limit: limit + 20 }));
  if (sources.includes("kalibrr")) fetchers.push(fetchKalibrrID({ keywords, limit: limit + 20 }));
  if (sources.includes("indeed")) fetchers.push(fetchIndeedID({ keywords, limit: limit + 20 }));
  // Portal international (fallback)
  if (sources.includes("remotive")) fetchers.push(fetchRemotive({ keywords, categories, limit: limit + 20 }));
  if (sources.includes("arbeitnow")) fetchers.push(fetchArbeitnow({ keywords, limit: limit + 20 }));
  if (sources.includes("themuse")) fetchers.push(fetchTheMuse({ keywords, limit: limit + 20 }));
  if (sources.includes("jobicy")) fetchers.push(fetchJobicy({ keywords, categories, limit: limit + 20 }));

  const results = await Promise.allSettled(fetchers);
  for (const r of results) if (r.status === "fulfilled") allJobs.push(...r.value);

  const seen = new Set(Object.keys(sentIds || {}));
  const fresh = [];
  for (const job of allJobs) {
    if (seen.has(job.id)) continue;
    // Skip expired jobs
    if (isExpired(job.expiryDate)) continue;
    seen.add(job.id);
    fresh.push(job);
    if (fresh.length >= limit) break;
  }

  return fresh;
}

// ────────────────────────────────────────────────────────────────────────────
// JOBSTREET INDONESIA (via Andaraz API)
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// LOKER INDONESIA — scrape dari situs lokal gratis
// ────────────────────────────────────────────────────────────────────────────

async function fetchLokerID({ keywords = [], limit = 20 } = {}) {
  try {
    // Coba API dari layoffs.fyi alternative atau Diknaker JSON
    // Sementara: filter Remotive untuk Asia/Worldwide + Indonesia keywords
    const kw = keywords.length ? keywords.join(" ") : "";
    const params = new URLSearchParams({ limit: String(limit * 5) });
    if (kw) params.set("search", `${kw} indonesia asia`);

    const data = await fetchWithTimeout(`https://remotive.com/api/remote-jobs?${params}`);
    let jobs = (data.jobs || []).map(normalizeRemotive);

    // Filter: hanya jobs yang lokasinya relevant untuk Indonesia/Asia
    const idKeywords = ["indonesia", "asia", "apac", "worldwide", "southeast", "remote", "anywhere"];
    jobs = jobs.filter((j) => {
      const loc = (j.location || "").toLowerCase();
      return idKeywords.some((k) => loc.includes(k));
    });

    return jobs.slice(0, limit);
  } catch (err) {
    logger.warn("LOKER", `LokerID fetch error: ${err.message}`);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// FORMAT MESSAGE
// ────────────────────────────────────────────────────────────────────────────

function formatJob(job, index) {
  const posted = formatDateID(job.postedAt);
  const expiry = formatDateID(job.expiryDate);
  const expired = isExpired(job.expiryDate);
  const sourceTag = job.source ? `[${job.source}]` : "";

  const lines = [
    `*${index}. ${job.title}* ${sourceTag}`,
    `Perusahaan: ${job.company}`,
    `Lokasi: ${job.location}`,
    `Tipe: ${job.type}`,
  ];
  if (job.salary) lines.push(`Gaji: ${job.salary}`);
  lines.push(`Dibuka: ${posted}`);
  if (expiry && expiry !== "-") {
    lines.push(expired ? `Tutup: ~${expiry}~ (TUTUP)` : `Tutup: ${expiry} (perkiraan)`);
  }
  if (job.tags && job.tags.length) lines.push(`Tag: ${job.tags.join(", ")}`);
  lines.push(`Link: ${job.url}`);
  return lines.join("\n");
}

function formatLokerMessage(jobs, { label = "Update", keywords = [], source = "" } = {}) {
  if (!jobs.length) return null;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const header = [
    "*INFO LOWONGAN KERJA*",
    "",
    `${date} | ${time} WIB`,
    ...(label ? [`Sesi: *${label}*`] : []),
    ...(keywords.length ? [`Kata kunci: ${keywords.join(", ")}`] : []),
    ...(source ? [`Sumber: ${source}`] : []),
  ].join("\n");

  const body = jobs.map((job, i) => formatJob(job, i + 1)).join("\n\n─────────────────────\n\n");

  const footer = [
    "",
    `Ditemukan *${jobs.length}* lowongan baru`,
    "Cek manual: .ayokerja [kata kunci]",
    "_Nova MD - Info Loker Otomatis_",
  ].join("\n");

  return `${header}\n\n${body}\n\n${footer}`;
}

// ────────────────────────────────────────────────────────────────────────────
// BROADCAST
// ────────────────────────────────────────────────────────────────────────────

async function sendLokerUpdate(scheduleLabel) {
  if (!sock) return;

  const db = getDatabase();
  const settings = getLokerSettings(db);

  if (!settings.enabled) return;
  if (!settings.targets.length) {
    logger.warn("LOKER", "Tidak ada grup target loker");
    return;
  }

  const sentIds = getSentIds(db);
  let jobs;
  try {
    jobs = await fetchNewJobs({
      sources: settings.sources,
      keywords: settings.keywords,
      categories: settings.categories,
      limit: settings.maxPerBroadcast,
      sentIds,
    });
  } catch (err) {
    logger.error("LOKER", `Gagal fetch loker: ${err.message}`);
    return;
  }

  if (!jobs.length) {
    logger.info("LOKER", `[${scheduleLabel}] Tidak ada loker baru untuk dikirim`);
    return;
  }

  const sources = [...new Set(jobs.map((j) => j.source))].join(", ");
  const message = formatLokerMessage(jobs, { label: scheduleLabel, keywords: settings.keywords, source: sources });
  if (!message) return;

  // try to fetch one thumbnail from job images (to avoid spamming big images)
  let thumbnailBuffer = null;
  for (const job of jobs) {
    const imageUrl = job.image || job.logo || job.company_logo || job.company_logo_url || null;
    if (!imageUrl) continue;
    const imgBuf = await fetchImageBuffer(imageUrl, DEFAULT_IMAGE_TIMEOUT_MS);
    if (!imgBuf) continue;
    const thumb = await makeThumbnail(imgBuf, 320);
    if (thumb) {
      thumbnailBuffer = thumb;
      break;
    }
  }

  let sent = 0;
  // ── target terpusat (.switch auto autoloker set): override target lama ──
  let targetJids = settings.targets || [];
  try {
    targetJids = await resolveAutoTargetsOr(sock, "autoloker", targetJids);
  } catch { /* target lib gagal → target settings lama */ }
  for (const jid of targetJids) {
    try {
      if (thumbnailBuffer) {
        // send image with caption
        await sock.sendMessage(jid, {
          image: thumbnailBuffer,
          caption: message,
        });
      } else {
        await sock.sendMessage(jid, { text: message });
      }
      sent++;
    } catch (err) {
      logger.warn("LOKER", `Gagal kirim ke ${jid}: ${err.message}`);
    }
  }

  if (sent > 0) {
    await markSent(db, jobs.map((j) => j.id));
    logger.success("LOKER", `[${scheduleLabel}] Terkirim ${jobs.length} loker ke ${sent} grup`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ────────────────────────────────────────────────────────────────────────────

function stopLokerJob() {
  if (Array.isArray(lokerJobs) && lokerJobs.length) {
    for (const job of lokerJobs) {
      try { job.stop(); } catch (err) { logger.warn("LOKER", `Gagal stop CronJob: ${err.message}`); }
    }
    lokerJobs = [];
  }
}

function startLokerJobs(settings) {
  stopLokerJob();
  if (!settings.enabled || !settings.schedules.length) return;
  for (const schedule of settings.schedules) {
    const cron = `0 ${schedule.minute ?? 0} ${schedule.hour} * * *`;
    const label = schedule.label || schedule.key || `${schedule.hour}:00`;
    try {
      const job = new CronJob(cron, () => sendLokerUpdate(label), null, true, settings.timezone || TZ);
      lokerJobs.push(job);
      logger.info("LOKER", `Jadwal [${label}] → ${cron} (${settings.timezone})`);
    } catch (err) {
      logger.error("LOKER", `Gagal membuat CronJob untuk [${label}]: ${err.message}`);
    }
  }
}

function initLokerScheduler(sockInstance) {
  sock = sockInstance;
  const db = getDatabase();
  const settings = getLokerSettings(db);
  logger.info("LOKER", `Scheduler ${settings.enabled ? "aktif" : "nonaktif"} | ${settings.targets.length} grup | ${settings.schedules.length} jadwal`);
  startLokerJobs(settings);
}

export {
  initLokerScheduler,
  getLokerStatus,
  updateLokerSettings,
  fetchNewJobs,
  fetchRemotive,
  fetchArbeitnow,
  fetchTheMuse,
  fetchJobicy,
  fetchJobstreetID,
  fetchGlintsID,
  fetchKalibrrID,
  fetchIndeedID,
  fetchAllIndonesiaJobs,
  formatLokerMessage,
  getSentIds,
  markSent,
  startLokerJobs,
  stopLokerJob,
};
