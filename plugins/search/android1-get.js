// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "android1-get",
  alias: ["an1get", "an1dl"],
  category: "search",
  description: "Download APK dari Android1",
  usage: ".android1-get <url>",
  example: ".android1-get https://an1.com/xxx",
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
  const url = m.text?.trim();

  if (!url || !url.includes("an1.com")) {
    return m.reply(claraWrap("Android1-get", `❌ URL tidak valid! Harus URL dari an1.com`));
  }

  m.react("🕒");

  try {
    const { data } = await axios.get(
      `https://api.neoxr.eu/api/an1-get?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`,
      {
        timeout: 60000,
      },
    );

    if (!data?.status || !data?.data) {
      throw new Error("Gagal mengambil detail APK");
    }

    const app = data.data;
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";
    if (app.url) {
      await sock.sendMessage(
        m.chat,
        {
          document: { url: app.url },
          fileName: app.name,
          mimetype: "application/vnd.android.package-archive",
          contextInfo: {
            forwardingScore: 0,
            isForwarded: false,
          },
        },
        { quoted: m },
      );

      m.react("✅");
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
          interactiveButtons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Buka di Browser",
                url: url,
              }),
            },
          ],
        },
        { quoted: m },
      );

    }
  } catch (err) {
    console.log(err);
    return m.reply(claraWrap("android1-get", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
