// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { uploadTo0x0 } from "../../src/lib/nova-tmpfiles.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "fakeff",
  alias: ["fakeff"],
  category: "canvas",
  description: "Membuat gambar ff",
  usage: ".fakeff <text>",
  example: ".fakeff Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const nama = m.text;
  if (!nama) {
    { const __navText = claraWrap("FAKE FF", `💡 *Contoh:* ${m.prefix}fakeff nama1`); return await m.reply(__navText, "fakeff"); };
  }
  try {
    await m.react("🕒");
    await sock.sendMedia(
      m.chat,
      `https://api.nexray.web.id/maker/fakelobyff?nickname=${encodeURIComponent(nama)}`,
      null,
      m,
      {
        type: "image",
      },
    );
    await m.react("🐣");
  } catch (error) {
    await m.react("❌");
    m.reply(claraWrap("fakeff", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
