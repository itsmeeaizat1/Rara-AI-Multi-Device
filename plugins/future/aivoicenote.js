// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aivoicenote", alias: ["aivoicenote", "aivoicenote2", "transcribe2"], category: "future",
  description: "Transcribe voice note jadi text", usage: ".aivoicenote (reply voice note)",
  example: ".aivoicenote", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const quoted = m.quoted || m.msg?.contextInfo?.quotedMessage;
    if (!quoted) {
      await sendReplyWithNav(sock, m, claraWrap("AI Voice Note", ["  ┊  ➶ Reply voice note/audio dengan command ini",
        "  ┊  ➶ Bot akan transcribe jadi text"].join("\n")), "aivoicenote");
      return { handled: true };
    }
    const buffer = await m.download();
    if (!buffer) throw new Error("Gagal download audio");
    await m.reply(claraWrap("aivoicenote", "_🎙️ Transcribing... mohon tunggu_"));
    const { data } = await axios.post("https://api.assemblyai.com/v2/upload", buffer, {
      headers: { "Content-Type": "application/octet-stream" }, timeout: 30000,
    });
    // Use free transcription API
    await m.reply(claraWrap("AI Voice Note", ["  ┊  ➶ Audio diterima", "  ┊  ➶ Transcribe membutuhkan API key AssemblyAI",
      "  ┊  ➶ Fitur ini butuh konfigurasi tambahan"].join("\n")));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };