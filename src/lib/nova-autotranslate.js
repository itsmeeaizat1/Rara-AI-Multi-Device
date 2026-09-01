// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * @file src/lib/nova-autotranslate.js
 * @description Auto-translate library for group messages with language detection and MyMemory API translation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path for storing per-group autotranslate settings
const DB_FILE = path.join(process.cwd(), 'database', 'autotranslate.json');

// In-memory state cache
let state = {};

/**
 * Ensure database directory exists and load settings from JSON
 */
function loadDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      state = JSON.parse(raw);
    } else {
      state = {};
      saveDatabase();
    }
  } catch (err) {
    console.error('[AutoTranslate] Error loading database:', err.message);
    state = {};
  }
}

/**
 * Save current state cache to JSON database file
 */
function saveDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AutoTranslate] Error saving database:', err.message);
  }
}

/**
 * Helper to get group configuration with default fallbacks
 * @param {string} groupId 
 * @returns {{ enabled: boolean, targetLang: string, lastTranslated: number }}
 */
function getGroupConfig(groupId) {
  if (!groupId) return { enabled: false, targetLang: 'id', lastTranslated: 0 };
  const groupData = state[groupId] || {};
  return {
    enabled: Boolean(groupData.enabled),
    targetLang: groupData.targetLang || 'id',
    lastTranslated: Number(groupData.lastTranslated || 0)
  };
}

/**
 * Initialize auto-translate library & database
 */
export function initAutoTranslate() {
  loadDatabase();
  return state;
}

/**
 * Enable auto-translate for a specific group
 * @param {string} groupId 
 * @returns {object} Updated group configuration
 */
export function enableAutoTranslate(groupId) {
  if (!groupId) return null;
  loadDatabase();
  const current = getGroupConfig(groupId);
  state[groupId] = {
    ...current,
    enabled: true
  };
  saveDatabase();
  return state[groupId];
}

/**
 * Disable auto-translate for a specific group
 * @param {string} groupId 
 * @returns {object} Updated group configuration
 */
export function disableAutoTranslate(groupId) {
  if (!groupId) return null;
  loadDatabase();
  const current = getGroupConfig(groupId);
  state[groupId] = {
    ...current,
    enabled: false
  };
  saveDatabase();
  return state[groupId];
}

/**
 * Get current auto-translate status for a group
 * @param {string} groupId 
 * @returns {object} Group configuration
 */
export function getAutoTranslateStatus(groupId) {
  loadDatabase();
  return getGroupConfig(groupId);
}

/**
 * Set target language for auto-translate in a group
 * @param {string} groupId 
 * @param {string} lang 
 * @returns {object} Updated group configuration
 */
export function setTargetLang(groupId, lang) {
  if (!groupId) return null;
  loadDatabase();
  const cleanLang = String(lang || 'id').toLowerCase().trim();
  const current = getGroupConfig(groupId);
  state[groupId] = {
    ...current,
    targetLang: cleanLang
  };
  saveDatabase();
  return state[groupId];
}

/**
 * Detect language of given text via Unicode character ranges & word patterns
 * Supported scripts: Japanese, Korean, Chinese, Arabic, Thai, Cyrillic
 * Common word patterns: English vs Indonesian
 * @param {string} text 
 * @returns {string} Language code ('ja', 'ko', 'zh', 'ar', 'th', 'ru', 'en', 'id', 'unknown')
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  const str = text.trim();
  if (str.length < 1) return 'unknown';

  // Unicode Regexes
  const jaHiraganaKatakana = /[\u3040-\u309F\u30A0-\u30FF]/g;
  const koHangul = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;
  const zhKanji = /[\u4E00-\u9FFF\u3400-\u4DBF]/g;
  const arArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const thThai = /[\u0E00-\u0E7F]/g;
  const ruCyrillic = /[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/g;

  const jaMatches = (str.match(jaHiraganaKatakana) || []).length;
  const koMatches = (str.match(koHangul) || []).length;
  const zhMatches = (str.match(zhKanji) || []).length;
  const arMatches = (str.match(arArabic) || []).length;
  const thMatches = (str.match(thThai) || []).length;
  const ruMatches = (str.match(ruCyrillic) || []).length;

  if (jaMatches > 0) return 'ja';
  if (koMatches > 0) return 'ko';
  if (arMatches > 0) return 'ar';
  if (thMatches > 0) return 'th';
  if (ruMatches > 0) return 'ru';
  if (zhMatches > 0) return 'zh';

  // Common word patterns for English vs Indonesian
  const enWords = /\b(the|is|are|was|were|have|has|had|this|that|with|for|from|you|they|we|he|she|it|what|when|where|why|how|will|would|can|could|should|about|there|their|been|more|some|like|time|just|know|take|people|into|year|your|good|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us|hello|hi|thanks|thank|please|sorry)\b/gi;
  const idWords = /\b(yang|dan|di|ke|dari|ini|itu|dengan|untuk|pada|adalah|sebagai|akan|bisa|ada|tidak|gak|nggak|sudah|udah|juga|saya|aku|kamu|dia|mereka|kita|kami|harus|mau|tahu|tau|apa|kenapa|bagaimana|siapa|kapan|dimana|dengannya|nya|bikin|banget|sangat|lagi|kalau|kalo|tetapi|tapi|karena|karna|atau|bukan|selalu|masih|hanya|tersebut|terima|kasih|makasih|selamat|pagi|siang|malam|halo)\b/gi;

  const enMatches = (str.match(enWords) || []).length;
  const idMatches = (str.match(idWords) || []).length;

  if (enMatches > idMatches) return 'en';
  if (idMatches > enMatches) return 'id';
  if (enMatches > 0 && enMatches === idMatches) return 'en';

  // Fallback for Latin text with English indicators or default Latin
  if (/[a-zA-Z]/.test(str)) {
    // If it looks like Latin without explicit Indonesian markers
    return 'en';
  }

  return 'unknown';
}

/**
 * Translate message using MyMemory free API
 * @param {string} text 
 * @param {string} targetLang 
 * @param {string} srcLang 
 * @returns {Promise<string|null>} Translated text
 */
