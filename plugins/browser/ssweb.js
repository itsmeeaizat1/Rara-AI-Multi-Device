// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch browser) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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

    // kartu info media (batch browser)
    const shotCard = await dlCard("gambar", { buffer: imageBuffer, mime: "image/png" }, [["URL", String(text).slice(0, 40)], ["Mode", mode || "full"]]);
    await sock.sendMedia(m.chat, imageBuffer, shotCard || null, m, {
      type: "image",
    });
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("ssweb", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, ssweb };
