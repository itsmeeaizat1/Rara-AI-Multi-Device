// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { scSearch } from "./soundcloud.js";
import scdl from "../../src/scraper/soundclouddl.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "playsoundcloud",
  alias: ["playsoundcloud", "playsc"],
  category: "search",
  description: "Cari dan download lagu dari SoundCloud",
  usage: ".playsc judul",
  example: ".playsc Only We Know",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { args, sock }) {
  if (!args[0]) {
    let txt = `🎶 *ᴘʟᴀʏ ꜱᴏᴜɴᴅᴄʟᴏᴜᴅ* 🎶\n\n`;
    txt += `Halo kak! Pengen dengerin lagu dari SoundCloud? Aku bisa cariin sekalian downloadin format MP3-nya buat kamu!\n\n`;
    txt += `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n`;
    txt += `👉 \`${m.prefix}playsc <judul lagu>\`\n\n`;
    txt += `*ᴄᴏɴᴛᴏʜ:*\n`;
    txt += `\`${m.prefix}playsc Only We Know\``;
    return await m.reply(claraWrap("playsoundcloud", txt));
  }
  try {
    const searchResults = await scSearch(args.join(" "));
    if (!searchResults.length) {
      return m.reply(novaError("PlaySoundcloud", "Lagunya gak nemu nih! Coba judul lain ya"));
    }

    const track = searchResults[0];
    const downloadInfo = await scdl(track.url);
    let contentTxt = `🎵 *ᴊᴜᴅᴜʟ :* ${downloadInfo.title}\n`;
    contentTxt += `👤 *ᴜᴘʟᴏᴀᴅᴇʀ :* ${downloadInfo.uploader}\n`;
    contentTxt += `⏱️ *ᴅᴜʀᴀꜱɪ :* ${downloadInfo.duration}\n`;
    contentTxt += `👁️ *ᴠɪᴇᴡꜱ :* ${downloadInfo.views}\n`;
    contentTxt += `❤️ *ʟɪᴋᴇꜱ :* ${downloadInfo.likes}\n`;
    contentTxt += `📦 *ᴜᴋᴜʀᴀɴ :* ${downloadInfo.size}`;

    let txt = `🎉 *ʙᴇʀʜᴀꜱɪʟ ᴅᴏᴡɴʟᴏᴀᴅ ʟᴀɢᴜ!* 🎉\n\n`;
    txt += contentTxt.trim().split("\n").map(line => `${line}`).join("\n");
    txt += `\n\n`;
    txt += `_Audio MP3 sedang dikirim, ditunggu ya kak!_ 🎶`;

    await sock.sendMedia(m.chat, downloadInfo.thumbnail || track.artwork, txt.trim(), m, { type: "image" });
    await sock.sendMedia(m.chat, downloadInfo.download_url, downloadInfo.title, m, { type: "audio" });
  } catch (e) {
    m.reply(novaError("PlaySoundcloud", `Gagal download lagu nih: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
