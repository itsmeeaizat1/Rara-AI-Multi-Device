// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeMedia } from "../../src/lib/rara-media-result.js";
const pluginConfig = {
  name: "apkmod-get",
  alias: ["apkmod-get", "apkmod"],
  category: "search",
  description: "Download APK MOD dari hasil pencarian",
  usage: ".apkmod-get <no> <query>",
  example: ".apkmod-get 1 vpn",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

async function handler(m, { sock }) {
  const args = m.args || [];
  const no = parseInt(args[0]);
  const query = args.slice(1).join(" ");

  if (!no || !query) {
    return m.reply(raraGuide("ApkModGet", "Format-nya salah nih!", m.prefix + "apkmod-get <no> <query>"));
  }
  try {
    const { data } = await axios.get(
      `https://api.neoxr.eu/api/apkmod?q=${encodeURIComponent(query)}&no=${no}&apikey=${NEOXR_APIKEY}`,
      {
        timeout: 60000,
      },
    );

    if (!data?.status || !data?.data) {
      throw new Error("Gagal ambil detail APK nih");
    }

    const app = data.data;
    const file = data.file;

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    if (file?.url) {
      await sock.sendMessage(
        m.chat,
        {
          document: { url: file.url?.trim() },
          fileName: file.filename || `${app.name}.apk`,
          mimetype: "application/vnd.android.package-archive",
          contextInfo: {
            forwardingScore: 0,
            isForwarded: false,
          },
        },
        { quoted: m },
      );
      const info = mediaResultCard({ header: "APKMod", title: file.filename || app.name, type: "aplikasi", ext: "apk", ...(await probeMedia(file.url?.trim())) });
      if (info) await m.reply(info);
    } else {
      let caption = `⚠️ Download URL tidak tersedia`;
      await sock.sendMessage(
        m.chat,
        {
          text: caption,
          contextInfo: {
            forwardingScore: 0,
            isForwarded: false,
          },
        },
        { quoted: m },
      );

    }
  } catch (err) {
    return m.reply(raraWrap("apkmod-get", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
