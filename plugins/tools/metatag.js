// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "metatag",
  alias: ["metatag"],
  category: "tools",
  description: "Extract meta tags website (title, description, OG, Twitter, favicon)",
  usage: ".metatag <url>",
  example: ".metatag https://github.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function extractMetaTags(html) {
  const result = {
    title: null,
    meta: {},
    og: {},
    twitter: {},
    links: {},
    favicon: null,
    canonical: null,
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Meta tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    let name = null, property = null, content = null;

    const nameMatch = attrs.match(/name\s*=\s*["']([^"']*)["']/i);
    const propMatch = attrs.match(/property\s*=\s*["']([^"']*)["']/i);
    const contentMatch = attrs.match(/content\s*=\s*["']([^"']*)["']/i);

    if (nameMatch) name = nameMatch[1];
    if (propMatch) property = propMatch[1];
    if (contentMatch) content = contentMatch[1];

    if (content) {
      if (property && property.startsWith("og:")) {
        result.og[property] = content;
      } else if (name && name.startsWith("twitter:")) {
        result.twitter[name] = content;
      } else if (name) {
        result.meta[name] = content;
      } else if (property) {
        result.meta[property] = content;
      }
    }
  }

  // Canonical
  const canonicalMatch = html.match(/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["']/i);
  if (canonicalMatch) result.canonical = canonicalMatch[1];

  // Favicon
  const faviconMatch = html.match(/<link\s+[^>]*rel\s*=\s*["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href\s*=\s*["']([^"']*)["']/i);
  if (faviconMatch) result.favicon = faviconMatch[1];

  return result;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "metatag <url>\n\n" +
        "Extract meta tags dari website\n" +
        "Info: title, description, OG tags, Twitter cards, favicon, canonical\n\n" +
        "Contoh:\n" +
        prefix + "metatag https://github.com\n" +
        prefix + "metatag https://blog.example.com",
        { title: "Meta Tag Extractor" }
      );
    }

    const url = text.startsWith("http") ? text : "https://" + text;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!res.ok) {
      return m.reply(claraWrap("MetaTag", "Gagal fetch: " + res.status + " " + res.statusText));
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return m.reply(claraWrap("MetaTag", "Bukan halaman HTML! Content-Type: " + contentType));
    }

    const html = await res.text();
    const meta = extractMetaTags(html);

    const lines = [];

    // Title
    lines.push("Title: " + (meta.title || "N/A"));
    if (meta.title && meta.title.length > 70) {
      lines.push("  Warning: Title > 70 chars (" + meta.title.length + ")");
    }

    // Description
    const desc = meta.meta["description"] || meta.og["description"] || null;
    lines.push("");
    lines.push("Description: " + (desc ? (desc.length > 120 ? desc.substring(0, 120) + "..." : desc) : "N/A"));
    if (desc && desc.length > 160) {
      lines.push("  Warning: Description > 160 chars (" + desc.length + ")");
    }

    // Keywords
    if (meta.meta["keywords"]) {
      lines.push("Keywords: " + (meta.meta["keywords"].length > 80 ? meta.meta["keywords"].substring(0, 80) + "..." : meta.meta["keywords"]));
    }

    // Canonical & Favicon
    lines.push("");
    lines.push("Canonical: " + (meta.canonical || "N/A"));
    lines.push("Favicon: " + (meta.favicon || "N/A"));

    // Open Graph
    const ogKeys = Object.keys(meta.og);
    if (ogKeys.length > 0) {
      lines.push("");
      lines.push("Open Graph (" + ogKeys.length + " tags):");
      for (const key of ogKeys) {
        const val = meta.og[key];
        lines.push("  " + key + ": " + (val.length > 60 ? val.substring(0, 60) + "..." : val));
      }
    } else {
      lines.push("");
      lines.push("Open Graph: Tidak ada");
    }

    // Twitter Card
    const twKeys = Object.keys(meta.twitter);
    if (twKeys.length > 0) {
      lines.push("");
      lines.push("Twitter Card (" + twKeys.length + " tags):");
      for (const key of twKeys) {
        const val = meta.twitter[key];
        lines.push("  " + key + ": " + (val.length > 60 ? val.substring(0, 60) + "..." : val));
      }
    }

    // Other meta tags
    const otherKeys = Object.keys(meta.meta).filter((k) => k !== "description" && k !== "keywords");
    if (otherKeys.length > 0) {
      lines.push("");
      lines.push("Other Meta (" + otherKeys.length + " tags):");
      for (const key of otherKeys.slice(0, 10)) {
        const val = meta.meta[key];
        lines.push("  " + key + ": " + (val.length > 50 ? val.substring(0, 50) + "..." : val));
      }
    }

    // Truncate output
    if (lines.length > 40) {
      lines.splice(40, lines.length - 40, "... (output dipotong)");
    }
    await m.react("🐣");
    return m.reply(claraWrap("Meta Tags: " + url.replace(/^https?:\/\//, ""), lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("metatag error:", e);
    return m.reply(claraWrap("MetaTag", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
