// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * rara-loker-id-sources.js
 * Fetcher lowongan kerja Indonesia.
 * 1. LinkedIn Indonesia (guest API) — SATU-SATUNYA yang terbukti hidup (v24.2.8)
 * 2. JobStreet Indonesia (via Andaraz API + direct fallback) — sekarang 500/404
 * 3. Glints Indonesia (via GraphQL API) — sekarang 403
 * 4. Kalibrr Indonesia (via public API) — sekarang 404
 * 5. Indeed Indonesia (via RSS + API) — sekarang 403
 *
 * Catatan: portal besar memblokir scraping dari IP server. LinkedIn guest
 * endpoint masih terbuka; sisanya dipertahankan sebagai cadangan kalau pulih.
 */

import { getAndarazConfig } from "./config/env-loader.js";
import { logger } from "./rara-logger.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function _fetch(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/html, */*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function _fetchJson(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const res = await _fetch(url, options, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function _decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function _filterJobs(jobs, keywords, limit) {
  if (!jobs.length) return [];
  let filtered = jobs;
  if (keywords && keywords.length) {
    const kwLower = keywords.map((k) => k.toLowerCase());
    filtered = jobs.filter((j) => {
      const text = `${j.title} ${j.company} ${j.location} ${(j.tags || []).join(" ")}`.toLowerCase();
      return kwLower.some((kw) => text.includes(kw));
    });
  }
  const seen = new Set();
  filtered = filtered.filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
  return filtered.slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. JOBSTREET INDONESIA
// ────────────────────────────────────────────────────────────────────────────

function normalizeJobstreet(job) {
  return {
    id: `jobstreet_${job.id || (job.title + "-" + (job.company || job.companyName || ""))}`,
    title: job.title || job.jobTitle || "-",
    company: job.company || job.companyName || "-",
    location: job.location || job.jobLocation || "Indonesia",
    type: (job.work_types && job.work_types.label) || job.jobType || "Full time",
    tags: [],
    url: job.url || (job.id ? `https://id.jobstreet.com/id/job/${job.id}` : "https://id.jobstreet.com"),
    postedAt: (job.date_posted && (job.date_posted.dateTimeUtc || job.date_posted.label)) || "",
    expiryDate: "",
    salary: job.salary || job.salaryRange || "",
    source: "JobStreet ID",
    image: null,
  };
}

