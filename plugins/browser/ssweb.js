// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ssweb",
  alias: ["ssweb"],
  category: "browser",
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
    return m.reply(raraGuide("ssweb", {
 kaomoji: "(≧▽≦)",
 sapaan: "tangkap layar website jadi gambar? gas! (ᵔ◡ᵔ)",
      cara: "tempel link webnya sesudah command, opsi --mobile buat tampilan HP",
      contoh: `${m.prefix}ssweb https://google.com · ${m.prefix}ss https://github.com --mobile`,
      note: "hasilnya langsung jadi foto halaman web tersebut",
      spec: ["⏱ 15dtk", "💸 gratis"],
    }));
  }

  let mode = "desktop";
  if (text.includes("--mobile") || text.includes("--hp")) {
    mode = "mobile";
    text = text.replace(/--mobile|--hp/g, "").trim();
  }

  if (!text.startsWith("http")) {
    text = "https://" + text;
  }
  try {
    await m.react("🕒");
    const imageBuffer = await ssweb(text, mode);

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    await sock.sendMedia(m.chat, imageBuffer, null, m, {
      type: "image",
    });
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("ssweb", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, ssweb };
