// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "shortlink",
  alias: ["shortlink", "shorturl", "urlshort2"],
  category: "tools",
  description: "Perpendek URL dengan berbagai layanan shortlink",
  usage: ".shortlink <provider> <url>\n.shortlink list — Lihat semua provider",
  example: ".shortlink tinyurl https://example.com",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const PROVIDERS = {
  tinyurl: {
    name: "TinyURL",
    desc: "Gratis, tanpa API key",
    shorten: async (url) => {
      const res = await axios.get("https://tinyurl.com/api-create.php", {
        params: { url },
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.data && res.data.startsWith("http")) return res.data;
      throw new Error("TinyURL gagal memproses URL");
    },
  },
  isgd: {
    name: "is.gd",
    desc: "Gratis, tanpa API key",
    shorten: async (url) => {
      const res = await axios.get("https://is.gd/create.php", {
        params: { format: "simple", url },
        timeout: 15000,
      });
      if (res.data && res.data.startsWith("http")) return res.data;
      throw new Error("is.gd gagal memproses URL");
    },
  },
  vgd: {
    name: "v.gd",
    desc: "Gratis, mirip is.gd",
    shorten: async (url) => {
      const res = await axios.get("https://v.gd/create.php", {
        params: { format: "simple", url },
        timeout: 15000,
      });
      if (res.data && res.data.startsWith("http")) return res.data;
      throw new Error("v.gd gagal memproses URL");
    },
  },
  cleanuri: {
    name: "CleanURI",
    desc: "Gratis, tanpa API key",
    shorten: async (url) => {
      const res = await axios.post("https://cleanuri.com/api/v1/shorten",
        { url },
        { timeout: 15000, headers: { "Content-Type": "application/json" } }
      );
      if (res.data && res.data.result_url) return res.data.result_url;
      throw new Error("CleanURI gagal memproses URL");
    },
  },
  "1pt": {
  name: "1pt.co",
    desc: "Gratis, tanpa API key",
    shorten: async (url) => {
      const res = await axios.post("https://api.1pt.co/addURL",
        { url },
        { timeout: 15000, headers: { "Content-Type": "application/json" } }
      );
      if (res.data && res.data.short) return "https://1pt.co/" + res.data.short;
      throw new Error("1pt.co gagal memproses URL");
    },
  },
  rebrandly: {
    name: "Rebrandly",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.rebrandlyKey;
      if (!apiKey) throw new Error("Rebrandly butuh API key. Set di config.js: shortlink.rebrandlyKey");
      const res = await axios.post("https://api.rebrandly.com/v1/links",
        { destination: url },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
        }
      );
      if (res.data && res.data.shortUrl) return "https://" + res.data.shortUrl;
      throw new Error("Rebrandly gagal memproses URL");
    },
  },
  bitly: {
    name: "Bitly",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.bitlyKey;
      if (!apiKey) throw new Error("Bitly butuh API key. Set di config.js: shortlink.bitlyKey");
      const res = await axios.post("https://api-ssl.bitly.com/v4/shorten",
        { long_url: url },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
        }
      );
      if (res.data && res.data.link) return res.data.link;
      throw new Error("Bitly gagal memproses URL");
    },
  },
  cuttly: {
    name: "Cutt.ly",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.cuttlyKey;
      if (!apiKey) throw new Error("Cutt.ly butuh API key. Set di config.js: shortlink.cuttlyKey");
      const res = await axios.get("https://cutt.ly/api/api.php", {
        params: { key: apiKey, short: url },
        timeout: 15000,
      });
      if (res.data && res.data.url && res.data.url.status === 7) return res.data.url.shortLink;
      throw new Error("Cutt.ly gagal: " + (res.data?.url?.title || "URL tidak valid"));
    },
  },
  shorte: {
    name: "Shorte.st",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.shorteKey;
      if (!apiKey) throw new Error("Shorte.st butuh API key. Set di config.js: shortlink.shorteKey");
      const res = await axios.put("https://api.shorte.st/v1/data/url",
        { urlToShorten: url },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
        }
      );
      if (res.data && res.data.shortenedUrl) return res.data.shortenedUrl;
      throw new Error("Shorte.st gagal memproses URL");
    },
  },
  ouo: {
    name: "OUO.io",
    desc: "Gratis, butuh API key",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.ouoKey;
      if (!apiKey) throw new Error("OUO.io butuh API key. Set di config.js: shortlink.ouoKey");
      const res = await axios.get("https://ouo.io/api/" + apiKey, {
        params: { s: url },
        timeout: 15000,
      });
      if (res.data && res.data.startsWith("http")) return res.data;
      throw new Error("OUO.io gagal memproses URL");
    },
  },
  linkvertise: {
    name: "Linkvertise",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.linkvertiseKey;
      if (!apiKey) throw new Error("Linkvertise butuh API key. Set di config.js: shortlink.linkvertiseKey");
      const res = await axios.post("https://publisher.linkvertise.com/api/v1/redirect/link/static",
        { url },
        {
          timeout: 15000,
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
        }
      );
      if (res.data && res.data.link) return res.data.link;
      throw new Error("Linkvertise gagal memproses URL");
    },
  },
  tinycc: {
    name: "Tiny.cc",
    desc: "Butuh API key (set di config)",
    shorten: async (url, m) => {
      const apiKey = (await import("../../config.js")).default?.shortlink?.tinyccKey;
      if (!apiKey) throw new Error("Tiny.cc butuh API key. Set di config.js: shortlink.tinyccKey");
      const res = await axios.get("https://tiny.cc/api/v1/shorten", {
        params: { c: "shorten", URL: url, format: "json", apiKey },
        timeout: 15000,
      });
      if (res.data && res.data.results && res.data.results.short_url) return res.data.results.short_url;
      throw new Error("Tiny.cc gagal memproses URL");
    },
  },
};

