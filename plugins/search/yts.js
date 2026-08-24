// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import yts from "yt-search";
import { generateWAMessageFromContent, proto } from "nova";
import axios from "axios";
import sharp from "sharp";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "yts",
  alias: ["ytsearch", "youtubesearch"],
  category: "search",
  description: "Mencari video di YouTube berdasarkan kata kunci dan menampilkan detail lengkap beserta thumbnail.",
  usage: ".yts <query>",
  example: ".yts lagu pop terbaru",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, text }) {
  if (!text) {
    return m.reply( claraWrap("Yts", "❌ *Waduh, kata kuncinya kosong!*\n\nKamu harus memasukkan kata kunci judul video yang ingin dicari ya. \n\nContoh penggunaan: `.yts lagu galau indonesia`"), { commandName: "yts" });
  }

  await m.react("🕒");

  try {
    const searchResults = await yts(text);
    const videos = searchResults.videos;

    if (!videos || videos.length === 0) {
      return m.reply(claraWrap("Yts", "⚠️ *Maaf banget, pencarian tidak menemukan hasil apa pun.* \n\nMungkin kata kuncinya terlalu spesifik. Coba gunakan kata kunci lain yang lebih umum ya!"));
    }

    const firstVideo = videos[0];

    const imageResponse = await axios.get(firstVideo.thumbnail, { responseType: "arraybuffer" });
    const thumbnailBuffer = await sharp(imageResponse.data).resize(300, 170).jpeg().toBuffer();

    const contentText = `✨ *ʜᴀꜱɪʟ ᴘᴇɴᴄᴀʀɪᴀɴ ʏᴏᴜᴛᴜʙᴇ* ✨

Halo! Ini dia hasil pencarian teratas yang aku temukan berdasarkan kata kunci yang kamu berikan. 

🔎 *ᴋᴀᴛᴀ ᴋᴜɴᴄɪ ᴘᴇɴᴄᴀʀɪᴀɴ*: ${text}
🎬 *ᴊᴜᴅᴜʟ ᴠɪᴅᴇᴏ*: ${firstVideo.title}
📺 *ɴᴀᴍᴀ ᴄʜᴀɴɴᴇʟ*: ${firstVideo.author.name}
⏱️ *ᴅᴜʀᴀꜱɪ ᴠɪᴅᴇᴏ*: ${firstVideo.timestamp}
👁️ *ᴊᴜᴍʟᴀʜ ᴘᴇɴᴏɴᴛᴏɴ*: ${firstVideo.views} views
📅 *ᴡᴀᴋᴛᴜ ᴅɪᴜɴɢɢᴀʜ*: ${firstVideo.ago}
🔗 *ᴛᴀᴜᴛᴀɴ ᴠɪᴅᴇᴏ*: ${firstVideo.url}

*ᴄᴀᴛᴀᴛᴀɴ ᴛᴀᴍʙᴀʜᴀɴ*: Thumbnail dari video ini sudah aku sematkan di bagian atas pesan (peta lokasi) sesuai permintaanmu. Keren kan? 😎

Pilih salah satu tombol di bawah ini untuk langsung mengunduh hasil video atau audio-nya!`;

    const content = {
      buttonsMessage: {
        buttons: [
          {
            buttonId: `.ytmp4 ${firstVideo.url}`,
            buttonText: { displayText: '🎥 Unduh Video' },
            type: 1,
          },
          {
            buttonId: `.ytmp3 ${firstVideo.url}`,
            buttonText: { displayText: '🎵 Unduh Audio' },
            type: 1,
          },
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
          name: firstVideo.title,
          address: `📺 Channel: ${firstVideo.author.name} | ⏱️ Durasi: ${firstVideo.timestamp}`
        },
        contentText: contentText,
        footerText: '🚀 NOVA MD - Asisten Setiamu',
        headerType: 6,
      },
    };

    const msg = generateWAMessageFromContent(m.chat, content, {
      quoted: m,
    });

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    await m.react("🐣");

  } catch (error) {
    console.error(error);
    m.reply(claraWrap("yts", "😔 *Aduh, sepertinya ada masalah di sistemku.* \n\nTerjadi kesalahan saat mencoba mencari video tersebut di YouTube. Mohon tunggu beberapa saat dan coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };