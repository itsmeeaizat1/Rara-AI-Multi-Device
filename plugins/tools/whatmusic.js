// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { downloadMediaMessage } from "nova";
import te from "../../src/lib/rara-error.js";
import raraApi from "../../src/lib/rara-apimanager.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "musikapaini",
  alias: ["musikapaini"],
  category: "tools",
  description: "Identifikasi lagu dari audio",
  usage: ".musikapaini (reply audio)",
  example: ".musikapaini",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

// Upload via engine rara-uploader (Kappa → Pone → Uguu) — termai dilepas 1 Okt 2026
// FIX laten: dulu balikin OBJECT (res.data) padahal call site butuh URL STRING
// (neoxr whatMusic kirim [object Object] ke param url)
import { uploadImage } from "../../src/lib/rara-uploader.js";

async function uploadTo0x0(buffer, filename) {
  return uploadImage(buffer, filename);
}

async function handler(m, { sock }) {
  let audioBuffer = null;
  let filename = "audio.mp3";

  if (m.quoted?.message) {
    const quotedMsg = m.quoted.message;
    const audioMsg = quotedMsg.audioMessage || quotedMsg.documentMessage;

    if (audioMsg) {
      try {
        audioBuffer = await downloadMediaMessage(
          { key: m.quoted.key, message: quotedMsg },
          "buffer",
          {},
        );
        filename = audioMsg.fileName || "audio.mp3";
      } catch (e) { console.error('[whatmusic.js]:', e.message); }
    }
  }

  if (!audioBuffer && m.message) {
    const audioMsg = m.message.audioMessage || m.message.documentMessage;
    if (audioMsg) {
      try {
        audioBuffer = await m.download();
        filename = audioMsg.fileName || "audio.mp3";
      } catch (e) { console.error('[whatmusic.js]:', e.message); }
    }
  }

  if (!audioBuffer) {
    return m.reply(raraWrap("musikapaini", [
      `🎵 *MUsIK APA INI?*`,
      `Identifikasi lagu dari audio`,
      ``,
      `📌 Format:`,
      `Reply audio dengan \`${m.prefix}musikapaini`,
      `Atau kirim audio + caption command`
    ]));
  }
  try {
    await m.react("🕒");
    const audioUrl = await uploadTo0x0(audioBuffer, filename);

    await m.reply(raraWrap("Musikapaini", "🔍 *mengidentifikasi...*\n\nMencari info lagu..."));

    const data = await raraApi.neoxr.whatMusic(
      {
        url: audioUrl,
        apikey: config.APIkey?.neoxr || "Milik-Bot-RaraMD",
      },
      {
        timeout: 60000,
      },
    );

    if (!data?.status || !data?.data) {
      return m.reply(raraWrap("musikapaini", "❌ *gagal*\n\nLagu tidak dikenali atau API error"));
    }

    const music = data.data;
    const links = music.links || {};

    let text = `🎵 *LAGU DITEMUKAN!*\n\n`;
        text += `🎶 Title: ${music.title || "-"}\n`;
    text += `👤 Artist: ${music.artist || "-"}\n`;
    text += `💿 Album: ${music.album || "-"}\n`;
    text += `📅 Release: ${music.release || "-"}\n`;
    text += `---\n\n`;

    const buttons = [];

    if (links.spotify?.track?.id) {
      buttons.push({
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "🎧 Spotify",
          url: `https://open.spotify.com/track/${links.spotify.track.id}`,
        }),
      });
    }

    if (links.youtube?.vid) {
      buttons.push({
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "YouTube",
          url: `https://youtube.com/watch?v=${links.youtube.vid}`,
        }),
      });
    }

    if (links.deezer?.track?.id) {
      buttons.push({
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "🎵 Deezer",
          url: `https://deezer.com/track/${links.deezer.track.id}`,
        }),
      });
    }

    const msgContent = {
      text,
      footer: "🎵 Music Recognition",
      contextInfo: saluranCtx(),
    };

    if (buttons.length > 0) {
      msgContent.interactiveButtons = buttons;
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, msgContent, { quoted: m });
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("musikapaini", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
