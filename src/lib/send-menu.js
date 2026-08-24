// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// send-menu.js — Reusable helper untuk kirim menu dengan preview card + nav buttons
// Pattern: sendMessage + text + buttons (template type:1) + contextInfo.externalAdReply (thumbnail)
// NO interactiveMessage, NO nativeFlowMessage — pakai template buttons yang support preview card
import fs from 'fs';
import path from 'path';
import { getAssetBuffer, getStaticThumbnail } from './nova-asset-manager.js';

// Load thumbnail kecil (100x100 JPEG) — preview card only, TIDAK tersimpan ke galeri HP
// getStaticThumbnail resize pakai sharp ke 100x100 JPEG quality 50 — cuma untuk externalAdReply preview
let menuThumb = null;
let menuThumbLoaded = false;

async function ensureThumbLoaded() {
  if (menuThumbLoaded) return;
  menuThumbLoaded = true;
  try {
    // Prioritas: getStaticThumbnail (100x100 JPEG) — kecil, tidak tersimpan ke galeri
    menuThumb = await getStaticThumbnail('nova-thumbnail-menu');
    if (!menuThumb) {
      menuThumb = await getStaticThumbnail('nova-thumbnail');
    }
    if (!menuThumb) {
      menuThumb = await getStaticThumbnail('nova');
    }
    if (!menuThumb) {
      // Fallback: direct fs.readFileSync lalu resize manual pakai sharp
      const sharp = (await import('sharp')).default;
      const thumbPath = path.join(process.cwd(), 'assets', 'image', 'menu.jpg');
      if (fs.existsSync(thumbPath)) {
        menuThumb = await sharp(fs.readFileSync(thumbPath))
          .resize(100, 100, { fit: 'cover' })
          .jpeg({ quality: 50 })
          .toBuffer();
      }
    }
    if (menuThumb) {
      console.log('[send-menu] ✅ Thumbnail loaded (100x100 JPEG): ' + menuThumb.length + ' bytes — tidak tersimpan ke galeri');
    } else {
      console.warn('[send-menu] ⚠️ No thumbnail found — preview card will be empty');
    }
  } catch (e) {
    console.error('[send-menu] ❌ Gagal load menu thumbnail:', e.message);
  }
}

/**
 * Kirim menu dengan preview card (externalAdReply) + template buttons.
 *
 * Thumbnail pakai buffer 100x100 JPEG (getStaticThumbnail) — cuma preview card,
 * TIDAK tersimpan ke galeri HP penerima.
 */
export async function sendMenuPreview(sock, m, {
  text,
  footer,
  buttons = [],
  title,
  body,
  sourceUrl,
}) {
  // Pastikan thumbnail 100x100 sudah di-load
  await ensureThumbLoaded();

  const footerText = footer || '❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀';

  const templateButtons = buttons.map((b) => ({
    buttonId: b.id,
    buttonText: { displayText: b.text },
    type: 1,
  }));

  const payload = {
    text: text || '',
    contextInfo: {
      mentionedJid: [m.sender],
      isForwarded: false,
      externalAdReply: {
        title: title || 'Nova AI WhatsApp Bot',
        body: body || 'WhatsApp Multi Device',
        thumbnail: menuThumb,
        sourceUrl: sourceUrl || '',
        mediaType: 1,
        showAdAttribution: false,
        renderLargerThumbnail: true,
      },
    },
  };

  if (footerText) {
    payload.footer = footerText;
  }

  if (templateButtons.length > 0) {
    payload.buttons = templateButtons;
  }

  try {
    return await sock.sendMessage(m.chat, payload, { quoted: m });
  } catch (error) {
    console.error('[send-menu] ❌ sendMessage with buttons gagal:', error.message);

    try {
      const fallbackPayload = {
        text: text || '',
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: title || 'Nova AI WhatsApp Bot',
            body: body || 'WhatsApp Multi Device',
            thumbnail: menuThumb,
            sourceUrl: sourceUrl || '',
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      };
      if (footerText) fallbackPayload.footer = footerText;
      return await sock.sendMessage(m.chat, fallbackPayload, { quoted: m });
    } catch (error2) {
      console.error('[send-menu] ❌ Fallback preview juga gagal:', error2.message);
      return await sock.sendMessage(m.chat, { text: text || '' }, { quoted: m });
    }
  }
}

/**
 * Kirim menu TANPA buttons (cuma teks + preview card).
 */
export async function sendMenuCard(sock, m, {
  text,
  footer,
  title,
  body,
  sourceUrl,
}) {
  return sendMenuPreview(sock, m, {
    text,
    footer,
    title,
    body,
    sourceUrl,
    buttons: [],
  });
}
