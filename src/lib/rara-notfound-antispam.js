// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Smart anti-spam untuk "command not found" suggestion
// Progressive escalation: makin sering spam, makin lama cooldown + response berubah

import config from "../../config.js";

// --- State ---
// Track per-user: array of timestamps dari unknown command terakhir
const spamTracker = new Map(); // sender -> [{ time, cmd }]
// Track per-user: level escalation
const escalationMap = new Map(); // sender -> { level, lastReply, expiresAt }

// --- Config ---
const WINDOW_MS = 60000; // 1 menit window untuk hitung spam
const BASE_COOLDOWN_MS = (config.features?.commandSuggestionCooldown || 5) * 1000;
const MAX_TRACK = 20; // max entries simpan per user

/**
 * Record unknown command dari user, return decision object:
 * { shouldReply, cooldownMs, level, totalHits, isSpamming, suggestionText }
 */
export function trackNotFound(sender, command) {
  const now = Date.now();
  const key = sender;

  // Baca config dynamically (bisa diubah saat runtime oleh owner)
  const smartEnabled = config.features?.commandSuggestionSmart !== false;
  const baseCooldown = (config.features?.commandSuggestionCooldown || 5) * 1000;

  // Ambil history user
  let history = spamTracker.get(key) || [];
  // Filter hanya yang dalam window
  history = history.filter((h) => now - h.time < WINDOW_MS);
  // Tambah entry baru
  history.push({ time: now, cmd: command });
  // Cap size
  if (history.length > MAX_TRACK) history = history.slice(-MAX_TRACK);
  spamTracker.set(key, history);

  // Hitung level berdasarkan frequency dalam window
  const hitsInWindow = history.length;
  let level = 0;
  let cooldownMs = baseCooldown;

  if (smartEnabled) {
    // Progressive escalation: makin sering spam, makin lama cooldown
    if (hitsInWindow <= 2) {
      level = 0;
      cooldownMs = baseCooldown;
    } else if (hitsInWindow <= 4) {
      level = 1;
      cooldownMs = baseCooldown * 2;
    } else if (hitsInWindow <= 7) {
      level = 2;
      cooldownMs = baseCooldown * 4;
    } else if (hitsInWindow <= 12) {
      level = 3;
      cooldownMs = baseCooldown * 8; // bot diam
    } else {
      level = 4;
      cooldownMs = baseCooldown * 12; // AI smart response
    }
  } else {
    // Smart OFF — cooldown statis, selalu level 0
    level = 0;
    cooldownMs = baseCooldown;
  }

  // Cek escalation state
  let esc = escalationMap.get(key);
  if (!esc || now > esc.expiresAt) {
    esc = { level: level, lastReply: 0, expiresAt: now + WINDOW_MS };
  }
  esc.level = level;
  escalationMap.set(key, esc);

  // Cek cooldown: kalau belum lewat cooldown, skip reply
  if (now - esc.lastReply < cooldownMs) {
    return { shouldReply: false, cooldownMs, level, totalHits: hitsInWindow };
  }

  esc.lastReply = now;
  escalationMap.set(key, esc);

  return { shouldReply: true, cooldownMs, level, totalHits: hitsInWindow };
}

/**
 * Generate reply berdasarkan level
 * Level 0: normal suggestion (mungkin maksudmu X)
 * Level 1: warning singkat + suggestion
 * Level 2: annoyed — kasih tahu user untuk pakai .menu
 * Level 3: ignore (shouldReply=false, tidak sampai sini)
 * Level 4: AI smart response
 */
export function getNotFoundReply(prefix, command, closest, level, totalHits) {
  // Jika smart OFF, selalu pakai level 0 reply
  const smartEnabled = config.features?.commandSuggestionSmart !== false;
  if (!smartEnabled) level = 0;

  if (level === 0) {
    // Normal
    let text = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D\n";
    text += "\u2502 Command *" + prefix + command + "* tidak ditemukan\n";
    if (closest) {
      text += "\u2502 Mungkin maksudmu: *" + prefix + closest + "* ?\n";
    }
    text += "\u2502\n";
    text += "\u2502 \u{1F4A1} Ketik *" + prefix + "tanyaai* untuk tanya AI\n";
    text += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";
    return text;
  }

  if (level === 1) {
    // Warning
    let text = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D\n";
    text += "\u2502 \u26A0 Kamu sudah salah ketik " + totalHits + "x dalam 1 menit\n";
    text += "\u2502 Command *" + prefix + command + "* tidak ditemukan\n";
    if (closest) {
      text += "\u2502 Mungkin: *" + prefix + closest + "*\n";
    }
    text += "\u2502\n";
    text += "\u2502 \u{1F4A1} Cek *" + prefix + "menu* untuk daftar lengkap\n";
    text += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";
    return text;
  }

  if (level === 2) {
    // Annoyed
    let text = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D\n";
    text += "\u2502 \u26A0 Sudah " + totalHits + "x command tidak ditemukan!\n";
    text += "\u2502 Tolong cek *" + prefix + "menu* dulu ya\n";
    text += "\u2502\n";
    text += "\u2502 \u{1F4A1} Atau tanya *" + prefix + "tanyaai* \u2014 AI bantu cari\n";
    text += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";
    return text;
  }

  if (level === 4) {
    // AI smart — tell user to use tanyaai
    let text = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D\n";
    text += "\u2502 \u{1F6A2} Kamu mengirim " + totalHits + " command salah!\n";
    text += "\u2502 Bot tidak mengenal command tersebut.\n";
    text += "\u2502\n";
    text += "\u2502 \u{1F4A1} Daripada tebak-tebakan, langsung tanya AI:\n";
    text += "\u2502 *" + prefix + "tanyaai* <apa yang kamu cari>\n";
    text += "\u2502\n";
    text += "\u2502 Atau cek daftar: *" + prefix + "menu*\n";
    text += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";
    return text;
  }

  // Default (should not reach here)
  return null;
}

/**
 * Cek apakah user sedang di-mute (level 3 = ignore total)
 */
export function isNotFoundMuted(sender) {
  const esc = escalationMap.get(sender);
  if (!esc) return false;
  const now = Date.now();
  if (now > esc.expiresAt) {
    escalationMap.delete(sender);
    return false;
  }
  return esc.level >= 3 && esc.level < 4;
}

/**
 * Reset tracker untuk user (dipanggil saat user berhasil execute command valid)
 */
export function resetNotFoundTracker(sender) {
  spamTracker.delete(sender);
  escalationMap.delete(sender);
}

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupNotFoundTracker() {
  const now = Date.now();
  for (const [key, history] of spamTracker) {
    const filtered = history.filter((h) => now - h.time < WINDOW_MS);
    if (filtered.length === 0) {
      spamTracker.delete(key);
    } else {
      spamTracker.set(key, filtered);
    }
  }
  for (const [key, esc] of escalationMap) {
    if (now > esc.expiresAt) {
      escalationMap.delete(key);
    }
  }
}

// Auto-cleanup setiap 5 menit
setInterval(cleanupNotFoundTracker, 5 * 60 * 1000);
