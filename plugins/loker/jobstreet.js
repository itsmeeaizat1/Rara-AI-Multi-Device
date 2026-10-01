// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// JobStreet — Cari lowongan kerja & lihat detail via Andaraz JobStreet API
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "jobstreet",
  alias: ["jobstreet"],
  category: "loker",
  description: "JobStreet Indonesia — cari lowongan kerja & lihat detail lowongan",
  usage: ".jobstreet <keyword> — Cari lowongan\n.jobstreet detail <id> — Lihat detail lowongan\n.jobstreet — Info plugin",
  example: ".jobstreet developer\n.jobstreet detail 93291047",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

import fs from "node:fs";
import { getAndarazConfig } from "../../src/lib/config/env-loader.js";
const andarazConfig = getAndarazConfig();
const API_KEY = andarazConfig.apikey;
const API_BASE = "https://api.andaraz.com/api/jobstreet";

// ─── Search jobs ──────────────────────────────────────────────────
async function searchJobs(keyword, page = 1) {
  const url = API_BASE + "/search?apikey=" + API_KEY + "&q=" + encodeURIComponent(keyword) + "&page=" + page;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("HTTP " + res.status + (text ? " - " + text.substring(0, 200) : ""));
  }

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || data.error || "Pencarian gagal");
  }
  return data;
}

// ─── Get job detail ────────────────────────────────────────────────
async function getJobDetail(jobId) {
  const url = API_BASE + "/detail?apikey=" + API_KEY + "&id=" + encodeURIComponent(jobId);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("HTTP " + res.status + (text ? " - " + text.substring(0, 200) : ""));
  }

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || data.error || "Gagal ambil detail nih");
  }
  return data;
}

// ─── Format search results ─────────────────────────────────────────
function formatSearchResults(data, keyword, page) {
  const jobs = data.jobs || data.results || data.data || [];
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return raraWrap("JobStreet", [
      "Tidak ada lowongan ditemukan untuk: " + keyword,
      "",
      "Coba keyword lain seperti:",
      "developer, marketing, designer, accountant, guru",
    ], "warn");
  }

  const lines = [
    "HASIL PENCARIAN: " + keyword.toUpperCase(),
    "Halaman: " + page + " | Total: " + (data.total || jobs.length) + " lowongan",
    "",
  ];

  const maxShow = Math.min(jobs.length, 10);
  for (let i = 0; i < maxShow; i++) {
    const job = jobs[i];
    const title = job.title || job.jobTitle || "N/A";
    const company = job.company || job.companyName || "N/A";
    const location = job.location || job.jobLocation || "N/A";
    const salary = job.salary || job.salaryRange || "";
    const jobId = job.id || job.jobId || "";
    const jobType = job.work_types?.label || job.jobType || "";

    lines.push((i + 1) + ". " + title);
    lines.push("   Perusahaan: " + company);
    lines.push("   Lokasi: " + location);
    if (salary) lines.push("   Gaji: " + salary);
    if (jobType) lines.push("   Tipe: " + jobType);
    if (jobId) lines.push("   ID: " + jobId);
    lines.push("");
  }

  if (jobs.length > 10) {
    lines.push("Ketik .jobstreet " + keyword + " " + (page + 1) + " untuk halaman berikutnya");
  }
  lines.push("Ketik .jobstreet detail <ID> untuk lihat detail lowongan");
  lines.push("Source: JobStreet Indonesia via Andaraz API");

  return raraWrap("JobStreet", lines, "info");
}

// ─── Format job detail ─────────────────────────────────────────────
function formatJobDetail(data) {
  const lines = [
    "DETAIL LOWONGAN",
    "",
    "Judul: " + (data.title || "N/A"),
    "Perusahaan: " + (data.company || "N/A"),
    "Lokasi: " + (data.location || "N/A"),
  ];

  if (data.salary) lines.push("Gaji: " + data.salary);
  if (data.work_types?.label) lines.push("Tipe: " + data.work_types.label);
  if (data.teaser) lines.push("Ringkasan: " + data.teaser);
  if (data.date_posted?.label) lines.push("Diposting: " + data.date_posted.label);

  // Description (strip HTML, trim to reasonable length)
  let desc = data.description || "";
  if (!desc && data.description_html) {
    desc = data.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  if (desc) {
    lines.push("");
    lines.push("DESKRIPSI:");
    // Trim long descriptions
    if (desc.length > 2000) {
      lines.push(desc.substring(0, 2000));
      lines.push("", "...(deskripsi dipotong, " + (desc.length - 2000) + " karakter lagi)");
    } else {
      lines.push(desc);
    }
  }

  lines.push("");
  lines.push("Source: JobStreet Indonesia via Andaraz API");

  return raraWrap("JobStreet", lines, "info");
}

// ─── Handler ──────────────────────────────────────────────────────
async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();
    await m.react("🕒");

    if (!input) {
      return m.reply(raraWrap("JobStreet", [
        "Cari lowongan kerja dari JobStreet Indonesia",
        "Source: Andaraz API",
        "",
        "CARA PAKAI:",
        usedPrefix + "jobstreet <keyword> — Cari lowongan",
        usedPrefix + "jobstreet <keyword> <halaman> — Halaman tertentu",
        usedPrefix + "jobstreet detail <id> — Lihat detail lowongan",
        "",
        "Contoh:",
        usedPrefix + "jobstreet developer",
        usedPrefix + "jobstreet marketing 2",
        usedPrefix + "jobstreet detail 93291047",
      ]));
    }

    const parts = input.split(/\s+/);
    const sub = parts[0].toLowerCase();

    // Detail mode
    if (sub === "detail" || sub === "d") {
      const jobId = parts[1];
      if (!jobId) {
        return m.reply(raraWrap("JobStreet", "ID lowongan wajib!\n💡 *Contoh:* " + usedPrefix + "jobstreet detail 93291047"));
      }

      m.reply(raraWrap("JobStreet", "Mengambil detail lowongan...\nID: " + jobId));

      const data = await getJobDetail(jobId);
      await m.react("🐣");
      return m.reply(formatJobDetail(data));
    }

    // Search mode
    let keyword = parts.join(" ");
    let page = 1;

    // Check if last part is a number (page)
    if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
      page = parseInt(parts[parts.length - 1]);
      keyword = parts.slice(0, -1).join(" ");
    }

    if (!keyword) {
      return m.reply(raraWrap("JobStreet", "Keyword pencarian wajib!\n💡 *Contoh:* " + usedPrefix + "jobstreet developer"));
    }

    m.reply(raraWrap("JobStreet", "Mencari lowongan...\nKeyword: " + keyword + "\nHalaman: " + page));

    const data = await searchJobs(keyword, page);
    await m.react("🐣");
    return m.reply(formatSearchResults(data, keyword, page));
  } catch (e) {
    console.error("[JobStreet]", e);
    await m.react("❌");
    let errMsg = e.message;

    // Handle 403 specifically
    if (errMsg.includes("403")) {
      errMsg = "JobStreet lagi blokir nih. Coba lagi nanti atau pakai .jobstreet detail <id>";
    }

    m.reply(raraWrap("JobStreet", [
      "Error: " + errMsg,
      "",
      "Kemungkinan penyebab:",
      "1. JobStreet sedang memblokir API (403)",
      "2. Keyword gak valid nih",
      "3. Koneksi timeout",
      "",
      "Tips: Gunakan .jobstreet detail <id> untuk lihat detail lowongan tertentu",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
