// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gsmarena2.js — GSM Arena v2 (siputzx API, no npm dependency)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "gsmarena2",
  alias: ["gsmarena2", "gsm2", "hp2"],
  category: "search",
  description: "Cari spesifikasi HP di GSMArena v2 (siputzx API)",
  usage: ".gsmarena2 <nama hp>",
  example: ".gsmarena2 samsung galaxy s25",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const query = m.args.join(" ").trim();
    if (!query) {
      return m.reply(raraWrap("gsmarena2", `Cari HP apa?\n\nContoh: ${m.prefix}gsmarena2 samsung galaxy s25`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.siputzx.my.id/api/s/gsmarena?query=${encodeURIComponent(query)}`, {
      timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.data && !data.result)) {
      await m.react("❌");
      return m.reply(raraWrap("gsmarena2", `HP "${query}" tidak ditemukan.`, "error"));
    }

    const r = data.data || data.result || data;
    await m.react("🐣");

    let msg = "";
    if (r.name || r.title) msg += `Nama: *${r.name || r.title}*\n`;
    if (r.brand) msg += `Brand: *${r.brand}*\n`;
    if (r.url) msg += `URL: ${r.url}\n`;
    msg += `
`;

    // Spec sections
    if (r.specs) {
      const specs = r.specs;
      for (const [category, items] of Object.entries(specs)) {
        msg += `*${category}*\n`;
        if (Array.isArray(items)) {
          items.forEach(it => {
            if (typeof it === "object" && it.name && it.value) {
              msg += `${it.name}: ${it.value}\n`;
            } else if (typeof it === "string") {
              msg += `${it}\n`;
            }
          });
        } else if (typeof items === "object") {
          for (const [k, v] of Object.entries(items)) {
            msg += `${k}: ${v}\n`;
          }
        }
        msg += `
`;
      }
    } else {
      // Flat keys
      for (const [k, v] of Object.entries(r)) {
        if (["name", "brand", "title", "url", "image", "thumbnail"].includes(k)) continue;
        msg += `${k}: ${v}\n`;
      }
    }
    
    const imgUrl = r.image || r.thumbnail || r.img;
    if (imgUrl && imgUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        const imgBuf = Buffer.from(imgRes.data);
        const card = await dlCard("gambar", { buffer: imgBuf }, [["HP", String(r.name || r.title || query).slice(0, 40)], ["Brand", String(r.brand || "-")]]);
        return await sock.sendMessage(m.chat, { image: imgBuf, caption: card ? `${card}\n\n${msg}` : msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("gsmarena2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("gsmarena2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
