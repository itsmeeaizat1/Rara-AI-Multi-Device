// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "magang",
  alias: ["magang"],
  category: "education",
  description: "Cari lowongan magang/internship untuk mahasiswa",
  usage: ".magang <command>",
  example: ".magang it\n.magang jakarta\n.magang remote\n.magang design",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

// API sources (free, no key):
// 1.arbeitnow.com API - international internships
// 2. remotive.io API - remote internships
// 3. devitjobs.eu - tech internships (fallback)
// 4. DuckDuckGo fallback for Indonesia-specific

async function fetchMagang(keyword, location) {
  const results = [];
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };

  // Source 1: arbeitnow.com - free jobs API
  try {
    let query = "internship";
    if (keyword) query = keyword + " internship";
    if (location) query += " " + location;
    const res = await axios.get(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}&limit=10`, {
      timeout: 15000,
      validateStatus: () => true,
      headers,
    });
    if (res.status === 200 && res.data?.data) {
      for (const job of res.data.data.slice(0, 7)) {
        results.push({
          title: job.title || "Internship",
          company: job.company_name || job.company || "N/A",
          location: job.location || "Remote",
          type: job.job_types || ["Internship"],
          remote: job.remote || false,
          link: job.url || job.slug || "https://www.arbeitnow.com",
          tags: job.tags || [],
        });
      }
    }
  } catch (e) { console.error('[internship.js]:', e.message); }

  // Source 2: remotive.io - remote jobs
  if (results.length < 5) {
    try {
      const res = await axios.get("https://remotive.com/api/remote-jobs?search=internship" + (keyword ? "+" + keyword : ""), {
        timeout: 12000,
        validateStatus: () => true,
        headers,
      });
      if (res.status === 200 && res.data?.jobs) {
        for (const job of res.data.jobs.slice(0, 7)) {
          results.push({
            title: job.title || "Internship",
            company: job.company_name || "N/A",
            location: "Remote",
            type: ["Remote"],
            remote: true,
            link: job.url || "https://remotive.com",
            tags: job.tags || [],
          });
        }
      }
    } catch (e) { console.error('[internship.js]:', e.message); }
  }

  // Source 3: DuckDuckGo fallback for Indonesia
  if (results.length === 0) {
    try {
      const q = "magang internship " + (keyword || "") + " " + (location || "Indonesia") + " 2026";
      const res = await axios.get("https://api.duckduckgo.com/", {
        params: { q: q.trim(), format: "json", no_html: 1, skip_disambig: 1 },
        timeout: 10000,
        validateStatus: () => true,
        headers,
      });
      if (res.status === 200 && res.data) {
        const d = res.data;
        if (d.RelatedTopics) {
          for (const t of d.RelatedTopics.slice(0, 5)) {
            if (t.Text && t.FirstURL) {
              results.push({
                title: t.Text.split(" - ")[0].substring(0, 80),
                company: "DuckDuckGo",
                location: location || "Indonesia",
                type: ["Internship"],
                remote: false,
                link: t.FirstURL,
                tags: [],
              });
            }
          }
        }
      }
    } catch (e) { console.error('[internship.js]:', e.message); }
  }

  // Source 4: Google search fallback
  if (results.length === 0) {
    try {
      const q = encodeURIComponent("lowongan magang " + (keyword || "") + " " + (location || "Indonesia") + " 2026");
      const res = await axios.get(`https://www.google.com/search?q=${q}&num=7`, {
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
        while ((match = linkRegex.exec(html)) !== null && links.length < 7) links.push(match[1]);
        while ((match = textRegex.exec(html)) !== null && texts.length < 7) texts.push(match[1].trim());
        for (let i = 0; i < Math.min(links.length, texts.length, 7); i++) {
          results.push({
            title: texts[i] || "Lowongan Magang",
            company: "Google Search",
            location: location || "Indonesia",
            type: ["Internship"],
            remote: false,
            link: links[i],
            tags: [],
          });
        }
      }
    } catch (e) { console.error('[internship.js]:', e.message); }
  }

  return results;
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const input = args.join(" ").trim();

  // .magang help
  if (input === "" || (args[0] || "").toLowerCase() === "help" || (args[0] || "").toLowerCase() === "bantuan") {
    const txt = raraWrap("Magang - Pencari Lowongan Internship", [
      `Cari lowongan magang/internship dari berbagai sumber online.`,
      ``,
      `Perintah:`,
      `1. ${prefix}magang <kategori> - Cari berdasarkan bidang`,
      `2. ${prefix}magang <kota> - Cari berdasarkan lokasi`,
      `3. ${prefix}magang remote - Cari magang remote`,
      ``,
      `Contoh:`,
      `${prefix}magang it`,
      `${prefix}magang jakarta`,
      `${prefix}magang design`,
      `${prefix}magang remote`,
      `${prefix}magang marketing remote`,
    ].join("\n")) + "\n" + tipText("Hasil dari arbeitnow + remotive + DuckDuckGo");
    return m.reply( txt, { commandName: "magang" });
  }
  try {
    // Parse: bisa keyword + location
    let keyword = "";
    let location = "";
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("remote")) {
      keyword = input.replace(/remote/gi, "").trim();
      location = "remote";
    } else {
      // Cek apakah kata terakhir adalah lokasi (kota Indonesia)
      const kotaList = ["jakarta", "bandung", "surabaya", "yogyakarta", "semarang", "malang", "bali", "medan", "makassar", "bekasi", "depok", "tangerang"];
      const words = input.split(" ");
      const lastWord = words[words.length - 1].toLowerCase();
      if (kotaList.includes(lastWord)) {
        location = lastWord;
        keyword = words.slice(0, -1).join(" ").trim();
      } else {
        keyword = input;
      }
    }

    const results = await fetchMagang(keyword, location);
    if (results.length === 0) {
      return m.reply( raraWrap("Magang", [
        "Tidak ada hasil ditemukan.",
        "Coba kata kunci lain atau cek:",
        "https://www.magang.id",
        "https://www.kalibrr.com",
      ].join("\n")), { commandName: "magang" });
    }

    let txt = `Lowongan Magang\n\n`;
    txt += `Kata kunci: ${keyword || "semua"}\n`;
    txt += `Lokasi: ${location || "semua"}\n`;
    txt += `${results.length} lowongan ditemukan\n\n`;

    for (let i = 0; i < results.length; i++) {
      const job = results[i];
      txt += `${i + 1}. ${job.title}\n`;
      txt += `   Perusahaan: ${job.company}\n`;
      txt += `   Lokasi: ${job.location}${job.remote ? " (Remote)" : ""}\n`;
      txt += `   Link: ${job.link}\n\n`;
    }

    txt += tipText("Cek link untuk detail & cara apply");
    return m.reply( txt, { commandName: "magang" });
  } catch (e) {
    return m.reply( raraError("Magang", `Gagal cari nih: ${e.message}`), { commandName: "magang" });
  }
}

export { pluginConfig as config, handler };
