// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { generateWAMessageFromContent } from "nova";
import sharp from "sharp";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "spotify",
  alias: ["spotify", "spotifysearch", "spsearch"],
  category: "search",
  description: "Mencari daftar lagu di Spotify berdasarkan judul atau artis",
  usage: ".spotify <query>",
  example: ".spotify neffex grateful",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, text }) {
  if (!text) {
    return m.reply( claraWrap("Spotify", "❌ *Waduh, kata kuncinya mana nih?*\n\nKamu harus memasukkan judul lagu atau nama artis yang ingin dicari di Spotify. \n\nContoh penggunaan: `.spotify bruno mars`"), { commandName: "spotify" });
  }

  await m.react("🕒");

  try {
    const res = await axios.get(`https://api.cuki.biz.id/api/search/spotify?apikey=${config.APIkey.cuki}&query=${encodeURIComponent(text)}&limit=5`);
    const data = res.data;

    if (!data.status || !data.data || !data.data.results || data.data.results.length === 0) {
      return m.reply(claraWrap("spotify", `⚠️ *Maaf, lagu tidak ditemukan!* \n\nAku sudah mencari dengan kata kunci *${text}* tapi tidak ada hasil di Spotify. Coba gunakan judul yang lebih spesifik ya.`));
    }

    const results = data.data.results;
    const firstResult = results[0];

    let contentText = `✨ *ʜᴀꜱɪʟ ᴘᴇɴᴄᴀʀɪᴀɴ ꜱᴘᴏᴛɪꜰʏ* ✨\n\nHalo! Aku berhasil menemukan beberapa lagu berdasarkan kata kunci *${text}*. Berikut adalah daftar teratasnya:\n\n`;

    results.forEach((t, i) => {
      contentText += `*${i + 1}. ${t.title}*\n`;
      contentText += `   🎤 Artis: ${t.artist}\n`;
      contentText += `   ⏱️ Durasi: ${t.duration}\n`;
      contentText += `   🔗 Link: ${t.url}\n\n`;
    });

    contentText += `*ᴄᴀᴛᴀᴛᴀɴ*: Kamu bisa menyalin link lagu di atas dan menggunakan perintah \`.spdl <link>\` untuk mengunduhnya secara langsung! Atau tekan tombol di bawah ini untuk lagu pertama. 🚀`;

    let thumbnailBuffer = null;
    try {
      const imageResponse = await axios.get(firstResult.thumb, { responseType: "arraybuffer" });
      thumbnailBuffer = await sharp(imageResponse.data).resize(300, 170).jpeg().toBuffer();
    } catch (e) {
    }

    if (thumbnailBuffer) {
      const content = {
        buttonsMessage: {
          buttons: [
            {
              buttonId: `.spdl ${firstResult.url}`,
              buttonText: { displayText: '🎵 Unduh Lagu Pertama' },
              type: 1,
            }
          ,
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Kembali",
                id: m.prefix + "menu"
              })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Tanya AI",
                id: m.prefix + "aihelp"
              })
            }
          ],
          locationMessage: {
            jpegThumbnail: thumbnailBuffer,
            name: firstResult.title,
            address: `🎤 ${firstResult.artist} | ⏱️ ${firstResult.duration}`
          },
          contentText: contentText,
          footerText: '🚀 NOVA MD - Spotify Search',
          headerType: 6,
        },
      };

      const msg = generateWAMessageFromContent(m.chat, content, { quoted: m });
      await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    } else {
      await m.reply(contentText);
    }

    await m.react("🐣");

  } catch (err) {
    console.error("[Spotify Search]", err.message);
    m.reply(claraWrap("spotify", "😔 *Aduh, sepertinya API sedang bermasalah.* \n\nTerjadi kesalahan fatal saat mencoba memproses pencarian Spotify. Silakan coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };
