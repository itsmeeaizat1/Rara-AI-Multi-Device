// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/info/ayokerja.js
 * Command .ayokerja — cek lowongan kerja manual untuk semua user.
 * Sumber: Remotive + Arbeitnow (gratis, tanpa API key).
 */

import {
  fetchNewJobs,
  fetchAllIndonesiaJobs,
  formatLokerMessage,
  getLokerStatus,
} from "../../src/lib/nova-loker-scheduler.js";

const pluginConfig = {
  name: "ayokerja",
  alias: ["ayokerja"],
  category: "info",
  description: "Cari lowongan kerja Indonesia (JobStreet, Glints, Kalibrr, Indeed)",
  usage: ".ayokerja [kata kunci]",
  example: ".ayokerja developer",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_MAP = {
  it: "software-dev",
  "software-dev": "software-dev",
  developer: "software-dev",
  dev: "software-dev",
  design: "design",
  desain: "design",
  marketing: "marketing",
  sales: "sales",
  support: "customer-support",
  cs: "customer-support",
  data: "data",
  finance: "finance",
  keuangan: "finance",
  hr: "hr",
  management: "management",
  writing: "writing",
  content: "writing",
  konten: "writing",
  qa: "qa",
  devops: "devops",
  product: "product",
  legal: "legal",
};

function parseArgs(args) {
  const keywords = [];
  let category = "";

  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (CATEGORY_MAP[lower]) {
      category = CATEGORY_MAP[lower];
    } else {
      keywords.push(arg);
    }
  }

  return { keywords, category };
}

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => String(a).trim()).filter(Boolean);
  const { keywords, category } = parseArgs(args);

  await m.react("🕒");

  try {
    const settings = getLokerStatus();

    // Merge keyword dari settings + keyword dari user
    const mergedKeywords = keywords.length ? keywords : settings.keywords || [];

    const mergedCategories = category ? [category] : settings.categories || [];

    // Coba 4 portal Indonesia dulu (JobStreet, Glints, Kalibrr, Indeed)
    let jobs = await fetchAllIndonesiaJobs({
      sources: ["jobstreet", "glints", "kalibrr", "indeed"],
      keywords: mergedKeywords,
      limit: 5,
      sentIds: {},
    });

    // Fallback ke sumber international jika tidak ada hasil
    if (!jobs.length) {
      jobs = await fetchNewJobs({
        sources: ["remotive", "arbeitnow"],
        keywords: mergedKeywords,
        categories: mergedCategories,
        limit: 5,
        sentIds: {},
      });
    }

    if (!jobs || !jobs.length) {
      const noMsg = mergedKeywords && mergedKeywords.length
        ? "Tidak ada loker untuk kata kunci: " + mergedKeywords.join(", ")
        : "Tidak ada loker terbaru saat ini.";
      return m.reply(noMsg);
    }

    const msg = formatLokerMessage(jobs, { label: "Hasil Pencarian", keywords: mergedKeywords });
    if (!msg) {
      return m.reply(claraWrap("Ayokerja", "Tidak ada loker yang bisa ditampilkan."));
    }

    await m.react("🐣");
    return await m.reply(claraWrap("ayokerja", msg));
  } catch (e) {
    return m.reply(novaError("AyoKerja", `Ada error nih: ${e?.message || String(e)}`));
  }
}

export { pluginConfig as config, handler };