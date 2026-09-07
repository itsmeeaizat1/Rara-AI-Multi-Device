// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import moment from "moment-timezone";
import axios from "axios";
import { createRequire } from "module";
import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "iqc",
  alias: ["iqc"],
  category: "canvas",
  description: "Membuat gambar chat iPhone/Android style (2 varian)",
  usage: ".iqc android/iphone <text>",
  example: ".iqc iphone Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

/**
 * Mode android — render via API nexray (alur lama, tetep jalan).
 */
async function renderAndroid(text, time) {
  const apiUrl = `https://api.nexray.eu.cc/maker/v1/iqc?text=${encodeURIComponent(text)}&provider=INDOSAT&jam=${encodeURIComponent(time)}&baterai=100`;

  const res = await axios.get(apiUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.headers["content-type"]?.includes("image")) {
    throw new Error("Gagal bikin IQC nih, format bukan gambar");
  }

  return Buffer.from(res.data);
}

/**
 * Mode iphone — render LOKAL via package iqc-canvas (iPhone style ala
 * nixxiqc.vercel.app: bubble chat iPhone + reaction bar + context menu),
 * tanpa ketergantungan API pihak ketiga.
 * Kalau user reply pesan, pesan itu jadi block reply di gambar.
 */
async function renderIphone(text, time, m) {
  // Lazy require — iqc-canvas CJS, gak bisa di-import ESM langsung
  const require = createRequire(import.meta.url);
  const { generateIQC } = require("iqc-canvas");

  const options = {};
  if (m.quoted?.text) {
    const sender =
      m.quoted.pushName ||
      (m.quoted.sender ? String(m.quoted.sender).split("@")[0] : null) ||
      "Anda";
    options.reply = {
      sender: String(sender).slice(0, 30),
      text: String(m.quoted.text).trim().slice(0, 120),
    };
  }

  const result = await generateIQC(text, time, options);
  if (!result?.success || !result?.image) {
    throw new Error(result?.message || "Render IQC iPhone gagal");
  }
  return result.image;
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const first = String(args[0] || "").toLowerCase();

  // .iqc tanpa argumen → usage 2 varian
  if (!args.length) {
    return m.reply(
      novaGuide(
        "iqc",
        "Bikin gambar chat mockup, ada 2 varian",
        `${m.prefix}iqc android <text> — mockup chat android\n${m.prefix}iqc iphone <text> — mockup chat iphone (reply pesan = jadi block reply)`
      )
    );
  }

  let mode = "android"; // default: teks tanpa mode = android (backward compat)
  let text = m.args.join(" ");
  if (first === "android" || first === "iphone") {
    mode = first;
    text = args.slice(1).join(" ");
  }

  if (!text.trim()) {
    return m.reply(
      novaGuide(
        "iqc",
        `Mode ${mode} dipilih tapi teksnya kosong`,
        `${m.prefix}iqc ${mode} Hai cantik`
      )
    );
  }

  try {
    await m.react("🕒");

    const now = new Date();
    const time = moment(now).tz("Asia/Jakarta").format("HH:mm");

    let buffer;
    let caption = "*ɪqᴄ ᴄʜᴀᴛ*";

    if (mode === "iphone") {
      try {
        buffer = await renderIphone(text, time, m);
        caption = "*ɪqᴄ ᴄʜᴀᴛ — ɪᴘʜᴏɴᴇ*";
      } catch (err) {
        // Render lokal gagal (misal dependensi belum ke-instal di VPS) →
        // fallback ke mode android biar user tetap dapat gambar.
        console.error("[IQC] iphone fallback ke android:", err.message);
        buffer = await renderAndroid(text, time);
        caption = "*ɪqᴄ ᴄʜᴀᴛ* (ɪᴘʜᴏɴᴇ ꜱᴇᴅᴀɴɢ ᴅɪᴘᴇʀʙᴀɪᴋ, ᴘᴀᴋᴀɪ ᴀɴᴅʀᴏɪᴅ)";
      }
    } else {
      buffer = await renderAndroid(text, time);
    }

    await m.react("🐣");

    // Dikirim sebagai gambar biasa (bukan stiker) — hasilnya mockup screenshot
    // chat iPhone/Android yang portrait, akan gepeng/rusak kalau dipaksa jadi stiker 512x512
    await sock.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
  } catch (error) {
    console.error("[IQC]", error.message);
    await m.react("❌");
    m.reply(novaError("IQC", "Gagal bikin gambar chat nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
