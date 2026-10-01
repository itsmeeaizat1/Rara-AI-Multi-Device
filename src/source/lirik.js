// RARA SKILL PACK — LIRIK LAGU (12 Sep 2026)
// Cari lirik lagu lewat scraper LRCLIB existing (spotify-lyrics.js) —
// pola retry ladder-nya kepake (lagu cover/alternatif tetep ketemu).
// Skill pack: ke-load otomatis registerSkillPacks.

import { getLyrics } from "../scraper/spotify-lyrics.js";

// seam buat e2e (tanpa network)
let lirikFn = getLyrics
export function _setLirikFn(fn) { lirikFn = fn || getLyrics }

const stripLrc = (t) => String(t || "").replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim()

const skill = {
  name: "lirik",
  desc: "CARI LIRIK lagu (teks lagu lengkap) — pakai kalau user minta 'lirik lagu X'. judul = judul lagu (boleh sekalian nama penyanyi)",
  args: ["judul"],
  perm: "user",
  danger: false,
  async run(conn, m, a) {
    const judul = (typeof a === "string" ? a : String(a?.judul || "")).trim()
    if (!judul || judul.length < 2) throw new Error("judul lagunya mana? contoh: lirik komang raisa")
    const r = await lirikFn(judul)
    if (!r?.status || (!r.plainLyrics && !r.syncedLyrics)) {
      throw new Error(`lirik "${judul}" gak ketemu — coba sekalian nama penyanyinya, contoh: lirik komang raisa`)
    }
    const teks = stripLrc(r.plainLyrics || r.syncedLyrics)
    const meta = `🎵 ${r.trackName || judul}${r.artistName ? " — " + r.artistName : ""}`
    const body = teks.length > 3500 ? teks.slice(0, 3500) + "\n…(kepotong, liriknya panjang)" : teks
    await conn.sendMessage(m.chat, { text: meta + "\n\n" + body }, { quoted: m })
  },
}
export default skill
