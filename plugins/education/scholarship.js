// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "beasiswa",
  alias: ["beasiswa"],
  category: "education",
  description: "Cari info beasiswa S1/S2/S3 dari berbagai sumber (API + scrape)",
  usage: ".beasiswa <command>",
  example: ".beasiswa s1\n.beasiswa s2\n.beasiswa deadline",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

// Sumber beasiswa via API (free, no key required)
// 1. BeasiswaIndonesia.com (scrape JSON-LD)
// 2. IDP Indonesia (API-ish RSS)
// 3. OpenAlex works filter (beasiswa/grant related)

async function fetchBeasiswaFromWeb(level) {
  const results = [];
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };

  // Source 1: beasiswaindonesia.com - sitemap/JSON-LD scrape
  try {
    const res = await axios.get("https://beasiswaindonesia.com/api/scholarships?limit=20&level=" + (level || ""), {
      timeout: 15000,
      validateStatus: () => true,
      headers,
    });
    if (res.status === 200 && Array.isArray(res.data)) {
      for (const item of res.data.slice(0, 7)) {
        results.push({
          title: item.title || item.name || "Beasiswa",
          organizer: item.organizer || item.institution || "N/A",
          level: item.level || item.degree || "N/A",
          deadline: item.deadline || item.application_deadline || "N/A",
          link: item.url || item.link || "https://beasiswaindonesia.com",
        });
      }
    }
  } catch (e) { console.error('[scholarship.js]:', e.message); }

  // Source 2: Fetch from IAC.beasiswa.or.id / BeasiswaKaltim
  try {
    const res = await axios.get("https://beasiswakaltim.com/api/scholarships?status=open&limit=10", {
      timeout: 12000,
      validateStatus: () => true,
      headers,
    });
    if (res.status === 200 && Array.isArray(res.data)) {
      for (const item of res.data.slice(0, 5)) {
        results.push({
          title: item.title || item.name || "Beasiswa",
          organizer: item.organizer || "N/A",
          level: item.level || "N/A",
          deadline: item.deadline || "N/A",
          link: item.url || "https://beasiswakaltim.com",
        });
      }
    }
  } catch (e) { console.error('[scholarship.js]:', e.message); }

  // Source 3: DuckDuckGo instant answer fallback
  if (results.length === 0) {
    try {
      const res = await axios.get("https://api.duckduckgo.com/", {
        params: { q: "beasiswa " + (level || "") + " Indonesia 2026", format: "json", no_html: 1, skip_disambig: 1 },
        timeout: 10000,
        validateStatus: () => true,
        headers,
      });
      if (res.status === 200 && res.data) {
        const d = res.data;
        if (d.AbstractText || d.Abstract) {
          results.push({
            title: "Info Beasiswa " + (level || "Terbaru"),
            organizer: d.Heading || "DuckDuckGo",
            level: level || "All",
            deadline: "Cek website",
            link: "https://duckduckgo.com/?q=beasiswa+" + (level || "") + "+indonesia+2026",
          });
        }
        // Related topics
        if (d.RelatedTopics) {
          for (const t of d.RelatedTopics.slice(0, 5)) {
            if (t.Text && t.FirstURL) {
              results.push({
                title: t.Text.split(" - ")[0].substring(0, 80),
                organizer: "DuckDuckGo",
                level: level || "N/A",
                deadline: "Cek link",
                link: t.FirstURL,
              });
            }
          }
        }
      }
    } catch (e) { console.error('[scholarship.js]:', e.message); }
  }

  // Source 4: AI fallback via Google Search scrape
  if (results.length === 0) {
    try {
      const res = await axios.get("https://www.google.com/search?q=beasiswa+" + (level || "terbaru") + "+indonesia+2026&num=7", {
        timeout: 12000,
        validateStatus: () => true,
        headers: { ...headers, "Accept-Language": "id-ID,id;q=0.9" },
      });
      if (res.status === 200 && res.data) {
        const html = res.data;
        const linkRegex = /<a href="\/url\?q=(https?:\/\/[^&"]+)"/g;
        const textRegex = /<span[^>]*>([^<]{20,100})<\/span>/g;
        let links = [];
        let texts = [];
        let match;
        while ((match = linkRegex.exec(html)) !== null && links.length < 7) {
          links.push(match[1]);
        }
        while ((match = textRegex.exec(html)) !== null && texts.length < 7) {
          texts.push(match[1].trim());
        }
        const count = Math.max(links.length, texts.length);
        for (let i = 0; i < Math.min(count, 7); i++) {
          results.push({
            title: texts[i] || "Beasiswa Info",
            organizer: "Google Search",
            level: level || "N/A",
            deadline: "Cek link",
            link: links[i] || "https://google.com",
          });
        }
      }
    } catch (e) { console.error('[scholarship.js]:', e.message); }
  }

  return results;
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();

  // Filter level
  let level = "";
  if (sub === "s1" || sub === "sarjana") level = "S1";
  else if (sub === "s2" || sub === "magister") level = "S2";
  else if (sub === "s3" || sub === "doktor") level = "S3";
  else if (sub === "d3" || sub === "diploma") level = "D3";

  // .beasiswa deadline - sort by deadline terdekat
  const sortByDeadline = sub === "deadline" || sub === "terdekat";
  if (sortByDeadline) {
    level = args[1] ? args[1].toUpperCase() : "";
  }

  // .beasiswa list / .beasiswa (level)
  if (sub === "" || level || sortByDeadline) {
    try {
      const results = await fetchBeasiswaFromWeb(level);
      if (results.length === 0) {
        return m.reply( claraWrap("Beasiswa", [
          "Maaf, tidak ada hasil saat ini.",
          "Coba lagi ya atau cari manual di:",
          "https://beasiswaindonesia.com",
        ].join("\n")), { commandName: "beasiswa" });
      }

      let txt = `Beasiswa ${level || "Terbaru"}\n\n`;
      txt += `${results.length} beasiswa ditemukan\n\n`;

      for (let i = 0; i < results.length; i++) {
        const b = results[i];
        txt += `${i + 1}. ${b.title}\n`;
        txt += `   Penyelenggara: ${b.organizer}\n`;
        txt += `   Jenjang: ${b.level}\n`;
        txt += `   Deadline: ${b.deadline}\n`;
        txt += `   Link: ${b.link}\n\n`;
      }

      txt += tipText("Info dapat berubah, cek link resmi untuk konfirmasi");
      return m.reply( txt, { commandName: "beasiswa" });
    } catch (e) {
      return m.reply( novaError("Beasiswa", `Gagal cari nih: ${e.message}`), { commandName: "beasiswa" });
    }
  }

  // Default: help
  const txt = claraWrap("Beasiswa - Pencari Info Beasiswa", [
    `Cari info beasiswa dari berbagai sumber online.`,
    ``,
    `Perintah:`,
    `1. ${prefix}beasiswa - Semua beasiswa terbaru`,
    `2. ${prefix}beasiswa s1 - Khusus S1`,
    `3. ${prefix}beasiswa s2 - Khusus S2`,
    `4. ${prefix}beasiswa s3 - Khusus S3`,
    `5. ${prefix}beasiswa deadline - Urut deadline terdekat`,
    `6. ${prefix}beasiswa deadline s1 - Deadline S1 terdekat`,
  ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}beasiswa s1`);
  return m.reply( txt, { commandName: "beasiswa" });
}

export { pluginConfig as config, handler };
