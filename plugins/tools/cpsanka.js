// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "cpsanka",
  alias: ["cpsanka"],
  category: "tools",
  description: "Random anime couple (cowo & cwe) image",
  usage: ".cpsanka",
  example: ".cpsanka",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const url = `${API_BASE}/anime/cp?apikey=${API_KEY}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.status) {
      throw new Error(res.data?.message || "API error");
    }

    const { cowo_url, cwe_url } = res.data.result;

    // Download both images
    const [cowoRes, cweRes] = await Promise.all([
      axios.get(cowo_url, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true }),
      axios.get(cwe_url, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true }),
    ]);

    if (cowoRes.status !== 200 || cweRes.status !== 200) {
      throw new Error("Gagal download gambar");
    }

    const cowoBuf = Buffer.from(cowoRes.data);
    const cweBuf = Buffer.from(cweRes.data);

    // Send cowo image
    let cowoCard = "";
    try {
      const info = await probeBuffer(cowoBuf);
      cowoCard = mediaResultCard({
        header: "cpsanka",
        type: "gambar",
        request: [["Bagian", "cowo"]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    await sock.sendMessage(m.chat, {
      image: cowoBuf,
      caption: (cowoCard || "Anime Couple (Cowo)"),
    }, { quoted: m });

    // Send cwe image
    let cweCard = "";
    try {
      const info = await probeBuffer(cweBuf);
      cweCard = mediaResultCard({
        header: "cpsanka",
        type: "gambar",
        request: [["Bagian", "cwe"]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: cweBuf,
      caption: (cweCard || "Anime Couple (Cewe)"),
    });
  } catch (e) {
    await m.react("❌");
    console.error("[CPSANKA] Error:", e.message);
    let txt = `Gagal mengambil couple image!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(raraWrap("cpsanka", txt));
  }
}

export { pluginConfig as config, handler };
