// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ssweb",
  alias: ["screenshot", "ss", "webss"],
  category: "tools",
  description: "Screenshot website",
  usage: ".ssweb <url>",
  example: ".ssweb https://google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function ssweb(url, mode = "desktop") {
  const width = mode === "mobile" ? 720 : 1920;
  const apiUrl = `https://image.thum.io/get/width/${width}/crop/1080/noanimate/${url}`;
  const res = await axios.get(apiUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

async function handler(m, { sock }) {
  let text = m.text?.trim();

  if (!text) {
    return sendReplyWithNav(sock, m, `📸 *sCREENsHOT WEB*\n\n` +
        `Screenshot halaman website\n\n` +
        `*Contoh:*\n` +
        `${m.prefix}ssweb https://google.com\n` +
        `${m.prefix}ss https://github.com --mobile`, "ssweb");
  }

  let mode = "desktop";
  if (text.includes("--mobile") || text.includes("--hp")) {
    mode = "mobile";
    text = text.replace(/--mobile|--hp/g, "").trim();
  }

  if (!text.startsWith("http")) {
    text = "https://" + text;
  }

  await m.react("🕐");

  try {
    const imageBuffer = await ssweb(text, mode);

    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    await sock.sendMedia(m.chat, imageBuffer, null, m, {
      type: "image",
    });

    await m.react("✅");
  } catch (error) {
    m.reply(claraWrap("ssweb", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, ssweb };
