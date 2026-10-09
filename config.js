// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// config.js — Thin aggregator
// Semua config dipindah ke src/lib/config/ per kategori
// File ini tetap export object `config` dengan struktur sama persis
// agar 359+ plugin yang import `config` tetap jalan tanpa perubahan

import * as ownerPremiumDb from "./src/lib/rara-premium-db.js";

// Import per kategori dari src/lib/config/
import { apiKeys } from "./src/lib/config/apikey.js";
import { botIdentity } from "./src/lib/config/bot-identity.js";
import { assets } from "./src/lib/config/assets.js";
import { features, registration, energi, welcome, goodbye } from "./src/lib/config/features.js";
import { messages, errorTemplate, groupProtection } from "./src/lib/config/messages.js";
import { aiHelp, geminiApiKey, autoaiPersonas } from "./src/lib/config/ai.js";
import { rpg } from "./src/lib/config/rpg.js";
import { ui, dev } from "./src/lib/config/ui.js";
import { weather, weatherScheduler, lokerScheduler } from "./src/lib/config/schedulers.js";
import { vercel, pterodactyl, digitalocean, alightmotion } from "./src/lib/config/external.js";
import { applyPteroOverrides } from "./src/lib/panel/index.js";
import { database, backup, scheduler, emailOtp } from "./src/lib/config/system.js";
import { payment, donasi } from "./src/lib/config/payment.js";

// ═══════════════════════════════════════════
// ASSEMBLE CONFIG — struktur identik dengan versi lama
// ═══════════════════════════════════════════
const config = {
  // Bot identity
  info: botIdentity.info,
  owner: botIdentity.owner,
  session: botIdentity.session,
  bot: botIdentity.bot,
  mode: botIdentity.mode,
  command: botIdentity.command,
  sticker: botIdentity.sticker,
  saluran: botIdentity.saluran,

  // Assets
  assets,

  // External services
  vercel,
  pterodactyl: applyPteroOverrides(pterodactyl),
  digitalocean,
  alightmotion,

  // Payment
  payment,
  donasi,

  // Features & energy
  features,
  registration,
  energi,
  welcome,
  goodbye,

  // Messages
  messages,
  errorTemplate,
  groupProtection,

  // AI
  aiHelp,
  geminiApiKey,
  autoaiPersonas,

  // RPG
  rpg,

  // UI & dev
  ui,
  dev,

  // Schedulers
  weather,
  weatherScheduler,
  lokerScheduler,

  // System
  database,
  backup,
  scheduler,
  emailOtp,

  // API keys (dari JSON via env-loader)
  APIkey: apiKeys.APIkey,
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS — tetap di sini
// ═══════════════════════════════════════════

function matchJidNumber(a, b) {
  const cleanA = String(a).replace(/[^0-9]/g, "");
  const cleanB = String(b).replace(/[^0-9]/g, "");
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
}

function isOwner(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/@.+/g, "");
  const ownerNumbers = config.owner?.number || [];
  for (const n of ownerNumbers) {
    if (matchJidNumber(cleanJid, n)) return true;
  }
  try {
    if (ownerPremiumDb.isOwner(jid)) return true;
  } catch {}
  return false;
}

function setBotNumber(number) {
  if (number) {
    config.botNumber = number;
    config.bot = config.bot || {};
    config.bot.number = number;
  }
}

function isPremium(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/@.+/g, "");
  if (Array.isArray(config.premiumUsers)) {
    for (const n of config.premiumUsers) {
      if (matchJidNumber(cleanJid, n)) return true;
    }
  }
  try {
    if (ownerPremiumDb.isPremium(jid)) return true;
  } catch {}
  // FIX 3 Okt 2026: .addprem / .approveprem / .addpremall menulis ke db.data.premium (database
  // utama), sedangkan premium-db/premium.json cuma diisi jalur sewa. Dulu gate HANYA baca
  // premium.json -> user hasil .addprem "berhasil ditambah" tapi tetap ditolak di 65 fitur premium.
  // Sekarang db.data.premium ikut dibaca (lazy supaya tidak bikin siklus impor dgn rara-database).
  try {
    if (isInDbPremium(cleanJid)) return true;
  } catch {}
  return false;
}

// Entri db.data.premium: string nomor (addpremall) | {id, expired?(ms)} (addprem/approveprem).
// Tanpa expired = lifetime. Hanya nomor >= 8 digit yang dicocokkan (anti false-positive).
function isInDbPremium(cleanJid) {
  const num = String(cleanJid || "").replace(/[^0-9]/g, "");
  if (num.length < 8) return false;
  let list;
  try {
    const db = globalThis.__raraGetDatabase?.();
    list = db?.data?.premium;
  } catch {
    return false;
  }
  if (!Array.isArray(list)) return false;
  const now = Date.now();
  for (const p of list) {
    const raw = typeof p === "string" ? p : p?.id || p?.jid || p?.number || "";
    const pn = String(raw).replace(/[^0-9]/g, "");
    if (pn.length < 8 || !matchJidNumber(num, pn)) continue;
    if (p && typeof p === "object" && typeof p.expired === "number" && p.expired < now) continue;
    return true;
  }
  return false;
}

function isPartner(jid) {
  if (!jid) return false;
  try {
    return ownerPremiumDb.isPartner(jid);
  } catch {}
  return false;
}

function isBanned(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/@.+/g, "");
  if (Array.isArray(config.bannedUsers)) {
    for (const n of config.bannedUsers) {
      if (matchJidNumber(cleanJid, n)) return true;
    }
  }
  return false;
}

config.isOwner = isOwner;
config.isPremium = isPremium;
config.isPartner = isPartner;
config.isBanned = isBanned;
config.setBotNumber = setBotNumber;

function getOwnerName(number) {
  if (!number) return config.owner?.name || "Owner";
  const clean = String(number).replace(/[^0-9]/g, "");
  const cfgNumbers = (config.owner?.number || []).map(n => String(n).replace(/[^0-9]/g, ""));
  if (cfgNumbers.includes(clean)) return config.owner?.name || "Owner";
  try {
    const db = global.raraDb;
    if (db?.data?.ownerList) {
      const entry = db.data.ownerList.find(o => String(o.number).replace(/[^0-9]/g, "") === clean);
      if (entry?.name) return entry.name;
    }
  } catch {}
  return "Owner";
}

export { config, isOwner, setBotNumber, isPremium, isPartner, isBanned, getOwnerName };
export default config;
