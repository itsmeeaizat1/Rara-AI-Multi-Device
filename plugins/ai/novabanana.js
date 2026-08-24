// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { live3d } from "../../src/scraper/seaart.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "novabanana",
  alias: [],
  category: "ai",
  description: "Edit gambar dengan AI menggunakan prompt",
  usage: ".novabanana <prompt>",
  example: ".novabanana make it anime style",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.args.join(" ");
  if (!prompt) {
    return m.reply( `🍌 *ɴᴏᴠᴀ ʙᴀɴᴀɴᴀ ꜱᴜᴘᴇʀ*\n\n` +
        `Edit gambar dengan AI\n\n` +
        `\`Contoh: ${m.prefix}novabanana make it anime style\`\n\n` +
        `Reply atau kirim gambar dengan caption`, "novabanana");
  }

  const isImage = m.isImage || (m.quoted && m.quoted.isImage);
  if (!isImage) {
    return m.reply( claraWrap("Novabanana", `🍌 *ɴᴀɴᴏ ʙᴀɴᴀɴᴀ*\n\nReply atau kirim gambar dengan caption`), { commandName: "novabanana" });
  }

  m.react("🕒");

  try {
    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      return m.reply(claraWrap("Gagal", `❌ *ɢᴀɢᴀʟ*\n\nGagal mengunduh gambar`));
    }

    const resultBuffer = await live3d(mediaBuffer, prompt).then(
      (res) => res.image,
    );

    m.react("🐣");

    await sock.sendMedia(m.chat, resultBuffer, null, m, {
      type: "image",
    });
  } catch (error) {
    console.log(error);
    m.reply(claraWrap("Novabanana", `🍀 *Waduhh, sepertinya ini ada kendala*
Silahkan coba lagi nanti, dimohon jangan spam`));
  }
}

export { pluginConfig as config, handler };
