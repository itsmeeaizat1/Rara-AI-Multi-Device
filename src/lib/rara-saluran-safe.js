// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// rara-saluran-safe.js — Sanitasi payload buat WhatsApp Channel (saluran/newsletter)
//
// REQUEST OWNER 14 Sep 2026: "kirim pesan ke saluran auto convert tanpa tombol
// — kenapa di channel WA gak support VN, muncul 'pesan whatsapp tidak didukung'
// pas dikirim musik menu".
//
// AKAR MASALAH: WhatsApp Channel TIDAK support pesan interaktif (template
// buttons type:1, interactiveMessage, nativeFlowMessage, listMessage/sections)
// dan TIDAK support QUOTED FAKE (reply ke pesan fake polling/troli/text yang
// digenerate bot). Kirim macam itu ke saluran → follower lihat
// "Pesan WhatsApp tidak didukung / Perbarui WhatsApp".
//
// Yang AMAN di saluran: text, image/video/audio (PTT VN polos, TANPA quoted),
// document, contextInfo.externalAdReply (preview card).
//
// Sanitizer ini jadi SATU TITIK PUSAT: semua jalur kirim ke saluran tinggal
// lewat sini — payload yang gak support otomatis dikonversi versi polosnya.
// ═════════════════════════════════════════════

/**
 * Cek apakah jid adalah saluran (newsletter).
 * @param {string} jid
 */
export function isSaluranJid(jid) {
  return typeof jid === "string" && jid.endsWith("@newsletter");
}

/**
 * Sanitasi payload buat saluran — auto-convert versi polos:
 * - buttons / footer-buttons (template type:1) → dibuang, caption/teks tetap
 * - sections / listMessage → dibuang
 * - interactiveMessage / nativeFlowMessage / templateMessage → dibuang
 * - externalAdReply tetap dipertahankan (aman di saluran)
 *
 * Payload gak di-mutasi (copy shallow dulu biar caller gak kena side-effect).
 * @param {object} payload payload sendMessage Baileys
 * @returns {object} payload aman saluran
 */
export function sanitizeForSaluran(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const p = { ...payload };

  // 1. tombol template type:1 + footer interaktif → buang (teks tetap kekirim)
  delete p.buttons;
  delete p.footer;
  delete p.title;

  // 2. list / section menu → buang (isinya udah ada di text utama)
  delete p.sections;
  delete p.listType;
  delete p.description;
  delete p.buttonText;
  delete p.singleSelectEligible;

  // 3. pesan interaktif native flow → buang
  delete p.interactiveMessage;
  delete p.interactiveResponseMessage;
  delete p.nativeFlowMessage;
  delete p.templateMessage;
  delete p.productListMessage;
  delete p.productMessage;

  // 4. contextInfo.externalAdReply AMAN di saluran — dipertahankan;
  //    quoted fake ditangani di level options (sendSaluranSafe).
  return p;
}

/**
 * Kirim payload ke saluran dengan auto-convert aman:
 * 1. payload disanitasi (tombol/interaktif dibuang)
 * 2. options.quoted dibuang (saluran gak support quoted, apalagi fake quote)
 * 3. kalau kirim gagal → retry versi paling polos (media tetap, sisanya buang)
 *
 * @param {object} sock   socket Baileys
 * @param {string} jid    jid saluran (…@newsletter)
 * @param {object} payload payload sendMessage
 * @param {object} [options] options sendMessage (quoted dsb)
 * @returns hasil sock.sendMessage
 */
export async function sendSaluranSafe(sock, jid, payload, options = {}) {
  if (!isSaluranJid(jid)) {
    return sock.sendMessage(jid, payload, options);
  }
  const clean = sanitizeForSaluran(payload);
  // quoted di saluran = sumber "pesan tidak didukung" — dibuang total
  const cleanOpts = { ...options };
  delete cleanOpts.quoted;

  try {
    return await sock.sendMessage(jid, clean, cleanOpts);
  } catch {
    // retry versi lebih polos: buang contextInfo (preview card kadang nyendat)
    const bare = { ...clean };
    delete bare.contextInfo;
    try {
      return await sock.sendMessage(jid, bare, cleanOpts);
    } catch {
      // fallback terakhir: text polos doang (caption media jadi teks)
      const text = clean.text || clean.caption || "";
      if (!text) throw new Error("sendSaluranSafe: semua format gagal & tanpa teks");
      return await sock.sendMessage(jid, { text }, cleanOpts);
    }
  }
}

/**
 * Sanitasi VN/audio buat saluran — PTT polos TANPA quoted/fake-quote/contextInfo
 * (penyebab "whatsapp tidak didukung" pas musik menu dikirim ke channel).
 * @param {object} payload { audio, ptt, mimetype, ... }
 * @returns {object} payload audio aman saluran
 */
export function sanitizeAudioForSaluran(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return {
    audio: payload.audio,
    ptt: payload.ptt !== false,
    mimetype: payload.mimetype || "audio/ogg; codecs=opus",
  };
}
