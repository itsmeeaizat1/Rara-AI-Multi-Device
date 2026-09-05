// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  claraHeader,  separator, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import https from "node:https";
import http from "node:http";

const pluginConfig = {
  name: "headerscan", alias: ["headerscan"], category: "tools",
  alias: ["headerscan"],
  description: "Scan HTTP headers website", usage: ".headerscan <url>",
  example: ".headerscan https://google.com", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const url = m.text?.trim();
    if (!url || !url.startsWith("http")) {
      await m.reply( novaCaption({
  emoji: "🛠️",
  name: "headerscan",
  description: "Scan HTTP headers website",
  usage: `${prefix}headerscan <url>`,
  example: `${prefix}headerscan https://google.com`,
}), "headerscan");
      return { handled: true };
    }
    const mod = url.startsWith("https") ? https : http;
    await new Promise((resolve, reject) => {
      mod.request(url, { method: "HEAD", timeout: 10000 }, (res) => {
        let text = claraWrap("Header Scan", "🔍") + "\n\n" + claraWrap(url, [
          `Status: *${res.statusCode} ${res.statusMessage}*`,
          ...Object.entries(res.headers).slice(0, 12).map(([k,v]) => `${k}: ${v}`),
        ]);
        m.react("🐣");
        m.reply(text, "headerscan").then(() => resolve());
      }).on("error", reject).end();
    });
  } catch (e) {
    await m.react("❌");
    await m.reply(novaError("Tools", "Gagal nih"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };