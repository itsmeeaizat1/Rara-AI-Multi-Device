// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "urldiff",
  alias: ["urldiff"],
  category: "tools",
  description: "Bandingin response 2 URL (status, headers, body size, load time)",
  usage: ".urldiff <url1> <url2>",
  example: ".urldiff https://httpbin.org/get https://httpbin.org/status/200",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function fetchUrl(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const start = Date.now();
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    const ttfb = Date.now() - start;
    const body = await res.text();
    const total = Date.now() - start;

    return {
      url: target,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      ttfb,
      total,
      bodySize: Buffer.byteLength(body, "utf-8"),
      contentType: res.headers.get("content-type") || "N/A",
      server: res.headers.get("server") || "N/A",
      contentEncoding: res.headers.get("content-encoding") || "none",
      cacheControl: res.headers.get("cache-control") || "N/A",
      redirected: res.redirected,
      finalUrl: res.url,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (e) {
    return { url: target, error: e.message, total: Date.now() - start };
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "urldiff <url1> <url2>\n\n" +
        "Bandingin response 2 URL\n" +
        "Info: status, TTFB, body size, server, content-type, headers\n\n" +
        "Contoh:\n" +
        prefix + "urldiff https://httpbin.org/get https://httpbin.org/status/200\n" +
        prefix + "urldiff site1.com site2.com",
        { title: "URL Comparator" }
      );
    }

    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      return m.reply(claraWrap("URLDiff", "Butuh 2 URL!\n💡 *Contoh:* " + prefix + "urldiff site1.com site2.com"));
    }

    const url1 = parts[0];
    const url2 = parts[1];

    await m.react("🕒");

    const [r1, r2] = await Promise.all([fetchUrl(url1), fetchUrl(url2)]);

    if (r1.error || r2.error) {
      await m.react("❌");
      const lines = [];
      if (r1.error) lines.push(url1 + ": Error - " + r1.error);
      if (r2.error) lines.push(url2 + ": Error - " + r2.error);
      return m.reply(claraWrap("URLDiff Error", lines.join("\n")));
    }

    // Compare
    const sameStatus = r1.status === r2.status;
    const sameServer = r1.server === r2.server;
    const sameContentType = r1.contentType === r2.contentType;
    const sameEncoding = r1.contentEncoding === r2.contentEncoding;
    const faster = r1.ttfb < r2.ttfb ? "A" : r1.ttfb > r2.ttfb ? "B" : "TIE";
    const bigger = r1.bodySize > r2.bodySize ? "A" : r1.bodySize < r2.bodySize ? "B" : "TIE";

    const lines = [
      "URL A: " + url1.replace(/^https?:\/\//, ""),
      "URL B: " + url2.replace(/^https?:\/\//, ""),
      "",
      "Status: " + (sameStatus ? "SAME (" + r1.status + ")" : "DIFF"),
      "  A: " + r1.status + " " + r1.statusText,
      "  B: " + r2.status + " " + r2.statusText,
      "",
      "TTFB: " + (faster === "TIE" ? "SAME" : faster + " faster"),
      "  A: " + r1.ttfb + "ms",
      "  B: " + r2.ttfb + "ms",
      "  Diff: " + Math.abs(r1.ttfb - r2.ttfb) + "ms",
      "",
      "Total Time:",
      "  A: " + r1.total + "ms",
      "  B: " + r2.total + "ms",
      "",
      "Body Size: " + (bigger === "TIE" ? "SAME" : bigger + " bigger"),
      "  A: " + formatSize(r1.bodySize),
      "  B: " + formatSize(r2.bodySize),
      "",
      "Content-Type: " + (sameContentType ? "SAME" : "DIFF"),
      "  A: " + r1.contentType,
      "  B: " + r2.contentType,
      "",
      "Server: " + (sameServer ? "SAME" : "DIFF"),
      "  A: " + r1.server,
      "  B: " + r2.server,
      "",
      "Encoding: " + (sameEncoding ? "SAME" : "DIFF"),
      "  A: " + r1.contentEncoding,
      "  B: " + r2.contentEncoding,
      "",
      "Redirected:",
      "  A: " + (r1.redirected ? "Yes" : "No"),
      "  B: " + (r2.redirected ? "Yes" : "No"),
      "",
      "Summary:",
    ];

    const diffs = [];
    if (!sameStatus) diffs.push("status");
    if (!sameServer) diffs.push("server");
    if (!sameContentType) diffs.push("content-type");
    if (!sameEncoding) diffs.push("encoding");
    if (r1.bodySize !== r2.bodySize) diffs.push("body size");
    if (r1.ttfb !== r2.ttfb) diffs.push("TTFB");

    if (diffs.length === 0) {
      lines.push("  Responses are identical in key metrics");
    } else {
      lines.push("  Differences: " + diffs.join(", "));
      lines.push("  Faster: " + (faster === "TIE" ? "TIE" : faster));
      lines.push("  Bigger body: " + (bigger === "TIE" ? "TIE" : bigger));
    }

    await m.react("🐣");
    return m.reply(claraWrap("URL Diff: " + url1.replace(/^https?:\/\//, "") + " vs " + url2.replace(/^https?:\/\//, ""), lines.join("\n")));
  } catch (e) {
    console.error("urldiff error:", e);
    await m.react("❌");
    return m.reply(claraWrap("URLDiff", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
