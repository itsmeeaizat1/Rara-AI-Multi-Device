// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Env loader — baca semua API key dari .env, bukan dari JSON hardcoded
// File ini aman di-push ke GitHub (tidak berisi key apapun)

import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env dari root project
const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Ambil API key dari environment variable.
 * @param {string} envVar - Nama env variable, contoh: "ANDARAZ_API_KEY"
 * @param {string} fallback - Value default kalau env gak ada
 * @returns {string}
 */
export function getEnv(envVar, fallback = "") {
  return process.env[envVar] || fallback;
}

/**
 * Ambil semua API key dalam format object (kompatibel dengan config.APIkey lama)
 */
export function getApiKeys() {
  return {
    lolhuman: getEnv("LOLHUMAN_API_KEY"),
    neoxr: getEnv("NEOXR_API_KEY"),
    fgsi: getEnv("FGSI_API_KEY"),
    google: getEnv("GOOGLE_API_KEY"),
    groq: getEnv("GROQ_API_KEY"),
    betabotz: getEnv("BETABOTZ_API_KEY"),
    covenant: getEnv("COVENANT_API_KEY"),
    onlym: getEnv("ONLYM_API_KEY"),
    obscura: getEnv("OBSCURA_API_KEY"),
    firefly: getEnv("FIREFLY_API_KEY"),
    cuki: getEnv("CUKI_API_KEY"),
    anabot: getEnv("ANABOTZ_API_KEY"),
    termai: getEnv("TERMAI_API_KEY"),
    tenor: getEnv("TENOR_API_KEY"),
    voiceai: getEnv("VOICEAI_API_KEY"),
    fishaudio: getEnv("FISHAUDIO_API_KEY"),
  };
}

/**
 * Ambil config Andaraz dari env
 */
export function getAndarazConfig() {
  return {
    apikey: getEnv("ANDARAZ_API_KEY"),
    baseUrl: getEnv("ANDARAZ_BASE_URL", "https://api.andaraz.com"),
  };
}

/**
 * Ambil config Sankavollerei dari env
 */
export function getSankaConfig() {
  return {
    apikey: getEnv("SANKA_API_KEY"),
    baseUrl: getEnv("SANKA_BASE_URL", "https://www.sankavollerei.web.id"),
  };
}

/**
 * Ambil DeepAI API key dari env
 */
export function getDeepAiKey() {
  return getEnv("DEEPAI_API_KEY");
}
