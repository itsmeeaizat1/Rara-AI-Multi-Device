// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "techstack",
  alias: ["whatcms", "stackdetect", "builtwith", "techdetect", "wappdetect"],
  category: "tools",
  description: "Detect teknologi website (framework, CMS, CDN, analytics, JS lib)",
  usage: ".techstack <url>",
  example: ".techstack https://github.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TECH_SIGNATURES = {
  // CMS
  WordPress: { check: (h) => /wp-content|wp-includes|wp-json/i.test(h), category: "CMS" },
  Joomla: { check: (h) => /\/components\/com_|\/media\/jui\//i.test(h), category: "CMS" },
  Drupal: { check: (h) => /drupal\.js|\/sites\/default\/files\//i.test(h), category: "CMS" },
  Ghost: { check: (h) => /ghost-|__ghost__/i.test(h), category: "CMS" },
  Blogger: { check: (h) => /blogger|blogspot/i.test(h), category: "CMS" },
  Shopify: { check: (h) => /cdn\.shopify|shopify\.theme/i.test(h), category: "E-Commerce" },
  Magento: { check: (h) => /mage\/|mage\/cookies/i.test(h), category: "E-Commerce" },
  WooCommerce: { check: (h) => /woocommerce/i.test(h), category: "E-Commerce" },
  "Next.js": { check: (h, hr) => /__NEXT_DATA__|_next\//i.test(h), category: "Framework" },
  "Nuxt.js": { check: (h) => /__NUXT__|_nuxt\//i.test(h), category: "Framework" },
  "React": { check: (h) => /react(\.|-)?(production|min)|react-dom/i.test(h), category: "JS Library" },
  "Vue.js": { check: (h) => /vue(\.min)?\.js|__vue__/i.test(h), category: "JS Library" },
  Angular: { check: (h) => /ng-version|angular(\.min)?\.js|@angular/i.test(h), category: "Framework" },
  "Svelte": { check: (h) => /svelte-/i.test(h), category: "Framework" },
  jQuery: { check: (h) => /jquery(\.min)?\.js|jQuery v/i.test(h), category: "JS Library" },
  Bootstrap: { check: (h) => /bootstrap(\.min)?\.(css|js)/i.test(h), category: "CSS Framework" },
  Tailwind: { check: (h) => /tailwind/i.test(h), category: "CSS Framework" },
  Bulma: { check: (h) => /bulma(\.min)?\.css/i.test(h), category: "CSS Framework" },
  // CDN
  Cloudflare: { check: (h, hr) => hr.get("server")?.toLowerCase().includes("cloudflare") || /cdn-cgi\//i.test(h), category: "CDN" },
  "Google Cloud CDN": { check: (h, hr) => hr.get("server")?.toLowerCase().includes("golfe") || hr.get("server")?.toLowerCase().includes("google"), category: "CDN" },
  "Amazon CloudFront": { check: (h, hr) => hr.get("via")?.includes("CloudFront") || hr.get("x-amz-cf-id"), category: "CDN" },
  Fastly: { check: (h, hr) => hr.get("x-served-by")?.includes("cache") || hr.get("server")?.toLowerCase().includes("varnish"), category: "CDN" },
  Vercel: { check: (h, hr) => hr.get("server")?.includes("Vercel") || /vercel/i.test(h), category: "Hosting" },
  Netlify: { check: (h, hr) => hr.get("server")?.includes("Netlify"), category: "Hosting" },
  "GitHub Pages": { check: (h, hr) => hr.get("server")?.includes("GitHub"), category: "Hosting" },
  // Analytics
  "Google Analytics": { check: (h) => /google-analytics\.com|gtag\(/i.test(h), category: "Analytics" },
  "Google Tag Manager": { check: (h) => /googletagmanager\.com|GTM-/i.test(h), category: "Analytics" },
  "Facebook Pixel": { check: (h) => /connect\.facebook\.net.*fbevents|fbq\(/i.test(h), category: "Analytics" },
  Hotjar: { check: (h) => /static\.hotjar\.com/i.test(h), category: "Analytics" },
  "Mixpanel": { check: (h) => /cdn\.mxpnl\.com|mixpanel/i.test(h), category: "Analytics" },
  // Web servers
  Nginx: { check: (h, hr) => hr.get("server")?.toLowerCase().includes("nginx"), category: "Web Server" },
  Apache: { check: (h, hr) => hr.get("server")?.toLowerCase().includes("apache"), category: "Web Server" },
  "LiteSpeed": { check: (h, hr) => hr.get("server")?.toLowerCase().includes("litespeed"), category: "Web Server" },
  // Other
  "Disqus": { check: (h) => /disqus\.com|disqus_/i.test(h), category: "Widget" },
  "reCAPTCHA": { check: (h) => /recaptcha|google\.com\/recaptcha/i.test(h), category: "Security" },
  "hCaptcha": { check: (h) => /hcaptcha\.com/i.test(h), category: "Security" },
  "WordPress.com": { check: (h, hr) => hr.get("x-hacker")?.includes("WordPress.com"), category: "Hosting" },
  "Cloudflare Insights": { check: (h) => /cloudflareinsights/i.test(h), category: "Analytics" },
};

async function detectTech(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const res = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });

  const html = await res.text();
  const headers = res.headers;
  const detected = [];
  const categories = {};

  for (const [name, sig] of Object.entries(TECH_SIGNATURES)) {
    if (sig.check(html, headers)) {
      detected.push({ name, category: sig.category });
      if (!categories[sig.category]) categories[sig.category] = [];
      categories[sig.category].push(name);
    }
  }

  return { detected, categories, status: res.status, finalUrl: res.url, htmlSize: html.length };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "techstack <url>\n\n" +
        "Detect teknologi website (40+ signatures)\n" +
        "Deteksi: CMS, Framework, JS lib, CDN, Analytics, Web Server\n\n" +
        "Contoh:\n" +
        prefix + "techstack https://github.com\n" +
        prefix + "techstack https://wordpress.org",
        { title: "Tech Stack Detector" }
      );
    }

    await m.react("🕒");

    const result = await detectTech(text);

    if (result.detected.length === 0) {
      await m.react("✅");
      return m.reply(claraWrap("TechStack: " + text.replace(/^https?:\/\//, ""), [
        "Status: " + result.status,
        "Tidak ada teknologi terdeteksi",
        "",
        "Mungkin site custom atau signatures belum cover",
      ].join("\n")));
    }

    const lines = [
      "URL: " + result.finalUrl.replace(/^https?:\/\//, ""),
      "Status: " + result.status,
      "Detected: " + result.detected.length + " technologies",
      "",
    ];

    // Group by category
    const categoryOrder = ["CMS", "E-Commerce", "Framework", "JS Library", "CSS Framework", "CDN", "Web Server", "Hosting", "Analytics", "Security", "Widget"];
    for (const cat of categoryOrder) {
      if (result.categories[cat]) {
        lines.push(cat + ":");
        for (const tech of result.categories[cat]) {
          lines.push("  " + tech);
        }
        lines.push("");
      }
    }

    // Other categories not in order
    for (const [cat, techs] of Object.entries(result.categories)) {
      if (!categoryOrder.includes(cat)) {
        lines.push(cat + ":");
        for (const tech of techs) {
          lines.push("  " + tech);
        }
      }
    }

    await m.react("✅");
    return m.reply(claraWrap("TechStack: " + text.replace(/^https?:\/\//, ""), lines.join("\n")));
  } catch (e) {
    console.error("techstack error:", e);
    await m.react("❌");
    return m.reply(claraWrap("TechStack", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
