// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { sendToolsPreview } from "../../src/lib/rara-context.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "pastebin",
  alias: ["pastebin"],
  category: "tools",
  description: "Upload teks ke Pastebin",
  usage: ".pastebin <text>",
  example: '.pastebin console.log("Hello World")',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let text = m.args.join(" ");

  if (m.quoted?.text) {
    text = m.quoted.text;
  }

  if (!text) {
    return m.reply(raraWrap("pastebin", [
      `📋 *pastebin upload*`,
      `Kirim teks untuk di-upload ke Pastebin.`,
      ``,
      `📌 Format:`,
      `${m.prefix}pastebin <text>`,
      `Reply teks dengan \`${m.prefix}pastebin`,
      `Contoh: \`${m.prefix}pastebin console.log("Hello")`
    ]));
  }

  const api_dev_key = "h9WMT2Mn9QW-qDhvUSc-KObqAYcjI0he";
  const api_paste_code = text.trim();
  const api_paste_name = `Paste dari ${m.pushName || "User"} - ${new Date().toLocaleDateString("id-ID")}`;

  const data = new URLSearchParams({
    api_dev_key,
    api_option: "paste",
    api_paste_code,
    api_paste_name,
    api_paste_private: "1",
  });

  try {
    await m.react("🕒");
    const res = await axios.post(
      "https://pastebin.com/api/api_post.php",
      data.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );

    const url = res.data;

    if (url.startsWith("Bad API request")) {
      { const __navText = `❌ *gagal*\n\n${url}`;       await m.react("🐣");
return await m.reply(__navText); };
    }

    const responseText =
      `✅ *pastebin berhasil*\n\n` +
      `📝 JUDUL: *${api_paste_name}*\n` +
      `📊 UKURAN: *${text.length} chars*\n` +
      `🔗 LINK: ${url}\n` +
      `\n` +
      `Paste akan expired sesuai pengaturan Pastebin.`;
    await sendToolsPreview(
      sock,
      m.chat,
      responseText,
      "Pastebin Upload",
      api_paste_name,
      { quoted: m },
    );
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("pastebin", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
