// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// 🔬 .BOTMOOD — Eksperimen pertama Laboratorium (.lab)
// Mood bot dari telemetry NYATA: uptime, kedalaman antrean kirim,
// error eksperimen terakhir — bukan random. Gaya kartu promosi AI.
// Fitur ini TIDAK jalan sebelum eksperimennya dinyalakan:
//   .lab global botmood  (owner)

import { getDatabase } from '../../src/lib/rara-database.js'
import { getQueueDepth } from '../../src/lib/rara-send-queue.js'
import { getLabData } from '../../src/lib/rara-lab.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  command: "botmood",
  alias: ["botmood", "moodbot", "botmungkin"],
  category: "smart",
  description: "Mood bot real-time dari telemetry internal (uptime, antrean, error)",
  usage: '.botmood — kartu mood bot saat ini',
  example: '.botmood',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
  // 🔬 tandai sebagai fitur eksperimen — gate .lab
  experimental: "botmood",
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), mnt = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} jam ${mnt} menit`;
  if (mnt > 0) return `${mnt} menit`;
  return `${s} detik`;
}

function hitungMood(uptimeMs, queue, lastError) {
  if (queue > 20) return { emoji: "🥵", label: "Sibuk Banget", alas: "Antrean kirim numpuk — sabar ya, antri satu-satu biar gak kena banned." };
  if (lastError) return { emoji: "🤕", label: "Baru Saja Tersandung", alas: "Ada error tercatat barusan, tapi tim dokter (plugin health) udah meriksa." };
  if (queue > 5) return { emoji: "😅", label: "Lumayan Sibuk", alas: "Masih antre beberapa pesan, semua kekirim berurutan." };
  if (uptimeMs < 5 * 60 * 1000) return { emoji: "🥱", label: "Baru Bangun", alas: "Bot baru nyala beberapa menit — pemanasan dulu." };
  if (uptimeMs > 3 * 24 * 60 * 60 * 1000) return { emoji: "😤", label: "Lelah Tapi Bertahan", alas: "Uptime udah lewat 3 hari tanpa tidur. Salut." };
  return { emoji: "😄", label: "Santai & Sehat", alas: "Antrean kosong, error bersih, siap kerja." };
}

async function handler(m, extra) {
  const db = (extra && extra.db) || getDatabase();
  const uptimeMs = (extra && extra.uptime) || process.uptime() * 1000;
  let queue = 0;
  try { queue = getQueueDepth() || 0; } catch {}
  let lastError = null;
  try {
    const lab = getLabData(db);
    lastError = lab?.telemetry?.botmood?.lastError || null;
  } catch {}

  const mood = hitungMood(uptimeMs, queue, lastError);

  return m.reply(raraWrap("Mood Bot", [
    `${mood.emoji} *MOOD SAAT INI: ${mood.label.toUpperCase()}*`,
    "",
    mood.alas,
    "",
    `▪ Uptime: ${fmtDuration(uptimeMs)}`,
    `▪ Antrean kirim: ${queue} pesan`,
    `▪ Error eksperimen terakhir: ${lastError || "gak ada"}`,
    "",
    "🔬 Fitur eksperimen aktif — telemetry dibaca langsung dari sistem, bukan random.",
  ]));
}

export default { config: pluginConfig, handler };
