// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText, novaWrap } from "../../src/lib/nova-menu-style.js";
import { spawn } from "node:child_process";

const pluginConfig = {
  name: "imagetext", alias: ["imagetext"], category: "tools",
  alias: ["imagetext"],
  description: "Tulis teks di atas gambar", usage: ".imagetext <text> (reply gambar)",
  example: ".imagetext Halo", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = m.text?.trim();
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!text || !quoted) {
      { const __navText = (novaWrap("Image Text", [`Reply gambar dengan: *${prefix}imagetext <teks>*`,
        "Bot akan menulis teks di atas gambar"].join("\n"))); await m.reply( __navText, "imagetext"); };
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar");
    // Simple text overlay using canvas if available, else just return info
    await m.react("🐣");
    await m.reply(novaWrap("Image Text", [`Teks: *${text}*`, "Gambar diterima",
      "Fitur ini butuh package 'canvas' untuk render"].join("\n")) + "\n" + tipText("Install canvas untuk hasil gambar"));
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };