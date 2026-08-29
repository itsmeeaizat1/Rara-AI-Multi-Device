// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import _sharp from 'sharp'
import { upload, get } from "../../src/scraper/hd.js";
import axios from "axios";
import config from "../../config.js";

function getSharp() {
  return _sharp;
}
import FormData from "form-data";
import path from "path";
import fs from "fs";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "hd2tool",
  alias: ["hd2tool", "hd2"],
  category: "tools",
  description: "Enhance gambar menjadi HD dengan AI (V3)",
  usage: ".hd2 (reply gambar)",
  example: ".hd2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};
async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  if (!isImage) {
    return m.reply( `✨ *HD ENHANCE V2*\n\nKirim/reply gambar untuk di-enhance\n\n\`${m.prefix}hd2\`\n\n🕕 Proses membutuhkan waktu ±1 menit`, "hd2");
  }
  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }
    if (!buffer) {
      return m.reply(claraWrap("hd2tool", `❌ Gagal mendownload gambar`));
    }
    const temp = path.join(process.cwd(), "temp", "hd.jpg");
    fs.writeFileSync(temp, buffer);
    const codes = await upload(temp);
    fs.unlinkSync(temp);
    const uplot = codes.code;
    await new Promise((resolve) => setTimeout(resolve, 10000));
    let result = await get(uplot);
    while (result.status === "waiting") {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      result = await get(uplot);
    }
    if (!result) {
      return m.reply(claraWrap("hd2tool", `❌ Gagal enhance gambar. Coba lagi nanti.`));
    }
    await sock.sendMessage(
      m.chat,
      {
        document: { url: result.downloadUrls[0] },
        mimetype: "image/png",
        jpegThumbnail: await (
          await getSharp()
        )(
          await axios
            .get(result.downloadUrls[0], { responseType: "arraybuffer" })
            .then((res) => Buffer.from(res.data)),
        )
          .resize(50, 50)
          .jpeg({ quality: 30 })
          .toBuffer(),
        fileLength: 99999999999999,
        fileName: `CONVERTED BY ${config.bot.name}`,
      },
      { quoted: m },
    );
  } catch (error) {
    m.reply(claraWrap("hd2tool", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
