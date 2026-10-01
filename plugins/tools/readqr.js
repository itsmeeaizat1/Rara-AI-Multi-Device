// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "readqr", alias: ["readqr"], category: "tools",
  alias: ["readqr"],
  description: "Baca QR code dari gambar", usage: ".readqr (reply gambar QR)",
  example: ".readqr", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!quoted) {
      { const __navText = (raraWrap("Read QR", [`Reply gambar QR code dengan *${prefix}readqr*`,
        "Bot akan membaca isi QR code"].join("\n"))); await m.reply( __navText, "readqr"); };
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar");
    const base64 = buffer.toString("base64");
    const { data } = await axios.post("https://api.qrserver.com/v1/read-qr-code/", 
      `filebase64=${base64}`, { headers: {"Content-Type":"application/x-www-form-urlencoded"}, timeout: 15000 });
    const result = Array.isArray(data) ? data[0]?.symbol?.[0]?.data : data;
    if (!result) throw new Error("QR tidak terbaca");
    await m.react("🐣");
    await m.reply(raraWrap("Read QR", [`Isi QR: *${result}*`].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraError("Tools", "Gagal nih"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };