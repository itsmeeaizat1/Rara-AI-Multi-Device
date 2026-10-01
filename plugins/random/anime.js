// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "nova";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const nexrayTypes = [
  "waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "hug",
  "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet", "blush", "smile",
  "wave", "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill",
  "happy", "wink", "poke", "dance", "cringe"
];

const pluginConfig = {
  name: ["loli", ...nexrayTypes],
  alias: ["loli"],
  category: "random",
  description: "Random gambar anime/reaction (Nexray Source)",
  usage: ".<nama> (lihat daftar di bawah)",
  example: ".waifu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = m.command.toLowerCase();

    if (cmd === "loli") {
      return await sock.sendMessage(
        m.chat,
        {
          image: { url: "https://api.nexray.web.id/random/loli" },
          caption: `👧 *random loli*`,
        },
        { quoted: m },
      );
    }

    if (nexrayTypes.includes(cmd)) {
      const res = await axios.get(`https://api.nexray.eu.cc/random/anime?type=${cmd}`, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res.data);
      const isGif = buffer.length > 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // "GIF"
      
      const media = await prepareWAMessageMedia(
        isGif ? { video: buffer, gifPlayback: true } : { image: buffer },
        { upload: sock.waUploadToServer }
      );
      
      const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              body: { text: `*Random ${cmd.toUpperCase()}*` },
              footer: { text: "Tekan tombol di bawah untuk memuat gambar lain" },
              header: {
                hasMediaAttachment: true,
                ...(isGif ? { videoMessage: media.videoMessage } : { imageMessage: media.imageMessage })
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Lanjut Cari Lagi?",
                      id: `${m.prefix}${cmd}`
                    })
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
                ]
              }
            }
          }
        }
      }, { quoted: m });
      
      return await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    }

  } catch (err) {
    return m.reply(novaWrap("Random Anime", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
