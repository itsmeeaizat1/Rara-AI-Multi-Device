// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-tiktok-format.js — SATU PINTU caption hasil fitur TikTok downloader
// Request owner 19 Sep 2026: "tiktok jga ada filed ini cntoh kyk jdul video,
// durasi, view, like, komentar, share, pencipta, download sd/hd trgantung
// fitur bsa sd doang apa hd" — contoh:
//   *TikTok Downloader*
//   📝 *Judul:* black hair harga mati🤞 ...
//   👤 *Uploader:* Zyachen
//   🔗 *Username:* @disappo_1nted
//   ⏱️ *Durasi:* 00:20
//   👁️ *Views:* 720,329
//   ❤️ *Likes:* 188,939
//   💬 *Komentar:* 753
//   🔄 *Share:* 13,432
//   ⬇️ *Download:* HD
// Dipakai: .tiktok, .tiktok2, .tiktokv3, .tiktokv4, .ttvideo (tiktokmedia).
// Field kosong → baris dilewati (urutan tetap). Download: HD/SD tergantung
// kemampuan engine yang dipakai fitur tsb (bukan klaim asal).

/**
 * Angka → format ribuan koma ala contoh owner (720,329).
 * String yang udah berformat (mis. "720.329" gaya Indonesia atau "720,329")
 * dinormalisasi dulu supaya konsisten.
 */
export function fmtNum(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    return Math.round(v).toLocaleString("en-US");
  }
  const raw = String(v).replace(/[.,\s]/g, "");
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return String(v); // teks non-angka → apa adanya
  return n.toLocaleString("en-US");
}

/**
 * Durasi → "mm:ss" zero-padded ("00:20"). Detik (20/160) atau string
 * "00:20"/"0:20" diterima.
 */
export function fmtTiktokDuration(sec) {
  if (sec === null || sec === undefined || sec === "") return "";
  const s = typeof sec === "string" ? sec.trim() : String(sec);
  if (/^\d+:\d{1,2}$/.test(s)) {
    const [mm, ss] = s.split(":").map((x) => parseInt(x, 10));
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || n <= 0) return ""; // 0 detik / sampah → baris dilewati
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

/**
 * Bangun caption TikTok sesuai format owner.
 * @param {object} p — { title, uploader, username, duration, views, likes,
 *   comments, shares, download } — download: "HD"/"SD"/"HD/SD"
 * @returns {string}
 */
export function tiktokCaption({
  header = "TikTok Downloader",
  title, uploader, username, duration, views, likes, comments, shares, download,
} = {}) {
  const handle = (() => {
    const u = String(username || "").trim();
    if (!u || u === "-") return "";
    return u.startsWith("@") ? u : `@${u}`;
  })();

  const lines = [
    `*${String(header).trim() || "TikTok Downloader"}*`,
    "",
    title ? `📝 *Judul:* ${String(title).trim()}` : "",
    uploader ? `👤 *Uploader:* ${String(uploader).trim()}` : "",
    handle ? `🔗 *Username:* ${handle}` : "",
    duration ? `⏱️ *Durasi:* ${fmtTiktokDuration(duration)}` : "",
    views ? `👁️ *Views:* ${fmtNum(views)}` : "",
    likes ? `❤️ *Likes:* ${fmtNum(likes)}` : "",
    comments ? `💬 *Komentar:* ${fmtNum(comments)}` : "",
    shares ? `🔄 *Share:* ${fmtNum(shares)}` : "",
    download ? `⬇️ *Download:* ${String(download).trim()}` : "",
  ].filter(Boolean);

  // pisah header dari field (blank line setelah "TikTok Downloader")
  const head = lines[0];
  const body = lines.slice(1);
  return body.length ? `${head}\n\n${body.join("\n")}` : head;
}
