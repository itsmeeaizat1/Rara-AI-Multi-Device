// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "speedurl",
  alias: ["speedurl"],
  category: "tools",
  description: "Ukur load time halaman web (TTFB, total load, ukuran KB)",
  usage: ".speedurl <url>",
  example: ".speedurl https://github.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function measureLoad(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const results = { url: target, phases: {}, size: 0, status: 0, ok: false };

  // Measure DNS + connect + TTFB + total
  const t0 = Date.now();
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const tTTFB = Date.now();

    const body = await res.text();
    const tEnd = Date.now();

    results.status = res.status;
    results.ok = res.ok;
    results.size = Buffer.byteLength(body, "utf-8");
    results.contentEncoding = res.headers.get("content-encoding") || "none";
    results.contentType = res.headers.get("content-type") || "N/A";
    results.server = res.headers.get("server") || "N/A";
    results.cacheControl = res.headers.get("cache-control") || "N/A";

    // Phase timing (approximate from fetch — no detailed timing API)
    results.phases.total = tEnd - t0;
    results.phases.ttfb = tTTFB - t0;
    results.phases.download = tEnd - tTTFB;
    results.phases.redirected = res.redirected;
    results.phases.finalUrl = res.url;

    // Compression check
    const compressed = res.headers.get("content-encoding") !== null;
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      results.transferSize = parseInt(contentLength);
    } else {
      results.transferSize = results.size;
    }
    results.compressed = compressed;
  } catch (e) {
    results.error = e.message;
    results.phases.total = Date.now() - t0;
  }

  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function rateLabel(ms) {
  if (ms < 200) return "Excellent";
  if (ms < 500) return "Good";
  if (ms < 1000) return "Average";
  if (ms < 3000) return "Slow";
  return "Very Slow";
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "speedurl <url>\n\n" +
        "Ukur performa load halaman web\n" +
        "Info: TTFB, download time, total time, ukuran, kompresi\n\n" +
        "Contoh:\n" +
        prefix + "speedurl https://github.com\n" +
        prefix + "speedurl google.com",
        { title: "URL Speed Test" }
      );
    }
    const result = await measureLoad(text);

    if (result.error) {
      return m.reply(claraWrap("SpeedURL Error", [
        "URL: " + result.url,
        "Error: " + result.error,
        "Time: " + result.phases.total + "ms",
      ].join("\n")));
    }

    const lines = [
      "URL: " + (result.phases.finalUrl || result.url).replace(/^https?:\/\//, ""),
      "Status: " + result.status + " " + (result.ok ? "OK" : "Error"),
      "",
      "TTFB: " + result.phases.ttfb + "ms (" + rateLabel(result.phases.ttfb) + ")",
      "Download: " + result.phases.download + "ms",
      "Total: " + result.phases.total + "ms (" + rateLabel(result.phases.total) + ")",
      "",
      "Body size: " + formatSize(result.size),
      "Transfer size: " + formatSize(result.transferSize),
      "Compressed: " + (result.compressed ? "Yes (" + result.contentEncoding + ")" : "No"),
      "Server: " + result.server,
      "Content-Type: " + result.contentType,
    ];

    if (result.phases.redirected) {
      lines.push("");
      lines.push("Redirected to: " + result.phases.finalUrl.replace(/^https?:\/\//, ""));
    }

    if (result.cacheControl !== "N/A") {
      lines.push("Cache-Control: " + (result.cacheControl.length > 40 ? result.cacheControl.substring(0, 40) + "..." : result.cacheControl));
    }
    await m.react("🐣");
    return m.reply(claraWrap("SpeedURL: " + text.replace(/^https?:\/\//, ""), lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("speedurl error:", e);
    return m.reply(claraWrap("SpeedURL", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
