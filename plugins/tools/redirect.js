// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "redirect",
  alias: ["redirecttrace", "redirectchain", "urlredirect", "redirectcheck"],
  category: "tools",
  description: "Trace redirect chain URL (lihat semua hop + status code)",
  usage: ".redirect <url>",
  example: ".redirect http://example.com  atau  .redirect bit.ly/abc123",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function traceRedirects(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const hops = [];
  let currentUrl = target;
  let maxHops = 15;

  while (maxHops > 0) {
    const start = Date.now();
    let res;
    try {
      res = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      hops.push({
        url: currentUrl,
        status: 0,
        statusText: "Error",
        error: e.message,
        time: Date.now() - start,
      });
      break;
    }

    const elapsed = Date.now() - start;
    const location = res.headers.get("location");
    const isRedirect = res.status >= 300 && res.status < 400 && location;

    hops.push({
      url: currentUrl,
      status: res.status,
      statusText: res.statusText,
      time: elapsed,
      server: res.headers.get("server") || "N/A",
      redirect: isRedirect ? location : null,
    });

    if (!isRedirect) {
      break;
    }

    // Resolve relative redirects
    if (location.startsWith("/")) {
      const base = new URL(currentUrl);
      currentUrl = base.origin + location;
    } else if (location.startsWith("http")) {
      currentUrl = location;
    } else {
      const base = new URL(currentUrl);
      currentUrl = new URL(location, base).href;
    }

    maxHops--;
  }

  if (maxHops === 0) {
    hops.push({ url: "...", status: 0, statusText: "Max redirects (15)" });
  }

  return hops;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return sendReplyWithNav(sock, m,
        prefix + "redirect <url>\n\n" +
        "Trace redirect chain URL\n" +
        "Lihat semua hop, status code, response time, final destination\n\n" +
        "Contoh:\n" +
        prefix + "redirect http://example.com\n" +
        prefix + "redirect bit.ly/demo\n" +
        prefix + "redirect t.co/abc123",
        { title: "Redirect Chain Tracer" }
      );
    }

    await m.react("🕐");

    const hops = await traceRedirects(text);

    if (hops.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("Redirect", "Tidak ada response"));
    }

    const lines = [
      "Total hops: " + hops.length,
      "Final: " + (hops[hops.length - 1].url || "N/A").replace(/^https?:\/\//, ""),
      "",
      "Chain:",
    ];

    for (let i = 0; i < hops.length; i++) {
      const hop = hops[i];
      const arrow = i < hops.length - 1 ? " ->" : " ==";
      let line = (i + 1) + ". [" + hop.status + "] " + hop.url.replace(/^https?:\/\//, "");

      if (hop.url === "...") {
        line = (i + 1) + ". Max redirects reached";
      }

      lines.push(line);

      if (hop.statusText && hop.statusText !== "Error" && hop.status > 0) {
        lines.push("   " + hop.statusText + " | " + hop.time + "ms | Server: " + hop.server);
      } else if (hop.error) {
        lines.push("   Error: " + hop.error);
      } else if (hop.statusText === "Max redirects (15)") {
        lines.push("   Too many redirects");
      }

      if (hop.redirect) {
        let dest = hop.redirect;
        if (dest.startsWith("/")) dest = "(relative) " + dest;
        lines.push("   -> " + (dest.length > 60 ? dest.substring(0, 60) + "..." : dest));
      }
    }

    const totalTime = hops.reduce((s, h) => s + (h.time || 0), 0);
    lines.push("");
    lines.push("Total time: " + totalTime + "ms");

    await m.react("✅");
    return m.reply(claraWrap("Redirect Trace: " + text.replace(/^https?:\/\//, ""), lines.join("\n")));
  } catch (e) {
    console.error("redirect error:", e);
    await m.react("❌");
    return m.reply(claraWrap("Redirect", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