async function handler(m, { sock }) {
  const args = (m.args || []);
  const text = m.text?.trim() || "";

  // .shortlink list
  if ((args[0] || "").toLowerCase() === "list") {
    const providers = Object.entries(PROVIDERS);
    let txt = "SHORTLINK PROVIDER\n\n";
    txt += "Gratis (tanpa API key):\n";
    let freeIdx = 1;
    let paidIdx = 1;
    let freeTxt = "";
    let paidTxt = "";
    for (const [key, p] of providers) {
      const isFree = !p.desc.includes("API key");
      if (isFree) {
        freeTxt += freeIdx + ". " + key + " — " + p.name + " (" + p.desc + ")\n";
        freeIdx++;
      } else {
        paidTxt += paidIdx + ". " + key + " — " + p.name + " (" + p.desc + ")\n";
        paidIdx++;
      }
    }
    txt += freeTxt + "\nDengan API key:\n" + paidTxt;
    txt += "\nCara pakai: .shortlink <provider> <url>\n";
    txt += "Contoh: .shortlink tinyurl https://google.com\n\n";
    txt += "Untuk provider berbayar, set API key di config.js:\n";
    txt += "shortlink: { bitlyKey: \"xxx\", cuttlyKey: \"xxx\", dst }";
    return m.reply( txt, "shortlink");
  }

  // Parse: .shortlink <provider> <url>
  const providerName = (args[0] || "").toLowerCase();
  const url = args.slice(1).join(" ").trim() || "";

  if (!providerName || !url) {
    let txt = "SHORTLINK\n\n";
    txt += "Format: .shortlink <provider> <url>\n\n";
    txt += "Provider gratis: tinyurl, isgd, vgd, cleanuri, 1pt\n";
    txt += "Provider berbayar: bitly, cuttly, rebrandly, shorte, ouo, tinycc\n\n";
    txt += "Contoh:\n";
    txt += "1. .shortlink tinyurl https://google.com\n";
    txt += "2. .shortlink isgd https://example.com\n";
    txt += "3. .shortlink bitly https://github.com\n\n";
    txt += "Ketik .shortlink list buat lihat semua provider";
    return m.reply( txt, "shortlink");
  }

  const provider = PROVIDERS[providerName];
  if (!provider) {
    let txt = "Provider tidak ditemukan: " + providerName + "\n\n";
    txt += "Provider tersedia: " + Object.keys(PROVIDERS).join(", ") + "\n\n";
    txt += "Ketik .shortlink list buat lihat detail";
    return m.reply(claraWrap("shortlink", txt));
  }

  // Validasi URL
  let cleanUrl = url;
  if (!cleanUrl.match(/^https?:\/\//i)) {
    cleanUrl = "https://" + cleanUrl;
  }

  try {
    const shortUrl = await provider.shorten(cleanUrl, m);

    const txt = claraWrap("Shortlink", ["SHORTLINK BERHASIL", "Provider: " + provider.name, "URL asli: " + cleanUrl, "URL pendek: " + shortUrl].join("\n"));
    return m.reply( txt, "shortlink");
  } catch (e) {
    let txt = "Gagal memperpendek URL\n\n";
    txt += "Provider: " + provider.name + "\n";
    txt += "URL: " + cleanUrl + "\n";
    txt += "Error: " + e.message + "\n\n";
    txt += "Coba provider lain: .shortlink tinyurl <url>";
    return m.reply(claraWrap("shortlink", txt));
  }
}

export { pluginConfig as config, handler };
