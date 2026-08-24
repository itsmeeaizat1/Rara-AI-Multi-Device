// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sitasi",
  alias: ["citation", "cite", "sitasiapi"],
  category: "education",
  description: "Generator sitasi APA/MLA/IEEE/Harvard dari URL atau judul paper",
  usage: ".sitasi <style> <url/judul>",
  example: ".sitasi apa https://example.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 3,
  isEnabled: true,
};

const STYLES = ["apa", "mla", "ieee", "harvard", "chicago", "vancouver"];

async function fetchPageMeta(url) {
  const res = await axios.get(url, {
    timeout: 15000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    maxRedirects: 5,
  });
  if (res.status !== 200) return null;

  const html = res.data;
  const getMeta = (pattern) => {
    const match = html.match(pattern);
    return match ? match[1].trim() : "";
  };

  let title = getMeta(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || getMeta(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i)
    || getMeta(/<title[^>]*>([^<]+)<\/title>/i)
    || "Untitled";

  let author = getMeta(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)
    || getMeta(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i)
    || "";

  let date = getMeta(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)
    || getMeta(/<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i)
    || "";

  let site = getMeta(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    || "";

  let desc = getMeta(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || "";

  // Extract domain
  let domain = "";
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch (e) { console.error('[sitasi.js]:', e.message); }

  // Parse date
  let year = "", month = "", day = "";
  if (date) {
    const d = new Date(date);
    if (!isNaN(d)) {
      year = d.getFullYear();
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      month = months[d.getMonth()];
      day = d.getDate();
    }
  } else {
    year = new Date().getFullYear();
  }

  return { title, author, year, month, day, site, domain, desc, url };
}

function formatAPA(meta) {
  let cite = "";
  if (meta.author) {
    // Last, First
    const parts = meta.author.split(" ");
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0] + ".").join(" ");
    cite += `${last}, ${initials}`;
  } else if (meta.site) {
    cite += meta.site;
  } else {
    cite += meta.domain;
  }
  cite += ` (${meta.year || "n.d."}). `;
  cite += `${meta.title}.`;
  if (meta.site) cite += ` ${meta.site}.`;
  cite += ` Retrieved from ${meta.url}`;
  return cite;
}

function formatMLA(meta) {
  let cite = "";
  if (meta.author) {
    cite += meta.author;
  } else if (meta.site) {
    cite += meta.site;
  } else {
    cite += meta.title;
  }
  cite += `. "${meta.title}."`;
  if (meta.site) cite += ` ${meta.site},`;
  if (meta.day && meta.month) cite += ` ${meta.day} ${meta.month} ${meta.year}`;
  else cite += ` ${meta.year || "n.d."}`;
  cite += `, ${meta.url}.`;
  return cite;
}

function formatIEEE(meta) {
  let cite = "";
  if (meta.author) {
    const parts = meta.author.split(" ");
    const initials = parts.slice(0, -1).map(p => p[0] + ".").join(" ");
    const last = parts[parts.length - 1];
    cite += `${initials} ${last},`;
  }
  cite += ` "${meta.title},"`;
  if (meta.site) cite += ` ${meta.site},`;
  cite += ` ${meta.year || "n.d."}.`;
  cite += ` [Online]. Available: ${meta.url}`;
  return cite;
}

function formatHarvard(meta) {
  let cite = "";
  if (meta.author) {
    const parts = meta.author.split(" ");
    const last = parts[parts.length - 1];
    cite += `${last}`;
  } else if (meta.site) {
    cite += meta.site;
  } else {
    cite += meta.domain;
  }
  cite += `, ${meta.year || "n.d."}. `;
  cite += `${meta.title}.`;
  if (meta.site) cite += ` ${meta.site}.`;
  cite += ` Available at: ${meta.url}`;
  return cite;
}

function formatChicago(meta) {
  let cite = "";
  if (meta.author) {
    cite += meta.author;
  } else if (meta.site) {
    cite += meta.site;
  } else {
    cite += meta.domain;
  }
  cite += `. "${meta.title}."`;
  if (meta.site) cite += ` ${meta.site},`;
  if (meta.day && meta.month) cite += ` ${meta.month} ${meta.day}, ${meta.year}`;
  else cite += ` ${meta.year || "n.d."}`;
  cite += `. ${meta.url}.`;
  return cite;
}

function formatVancouver(meta) {
  let cite = "";
  if (meta.author) {
    cite += meta.author;
  } else if (meta.site) {
    cite += meta.site;
  } else {
    cite += meta.domain;
  }
  cite += `. ${meta.title} [Internet].`;
  if (meta.site) cite += ` ${meta.site};`;
  cite += ` ${meta.year || "n.d."} [cited ${new Date().toLocaleDateString("en-US")}].`;
  cite += ` Available from: ${meta.url}`;
  return cite;
}

const FORMATTERS = {
  apa: formatAPA,
  mla: formatMLA,
  ieee: formatIEEE,
  harvard: formatHarvard,
  chicago: formatChicago,
  vancouver: formatVancouver,
};

async function handler(m, { sock, args }) {
  const style = (args[0] || "").toLowerCase();
  const input = args.slice(1).join(" ").trim();

  if (!style || !input || style === "help" || style === "menu") {
    let txt = `Generator Sitasi\n\n`;
    txt += `Format: \`${m.prefix}sitasi <style> <url atau judul>\`\n\n`;
    txt += `Style tersedia:\n`;
    txt += `1. APA\n`;
    txt += `2. MLA\n`;
    txt += `3. IEEE\n`;
    txt += `4. Harvard\n`;
    txt += `5. Chicago\n`;
    txt += `6. Vancouver\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}sitasi apa https://example.com/article\`\n`;
    txt += `\`${m.prefix}sitasi ieee https://ieeexplore.ieee.org/document/12345\`\n\n`;
    txt += `_Otomatis ambil metadata dari halaman web_`;
    return await m.reply( txt, { commandName: "sitasi" });
  }

  await m.react("🕒");

  try {
    let targetStyle = STYLES.includes(style) ? style : "apa";
    let isURL = false;
    let meta;

    // Check if input is URL
    if (input.startsWith("http://") || input.startsWith("https://")) {
      isURL = true;
      meta = await fetchPageMeta(input);
      if (!meta) {
        return m.reply(claraWrap("sitasi", "Gagal mengambil halaman! Pastikan URL valid dan dapat diakses."));
      }
    } else {
      // Treat as manual entry - search or manual format
      // Build meta from text input
      const today = new Date();
      meta = {
        title: input,
        author: "",
        year: today.getFullYear(),
        month: "",
        day: "",
        site: "",
        domain: "",
        desc: "",
        url: input,
      };
    }

    const formatter = FORMATTERS[targetStyle] || formatAPA;
    const citation = formatter(meta);

    let txt = `Hasil Sitasi (${targetStyle.toUpperCase()})\n\n`;
    txt += `${citation}\n\n`;
    txt += `---\n`;
    txt += `Detail:\n`;
    if (meta.author) txt += `Author: ${meta.author}\n`;
    txt += `Title: ${meta.title}\n`;
    if (meta.site) txt += `Site: ${meta.site}\n`;
    txt += `Year: ${meta.year || "n.d."}\n`;
    if (isURL) txt += `URL: ${meta.url}\n`;
    txt += `\n_Salin sitasi di atas ke daftar pustaka_`;

    await m.reply(txt);
    await m.react("🐣");
  } catch (e) {
    console.error("[SITASI] Error:", e.message);
    await m.reply(claraWrap("sitasi", `Gagal membuat sitasi!\n\nError: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