export async function translateMessage(text, targetLang = 'id', srcLang = 'auto') {
  try {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.trim();
    if (!cleanText) return null;

    const pair = srcLang && srcLang !== 'auto' ? `${srcLang}|${targetLang}` : `auto|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(pair)}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    if (json && json.responseData && json.responseData.translatedText) {
      let translated = json.responseData.translatedText;
      // Decode common HTML entities
      translated = translated
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      // Ignore if API returned match warning / empty
      if (translated && !translated.startsWith('MYMEMORY WARNING:')) {
        return translated;
      }
    }
    return null;
  } catch (err) {
    console.error('[AutoTranslate] MyMemory API translation error:', err.message);
    return null;
  }
}

/**
 * Determine whether a given WhatsApp message should be translated
 * @param {object} m WhatsApp message object
 * @param {string} groupId Optional group JID
 * @returns {boolean}
 */
export function shouldTranslate(m, groupId = m?.chat) {
  if (!m || !groupId) return false;

  // 1. Check if group auto-translate is enabled
  const config = getAutoTranslateStatus(groupId);
  if (!config.enabled) return false;

  // 2. Ignore bot messages (fromMe)
  if (m.fromMe || m.key?.fromMe) return false;

  // 3. Ignore commands (messages starting with prefix or m.isCommand)
  if (m.isCommand) return false;
  const rawText = m.text || '';
  if (!rawText || typeof rawText !== 'string') return false;
  const trimmed = rawText.trim();
  if (/^[.!#/$%&*+?\-@~]/.test(trimmed)) return false;

  // 4. Min 5 characters check & media-only check
  if (trimmed.length < 5) return false;

  // 5. Rate limit: 1 translation per 10s per group
  const now = Date.now();
  if (now - (config.lastTranslated || 0) < 10000) return false;

  // 6. Language detection
  const detectedLang = detectLanguage(trimmed);
  const targetLang = (config.targetLang || 'id').toLowerCase();

  if (detectedLang === 'unknown') return false;
  if (detectedLang.toLowerCase() === targetLang) return false;

  return true;
}

/**
 * Handle auto-translation for incoming group message
 * @param {object} m WhatsApp message object
 * @param {object} sock Baileys socket
 * @returns {Promise<boolean>}
 */
export async function handleAutoTranslateMessage(m, sock) {
  try {
    if (!m || !m.isGroup) return false;
    const groupId = m.chat || m.key?.remoteJid;
    if (!groupId) return false;

    if (!shouldTranslate(m, groupId)) return false;

    const config = getAutoTranslateStatus(groupId);
    const targetLang = config.targetLang || 'id';
    const detectedLang = detectLanguage(m.text);

    const translatedText = await translateMessage(m.text, targetLang, detectedLang);
    if (!translatedText) return false;

    // Update rate limit timestamp and save DB
    state[groupId] = {
      ...config,
      lastTranslated: Date.now()
    };
    saveDatabase();

    const langNames = {
      en: 'English', id: 'Indonesian', ja: 'Japanese', ko: 'Korean',
      zh: 'Chinese', ar: 'Arabic', th: 'Thai', ru: 'Russian'
    };

    const srcName = langNames[detectedLang] || detectedLang.toUpperCase();
    const tgtName = langNames[targetLang] || targetLang.toUpperCase();

    const resultMessage = `╭─「 ✦ Auto Translate ✦ 」\n│\n│ • Dari : ${srcName}\n│ • Ke   : ${tgtName}\n│\n${translatedText}\n│\n╰────  •  ────`;
    await m.reply(resultMessage);
    return true;
  } catch (err) {
    console.error('[AutoTranslate] Handle message error:', err.message);
    return false;
  }
}

// Auto-init on load
initAutoTranslate();

export default {
  initAutoTranslate,
  enableAutoTranslate,
  disableAutoTranslate,
  getAutoTranslateStatus,
  detectLanguage,
  translateMessage,
  shouldTranslate,
  setTargetLang,
  handleAutoTranslateMessage
};
