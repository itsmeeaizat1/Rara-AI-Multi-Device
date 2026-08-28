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

  const footerText = footer || '╰─';

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
        title: title || "Nova AI WhatsApp Bot",
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

  // WhatsApp Channel (saluran/newsletter) TIDAK support template buttons
  // (type:1 buttonsMessage) sama sekali — follower akan lihat "Anda menerima
  // info saluran, tetapi versi WhatsApp Anda tidak mendukungnya. Perbarui
  // WhatsApp". Link-preview (externalAdReply) tetap aman dikirim ke channel.
  const isNewsletter = m.chat && m.chat.endsWith("@newsletter");
  if (templateButtons.length > 0 && !isNewsletter) {
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
            title: title || "Nova AI WhatsApp Bot",
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

// === MENU AUDIO SENDER ===
// Kirim musik menu setelah tampilan menu (jika audioMenu aktif)
// allmenuAudioStyle: 1=PTT reply asli, 2=PTT reply fake polling, 3=MP3 reply fake text, 4=MP3 reply fake troli

let _menuAudioPtt = null;   // OGG/Opus buffer untuk VN (ptt: true)
let _menuAudioMp3 = null;   // MP3 buffer untuk audio biasa (ptt: false)
let _menuAudioLoaded = false;

async function ensureMenuAudioLoaded() {
  if (_menuAudioLoaded) return;
  _menuAudioLoaded = true;

  try {
    // Load MP3 buffer
    _menuAudioMp3 = getAssetBuffer('nova-mp3');
    if (!_menuAudioMp3) {
      const p = path.join(process.cwd(), 'assets', 'audio', 'cinta-terbaik-cassandra.mp3');
      if (fs.existsSync(p)) {
        _menuAudioMp3 = fs.readFileSync(p);
      }
    }

    if (_menuAudioMp3) {
      console.log('[send-menu] ✅ Menu audio MP3 loaded: ' + _menuAudioMp3.length + ' bytes');

      // Convert MP3 → OGG/Opus untuk VN (ptt: true)
      // WhatsApp butuh audio/ogg; codecs=opus untuk voice note yang bisa diputar
      try {
        const ffmpegPath = (await import('@ffmpeg-installer/ffmpeg')).default.path;
        const ffmpeg = (await import('fluent-ffmpeg')).default;
        ffmpeg.setFfmpegPath(ffmpegPath);

        _menuAudioPtt = await new Promise((resolve, reject) => {
          const chunks = [];
          const stream = require('stream');
          const passThrough = new stream.PassThrough();

          ffmpeg({ source: path.join(process.cwd(), 'assets', 'audio', 'cinta-terbaik-cassandra.mp3') })
            .format('opus')
            .audioCodec('libopus')
            .audioBitrate('64k')
            .audioFrequency(48000)
            .audioChannels(1)
            .on('error', (err) => {
              console.error('[send-menu] ❌ FFmpeg convert error:', err.message);
              reject(err);
            })
            .on('end', () => {
              const buffer = Buffer.concat(chunks);
              console.log('[send-menu] ✅ Menu audio OGG/Opus converted: ' + buffer.length + ' bytes');
              resolve(buffer);
            })
            .stream(passThrough, { end: true });

          passThrough.on('data', (chunk) => chunks.push(chunk));
        });
      } catch (convErr) {
        console.error('[send-menu] ❌ FFmpeg conversion failed, PTT will use MP3 mimetype:', convErr.message);
        // Fallback: pakai MP3 buffer untuk PTT (mungkin ga bisa diputar tapi setidaknya muncul)
        _menuAudioPtt = _menuAudioMp3;
      }
    } else {
      console.warn('[send-menu] ⚠️ Menu audio not found (nova-mp3 / cinta-terbaik-cassandra.mp3)');
    }
  } catch (e) {
    console.error('[send-menu] ❌ Menu audio load failed:', e.message);
  }
}

/**
 * Kirim audio menu setelah menampilkan menu.
 * @param {Object} sock - Baileys socket
 * @param {Object} m - Message object
 * @param {Object} db - Database instance
 * @param {boolean} isAllMenu - Jika true, gunakan allmenuAudioStyle (varian 1-4)
 */
export async function sendMenuAudio(sock, m, db, isAllMenu = false) {
  try {
    // Cek setting audioMenu (default: true jika belum diset)
    const audioEnabled = db?.setting ? (db.setting('audioMenu') !== false) : true;
    if (!audioEnabled) return;

    await ensureMenuAudioLoaded();

    if (!_menuAudioPtt && !_menuAudioMp3) return;

    // Tentukan mimetype berdasarkan format yang tersedia
    const pttMimetype = _menuAudioPtt && _menuAudioPtt !== _menuAudioMp3
      ? 'audio/ogg; codecs=opus'   // OGG/Opus — VN bisa diputar
      : 'audio/mpeg';              // Fallback MP3 (mungkin bermasalah sebagai PTT)

    // Semua menu (menu, allmenu, menukategori) pakai style yang sama
    // Style 1=PTT reply asli, 2=PTT reply fake polling, 3=MP3 reply fake text, 4=MP3 reply fake troli
    const style = (db?.setting ? db.setting('allmenuAudioStyle') : null) || 1;

    if (style === 1) {
      // PTT Voice Note + reply pesan asli
      await sock.sendMessage(m.chat, {
        audio: _menuAudioPtt,
        ptt: true,
        mimetype: pttMimetype,
      }, { quoted: m });
    } else if (style === 2) {
      // PTT Voice Note + reply fake polling
      const fakeKey = {
        remoteJid: m.chat,
        fromMe: false,
        id: 'FAKE_POLL_' + Date.now(),
        participant: '0@s.whatsapp.net',
      };
      await sock.sendMessage(m.chat, {
        audio: _menuAudioPtt,
        ptt: true,
        mimetype: pttMimetype,
      }, { quoted: { key: fakeKey, message: { pollCreationMessage: { name: 'Nova AI Menu', options: [], selectableOptionsCount: 0 } } } });
    } else if (style === 3) {
      // MP3 biasa + reply fake text
      const fakeKey = {
        remoteJid: m.chat,
        fromMe: false,
        id: 'FAKE_TEXT_' + Date.now(),
        participant: '0@s.whatsapp.net',
      };
      await sock.sendMessage(m.chat, {
        audio: _menuAudioMp3,
        ptt: false,
        mimetype: 'audio/mpeg',
      }, { quoted: { key: fakeKey, message: { conversation: '🎵 Nova AI WhatsApp Bot - Menu Audio' } } });
    } else if (style === 4) {
      // MP3 biasa + reply fake troli order
      const fakeKey = {
        remoteJid: m.chat,
        fromMe: false,
        id: 'FAKE_TROLI_' + Date.now(),
        participant: '0@s.whatsapp.net',
      };
      await sock.sendMessage(m.chat, {
        audio: _menuAudioMp3,
        ptt: false,
        mimetype: 'audio/mpeg',
      }, { quoted: { key: fakeKey, message: { orderMessage: { orderId: 'NOVA-' + Date.now(), thumbnail: null, itemCount: 1, status: 1, surface: 1, message: 'Nova AI WhatsApp Bot', sellerJid: '0@s.whatsapp.net', token: 'nova' } } } });
    }
  } catch (e) {
    console.error('[send-menu] ❌ sendMenuAudio error:', e.message);
  }
}
