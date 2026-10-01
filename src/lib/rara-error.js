// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-error.js — Plain text error template (no box decoration)
import config from '../../config.js'

function te(prefix, command, pushName, err) {
  // REQUEST OWNER 14 Sep 2026: AI satuan gak ada fallback lintas-AI — kalau
  // AI-nya down / API key expired, PESAN ERROR ASLI wajib kelihatan ke user
  // (bukan template generik), biar jelas AI-nya kenapa.
  if (err) {
    const raw = String(err?.message || err).replace(/\s+/g, " ").trim().replace(/^Error:\s*/i, "");
    return `❌ Gagal: .${command || '?'} mengalami error: ${raw.slice(0, 180) || 'penyebab gak diketahui'}. Coba lagi nanti`
  }
  return `❌ Gagal: .${command || '?'} mengalami error, coba lagi nanti`
}

export default te
