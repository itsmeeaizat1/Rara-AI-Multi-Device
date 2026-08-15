import { claraHeader,  separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import https from "node:https";
import http from "node:http";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "headerscan", alias: ["httpheaders", "headercheck"], category: "tools",
  description: "Scan HTTP headers website", usage: ".headerscan <url>",
  example: ".headerscan https://google.com", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();
    if (!url || !url.startsWith("http")) {
      await sendReplyWithNav(sock, m, claraWrap("Header Scan", [`◦ Penggunaan: *${prefix}headerscan <url>*`,
        `◦ Contoh: *${prefix}headerscan https://google.com*`].join("\n")), "headerscan");
      return { handled: true };
    }
    const mod = url.startsWith("https") ? https : http;
    await new Promise((resolve, reject) => {
      mod.request(url, { method: "HEAD", timeout: 10000 }, (res) => {
        let text = claraWrap("Header Scan", "🔍") + "\n\n" + claraWrap(url, [
          `◦ Status: *${res.statusCode} ${res.statusMessage}*`,
          ...Object.entries(res.headers).slice(0, 12).map(([k,v]) => `◦ ${k}: ${v}`),
        ]) + "\n\n" + separator("━", 22);
        m.reply(claraWrap("headerscan", text)).then(() => resolve());
      }).on("error", reject).end();
    });
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`◦ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };