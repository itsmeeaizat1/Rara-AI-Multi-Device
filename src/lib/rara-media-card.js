// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-media-card.js — Preview card (externalAdReply) untuk pesan media
// Hasil unduhan (video/audio) tampil dengan card: thumbnail asli dari sumber
// + judul + link, kayak link preview. Thumbnail diambil dari API sumber
// (YouTube thumbnail / TikTok cover), bukan file hasil download-nya.

/**
 * Bangun contextInfo.externalAdReply untuk pesan media.
 * @param {object} opts
 * @param {string} opts.title - Judul konten (mis. judul lagu/video)
 * @param {string} [opts.body] - Sub-label card (mis. "YouTube Audio • 320kbps")
 * @param {string} [opts.sourceUrl] - Link sumber (mis. link YouTube/TikTok)
 * @param {string} [opts.thumbnailUrl] - URL thumbnail asli dari API sumber
 * @param {number} [opts.mediaType=1] - 1 = photo preview, 2 = video preview
 * @param {boolean} [opts.renderLarger=false] - Thumbnail besar (hero card)
 * @returns {object} contextInfo siap dipasang di sock.sendMessage
 */
export function mediaPreviewCard({
  title,
  body,
  sourceUrl,
  thumbnailUrl,
  mediaType = 1,
  renderLarger = false,
} = {}) {
  const externalAdReply = {
    title: String(title || "Media").substring(0, 60),
    body: String(body || "Rara AI").substring(0, 45),
    mediaType,
    sourceUrl: sourceUrl || "",
    renderLargerThumbnail: !!renderLarger,
  };
  // thumbnailUrl opsional — kalau gak ada, card tetap muncul tanpa gambar
  if (thumbnailUrl) externalAdReply.thumbnailUrl = thumbnailUrl;
  return { externalAdReply };
}

export default mediaPreviewCard;