async function fetchJobstreetID({ keywords = [], limit = 10 } = {}) {
  const q = keywords.length ? keywords.join(" ") : "indonesia";
  const jobs = [];

  // Strategy 1: Andaraz API
  try {
    const andaraz = getAndarazConfig();
    const apiKey = andaraz.apikey;
    const baseUrl = andaraz.baseUrl || "https://api.andaraz.com";
    if (apiKey) {
      const url = `${baseUrl}/api/jobstreet/search?apikey=${apiKey}&q=${encodeURIComponent(q)}&page=1`;
      const data = await _fetchJson(url);
      if (data.status) {
        const rawJobs = data.jobs || data.results || data.data || [];
        jobs.push(...rawJobs.map(normalizeJobstreet));
        logger.info("LOKER-ID", `JobStreet Andaraz: ${jobs.length} jobs`);
      } else {
        logger.warn("LOKER-ID", `JobStreet Andaraz gagal: ${data.message || "unknown"}`);
      }
    }
  } catch (err) {
    logger.warn("LOKER-ID", `JobStreet Andaraz error: ${err.message}`);
  }

  if (jobs.length) return _filterJobs(jobs, keywords, limit);

  // Strategy 2: Direct JobStreet API (mungkin jalan dari VPS)
  try {
    const url = `https://id.jobstreet.com/api/v3/job-search?keywords=${encodeURIComponent(q)}&countryCode=ID&locale=id-ID&limit=${limit}&page=1`;
    const data = await _fetchJson(url, {
      headers: { "Seek-Locale": "id-ID", "X-Seek-Client": "candidate-web" },
    });
    if (data.data || data.jobs) {
      const rawJobs = data.data || data.jobs || [];
      jobs.push(...rawJobs.map(normalizeJobstreet));
      logger.info("LOKER-ID", `JobStreet direct: ${jobs.length} jobs`);
    }
  } catch (err) {
    logger.warn("LOKER-ID", `JobStreet direct error: ${err.message}`);
  }

  return _filterJobs(jobs, keywords, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. GLINTS INDONESIA
// ────────────────────────────────────────────────────────────────────────────

function normalizeGlints(job) {
  const node = job.node || job;
  const company = node.company || {};
  const location = node.location || (Array.isArray(node.locations) ? node.locations.map((l) => l.name).filter(Boolean).join(", ") : "Indonesia");
  return {
    id: `glints_${node.id || (node.title + "-" + (company.name || ""))}`,
    title: node.title || node.name || "-",
    company: company.name || node.companyName || "-",
    location: typeof location === "string" ? location : "Indonesia",
    type: node.type || node.jobType || "Full time",
    tags: Array.isArray(node.categories) ? node.categories.slice(0, 4) : [],
    url: node.url || (node.id ? `https://glints.com/id/en/opportunities/jobs/${node.id}` : "https://glints.com/id"),
    postedAt: node.postedAt || node.createdAt || "",
    expiryDate: "",
    salary: node.salaryFrom && node.salaryTo ? `Rp ${node.salaryFrom} - Rp ${node.salaryTo}` : (node.salary || ""),
    source: "Glints",
    image: company.logoUrl || null,
  };
}

async function fetchGlintsID({ keywords = [], limit = 10 } = {}) {
  const jobs = [];
  const q = keywords.length ? keywords.join(" ") : "";

  // Strategy 1: Glints GraphQL
  try {
    const query = `
      query Jobs($input: JobSearchInput!) {
        jobs(input: $input) {
          edges {
            node {
              id
              title
              type
              salaryFrom
              salaryTo
              createdAt
              company { name logoUrl }
              locations { name }
              categories { name }
            }
          }
        }
      }`;

    const variables = {
      input: {
        countryCode: "ID",
        limit: limit,
        ...(q ? { keyword: q } : {}),
      },
    };

    const res = await _fetch("https://glints.com/id/en/site/explore/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-glints-source": "web" },
      body: JSON.stringify({ query, variables }),
    });

    if (res.ok) {
      const data = await res.json();
      const edges = data?.data?.jobs?.edges || [];
      jobs.push(...edges.map(normalizeGlints));
      logger.info("LOKER-ID", `Glints GraphQL: ${jobs.length} jobs`);
    }
  } catch (err) {
    logger.warn("LOKER-ID", `Glints GraphQL error: ${err.message}`);
  }

  if (jobs.length) return _filterJobs(jobs, keywords, limit);

  // Strategy 2: Glints REST API (fallback)
  try {
    const params = new URLSearchParams({ limit: String(limit), country: "ID", ...(q ? { keyword: q } : {}) });
    const url = `https://glints.com/id/en/api/v2/jobs?${params}`;
    const data = await _fetchJson(url);
    const rawJobs = data.data || data.jobs || data.results || [];
    jobs.push(...rawJobs.map(normalizeGlints));
    logger.info("LOKER-ID", `Glints REST: ${jobs.length} jobs`);
  } catch (err) {
    logger.warn("LOKER-ID", `Glints REST error: ${err.message}`);
  }

  return _filterJobs(jobs, keywords, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 3. KALIBRR INDONESIA
// ────────────────────────────────────────────────────────────────────────────

function normalizeKalibrr(job) {
  return {
    id: `kalibrr_${job.id || (job.name + "-" + (job.company?.name || ""))}`,
    title: job.name || job.title || "-",
    company: job.company?.name || job.company_name || "-",
    location: job.location || (Array.isArray(job.office_locations)
      ? job.office_locations.map((l) => l.city || l.name).filter(Boolean).join(", ")
      : "Indonesia"),
    type: job.tenure || job.job_type || "Full time",
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 4) : [],
    url: job.url || (job.id ? `https://www.kalibrr.com/id-ID/jobs/${job.id}` : "https://www.kalibrr.com"),
    postedAt: job.creation_date || job.created_at || "",
    expiryDate: job.application_end_date || "",
    salary: job.salary_range
      ? `${job.salary_range.min || "?"} - ${job.salary_range.max || "?"} ${job.salary_range.currency || "IDR"}`
      : (job.salary || ""),
    source: "Kalibrr",
    image: job.company?.logo_url || job.company?.logo || null,
  };
}

async function fetchKalibrrID({ keywords = [], limit = 10 } = {}) {
  const jobs = [];
  const q = keywords.length ? keywords.join(" ") : "";

  // Strategy 1: Kalibrr job board API
  try {
    const params = new URLSearchParams({ country: "Indonesia", limit: String(limit * 2), ...(q ? { text: q } : {}) });
    const url = `https://www.kalibrr.com/api/kalibrr-web/jobs?${params}`;
    const data = await _fetchJson(url);
    const rawJobs = data.jobs || data.results || data.data || [];
    if (Array.isArray(rawJobs) && rawJobs.length) {
      jobs.push(...rawJobs.map(normalizeKalibrr));
      logger.info("LOKER-ID", `Kalibrr API: ${jobs.length} jobs`);
    }
  } catch (err) {
    logger.warn("LOKER-ID", `Kalibrr API error: ${err.message}`);
  }

  if (jobs.length) return _filterJobs(jobs, keywords, limit);

  // Strategy 2: Kalibrr search endpoint
  try {
    const url = `https://www.kalibrr.com/api/kalibrr-web/search/jobs?country=Indonesia&limit=${limit}${q ? "&text=" + encodeURIComponent(q) : ""}`;
    const data = await _fetchJson(url);
    const rawJobs = data.jobs || data.results || [];
    if (Array.isArray(rawJobs) && rawJobs.length) {
      jobs.push(...rawJobs.map(normalizeKalibrr));
      logger.info("LOKER-ID", `Kalibrr search: ${jobs.length} jobs`);
    }
  } catch (err) {
    logger.warn("LOKER-ID", `Kalibrr search error: ${err.message}`);
  }

  return _filterJobs(jobs, keywords, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 4. INDEED INDONESIA
// ────────────────────────────────────────────────────────────────────────────

function normalizeIndeed(job) {
  return {
    id: `indeed_${job.id || job.key || (job.title + "-" + job.company)}`,
    title: job.title || job.jobtitle || "-",
    company: job.company || job.company_display_name || "-",
    location: job.location || job.formattedLocation || job.city || "Indonesia",
    type: job.job_type || "Full time",
    tags: [],
    url: job.url || job.link || (job.id ? `https://id.indeed.com/viewjob?jk=${job.id}` : "https://id.indeed.com"),
    postedAt: job.date || job.posted_date || job.pubDate || "",
    expiryDate: "",
    salary: job.salary || job.salaryText || "",
    source: "Indeed ID",
    image: null,
  };
}

async function fetchIndeedID({ keywords = [], limit = 10 } = {}) {
  const jobs = [];
  const q = keywords.length ? keywords.join(" ") : "kerja";

  // Strategy 1: Indeed RSS feed
  try {
    const url = `https://id.indeed.com/rss?q=${encodeURIComponent(q)}&l=Indonesia&limit=${limit}`;
    const res = await _fetch(url);
    if (res.ok) {
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, limit)) {
        const title = (item.match(/<title>(.*?)<\/title>/) || [])[1]?.trim() || "-";
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]?.trim() || "";
        const parts = title.split(" - ");
        const jobTitle = parts[0] || title;
        const company = parts[1] || "-";
        const location = parts[2] || "Indonesia";
        jobs.push({
          id: `indeed_${Buffer.from(title + link).toString("base64").slice(0, 20)}`,
          title: _decodeEntities(jobTitle),
          company: _decodeEntities(company),
          location: _decodeEntities(location),
          type: "Full time",
          tags: [],
          url: link || "https://id.indeed.com",
          postedAt: pubDate,
          expiryDate: "",
          salary: "",
          source: "Indeed ID",
          image: null,
        });
      }
      logger.info("LOKER-ID", `Indeed RSS: ${jobs.length} jobs`);
    }
  } catch (err) {
    logger.warn("LOKER-ID", `Indeed RSS error: ${err.message}`);
  }

  if (jobs.length) return _filterJobs(jobs, keywords, limit);

  // Strategy 2: Indeed API (mungkin jalan dari VPS)
  try {
    const url = `https://id.indeed.com/api/jobsearch?keywords=${encodeURIComponent(q)}&location=Indonesia&limit=${limit}`;
    const data = await _fetchJson(url);
    const rawJobs = data.results || data.jobs || [];
    jobs.push(...rawJobs.map(normalizeIndeed));
    logger.info("LOKER-ID", `Indeed API: ${jobs.length} jobs`);
  } catch (err) {
    logger.warn("LOKER-ID", `Indeed API error: ${err.message}`);
  }

  return _filterJobs(jobs, keywords, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// AGGREGATE: Fetch dari semua portal Indonesia
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// LINKEDIN INDONESIA (guest API — SATU-SATUNYA YANG TERBUKTI HIDUP)
// ────────────────────────────────────────────────────────────────────────────
// FIX v24.2.8: 4 portal di bawah (JobStreet/Glints/Kalibrr/Indeed) sekarang
// MEMBLOKIR scrape (JobStreet 500/404, Glints 403, Kalibrr 404, Indeed 403),
// jadi fetchAllIndonesiaJobs selalu 0 dan notif loker isinya luar negeri
// (USA/Jerman dari Remotive/Arbeitnow). Endpoint `jobs-guest` LinkedIn masih
// terbuka dan mengembalikan LOKER INDONESIA asli — verified live:
// "Staff CRD - Graphic Designer @ PT. Selaras Husada, Surabaya".
function normalizeLinkedin(job) {
  return {
    id: `linkedin_${job.jobId || job.title}`,
    title: job.title || "-",
    company: job.company || "-",
    location: job.location || "Indonesia",
    type: job.type || "Full time",
    tags: [],
    url: job.url || "https://www.linkedin.com/jobs/search/?location=Indonesia",
    postedAt: job.postedAt || "",
    expiryDate: "",
    salary: "",
    source: "LinkedIn ID",
    image: null,
  };
}

async function fetchLinkedinID({ keywords = [], location = "Indonesia", limit = 10 } = {}) {
  const kw = Array.isArray(keywords) && keywords.length ? keywords.join(" ") : "";
  const lok = location || "Indonesia";
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(kw)}&location=${encodeURIComponent(lok)}&start=0`;
  try {
    const res = await _fetch(url, { headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const jobs = [];
    for (const card of html.split("<li>").slice(1)) {
      const title = _decodeEntities(((card.match(/class="base-search-card__title"[^>]*>\s*([^<]+)/) || [])[1] || "")).trim();
      if (!title) continue;
      const company = _decodeEntities(((card.match(/class="hidden-nested-link"[^>]*>\s*([^<]+)/) || [])[1] || "")).trim();
      const loc = _decodeEntities(((card.match(/class="job-search-card__location"[^>]*>\s*([^<]+)/) || [])[1] || "")).trim();
      const link = (card.match(/href="(https:\/\/[a-z]{2}\.linkedin\.com\/jobs\/view\/[^"?]+)/) || [])[1] || "";
      const dt = (card.match(/datetime="([^"]+)"/) || [])[1] || "";
      const jobId = (link.match(/-(\d+)$/) || [])[1] || "";
      jobs.push(normalizeLinkedin({ title, company, location: loc, url: link, postedAt: dt, jobId }));
      if (jobs.length >= limit) break;
    }
    if (!jobs.length) throw new Error("parse LinkedIn 0 loker — markup berubah?");
    logger.info("LOKER-ID", `LinkedIn: ${jobs.length} jobs`);
    return jobs;
  } catch (err) {
    logger.warn("LOKER-ID", `LinkedIn error: ${err.message}`);
    return [];
  }
}

async function fetchAllIndonesiaJobs({
  sources = ["linkedin", "jobstreet", "glints", "kalibrr", "indeed"],
  keywords = [],
  limit = 10,
  sentIds = {},
} = {}) {
  const fetchers = [];
  // v24.2.8 — LinkedIn dulu (satu-satunya yang hidup); 4 portal lain jadi cadangan
  if (sources.includes("linkedin")) fetchers.push(fetchLinkedinID({ keywords, limit }));
  if (sources.includes("jobstreet")) fetchers.push(fetchJobstreetID({ keywords, limit }));
  if (sources.includes("glints")) fetchers.push(fetchGlintsID({ keywords, limit }));
  if (sources.includes("kalibrr")) fetchers.push(fetchKalibrrID({ keywords, limit }));
  if (sources.includes("indeed")) fetchers.push(fetchIndeedID({ keywords, limit }));

  const results = await Promise.allSettled(fetchers);
  const allJobs = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) allJobs.push(...r.value);
  }

  const seen = new Set(Object.keys(sentIds || {}));
  const fresh = [];
  for (const job of allJobs) {
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    fresh.push(job);
  }
  return fresh;
}

export {
  fetchLinkedinID,
  normalizeLinkedin,
  fetchJobstreetID,
  fetchGlintsID,
  fetchKalibrrID,
  fetchIndeedID,
  fetchAllIndonesiaJobs,
  normalizeJobstreet,
  normalizeGlints,
  normalizeKalibrr,
  normalizeIndeed,
};
