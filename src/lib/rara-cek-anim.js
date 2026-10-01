// RARA CEK ANIM — meter standar + seam kirim hasil keluarga .cek*
// (38 plugin polos yang reply-nya cuma angka random dadakan).
// 13 Sep: sempat animasi morphing ▓░ edit-in-place.
// 14 Sep (owner: "animasi loading ▓░ gak perlu, udah ada loading react
// emoji 🧠/🔍/🛠️ — hapus aja"): morphing DIBUANG. runCekAnim dipertahanin
// sebagai seam biar 38 plugin .cek* gak perlu diubah — sekarang langsung
// kirim kartu hasil. cekMeterBar jadi meter standar ▰▱ (dipakai rara-limit-card).
const METER_W = 10;

export function cekMeterBar(pct) {
  const filled = Math.max(0, Math.min(METER_W, Math.round((pct / 100) * METER_W)));
  return "▰".repeat(filled) + "▱".repeat(METER_W - filled) + " " + pct + "%";
}

/**
 * Kirim kartu hasil langsung (tanpa animasi — loading react emoji urusan handler).
 * @param {object} m pesan handler
 * @param {object} sock (tidak dipakai lagi, pertahanin signature)
 * @param {string} finalText kartu hasil SUDAH jadi (raraWrap(...))
 * @param {object} replyOpts opsi m.reply final (mis. { mentions })
 * @param {object} opts (tidak dipakai lagi)
 */
export async function runCekAnim(m, sock, finalText, replyOpts = {}, opts = {}) {
  await m.reply(finalText, replyOpts);
}
