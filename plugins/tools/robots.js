// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "robots",
  alias: ["robots"],
  category: "tools",
  description: "Parse robots.txt website (allowed, disallowed, sitemap, crawl-delay)",
  usage: ".robots <url>",
  example: ".robots https://github.com  atau  .robots google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function parseRobots(txt) {
  const result = {
    userAgentRules: [],
    sitemaps: [],
    crawlDelay: null,
    rawLength: txt.length,
    comments: [],
  };

  const lines = txt.split("\n");
  let currentUserAgents = [];
  let currentRules = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      // Empty line — end of current rule block
      if (currentUserAgents.length > 0 && currentRules.length > 0) {
        result.userAgentRules.push({
          agents: [...currentUserAgents],
          rules: [...currentRules],
        });
      }
      currentUserAgents = [];
      currentRules = [];
      continue;
    }

    // Comment
    if (line.startsWith("#")) {
      const comment = line.replace(/^#\s*/, "");
      if (comment) result.comments.push(comment);
      continue;
    }

    // Remove inline comments
    const commentIdx = line.indexOf("#");
    if (commentIdx > 0) line = line.substring(0, commentIdx).trim();

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const field = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();

    if (field === "user-agent") {
      // New UA block — flush previous
      if (currentUserAgents.length > 0 && currentRules.length > 0) {
        result.userAgentRules.push({
          agents: [...currentUserAgents],
          rules: [...currentRules],
        });
        currentRules = [];
      }
      currentUserAgents.push(value);
    } else if (field === "disallow") {
      currentRules.push({ type: "Disallow", path: value || "/" });
    } else if (field === "allow") {
      currentRules.push({ type: "Allow", path: value });
    } else if (field === "crawl-delay") {
      const delay = parseFloat(value);
      if (!isNaN(delay)) {
        currentRules.push({ type: "Crawl-delay", value: delay });
        if (currentUserAgents.length === 0 || currentUserAgents.includes("*")) {
          result.crawlDelay = delay;
        }
      }
    } else if (field === "sitemap") {
      result.sitemaps.push(value);
    }
  }

  // Flush remaining
  if (currentUserAgents.length > 0 && currentRules.length > 0) {
    result.userAgentRules.push({
      agents: [...currentUserAgents],
      rules: [...currentRules],
    });
  }

  return result;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "robots <url>\n\n" +
        "Parse robots.txt website\n" +
        "Info: user-agent rules, disallow paths, allow paths, sitemaps, crawl-delay\n\n" +
        "Contoh:\n" +
        prefix + "robots https://github.com\n" +
        prefix + "robots google.com\n" +
        prefix + "robots https://wordpress.org",
        { title: "Robots.txt Parser" }
      );
    }

    const baseDomain = text.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const robotsUrl = text.startsWith("http")
      ? text.replace(/\/$/, "") + "/robots.txt"
      : "https://" + text.replace(/\/$/, "") + "/robots.txt";
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!res.ok) {
      if (res.status === 404) {
        return m.reply(claraWrap("Robots.txt: " + baseDomain, [
          "Status: 404 Not Found",
          "Tidak ada robots.txt",
          "Bot boleh crawl semua halaman (no restrictions)",
        ].join("\n")));
      }
      return m.reply(claraWrap("Robots.txt", "Gagal fetch: " + res.status + " " + res.statusText));
    }

    const txt = await res.text();
    const parsed = parseRobots(txt);

    const lines = [
      "URL: " + robotsUrl.replace(/^https?:\/\//, ""),
      "Size: " + parsed.rawLength + " bytes",
      "Total UA blocks: " + parsed.userAgentRules.length,
      "",
    ];

    if (parsed.crawlDelay !== null) {
      lines.push("Global Crawl-delay: " + parsed.crawlDelay + "s");
    }

    if (parsed.sitemaps.length > 0) {
      lines.push("");
      lines.push("Sitemaps (" + parsed.sitemaps.length + "):");
      for (const s of parsed.sitemaps.slice(0, 10)) {
        lines.push("  " + (s.length > 70 ? s.substring(0, 70) + "..." : s));
      }
    }

    if (parsed.userAgentRules.length > 0) {
      lines.push("");
      lines.push("Rules:");
      for (let i = 0; i < Math.min(parsed.userAgentRules.length, 8); i++) {
        const block = parsed.userAgentRules[i];
        lines.push("");
        lines.push("  User-agent: " + block.agents.join(", "));
        for (const rule of block.rules.slice(0, 12)) {
          if (rule.type === "Crawl-delay") {
            lines.push("    " + rule.type + ": " + rule.value + "s");
          } else {
            lines.push("    " + rule.type + ": " + (rule.path || "/"));
          }
        }
        if (block.rules.length > 12) {
          lines.push("    ... +" + (block.rules.length - 12) + " rules");
        }
      }
      if (parsed.userAgentRules.length > 8) {
        lines.push("... +" + (parsed.userAgentRules.length - 8) + " more UA blocks");
      }
    }

    if (parsed.comments.length > 0) {
      lines.push("");
      lines.push("Comments (" + parsed.comments.length + "):");
      for (const c of parsed.comments.slice(0, 3)) {
        lines.push("  " + (c.length > 60 ? c.substring(0, 60) + "..." : c));
      }
    }
    await m.react("🐣");
    return m.reply(claraWrap("Robots.txt: " + baseDomain, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("robots error:", e);
    return m.reply(claraWrap("Robots", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
