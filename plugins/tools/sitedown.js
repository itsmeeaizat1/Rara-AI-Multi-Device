// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sitedown",
  alias: ["sitedown"],
  category: "tools",
  description: "Cek apakah website online atau down (status code + response time)",
  usage: ".sitedown <url>",
  example: ".sitedown google.com  atau  .sitedown https://github.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function checkSite(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const start = Date.now();

  try {
    const res = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
    });

    const elapsed = Date.now() - start;
    return {
      online: true,
      statusCode: res.status,
      statusText: res.statusText,
      responseTime: elapsed,
      finalUrl: res.url,
      redirected: res.redirected,
      server: res.headers.get("server") || "N/A",
      contentType: res.headers.get("content-type") || "N/A",
    };
  } catch (e) {
    const elapsed = Date.now() - start;
    return {
      online: false,
      error: e.message,
      responseTime: elapsed,
    };
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "sitedown <url>\n\n" +
        "Cek apakah website online atau down\n" +
        "Info: status code, response time, server, redirect\n\n" +
        "Contoh:\n" +
        prefix + "sitedown google.com\n" +
        prefix + "sitedown https://github.com",
        { title: "Site Down Checker" }
      );
    }

    const url = text.trim();
    const result = await checkSite(url);

    if (result.online) {
      const statusLabel = result.statusCode >= 200 && result.statusCode < 300
        ? "ONLINE (" + result.statusCode + ")"
        : result.statusCode >= 300 && result.statusCode < 400
        ? "REDIRECT (" + result.statusCode + ")"
        : result.statusCode >= 400 && result.statusCode < 500
        ? "CLIENT ERROR (" + result.statusCode + ")"
        : "SERVER ERROR (" + result.statusCode + ")";

      const lines = [
        "Status: " + statusLabel,
        "Response: " + result.responseTime + "ms",
        "Server: " + result.server,
        "Content-Type: " + (result.contentType || "N/A"),
        "Redirect: " + (result.redirected ? "Yes" : "No"),
      ];

      if (result.redirected) {
        lines.push("Final URL: " + (result.finalUrl.length > 60 ? result.finalUrl.substring(0, 60) + "..." : result.finalUrl));
      }
      return m.reply(claraWrap("Site Check: " + url.replace(/^https?:\/\//, ""), lines.join("\n")));
    } else {
      return m.reply(claraWrap("Site Check: " + url.replace(/^https?:\/\//, ""), [
        "Status: DOWN",
        "Error: " + result.error,
        "Time: " + result.responseTime + "ms",
      ].join("\n")));
    }
  } catch (e) {
    console.error("sitedown error:", e);
    return m.reply(claraWrap("SiteDown", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
