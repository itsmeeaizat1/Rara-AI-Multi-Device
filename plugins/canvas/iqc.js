// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import moment from "moment-timezone";
import axios from "axios";
import { novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "iqc",
  alias: ["iqc"],
  category: "canvas",
  description: "Membuat gambar chat iPhone style",
  usage: ".iqc <text>",
  example: ".iqc Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(claraWrap("Iqc Chat", `📱 *ɪqᴄ ᴄʜᴀᴛ*\n\nMasukkan teks untuk chat\n\n\`Contoh: ${m.prefix}iqc Hai cantik\``), "iqc");
  }
  try {
    await m.react("🕒");

    const now = new Date();
    const time = moment(now).tz("Asia/Jakarta").format("HH:mm");

    const apiUrl = `https://api.nexray.eu.cc/maker/v1/iqc?text=${encodeURIComponent(text)}&provider=INDOSAT&jam=${encodeURIComponent(time)}&baterai=100`;

    const res = await axios.get(apiUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status !== 200 || !res.headers["content-type"]?.includes("image")) {
      throw new Error("Gagal bikin IQC nih, format bukan gambar");
    }

    const cardBuffer = Buffer.from(res.data);
    await m.react("🐣");

    // Dikirim sebagai gambar biasa (bukan stiker) — hasilnya mockup screenshot
    // chat iPhone/Android yang portrait, akan gepeng/rusak kalau dipaksa jadi stiker 512x512
    await sock.sendMessage(
      m.chat,
      { image: cardBuffer, caption: "*ɪqᴄ ᴄʜᴀᴛ*" },
      { quoted: m }
    );
  } catch (error) {
    console.error("[IQC]", error.message);
    await m.react("❌");
    m.reply(novaError("IQC", "Gagal bikin gambar chat nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
