// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  generateWAMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from "nova";
import te from "../../src/lib/nova-error.js";
import { f } from "../../src/lib/nova-http.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pap",
  alias: ["pap", "papcewe", "papcowo", "papfemboy"],
  category: "search",
  description: "Minta pap cewe, cowo, atau femboy dari Pinterest",
  usage: ".pap <cewe/cowo/femboy>",
  example: ".pap cewe",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const arg = m.args[0]?.toLowerCase();
  const validTypes = ["cewe", "cowo", "femboy"];

  if (!arg || !validTypes.includes(arg)) {
    return m.reply( claraWrap("Pap", "❌ Pilih salah satu tipe pap yang tersedia: `cewe`, `cowo`, atau `femboy`.\n\nContoh: `.pap cewe`"), { commandName: "pap" });
  }

  await m.react("🕒");

  try {
    const query = arg;
    
    const data = await f(
      `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`
    );

    const results = data?.data;
    if (!results || results.length === 0) {
      return m.reply(claraWrap("Pap", `❌ Waduh, pap ${query} lagi kosong nih. Coba lagi nanti.`));
    }

    const randomItem = results[Math.floor(Math.random() * results.length)];
    const imageUrl = randomItem.image_url;

    if (!imageUrl) {
      return m.reply(claraWrap("Pap", "⚠️ Gambar tidak tersedia."));
    }

    const mediaMessage = await prepareWAMessageMedia({
      image: { url: imageUrl }
    }, { upload: sock.waUploadToServer });

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {},
          interactiveMessage: {
            header: {
              title: "",
              subtitle: "",
              hasMediaAttachment: true,
              imageMessage: mediaMessage.imageMessage
            },
            footer: {
              text: "Pilih menu pap lainnya di bawah ini 👇"
            },
            body: {
              text: `📸 *PAP ${arg.toUpperCase()}*`
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🔁 Next",
                    id: `${m.prefix}pap ${arg}`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "👧 Cewe",
                    id: `${m.prefix}pap cewe`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "👦 Cowo",
                    id: `${m.prefix}pap cowo`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "⚧ Femboy",
                    id: `${m.prefix}pap femboy`
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
    }, { quoted: m, userJid: sock.user.jid });

    await sock.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    });

    await m.react("🐣");

  } catch (error) {
    console.error("[PAP Search]", error.message);
    m.reply(claraWrap("pap", "😔 Gagal memuat PAP. Server Pinterest mungkin sedang bermasalah."));
  }
}

export { pluginConfig as config, handler };
