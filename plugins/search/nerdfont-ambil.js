// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import _sharp from 'sharp'
import axios from "axios";
import * as cheerio from "cheerio";

function getSharp() {
  return _sharp;
}
import te from "../../src/lib/rara-error.js";
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

async function nerdfonts() {
  try {
    const { data } = await axios.get(
      "https://www.nerdfonts.com/font-downloads",
    );
    const $ = cheerio.load(data);
    const result = [];
    $("div.item").each((_, rynn) => {
      const name = $(rynn).find("span.nerd-font-invisible-text").text().trim();
      const textContent = $(rynn).find("div").first().text();
      const version =
        textContent.match(/Version:\s*([^\n\r]+)/)[1].trim() || null;
      const info = textContent.match(/Info:\s*([^\n\r]+)/)[1].trim() || null;
      const preview_image =
        "https://www.nerdfonts.com" +
          $(rynn)
            .find("a.font-preview")
            .attr("style")
            .match(
              /background-image\s*:\s*url\s*\(\s*['"]?([^'"]+)['"]?\s*\)/i,
            )[1] || null;
      const preview_url =
        $(rynn).find("a.nf-oct-link_external").attr("href") || null;
      const download_url = $(rynn).find("a.nf-fa-download").attr("href");
      if (name && download_url) {
        result.push({
          name,
          version,
          info,
          preview_image,
          preview_url,
          download_url,
        });
      }
    });
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
}
const pluginConfig = {
  name: "nerdfont-ambil",
  alias: ["nerdfont-ambil", "nerdfont"],
  category: "search",
  description: "Cari font di DaFont",
  usage: ".nerdfont-ambil <query>",
  example: ".nerdfont-ambil Coolvetica",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
function formatNumber(num) {
  const n = parseInt(num);
  if (isNaN(n)) return num;
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}
async function handler(m, { sock }) {
  const query = m.text?.trim()?.toLowerCase();
  if (!query)
    { const __navText = raraWrap("NERD FONT", `Masukan nama font yang ingin didownload`); return await m.reply(__navText); };
  try {
    const res = await nerdfonts();
    const data = res.find(
      (d, i) => d?.name.toLowerCase() === query.toLowerCase(),
    );
    const docCard = await dlCard("dokumen", { url: data.download_url }, [["Font", String(data.name || query).slice(0, 40)], ["Versi", String(data.version || "-")]]);
    sock.sendMessage(m.chat, {
      document: { url: data.download_url },
      fileName: data.name,
      mimetype: "application/zip",
      jpegThumbnail: await (
        await getSharp()
      )(
        await axios
          .get(data.preview_image, { responseType: "arraybuffer" })
          .then((res) => Buffer.from(res.data)),
      )
        .resize(50, 50)
        .toBuffer(),
      caption: docCard || `*done*\nJika kamu ingin mendownload lagi, ketik ${m.prefix}nerdfont lagi`,
    });
  } catch (err) {
    return m.reply(raraWrap("nerdfont-ambil", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
