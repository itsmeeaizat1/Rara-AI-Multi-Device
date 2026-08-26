// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "carijurnal",
  alias: ["carijurnal"],
  category: "education",
  description: "Cari jurnal/paper akademik via OpenAlex API (free, jutaan paper)",
  usage: ".carijurnal <kata kunci>",
  example: ".carijurnal machine learning",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const query = args.join(" ").trim();

  if (!query) {
    let txt = `Cari Jurnal/Paper\n\n`;
    txt += `Cari paper akademik dari database OpenAlex (jutaan paper, free).\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}carijurnal <kata kunci>\` - Cari paper\n`;
    txt += `2. \`${m.prefix}carijurnal <kata kunci> <jumlah>\` - Cari dengan jumlah hasil\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}carijurnal machine learning\`\n`;
    txt += `\`${m.prefix}carijurnal deep learning 10\`\n\n`;
    txt += `_OpenAlex: 250M+ paper, free, no API key_`;
    return await m.reply( txt, { commandName: "carijurnal" });
  }

  await m.react("🕒");

  try {
    let limit = 5;
    const lastArg = parseInt(args[args.length - 1]);
    let searchQuery = query;
    if (!isNaN(lastArg) && lastArg >= 1 && lastArg <= 20) {
      limit = lastArg;
      searchQuery = args.slice(0, -1).join(" ");
    }

    const res = await axios.get("https://api.openalex.org/works", {
      params: {
        search: searchQuery,
        "per-page": limit,
        sort: "cited_by_count:desc",
      },
      timeout: 20000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.results) throw new Error("Gagal mencari paper");

    const results = res.data.results;
    const total = res.data.meta?.count || results.length;

    let txt = `Hasil Pencarian Jurnal\n\n`;
    txt += `"${searchQuery}"\n`;
    txt += `${total.toLocaleString()} paper ditemukan\n\n`;

    for (let i = 0; i < results.length; i++) {
      const w = results[i];
      txt += `${i + 1}. ${w.title || "Untitled"}\n`;

      // Authors
      const authorships = w.authorships || [];
      const authors = authorships.slice(0, 3).map(a => a.author?.display_name || "?");
      if (authors.length > 0) txt += `   Author: ${authors.join(", ")}`;
      if (authorships.length > 3) txt += ` et al.`;
      txt += `\n`;

      // Year + venue
      if (w.publication_year) txt += `   Tahun: ${w.publication_year}\n`;
      if (w.primary_location?.source?.display_name) txt += `   Jurnal: ${w.primary_location.source.display_name}\n`;

      // Citations
      txt += `   Cited: ${w.cited_by_count || 0}x\n`;

      // DOI
      if (w.doi) txt += `   DOI: ${w.doi}\n`;

      // Abstract (if available, OpenAlex uses inverted index)
      if (w.abstract_inverted_index) {
        const abstract = reconstructAbstract(w.abstract_inverted_index);
        if (abstract) txt += `   Abstract: ${abstract.slice(0, 200)}...\n`;
      }

      // Open access
      if (w.open_access?.is_oa) txt += `   Open Access: Yes (${w.open_access.oa_status || "gold"})\n`;

      txt += `\n`;
    }

    txt += `_Sortir by cited count | OpenAlex API_`;

    await m.reply(txt);
    await m.react("🐣");
  } catch (e) {
    console.error("[CARIJURNAL] Error:", e.message);
    await m.reply(claraWrap("carijurnal", `Gagal mencari jurnal!\n\nError: ${e.message}`));
  }
}

function reconstructAbstract(invertedIndex) {
  const positions = [];
  for (const [word, idxs] of Object.entries(invertedIndex)) {
    for (const idx of idxs) {
      positions.push({ word, idx });
    }
  }
  positions.sort((a, b) => a.idx - b.idx);
  return positions.map(p => p.word).join(" ");
}

export { pluginConfig as config, handler };
