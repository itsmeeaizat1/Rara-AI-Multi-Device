// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import https from "node:https";
import http from "node:http";

const pluginConfig = {
  name: "expandurl", alias: ["unshorten", "urlexpand"], category: "tools",
  alias: ["expandurl"],
  description: "Expand short URL ke URL asli", usage: ".expandurl <url>",
  example: ".expandurl https://bit.ly/xxx", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function expand(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    let current = url; let redirects = 0;
    const follow = (u) => {
      if (redirects++ >= maxRedirects) return resolve({ final: u, redirects });
      const mod = u.startsWith("https") ? https : http;
      mod.request(u, { method: "HEAD", timeout: 10000 }, (res) => {
        if (res.headers.location) { current = new URL(res.headers.location, u).href; follow(current); }
        else resolve({ final: u, redirects, status: res.statusCode });
      }).on("error", () => resolve({ final: u, redirects })).end();
    };
    follow(url);
  });
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();
    if (!url || !url.startsWith("http")) {
      await m.reply( claraWrap("Expand URL", [`│ ❏ Penggunaan: *${prefix}expandurl <url>*`,
        `│ ❏ Contoh: *${prefix}expandurl https://bit.ly/xxx*`].join("\n")), "expandurl");
      return { handled: true };
    }
    const result = await expand(url);
    await m.reply(claraWrap("Expand URL", [`│ ❏ Input: ${url.substring(0,50)}`,
      `│ ❏ Final: ${result.final.substring(0,80)}`,
      `│ ❏ Redirect: *${result.redirects}x*`].join("\n")));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };