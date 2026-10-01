// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// system.js — Database, backup, scheduler, email OTP

import { apiKeys } from "./apikey.js";

// RELOKASI (owner 26 Sep 2026): root DB runtime kini src/database/<kategori>/,
// konten statis (soal game dll) tetap di src/data/
export const database = { path: "./src/database" };

export const backup = {
  enabled: false,
  intervalHours: 24,
  retainDays: 7,
};

export const scheduler = {
  resetHour: 0,
  resetMinute: 0,
};

// Email OTP configuration (recommended: set via environment variables)
export const emailOtp = {
  enabled: process.env.EMAILOTP_ENABLED === "true" || false,
  user: apiKeys.emailOtpUser,
  pass: apiKeys.emailOtpPass,
  fromName: process.env.EMAILOTP_FROM || "",
  host: process.env.EMAILOTP_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAILOTP_PORT || 587),
  secure: process.env.EMAILOTP_SECURE === "true",
  ttlMs: Number(process.env.EMAILOTP_TTL_MS || 5 * 60 * 1000),
  maxAttempts: Number(process.env.EMAILOTP_MAX_ATTEMPTS || 3),
};
