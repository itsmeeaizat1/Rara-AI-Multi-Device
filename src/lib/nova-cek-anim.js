// NOVA CEK ANIM — animasi "mengukur" generik untuk keluarga fitur .cek*
// (38 plugin polos yang reply-nya cuma angka random dadakan).
// Request owner 13 Sep 2026: "fitur yg polos dicek trus di variasi agar
// menarik" — batch 2. Morphing edit-in-place 1 pesan:
// 🔍 memeriksa → 🛠️ menganalisis (meter naik-turun bikin penasaran) →
// ⚡ finalisasi → kartu hasil (teks final PERSIS dari plugin, behavior gak
// berubah). Edit gagal → langsung kartu hasil (jangan bikin nunggu).
const METER_W = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function cekMeterBar(pct) {
  const filled = Math.max(0, Math.min(METER_W, Math.round((pct / 100) * METER_W)));
  return "▓".repeat(filled) + "░".repeat(METER_W - filled) + " " + pct + "%";
}

// Meter naik-turun bikin penasaran (naik pelan → dip kecil → naik lagi → mepet)
const FLICKER = [15, 28, 46, 39, 62, 74, 68, 85, 92, 97];

/**
 * Jalankan animasi pengukuran lalu kirim kartu final.
 * @param {object} m pesan handler
 * @param {object} sock
 * @param {string} finalText kartu hasil SUDAH jadi (claraWrap(...))
 * @param {object} replyOpts opsi m.reply final (mis. { mentions })
 * @param {object} opts { subject?: string, emoji?: string }
 */
export async function runCekAnim(m, sock, finalText, replyOpts = {}, opts = {}) {
  const subject = opts.subject || m.command || "kamu";
  const frames = [
    `🔍 memeriksa *${subject}*...`,
    ...FLICKER.map((pct) => `🛠️ menganalisis *${subject}*...\n` + cekMeterBar(pct)),
    `⚡ finalisasi hasil...`,
  ];
  const frameDelay = Number(process.env.NOVACEK_FRAME_MS) || 650;

  // Kartu animasi gak ada → jangan bikin user nunggu, langsung hasil
  if (!sock?.sendMessage) {
    await m.reply(finalText, replyOpts);
    return;
  }

  let key = null;
  try {
    const sent = await sock.sendMessage(m.chat, { text: frames[0] });
    key = sent?.key || null;
  } catch {}

  if (key) {
    for (let i = 1; i < frames.length; i++) {
      await sleep(frameDelay);
      try {
        await sock.sendMessage(m.chat, { text: frames[i], edit: key });
      } catch { key = null; break; }
    }
    await sleep(frameDelay);
  }

  if (!key) {
    // edit gak available → langsung kartu hasil
    await m.reply(finalText, replyOpts);
    return;
  }
  // kartu hasil di-edit ke pesan animasi yang sama (1 pesan utuh)
  try {
    await sock.sendMessage(m.chat, { text: finalText, ...replyOpts, edit: key });
  } catch {
    await m.reply(finalText, replyOpts);
  }
}
