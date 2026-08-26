// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "apkmod-get",
  alias: ["apkmod-get", "apkmodget", "getapkmod"],
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

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

async function handler(m, { sock }) {
  const args = m.args || [];
  const no = parseInt(args[0]);
  const query = args.slice(1).join(" ");

  if (!no || !query) {
    { const __navText = `❌ Format: \`${m.prefix}apkmod-get <no> <query>\``; return await m.reply( __navText, "apkmod-get"); };
  }

  m.react("🕒");

  try {
    const { data } = await axios.get(
      `https://api.neoxr.eu/api/apkmod?q=${encodeURIComponent(query)}&no=${no}&apikey=${NEOXR_APIKEY}`,
      {
        timeout: 60000,
      },
    );

    if (!data?.status || !data?.data) {
      throw new Error("Gagal mengambil detail APK");
    }

    const app = data.data;
    const file = data.file;

    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

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

      m.react("🐣");
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
    return m.reply(claraWrap("apkmod-get", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
