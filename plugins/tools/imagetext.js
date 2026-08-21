// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { spawn } from "node:child_process";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "imagetext", alias: ["textonimage", "captionimage"], category: "tools",
  description: "Tulis teks di atas gambar", usage: ".imagetext <text> (reply gambar)",
  example: ".imagetext Halo", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim();
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!text || !quoted) {
      { const __navText = (claraWrap("Image Text", [`╎❏ Reply gambar dengan: *${prefix}imagetext <teks>*`,
        "╎❏ Bot akan menulis teks di atas gambar"].join("\n"))); await sendReplyWithNav(sock, m, __navText, "imagetext"); };
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download gambar");
    // Simple text overlay using canvas if available, else just return info
    await m.reply(claraWrap("Image Text", [`╎❏ Teks: *${text}*`, "╎❏ Gambar diterima",
      "╎❏ Fitur ini butuh package 'canvas' untuk render"].join("\n")) + "\n" + tipText("Install canvas untuk hasil gambar"));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };