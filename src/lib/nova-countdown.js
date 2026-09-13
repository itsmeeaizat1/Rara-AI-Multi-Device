// NOVA COUNTDOWN ENGINE — LIVE TICKER edit-in-place (request owner 13 Sep
// 2026: "cek fitur lain yg masih biasa aja kyk td fitur .afk g ada
// countdown" — kartu fitur jangan polos statis doang, durasi/sisa waktu
// harus HIDUP nge-tick kayak timer beneran).
// Mode:
//   "down" — countdown menuju targetTs (reminder/alarm): "⏳ tersisa 04:59"
//   "up"   — count-up sejak sinceTs (AFK): "⏱️ durasi 2 menit 3 detik"
// Strategi edit (jaga kuota edit WhatsApp, gak spam):
//   - sisa waktu ≤ 31 dtk → tick TIAP DETIK sampai waktunya habis
//   - fase "wow" awal → 10 tick pertama tiap detik biar kerasa hidup
//   - sisa ≤ 5 menit → tick tiap 30 dtk; sisanya tiap 1 menit
//   - total edit dibatasi maxEdits (default 24) → kartu final statis
//     ("akan berbunyi HH:MM") — timer panjang gak nge-junk ribuan edit
//   - edit gagal (device lama) → ticker berhenti diam, kartu tetep ada

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Format sisa waktu live: "04:59" (mm:ss) / "1:04:33" (h:mm:ss) /
 * "2 hari 04 jam". Untuk countdown.
 */
export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  if (total >= 86400) {
    return `${Math.floor(total / 86400)} hari ${String(Math.floor((total % 86400) / 3600)).padStart(2, "0")} jam`;
  }
  const h = Math.floor(total / 3600);
  const mnt = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}:${String(mnt).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(mnt).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Jeda tick berikutnya — adaptif (lihat strategi di atas). */
function nextDelay({ remainingMs, editsDone }) {
  if (remainingMs <= 31000) return 1000;          // detik-detik terakhir: per detik
  if (editsDone < 10) return 1000;               // fase wow awal: per detik
  if (remainingMs <= 5 * 60 * 1000) return 30000; // dekat: per 30 dtk
  return 60000;                                  // jauh: per menit
}

/**
 * runLiveTicker — kirim kartu + edit-in-place sampai selesai/berhenti.
 * @param {object} o
 * @param {object} o.sock         Baileys socket
 * @param {string} o.chat         jid chat
 * @param {object} o.m            message m (fallback kirim pesan kalau edit mati)
 * @param {string} o.initialCard  teks kartu pertama (kirim sebagai pesan baru)
 * @param {Function} o.tickCard  (state) => teks kartu tiap tick —
 *   state = { now, remainingMs, elapsedMs }
 * @param {Function} [o.finalCard] (state) => teks kartu penutup statis
 *   (dipakai kalau ticker berhenti sebelum waktunya — sisa waktu lama)
 * @param {"down"|"up"} o.mode    countdown (targetTs) / count-up (sinceTs)
 * @param {number} [o.targetTs]   mode "down": epoch target (alarm/reminder)
 * @param {number} [o.sinceTs]    mode "up": epoch mulai (AFK)
 * @param {number} [o.upRunMs]    mode "up": berapa lama tick (default 12000)
 * @param {number} [o.maxEdits]   kuota edit (default 24)
 * @returns {Promise<{key: object|null, edits: number, finished: boolean}>}
 */
export async function runLiveTicker(o) {
  const {
    sock, chat, m,
    initialCard, tickCard, finalCard = null,
    mode = "down",
    targetTs = 0, sinceTs = 0,
    upRunMs = 12000,
    maxEdits = 24,
    isCancelled = null, // (opsional) () => boolean — batasin ticker kapan aja (mis. sesi di-stop)
  } = o || {};

  // kirim kartu awal sebagai pesan baru + simpan key buat edit
  let key = null;
  try {
    const sent = await sock.sendMessage(chat, { text: initialCard });
    key = sent?.key || null;
  } catch {}
  if (!key && m?.reply) { await m.reply(initialCard); }

  let edits = 0;
  let finished = false;
  let cancelled = false; // dibatalkan dari luar (isCancelled)

  const state = (now = Date.now()) => ({
    now,
    remainingMs: mode === "down" ? Math.max(0, Number(targetTs) - now) : 0,
    elapsedMs: mode === "up" ? Math.max(0, now - Number(sinceTs)) : 0,
  });

  try {
    while (edits < maxEdits) {
      const st = state();
      // berhenti kalau mode down udah sampai waktunya / mode up masa tick abis
      const done = mode === "down" ? st.remainingMs <= 0 : st.elapsedMs >= upRunMs;
      if (done) { finished = true; break; }

      if (isCancelled && isCancelled()) { cancelled = true; break; }

      const delay = mode === "down"
        ? nextDelay({ remainingMs: st.remainingMs, editsDone: edits })
        : Math.min(1000, Math.max(200, upRunMs - st.elapsedMs));
      await sleep(delay);
      if (isCancelled && isCancelled()) { cancelled = true; break; } // dibatalin pas mid-sleep

      edits++;
      if (!key) break; // edit gak available → gak usah junk pesan baru
      try {
        await sock.sendMessage(chat, { text: tickCard(state()), edit: key });
      } catch {
        break; // edit gagal → kartu terakhir tetep tampil, cukup sampai sini
      }
    }

    // kartu penutup: habis waktunya (finished) → tickCard terakhir (detik 0);
    // kehabisan kuota edit → finalCard statis biar info tetep lengkap
    if (key) {
      const st = state();
      const closing = cancelled
        ? (finalCard ? finalCard(st) : tickCard(st))
        : finished || !finalCard
          ? tickCard({ ...st, remainingMs: 0 })
          : finalCard(st);
      try { await sock.sendMessage(chat, { text: closing, edit: key }); } catch {}
    }
  } catch {}

  return { key, edits, finished };
}
